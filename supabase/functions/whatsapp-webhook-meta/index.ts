// whatsapp-webhook-meta — Endpoint Meta Cloud API com ROTEAMENTO por phone_number_id
//
// Arquitetura: 1 App Meta (Trilia.1) com webhook único → essa edge roteia:
//   - phone_number_id da instância "meta_oficial" do Hub → processa aqui (Hub Walk)
//   - outros phone_number_ids (ex: LuxSales) → proxy reverso pra URL cadastrada
//     em whatsapp_meta_routes (tabela pode ter N entradas)
//
// GET: verificação (usa verify_token da instância meta_oficial principal, ou
//      compara com o verify_token da rota correspondente quando Meta envia GET
//      pra validar webhook).
//
// POST: roteia eventos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, normalizePhone, verifyMetaSignature } from "../_shared/whatsapp.ts";

// Tabela whatsapp_meta_routes (ver migration 20260418200000_whatsapp_meta_routes.sql):
//   phone_number_id TEXT PK
//   forward_url     TEXT     (URL pra onde reencaminhar o payload completo)
//   forward_headers JSONB    (headers extras: ex {"Authorization": "Bearer ..."}
//   verify_token    TEXT     (token de verify Meta deste phone)
//   app_secret      TEXT     (opcional, pra validar HMAC)
//   system_tag      TEXT     (ex 'luxsales', 'objetivo')
//   ativo           BOOLEAN

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Carrega todas as instâncias meta_oficial + rotas extras pra roteamento
  const [{ data: instances }, { data: routes }] = await Promise.all([
    supabase.from("whatsapp_instances").select("*").eq("tipo", "meta_oficial"),
    supabase.from("whatsapp_meta_routes").select("*").eq("ativo", true),
  ]);

  // Índices por phone_number_id
  const instByPhoneId = new Map<string, any>();
  for (const i of instances || []) {
    const pid = i?.meta_config?.phone_number_id;
    if (pid) instByPhoneId.set(String(pid), i);
  }
  const routeByPhoneId = new Map<string, any>();
  for (const r of routes || []) {
    if (r.phone_number_id) routeByPhoneId.set(String(r.phone_number_id), r);
  }

  // ─── GET: verify ────────────────────────────────────────────────────
  // Meta envia com um verify_token específico. Procuramos match em:
  //   1. Qualquer instância meta_oficial
  //   2. Qualquer rota whatsapp_meta_routes
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token) {
      const matchInstance = (instances || []).find(
        (i: any) => i?.meta_config?.verify_token && i.meta_config.verify_token === token,
      );
      const matchRoute = (routes || []).find((r: any) => r.verify_token === token);
      if (matchInstance || matchRoute) {
        return new Response(challenge || "", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  // ─── POST: eventos ──────────────────────────────────────────────────
  const raw = await req.text();
  let payload: any = {};
  try { payload = JSON.parse(raw); } catch {}

  // Extrai phone_number_id do payload — Meta sempre manda em:
  // entry[0].changes[0].value.metadata.phone_number_id
  const phoneNumberId = String(
    payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? "",
  );

  const matchedInstance = phoneNumberId ? instByPhoneId.get(phoneNumberId) : null;
  const matchedRoute = phoneNumberId ? routeByPhoneId.get(phoneNumberId) : null;

  // Validação de assinatura HMAC
  const headerSig = req.headers.get("x-hub-signature-256");
  const appSecret = matchedInstance?.meta_config?.app_secret ?? matchedRoute?.app_secret ?? null;
  if (appSecret) {
    const ok = await verifyMetaSignature(appSecret, raw, headerSig);
    if (!ok) {
      await supabase.from("whatsapp_webhooks_raw").insert({
        provider_tipo: "meta",
        event_type: "signature_invalid",
        payload,
        erro: `Assinatura HMAC inválida (phone_number_id=${phoneNumberId})`,
      });
      return new Response("invalid signature", { status: 401, headers: corsHeaders });
    }
  }

  // Log bruto (sempre)
  await supabase.from("whatsapp_webhooks_raw").insert({
    provider_tipo: "meta",
    event_type: payload?.entry?.[0]?.changes?.[0]?.field ?? "messages",
    payload,
  });

  // ─── ROTEAMENTO ──────────────────────────────────────────────────────
  // Se não é uma instância do Hub e existe rota → proxy reverso
  if (!matchedInstance && matchedRoute?.forward_url) {
    // Reencaminha payload e headers relevantes pro sistema externo
    try {
      const headersOut: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (headerSig) headersOut["x-hub-signature-256"] = headerSig;
      if (matchedRoute.forward_headers && typeof matchedRoute.forward_headers === "object") {
        for (const [k, v] of Object.entries(matchedRoute.forward_headers)) {
          headersOut[k] = String(v);
        }
      }
      const fwd = await fetch(matchedRoute.forward_url, {
        method: "POST",
        headers: headersOut,
        body: raw, // bytes-exatos pra HMAC continuar válido no destino
      });
      // Propaga resposta pra Meta
      return new Response(await fwd.text(), {
        status: fwd.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      await supabase.from("whatsapp_webhooks_raw").insert({
        provider_tipo: "meta",
        event_type: "forward_error",
        payload,
        erro: `Falha proxy pra ${matchedRoute.forward_url}: ${e.message}`,
      });
      // Meta exige 200 pra não retentar — retornamos 200 mesmo com erro
      return new Response(JSON.stringify({ ok: false, proxy_error: e.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Se é instância do Hub → processa normalmente aqui
  if (matchedInstance) {
    try {
      const entries = payload?.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const ch of changes) {
          const value = ch?.value || {};
          // Mensagens recebidas
          for (const msg of value.messages || []) {
            const telefone = normalizePhone(msg.from);
            const tipo = msg.type || "text";
            const body = msg.text?.body ?? msg.button?.text ?? msg.interactive?.button_reply?.title ?? "";
            await supabase.from("whatsapp_messages").insert({
              instance_id: matchedInstance.id,
              direction: "in",
              status: "received",
              telefone,
              tipo,
              body,
              external_id: msg.id,
              raw: msg,
            });
          }
          // Status updates (sent/delivered/read/failed)
          for (const st of value.statuses || []) {
            const update: any = { status: mapMetaStatus(st.status) };
            if (st.status === "delivered") update.entregue_em = new Date().toISOString();
            if (st.status === "read") update.lido_em = new Date().toISOString();
            if (st.status === "failed") update.error = st.errors?.[0]?.message;
            await supabase.from("whatsapp_messages").update(update).eq("external_id", st.id);
          }
        }
      }
    } catch (e: any) {
      console.error("meta webhook hub error:", e.message);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Se não é conhecido (nem instância nem rota) — loga e retorna 200
  // (Meta retentaria se não fosse 200)
  await supabase.from("whatsapp_webhooks_raw").insert({
    provider_tipo: "meta",
    event_type: "unmapped_phone_number_id",
    payload,
    erro: `phone_number_id desconhecido: ${phoneNumberId}`,
  });
  return new Response(JSON.stringify({ ok: true, unmapped: phoneNumberId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function mapMetaStatus(s: string): string {
  switch (s) {
    case "sent": return "sent";
    case "delivered": return "delivered";
    case "read": return "read";
    case "failed": return "failed";
    default: return "sent";
  }
}

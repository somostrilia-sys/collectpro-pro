// whatsapp-webhook-meta — Endpoint Meta Cloud API
// GET: verificação (hub.mode=subscribe, hub.verify_token, hub.challenge)
// POST: eventos (mensagens, statuses). Assinatura validada via X-Hub-Signature-256

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, normalizePhone, verifyMetaSignature } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: instance } = await supabase.from("whatsapp_instances")
    .select("*").eq("tipo", "meta_oficial").maybeSingle();

  // ─── GET: verify ────────────────────────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = instance?.meta_config?.verify_token;
    if (mode === "subscribe" && token && expected && token === expected) {
      return new Response(challenge || "", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  // ─── POST: eventos ──────────────────────────────────────────────────
  const raw = await req.text();
  let payload: any = {};
  try { payload = JSON.parse(raw); } catch {}

  // Verificar assinatura (se configurado)
  const appSecret = instance?.meta_config?.app_secret;
  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256");
    const ok = await verifyMetaSignature(appSecret, raw, sig);
    if (!ok) {
      await supabase.from("whatsapp_webhooks_raw").insert({
        provider_tipo: "meta",
        event_type: "signature_invalid",
        payload, erro: "Assinatura HMAC inválida",
      });
      return new Response("invalid signature", { status: 401, headers: corsHeaders });
    }
  }

  await supabase.from("whatsapp_webhooks_raw").insert({
    provider_tipo: "meta",
    event_type: payload?.entry?.[0]?.changes?.[0]?.field ?? "messages",
    payload,
  });

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
            instance_id: instance?.id ?? null,
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
    console.error("meta webhook error:", e.message);
  }

  return new Response(JSON.stringify({ ok: true }), {
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

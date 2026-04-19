// whatsapp-call-action — chamadas de voz UAZAPI
//
// Body: { instance_id: string, action: string, ...params }
// Actions:
//   - make: { telefone | chat_jid }               // POST /call/make
//   - reject: { external_id }                     // POST /call/reject
//   - history_local: { chat_jid?, limit?, offset? }  // lista do banco

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad, jidToPhone } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { instance_id, action } = body;
    if (!instance_id) return bad("instance_id obrigatório");
    if (!action) return bad("action obrigatória");

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance) return bad("instância não encontrada", 404);

    // Histórico local (não precisa de token)
    if (action === "history_local") {
      const { chat_jid, limit, offset } = body;
      let q = supabase.from("whatsapp_call_log")
        .select("*")
        .eq("instance_id", instance_id)
        .order("iniciada_em", { ascending: false });
      if (chat_jid) q = q.eq("chat_jid", chat_jid);
      q = q.range(offset ?? 0, (offset ?? 0) + (limit ?? 100) - 1);
      const { data } = await q;
      return json({ success: true, calls: data ?? [] });
    }

    if (!instance.token) return bad("instância sem token", 400);
    const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
    const token = instance.token;

    const callPost = async (endpoint: string, payload: any) => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    switch (action) {
      case "make": {
        const { telefone, chat_jid, colaborador_id } = body;
        const target = chat_jid || telefone;
        if (!target) return bad("telefone ou chat_jid obrigatório");
        const r = await callPost("/call/make", { number: target });
        if (r.ok) {
          await supabase.from("whatsapp_call_log").insert({
            instance_id,
            external_id: r.data?.id ?? r.data?.callId ?? null,
            chat_jid: chat_jid ?? null,
            telefone: telefone || jidToPhone(chat_jid || ""),
            direction: "out",
            status: "calling",
            colaborador_id: colaborador_id ?? null,
            iniciada_em: new Date().toISOString(),
          });
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "reject": {
        const { external_id } = body;
        if (!external_id) return bad("external_id obrigatório");
        const r = await callPost("/call/reject", { id: external_id });
        if (r.ok) {
          await supabase.from("whatsapp_call_log")
            .update({ status: "rejected", encerrada_em: new Date().toISOString() })
            .eq("instance_id", instance_id)
            .eq("external_id", external_id);
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

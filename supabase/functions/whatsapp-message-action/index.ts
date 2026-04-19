// whatsapp-message-action — todas as ações sobre mensagens UAZAPI
//
// Body: { instance_id: string, action: string, ...params }
// Actions:
//   - react: { message_external_id, emoji }
//   - edit: { message_external_id, new_text }
//   - delete: { message_external_id }
//   - pin: { message_external_id, pin: boolean }
//   - markread: { chat_jid OR telefone, message_external_id? }
//   - find: { chat_jid OR telefone, query?, limit? }
//   - history_sync: { chat_jid OR telefone, count? }
//   - download: { message_external_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad } from "../_shared/whatsapp.ts";

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
    if (!instance.token) return bad("instância sem token (conecte primeiro)", 400);

    const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
    const token = instance.token;

    // Helper pra chamar UAZAPI
    const call = async (endpoint: string, payload: any) => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    switch (action) {
      case "react": {
        const { message_external_id, emoji } = body;
        if (!message_external_id) return bad("message_external_id obrigatório");
        const r = await call("/message/react", { id: message_external_id, text: emoji ?? "" });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "edit": {
        const { message_external_id, new_text } = body;
        if (!message_external_id || !new_text) return bad("message_external_id e new_text obrigatórios");
        const r = await call("/message/edit", { id: message_external_id, text: new_text });
        if (r.ok) {
          // Atualiza body local
          await supabase.from("whatsapp_messages")
            .update({ body: new_text })
            .eq("instance_id", instance_id)
            .eq("message_external_id", message_external_id);
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "delete": {
        const { message_external_id } = body;
        if (!message_external_id) return bad("message_external_id obrigatório");
        const r = await call("/message/delete", { id: message_external_id });
        if (r.ok) {
          // Marca como deletada localmente
          const { data: msgRow } = await supabase.from("whatsapp_messages")
            .select("id")
            .eq("instance_id", instance_id)
            .eq("message_external_id", message_external_id)
            .maybeSingle();
          if (msgRow) {
            await supabase.from("whatsapp_uazapi_details")
              .update({ deleted_at: new Date().toISOString() })
              .eq("message_id", msgRow.id);
          }
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "pin": {
        const { message_external_id, pin } = body;
        if (!message_external_id) return bad("message_external_id obrigatório");
        const r = await call("/message/pin", { id: message_external_id, pin: pin !== false });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "markread": {
        const { chat_jid, telefone, message_external_id } = body;
        const number = chat_jid || telefone;
        if (!number) return bad("chat_jid ou telefone obrigatório");
        const r = await call("/message/markread", {
          number,
          id: message_external_id,
        });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "find": {
        const { chat_jid, telefone, query, limit } = body;
        const number = chat_jid || telefone;
        if (!number) return bad("chat_jid ou telefone obrigatório");
        const r = await call("/message/find", {
          number,
          query,
          limit: limit ?? 50,
        });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "history_sync": {
        const { chat_jid, telefone, count } = body;
        const number = chat_jid || telefone;
        if (!number) return bad("chat_jid ou telefone obrigatório");
        const r = await call("/message/history-sync", {
          number,
          count: count ?? 50,
        });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "download": {
        const { message_external_id } = body;
        if (!message_external_id) return bad("message_external_id obrigatório");
        // Dispara re-download da mídia (se mídia já existe em whatsapp_media)
        const { data: msgRow } = await supabase.from("whatsapp_messages")
          .select("id")
          .eq("instance_id", instance_id)
          .eq("message_external_id", message_external_id)
          .maybeSingle();
        if (!msgRow) return bad("mensagem não encontrada no banco");

        // Aciona downloader com force=true
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const r = await fetch(`${supabaseUrl}/functions/v1/whatsapp-media-downloader`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ message_id: msgRow.id, force: true }),
        });
        const data = await r.json().catch(() => ({}));
        return json({ success: r.ok, data }, r.ok ? 200 : 502);
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

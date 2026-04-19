// whatsapp-chat-action — ações de gerenciamento de chat UAZAPI
//
// Body: { instance_id: string, action: string, ...params }
// Actions:
//   - archive: { chat_jid, archive: boolean }
//   - pin: { chat_jid, pin: boolean }
//   - mute: { chat_jid, duration_seconds? }      // 0 = desmutar
//   - read: { chat_jid, read: boolean }          // marcar lido/não lido
//   - delete: { chat_jid }
//   - find: { query?, filter?, limit?, offset? }
//   - notes_get: { chat_jid }
//   - notes_edit: { chat_jid, content }
//   - notes_refresh: { chat_jid }
//   - notes_internal_list: { chat_jid }          // notas locais (não UAZAPI)
//   - notes_internal_add: { chat_jid, conteudo, colaborador_id }
//   - notes_internal_delete: { note_id }

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

    const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
    const token = instance.token;

    // Actions que não precisam de token (notas internas locais)
    if (action.startsWith("notes_internal_")) {
      return await handleInternalNotes(supabase, instance_id, action, body);
    }

    if (!token) return bad("instância sem token (conecte primeiro)", 400);

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
      case "archive": {
        const { chat_jid, archive } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const r = await call("/chat/archive", { number: chat_jid, archive: archive !== false });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "pin": {
        const { chat_jid, pin } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const r = await call("/chat/pin", { number: chat_jid, pin: pin !== false });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "mute": {
        const { chat_jid, duration_seconds } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const r = await call("/chat/mute", {
          number: chat_jid,
          duration: duration_seconds ?? 0,
        });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "read": {
        const { chat_jid, read } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const r = await call("/chat/read", { number: chat_jid, read: read !== false });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "delete": {
        const { chat_jid } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const r = await call("/chat/delete", { number: chat_jid });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "find": {
        const { query, filter, limit, offset } = body;
        const payload: any = { limit: limit ?? 50, offset: offset ?? 0 };
        if (query) payload.query = query;
        if (filter) Object.assign(payload, filter);
        const r = await call("/chat/find", payload);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "notes_get": {
        const { chat_jid } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const r = await call("/chat/notes", { number: chat_jid });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "notes_edit": {
        const { chat_jid, content } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const r = await call("/chat/notes/edit", { number: chat_jid, notes: content ?? "" });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "notes_refresh": {
        const { chat_jid } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const r = await call("/chat/notes/refresh", { number: chat_jid });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

// ─── Notas internas (locais, não sincronizam com UAZAPI) ───────────────
async function handleInternalNotes(supabase: any, instanceId: string, action: string, body: any) {
  try {
    switch (action) {
      case "notes_internal_list": {
        const { chat_jid } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const { data } = await supabase.from("whatsapp_chat_notes")
          .select("*")
          .eq("instance_id", instanceId)
          .eq("chat_jid", chat_jid)
          .order("criado_em", { ascending: false });
        return json({ success: true, notes: data ?? [] });
      }
      case "notes_internal_add": {
        const { chat_jid, conteudo, colaborador_id, colaborador_nome } = body;
        if (!chat_jid || !conteudo) return bad("chat_jid e conteudo obrigatórios");
        const { data, error } = await supabase.from("whatsapp_chat_notes").insert({
          instance_id: instanceId,
          chat_jid,
          conteudo,
          criado_por: colaborador_id ?? null,
          criado_por_nome: colaborador_nome ?? null,
        }).select().single();
        if (error) return bad(error.message);
        return json({ success: true, note: data });
      }
      case "notes_internal_delete": {
        const { note_id } = body;
        if (!note_id) return bad("note_id obrigatório");
        await supabase.from("whatsapp_chat_notes").delete().eq("id", note_id);
        return json({ success: true });
      }
      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message, 500);
  }
}

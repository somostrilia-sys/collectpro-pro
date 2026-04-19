// whatsapp-contact-action — gestão de contatos e bloqueios
//
// Body: { instance_id: string, action: string, ...params }
// Actions:
//   - list: { }                             // GET /contacts
//   - list_paginated: { limit?, offset?, query? }
//   - add: { jid, name }                    // adicionar à agenda
//   - remove: { jid }                       // remover da agenda
//   - check: { phones: string[] }           // verificar se números têm WhatsApp
//   - details: { jid, preview? }            // detalhes completos do chat
//   - block: { jid }
//   - unblock: { jid }
//   - blocklist: { }                        // lista de bloqueados
//   - sync_to_db: { }                       // puxa todos contatos pra whatsapp_contacts

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
    if (!instance?.token) return bad("instância sem token", 400);

    const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
    const token = instance.token;

    const callPost = async (endpoint: string, payload: any = {}) => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    const callGet = async (endpoint: string) => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: "GET",
        headers: { token },
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    switch (action) {
      case "list": {
        const r = await callGet("/contacts");
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "list_paginated": {
        const { limit, offset, query } = body;
        const r = await callPost("/contacts/list", {
          limit: limit ?? 100,
          offset: offset ?? 0,
          query: query ?? "",
        });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "add": {
        const { jid, name } = body;
        if (!jid || !name) return bad("jid e name obrigatórios");
        const r = await callPost("/contact/add", { jid, name });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "remove": {
        const { jid } = body;
        if (!jid) return bad("jid obrigatório");
        const r = await callPost("/contact/remove", { jid });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "check": {
        const { phones } = body;
        if (!Array.isArray(phones) || phones.length === 0) {
          return bad("phones (array) obrigatório");
        }
        const r = await callPost("/chat/check", { numbers: phones });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "details": {
        const { jid, preview } = body;
        if (!jid) return bad("jid obrigatório");
        const r = await callPost("/chat/details", { number: jid, preview: preview === true });
        // Cache no banco
        if (r.ok && r.data) {
          const chat = r.data?.chat ?? r.data;
          const update: any = {
            instance_id,
            jid,
            telefone: jidToPhone(jid),
            last_refresh: new Date().toISOString(),
          };
          if (chat?.wa_name) update.push_name = chat.wa_name;
          if (chat?.wa_contactName) update.contact_name = chat.wa_contactName;
          if (chat?.image) update.avatar_url = chat.image;
          if (chat?.imagePreview) update.avatar_preview_url = chat.imagePreview;
          if (chat?.wa_isBlocked !== undefined) update.is_blocked = chat.wa_isBlocked;
          update.raw = chat;
          await supabase.from("whatsapp_contacts")
            .upsert(update, { onConflict: "instance_id,jid" });
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "block": {
        const { jid } = body;
        if (!jid) return bad("jid obrigatório");
        const r = await callPost("/chat/block", { number: jid, block: true });
        if (r.ok) {
          await supabase.from("whatsapp_blocks").upsert({
            instance_id,
            jid,
            telefone: jidToPhone(jid),
          }, { onConflict: "instance_id,jid" });
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "unblock": {
        const { jid } = body;
        if (!jid) return bad("jid obrigatório");
        const r = await callPost("/chat/block", { number: jid, block: false });
        if (r.ok) {
          await supabase.from("whatsapp_blocks")
            .delete()
            .eq("instance_id", instance_id)
            .eq("jid", jid);
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "blocklist": {
        const r = await callGet("/chat/blocklist");
        // Sincroniza cache
        if (r.ok && Array.isArray(r.data?.blocklist ?? r.data)) {
          const list = r.data.blocklist ?? r.data;
          for (const jid of list) {
            await supabase.from("whatsapp_blocks").upsert({
              instance_id,
              jid: String(jid),
              telefone: jidToPhone(String(jid)),
            }, { onConflict: "instance_id,jid" });
          }
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "sync_to_db": {
        // Puxa contatos paginados da UAZAPI e persiste no banco
        let offset = 0;
        const limit = 200;
        let total = 0;
        while (true) {
          const r = await callPost("/contacts/list", { limit, offset });
          if (!r.ok) break;
          const contacts = r.data?.contacts ?? r.data?.data ?? [];
          if (!Array.isArray(contacts) || contacts.length === 0) break;
          for (const c of contacts) {
            const jid = c.id ?? c.jid ?? c.wa_chatid;
            if (!jid) continue;
            await supabase.from("whatsapp_contacts").upsert({
              instance_id,
              jid,
              telefone: jidToPhone(jid),
              push_name: c.pushName ?? c.wa_name ?? null,
              contact_name: c.name ?? c.wa_contactName ?? null,
              avatar_url: c.image ?? c.imageUrl ?? null,
              avatar_preview_url: c.imagePreview ?? null,
              is_business: c.isBusiness ?? false,
              last_refresh: new Date().toISOString(),
              raw: c,
            }, { onConflict: "instance_id,jid" });
            total++;
          }
          if (contacts.length < limit) break;
          offset += limit;
          if (offset > 10000) break; // safety
        }
        return json({ success: true, synced: total });
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

// whatsapp-label-action — etiquetas + CRM leads
//
// Body: { instance_id: string, action: string, ...params }
// Actions (labels):
//   - list: { }                              // GET /labels
//   - refresh: { }                           // POST /labels/refresh (sincroniza do WhatsApp)
//   - create: { nome, cor? }
//   - update: { external_id OR id, nome?, cor? }
//   - delete: { external_id OR id }
//   - apply_to_chat: { chat_jid, label_external_ids: string[] }
//   - remove_from_chat: { chat_jid, label_external_id }
// Actions (CRM):
//   - lead_edit: { chat_jid, lead_fields }   // atualiza lead no WhatsApp via UAZAPI
//   - lead_set_fieldmap: { field_definitions } // POST /instance/updateFieldsMap (admin)
//   - lead_list_local: { status?, attendant_id?, limit?, offset? }
//   - lead_update_local: { chat_jid, attendant_id?, kanban_order?, notes? }

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

    // Actions locais (não precisam de token UAZAPI)
    if (["lead_list_local", "lead_update_local"].includes(action)) {
      return await handleLocal(supabase, instance_id, action, body);
    }

    if (!instance.token) return bad("instância sem token (conecte primeiro)", 400);
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
        const r = await callGet("/labels");
        if (r.ok && Array.isArray(r.data?.labels ?? r.data)) {
          const list = r.data.labels ?? r.data;
          for (const l of list) {
            await supabase.from("whatsapp_labels").upsert({
              instance_id,
              external_id: String(l.id ?? l.labelId),
              nome: l.name ?? l.nome ?? `Label ${l.id}`,
              cor: l.color ?? null,
              ativo: l.deleted !== true,
            }, { onConflict: "instance_id,external_id" });
          }
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "refresh": {
        const r = await callPost("/labels/refresh", {});
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "create": {
        const { nome, cor } = body;
        if (!nome) return bad("nome obrigatório");
        // Spec /label/edit exige labelid — quando vazio, UAZAPI gera
        const r = await callPost("/label/edit", {
          labelid: "",
          name: nome,
          color: cor ?? null,
        });
        if (r.ok && (r.data?.labelid ?? r.data?.id)) {
          await supabase.from("whatsapp_labels").upsert({
            instance_id,
            external_id: String(r.data.labelid ?? r.data.id),
            nome,
            cor: cor ?? null,
            ativo: true,
          }, { onConflict: "instance_id,external_id" });
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "update": {
        const { external_id, id, nome, cor } = body;
        const labelExternalId = external_id ?? id;
        if (!labelExternalId) return bad("external_id obrigatório");
        const r = await callPost("/label/edit", {
          labelid: String(labelExternalId),
          name: nome,
          color: cor,
        });
        if (r.ok) {
          await supabase.from("whatsapp_labels")
            .update({ nome, cor })
            .eq("instance_id", instance_id)
            .eq("external_id", String(labelExternalId));
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "delete": {
        const { external_id, id } = body;
        const labelExternalId = external_id ?? id;
        if (!labelExternalId) return bad("external_id obrigatório");
        const r = await callPost("/label/edit", {
          labelid: String(labelExternalId),
          delete: true,
        });
        if (r.ok) {
          await supabase.from("whatsapp_labels")
            .update({ ativo: false })
            .eq("instance_id", instance_id)
            .eq("external_id", String(labelExternalId));
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "apply_to_chat": {
        const { chat_jid, label_external_ids } = body;
        if (!chat_jid || !Array.isArray(label_external_ids)) {
          return bad("chat_jid e label_external_ids obrigatórios");
        }
        const r = await callPost("/chat/labels", {
          number: chat_jid,
          labelids: label_external_ids.map(String),
        });
        if (r.ok) {
          // Limpa labels antigos desse chat
          await supabase.from("whatsapp_chat_labels")
            .delete()
            .eq("instance_id", instance_id)
            .eq("chat_jid", chat_jid);
          // Insere novos
          for (const extId of label_external_ids) {
            const { data: lbl } = await supabase.from("whatsapp_labels")
              .select("id")
              .eq("instance_id", instance_id)
              .eq("external_id", String(extId))
              .maybeSingle();
            if (lbl) {
              await supabase.from("whatsapp_chat_labels").insert({
                instance_id,
                chat_jid,
                label_id: lbl.id,
              });
            }
          }
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "remove_from_chat": {
        const { chat_jid, label_external_id } = body;
        if (!chat_jid || !label_external_id) return bad("chat_jid e label_external_id obrigatórios");

        const r = await callPost("/chat/labels", {
          number: chat_jid,
          remove_labelid: String(label_external_id),
        });

        if (r.ok) {
          const { data: lblToRemove } = await supabase.from("whatsapp_labels")
            .select("id")
            .eq("instance_id", instance_id)
            .eq("external_id", String(label_external_id))
            .maybeSingle();
          if (lblToRemove) {
            await supabase.from("whatsapp_chat_labels")
              .delete()
              .eq("instance_id", instance_id)
              .eq("chat_jid", chat_jid)
              .eq("label_id", lblToRemove.id);
          }
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      // ═══ CRM ═══

      case "lead_edit": {
        const { chat_jid, lead_fields } = body;
        if (!chat_jid || !lead_fields) return bad("chat_jid e lead_fields obrigatórios");
        // UAZAPI exige `id` (wa_fastid). Resolve via /chat/find antes.
        const findRes = await callPost("/chat/find", { wa_chatid: chat_jid, limit: 1 });
        const chatId = findRes.data?.chats?.[0]?.wa_fastid
          ?? findRes.data?.chats?.[0]?.id
          ?? findRes.data?.[0]?.id
          ?? chat_jid; // fallback
        const r = await callPost("/chat/editLead", {
          id: chatId,
          ...lead_fields,
        });
        // Sincroniza local
        await supabase.from("whatsapp_chat_leads").upsert({
          instance_id,
          chat_jid,
          lead_name: lead_fields.lead_name ?? lead_fields.name ?? null,
          lead_full_name: lead_fields.lead_fullName ?? lead_fields.fullName ?? null,
          lead_email: lead_fields.lead_email ?? lead_fields.email ?? null,
          lead_personalid: lead_fields.lead_personalid ?? lead_fields.personalid ?? null,
          lead_status: lead_fields.lead_status ?? lead_fields.status ?? null,
          lead_tags: Array.isArray(lead_fields.lead_tags ?? lead_fields.tags)
            ? (lead_fields.lead_tags ?? lead_fields.tags) : [],
          lead_notes: lead_fields.lead_notes ?? lead_fields.notes ?? null,
          lead_kanban_order: lead_fields.lead_kanbanOrder ?? lead_fields.kanbanOrder ?? null,
          custom_fields: lead_fields.custom_fields ?? {},
        }, { onConflict: "instance_id,chat_jid" });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "lead_set_fieldmap": {
        const { field_definitions } = body;
        if (!field_definitions) return bad("field_definitions obrigatório");
        const r = await callPost("/instance/updateFieldsMap", { fields: field_definitions });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

async function handleLocal(supabase: any, instanceId: string, action: string, body: any) {
  try {
    switch (action) {
      case "lead_list_local": {
        const { status, attendant_id, limit, offset } = body;
        let q = supabase.from("whatsapp_chat_leads")
          .select("*")
          .eq("instance_id", instanceId)
          .order("lead_kanban_order", { ascending: true, nullsFirst: false });
        if (status) q = q.eq("lead_status", status);
        if (attendant_id) q = q.eq("lead_assigned_attendant_id", attendant_id);
        q = q.range(offset ?? 0, (offset ?? 0) + (limit ?? 100) - 1);
        const { data, error } = await q;
        if (error) return bad(error.message);
        return json({ success: true, leads: data ?? [] });
      }

      case "lead_update_local": {
        const { chat_jid, attendant_id, kanban_order, notes, status } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const update: any = {};
        if (attendant_id !== undefined) update.lead_assigned_attendant_id = attendant_id;
        if (kanban_order !== undefined) update.lead_kanban_order = kanban_order;
        if (notes !== undefined) update.lead_notes = notes;
        if (status !== undefined) update.lead_status = status;
        await supabase.from("whatsapp_chat_leads").upsert({
          instance_id: instanceId,
          chat_jid,
          ...update,
        }, { onConflict: "instance_id,chat_jid" });
        return json({ success: true });
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message, 500);
  }
}

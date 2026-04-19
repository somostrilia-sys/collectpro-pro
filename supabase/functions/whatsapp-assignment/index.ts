// whatsapp-assignment — atribuição de chats a atendentes (UAZAPI + Meta)
//
// Body: { instance_id, provider_tipo?, action, ...params }
// provider_tipo: "uazapi" (default) | "meta"
//   UAZAPI usa chat_jid; Meta usa telefone.
//
// Actions:
//   - assign: { chat_jid OR telefone, colaborador_id, atribuido_por?, auto_release_minutes? }
//   - release: { chat_jid OR telefone }
//   - transfer: { chat_jid OR telefone, from_colaborador_id, to_colaborador_id, motivo? }
//   - get_current: { chat_jid OR telefone }
//   - list_by_attendant: { colaborador_id, only_active? }
//   - list_unassigned: { }                        // NOVO — pool "Sem dono" (Meta)
//   - list_all: { only_active? }                  // NOVO — todos os chats da instância
//   - sla_check: { threshold_minutes? }

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
    const providerTipo: "uazapi" | "meta" = body.provider_tipo ?? "uazapi";

    if (!instance_id) return bad("instance_id obrigatório");
    if (!action) return bad("action obrigatória");
    if (!["uazapi", "meta"].includes(providerTipo)) return bad("provider_tipo inválido");

    // Resolve target (chat_jid pra uazapi, telefone pra meta)
    const target = providerTipo === "meta" ? body.telefone : body.chat_jid;
    const targetKey = providerTipo === "meta" ? "telefone" : "chat_jid";

    // Helpers
    const expiresFromMinutes = (min: number | null): string | null =>
      min && min > 0 ? new Date(Date.now() + min * 60_000).toISOString() : null;

    const filterByTarget = (q: any) =>
      providerTipo === "meta" ? q.eq("telefone", target) : q.eq("chat_jid", target);

    switch (action) {
      case "assign": {
        const { colaborador_id, atribuido_por, auto_release_minutes } = body;
        if (!target) return bad(`${targetKey} obrigatório`);
        if (!colaborador_id) return bad("colaborador_id obrigatório");

        const autoReleaseMin = auto_release_minutes ?? 30;

        // Verifica assignment ativo existente
        let q = supabase.from("whatsapp_chat_assignments")
          .select("*")
          .eq("instance_id", instance_id)
          .eq("provider_tipo", providerTipo)
          .eq("status", "active");
        q = filterByTarget(q);
        const { data: existing } = await q.maybeSingle();

        if (existing && existing.colaborador_id !== colaborador_id) {
          // Se expires_at passou → libera, permite reassign
          const expired = existing.expires_at && new Date(existing.expires_at) < new Date();
          const lockMs = Date.now() - new Date(existing.atribuido_em).getTime();
          const withinLock = lockMs < 5 * 60 * 1000 && !expired;

          if (withinLock) {
            return json({
              success: false,
              locked: true,
              by: existing.colaborador_id,
              error: "Conversa em atendimento por outro atendente",
            }, 409);
          }
          // Libera anterior
          await supabase.from("whatsapp_chat_assignments")
            .update({ status: "released", liberado_em: new Date().toISOString() })
            .eq("id", existing.id);
        }

        if (existing?.colaborador_id === colaborador_id) {
          // Renova timestamp + expires_at
          const upd: any = { atribuido_em: new Date().toISOString() };
          upd.expires_at = expiresFromMinutes(autoReleaseMin);
          upd.auto_release_minutes = autoReleaseMin;
          await supabase.from("whatsapp_chat_assignments")
            .update(upd).eq("id", existing.id);
          return json({ success: true, renewed: true, assignment: existing });
        }

        const insertRow: Record<string, any> = {
          instance_id,
          colaborador_id,
          provider_tipo: providerTipo,
          atribuido_por: atribuido_por ?? null,
          status: "active",
          auto_release_minutes: autoReleaseMin,
          expires_at: expiresFromMinutes(autoReleaseMin),
        };
        if (providerTipo === "meta") {
          insertRow.telefone = target;
        } else {
          insertRow.chat_jid = target;
        }

        const { data: newAssign, error } = await supabase.from("whatsapp_chat_assignments")
          .insert(insertRow).select().single();
        if (error) return bad(error.message);

        // Auditoria
        await supabase.from("whatsapp_audit_log").insert({
          instance_id,
          colaborador_id: atribuido_por ?? colaborador_id,
          action_type: "assign",
          entity_type: "chat",
          entity_id: target,
          chat_jid: providerTipo === "uazapi" ? target : null,
          metadata: { assigned_to: colaborador_id, provider_tipo: providerTipo, target },
        });

        return json({ success: true, assignment: newAssign });
      }

      case "release": {
        if (!target) return bad(`${targetKey} obrigatório`);
        let q = supabase.from("whatsapp_chat_assignments")
          .update({ status: "released", liberado_em: new Date().toISOString() })
          .eq("instance_id", instance_id)
          .eq("provider_tipo", providerTipo)
          .eq("status", "active");
        q = filterByTarget(q);
        await q;
        return json({ success: true });
      }

      case "transfer": {
        const { from_colaborador_id, to_colaborador_id, motivo, auto_release_minutes } = body;
        if (!target) return bad(`${targetKey} obrigatório`);
        if (!to_colaborador_id) return bad("to_colaborador_id obrigatório");

        const autoReleaseMin = auto_release_minutes ?? 30;

        // Libera anterior
        let q = supabase.from("whatsapp_chat_assignments")
          .update({
            status: "transferred",
            liberado_em: new Date().toISOString(),
            transfer_reason: motivo ?? null,
          })
          .eq("instance_id", instance_id)
          .eq("provider_tipo", providerTipo)
          .eq("status", "active");
        q = filterByTarget(q);
        await q;

        const insertRow: Record<string, any> = {
          instance_id,
          colaborador_id: to_colaborador_id,
          provider_tipo: providerTipo,
          atribuido_por: from_colaborador_id,
          transfer_from: from_colaborador_id,
          transfer_reason: motivo ?? null,
          status: "active",
          auto_release_minutes: autoReleaseMin,
          expires_at: expiresFromMinutes(autoReleaseMin),
        };
        if (providerTipo === "meta") {
          insertRow.telefone = target;
        } else {
          insertRow.chat_jid = target;
        }

        const { data: newAssign } = await supabase.from("whatsapp_chat_assignments")
          .insert(insertRow).select().single();

        await supabase.from("whatsapp_audit_log").insert({
          instance_id,
          colaborador_id: from_colaborador_id ?? to_colaborador_id,
          action_type: "transfer",
          entity_type: "chat",
          entity_id: target,
          chat_jid: providerTipo === "uazapi" ? target : null,
          metadata: { from: from_colaborador_id, to: to_colaborador_id, motivo, provider_tipo: providerTipo, target },
        });

        return json({ success: true, assignment: newAssign });
      }

      case "get_current": {
        if (!target) return bad(`${targetKey} obrigatório`);
        let q = supabase.from("whatsapp_chat_assignments")
          .select("*, profiles:colaborador_id(full_name)")
          .eq("instance_id", instance_id)
          .eq("provider_tipo", providerTipo)
          .eq("status", "active");
        q = filterByTarget(q);
        const { data } = await q.maybeSingle();
        return json({ success: true, assignment: data ?? null });
      }

      case "list_by_attendant": {
        const { colaborador_id, only_active } = body;
        if (!colaborador_id) return bad("colaborador_id obrigatório");
        let q = supabase.from("whatsapp_chat_assignments")
          .select("*")
          .eq("instance_id", instance_id)
          .eq("provider_tipo", providerTipo)
          .eq("colaborador_id", colaborador_id);
        if (only_active) q = q.eq("status", "active");
        const { data } = await q.order("atribuido_em", { ascending: false });
        return json({ success: true, assignments: data ?? [] });
      }

      // NOVO — lista chats sem dono (pool Meta)
      case "list_unassigned": {
        // Busca todas as conversas Meta com mensagem in nos últimos 24h
        // e que NÃO têm assignment ativo
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: conversations } = await supabase
          .from("whatsapp_meta_conversations")
          .select("telefone, last_inbound_at, last_outbound_at, csw_expires_at")
          .eq("instance_id", instance_id)
          .gt("last_inbound_at", since);

        const unassigned: any[] = [];
        for (const c of (conversations ?? [])) {
          const { data: assigned } = await supabase
            .from("whatsapp_chat_assignments")
            .select("id")
            .eq("instance_id", instance_id)
            .eq("provider_tipo", "meta")
            .eq("telefone", c.telefone)
            .eq("status", "active")
            .maybeSingle();
          if (!assigned) unassigned.push(c);
        }
        return json({ success: true, chats: unassigned, total: unassigned.length });
      }

      case "list_all": {
        const { only_active } = body;
        let q = supabase.from("whatsapp_chat_assignments")
          .select("*, profiles:colaborador_id(full_name)")
          .eq("instance_id", instance_id)
          .eq("provider_tipo", providerTipo);
        if (only_active) q = q.eq("status", "active");
        const { data } = await q.order("atribuido_em", { ascending: false }).limit(500);
        return json({ success: true, assignments: data ?? [] });
      }

      case "sla_check": {
        const threshold = body.threshold_minutes ?? 30;
        const since = new Date(Date.now() - threshold * 60 * 1000).toISOString();

        const { data: recentIn } = await supabase.from("whatsapp_messages")
          .select("instance_id, telefone, criado_em, associado_id, provider_tipo")
          .eq("instance_id", instance_id)
          .eq("direction", "in")
          .lt("criado_em", since)
          .gt("criado_em", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order("criado_em", { ascending: false })
          .limit(500);

        const violations: any[] = [];
        for (const msg of (recentIn ?? [])) {
          const { data: reply } = await supabase.from("whatsapp_messages")
            .select("id")
            .eq("instance_id", msg.instance_id)
            .eq("telefone", msg.telefone)
            .eq("direction", "out")
            .gt("criado_em", msg.criado_em)
            .limit(1)
            .maybeSingle();
          if (!reply) {
            violations.push({
              telefone: msg.telefone,
              associado_id: msg.associado_id,
              provider_tipo: msg.provider_tipo,
              received_at: msg.criado_em,
              minutes_waiting: Math.floor((Date.now() - new Date(msg.criado_em).getTime()) / 60000),
            });
          }
        }

        return json({ success: true, violations, total: violations.length, threshold_minutes: threshold });
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

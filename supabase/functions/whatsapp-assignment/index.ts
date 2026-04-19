// whatsapp-assignment — atribuição de chats a atendentes
//
// Body: { instance_id: string, action: string, ...params }
// Actions:
//   - assign: { chat_jid, colaborador_id, atribuido_por? }
//   - release: { chat_jid }
//   - transfer: { chat_jid, from_colaborador_id, to_colaborador_id, motivo? }
//   - get_current: { chat_jid }
//   - list_by_attendant: { colaborador_id, only_active? }
//   - sla_check: { threshold_minutes? }   // lista chats sem resposta > X min

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

    switch (action) {
      case "assign": {
        const { chat_jid, colaborador_id, atribuido_por } = body;
        if (!chat_jid || !colaborador_id) return bad("chat_jid e colaborador_id obrigatórios");

        // Verificar lock ativo
        const { data: existing } = await supabase.from("whatsapp_chat_assignments")
          .select("*")
          .eq("instance_id", instance_id)
          .eq("chat_jid", chat_jid)
          .eq("status", "active")
          .maybeSingle();

        if (existing && existing.colaborador_id !== colaborador_id) {
          // Lock de 5min: se foi atribuído a outro atendente há menos de 5min, bloqueia
          const lockMs = Date.now() - new Date(existing.atribuido_em).getTime();
          if (lockMs < 5 * 60 * 1000) {
            return json({
              success: false,
              locked: true,
              by: existing.colaborador_id,
              error: "Conversa em atendimento por outro atendente",
            }, 409);
          }
          // Libera o anterior
          await supabase.from("whatsapp_chat_assignments")
            .update({ status: "released", liberado_em: new Date().toISOString() })
            .eq("id", existing.id);
        }

        if (existing?.colaborador_id === colaborador_id) {
          // Já é atribuído a ele — só renova o timestamp
          await supabase.from("whatsapp_chat_assignments")
            .update({ atribuido_em: new Date().toISOString() })
            .eq("id", existing.id);
          return json({ success: true, renewed: true, assignment: existing });
        }

        const { data: newAssign, error } = await supabase.from("whatsapp_chat_assignments")
          .insert({
            instance_id,
            chat_jid,
            colaborador_id,
            atribuido_por: atribuido_por ?? null,
            status: "active",
          }).select().single();
        if (error) return bad(error.message);

        // Auditoria
        await supabase.from("whatsapp_audit_log").insert({
          instance_id,
          colaborador_id: atribuido_por ?? colaborador_id,
          action_type: "assign",
          entity_type: "chat",
          entity_id: chat_jid,
          chat_jid,
          metadata: { assigned_to: colaborador_id },
        });

        return json({ success: true, assignment: newAssign });
      }

      case "release": {
        const { chat_jid } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        await supabase.from("whatsapp_chat_assignments")
          .update({ status: "released", liberado_em: new Date().toISOString() })
          .eq("instance_id", instance_id)
          .eq("chat_jid", chat_jid)
          .eq("status", "active");
        return json({ success: true });
      }

      case "transfer": {
        const { chat_jid, from_colaborador_id, to_colaborador_id, motivo } = body;
        if (!chat_jid || !to_colaborador_id) return bad("chat_jid e to_colaborador_id obrigatórios");

        // Libera o anterior
        await supabase.from("whatsapp_chat_assignments")
          .update({ status: "transferred", liberado_em: new Date().toISOString() })
          .eq("instance_id", instance_id)
          .eq("chat_jid", chat_jid)
          .eq("status", "active");

        // Cria novo
        const { data: newAssign } = await supabase.from("whatsapp_chat_assignments")
          .insert({
            instance_id,
            chat_jid,
            colaborador_id: to_colaborador_id,
            atribuido_por: from_colaborador_id,
            status: "active",
          }).select().single();

        // Auditoria
        await supabase.from("whatsapp_audit_log").insert({
          instance_id,
          colaborador_id: from_colaborador_id ?? to_colaborador_id,
          action_type: "transfer",
          entity_type: "chat",
          entity_id: chat_jid,
          chat_jid,
          metadata: { from: from_colaborador_id, to: to_colaborador_id, motivo },
        });

        return json({ success: true, assignment: newAssign });
      }

      case "get_current": {
        const { chat_jid } = body;
        if (!chat_jid) return bad("chat_jid obrigatório");
        const { data } = await supabase.from("whatsapp_chat_assignments")
          .select("*, profiles:colaborador_id(full_name)")
          .eq("instance_id", instance_id)
          .eq("chat_jid", chat_jid)
          .eq("status", "active")
          .maybeSingle();
        return json({ success: true, assignment: data ?? null });
      }

      case "list_by_attendant": {
        const { colaborador_id, only_active } = body;
        if (!colaborador_id) return bad("colaborador_id obrigatório");
        let q = supabase.from("whatsapp_chat_assignments")
          .select("*")
          .eq("instance_id", instance_id)
          .eq("colaborador_id", colaborador_id);
        if (only_active) q = q.eq("status", "active");
        const { data } = await q.order("atribuido_em", { ascending: false });
        return json({ success: true, assignments: data ?? [] });
      }

      case "sla_check": {
        const threshold = body.threshold_minutes ?? 30;
        const since = new Date(Date.now() - threshold * 60 * 1000).toISOString();

        // Busca conversas onde última mensagem foi recebida (in) há mais de X min
        // e não tem resposta (out) depois
        const { data: recentIn } = await supabase.from("whatsapp_messages")
          .select("instance_id, telefone, criado_em, associado_id")
          .eq("instance_id", instance_id)
          .eq("direction", "in")
          .lt("criado_em", since)
          .gt("criado_em", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order("criado_em", { ascending: false })
          .limit(500);

        const violations: any[] = [];
        for (const msg of (recentIn ?? [])) {
          // Checa se tem resposta posterior
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

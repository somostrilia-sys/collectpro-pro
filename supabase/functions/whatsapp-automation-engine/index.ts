// whatsapp-automation-engine — processa mensagens recebidas e dispara automações
//
// Chamado pelo webhook quando chega mensagem "in"
// Tipos de automação (whatsapp_automations.tipo):
//   - saudacao_inicial: primeira mensagem de um telefone novo
//   - fora_horario: mensagens fora de horário permitido
//   - keyword_reply: responde com base em palavras-chave
//   - keyword_label: aplica etiqueta quando detecta palavras
//   - follow_up: agenda mensagem de follow-up X horas depois
//
// Body: { message_id: string } (chamado fire-and-forget pelo webhook)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad, isGroupJid } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { message_id } = await req.json();
    if (!message_id) return bad("message_id obrigatório");

    // Busca mensagem + details
    const { data: msg } = await supabase.from("whatsapp_messages")
      .select("*, uazapi_details:whatsapp_uazapi_details(*)")
      .eq("id", message_id)
      .single();

    if (!msg) return bad("mensagem não encontrada", 404);
    if (msg.direction !== "in") return json({ success: true, skipped: "not_incoming" });

    const details = Array.isArray(msg.uazapi_details)
      ? msg.uazapi_details[0]
      : msg.uazapi_details;

    // Busca automações ativas da instância
    const { data: automations } = await supabase.from("whatsapp_automations")
      .select("*")
      .eq("instance_id", msg.instance_id)
      .eq("ativo", true)
      .order("prioridade", { ascending: false });

    if (!automations || automations.length === 0) {
      return json({ success: true, skipped: "no_automations" });
    }

    const chatJid = details?.chat_jid || `${msg.telefone}@s.whatsapp.net`;
    const body = (msg.body || "").toLowerCase();

    // Verifica se cliente fez opt-out (não automatiza pra quem pediu pra parar)
    const { data: optout } = await supabase.from("whatsapp_optouts")
      .select("id")
      .eq("instance_id", msg.instance_id)
      .eq("telefone", msg.telefone)
      .is("revogado_em", null)
      .maybeSingle();

    if (optout) {
      return json({ success: true, skipped: "optout_active" });
    }

    const results: any[] = [];

    for (const auto of automations) {
      try {
        const cfg = auto.config || {};

        // ─── SAUDAÇÃO INICIAL ───
        if (auto.tipo === "saudacao_inicial") {
          if (isGroupJid(chatJid)) continue; // só DM
          // Verifica se é primeira mensagem do telefone
          const { count } = await supabase.from("whatsapp_messages")
            .select("id", { count: "exact", head: true })
            .eq("instance_id", msg.instance_id)
            .eq("telefone", msg.telefone)
            .neq("id", msg.id);
          if (count === 0) {
            await sendAutoReply(supabase, msg.instance_id, chatJid, msg.telefone, cfg.mensagem || "Olá! Recebemos sua mensagem e um atendente vai responder em breve.");
            results.push({ automation: auto.nome, triggered: true, tipo: "saudacao" });
            await logRun(supabase, auto.id, chatJid, msg.telefone, message_id, "sent");
          }
        }

        // ─── FORA DE HORÁRIO ───
        else if (auto.tipo === "fora_horario") {
          const now = new Date();
          const hr = now.getHours();
          const dia = now.getDay(); // 0=dom, 6=sab
          const horaInicio = cfg.hora_inicio ?? 8;
          const horaFim = cfg.hora_fim ?? 20;
          const diasAtivos: number[] = cfg.dias_semana ?? [1, 2, 3, 4, 5]; // seg-sex por padrão
          const foraHora = hr < horaInicio || hr >= horaFim;
          const foraDia = !diasAtivos.includes(dia);
          if ((foraHora || foraDia) && !isGroupJid(chatJid)) {
            // Limita 1 resposta a cada 12h pra mesma pessoa
            const { data: recentReply } = await supabase.from("whatsapp_automation_runs")
              .select("id")
              .eq("automation_id", auto.id)
              .eq("chat_jid", chatJid)
              .gt("executado_em", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
              .limit(1);
            if (!recentReply || recentReply.length === 0) {
              await sendAutoReply(supabase, msg.instance_id, chatJid, msg.telefone, cfg.mensagem || "Estamos fora do horário de atendimento (seg-sex 8h-20h). Responderemos em breve!");
              results.push({ automation: auto.nome, triggered: true, tipo: "fora_horario" });
              await logRun(supabase, auto.id, chatJid, msg.telefone, message_id, "sent");
            }
          }
        }

        // ─── RESPOSTA POR PALAVRA-CHAVE ───
        else if (auto.tipo === "keyword_reply") {
          const keywords: string[] = (cfg.keywords || []).map((k: string) => k.toLowerCase());
          const matched = keywords.some((k) => body.includes(k));
          if (matched) {
            await sendAutoReply(supabase, msg.instance_id, chatJid, msg.telefone, cfg.mensagem || "");
            results.push({ automation: auto.nome, triggered: true, tipo: "keyword_reply" });
            await logRun(supabase, auto.id, chatJid, msg.telefone, message_id, "sent");
            if (cfg.stop_on_match) break; // para de processar outras automações
          }
        }

        // ─── APLICAR ETIQUETA POR PALAVRA-CHAVE ───
        else if (auto.tipo === "keyword_label") {
          const keywords: string[] = (cfg.keywords || []).map((k: string) => k.toLowerCase());
          const matched = keywords.some((k) => body.includes(k));
          if (matched && cfg.label_external_id) {
            // Busca labels atuais e adiciona o novo
            const { data: existing } = await supabase.from("whatsapp_chat_labels")
              .select("label_id, whatsapp_labels!inner(external_id)")
              .eq("instance_id", msg.instance_id)
              .eq("chat_jid", chatJid);

            const currentIds = (existing ?? [])
              .map((cl: any) => cl.whatsapp_labels?.external_id)
              .filter(Boolean);

            if (!currentIds.includes(cfg.label_external_id)) {
              // Aplica via edge de label
              await supabase.functions.invoke("whatsapp-label-action", {
                body: {
                  instance_id: msg.instance_id,
                  action: "apply_to_chat",
                  chat_jid: chatJid,
                  label_external_ids: [...currentIds, cfg.label_external_id],
                },
              });
              results.push({ automation: auto.nome, triggered: true, tipo: "label_applied" });
              await logRun(supabase, auto.id, chatJid, msg.telefone, message_id, "label_applied");
            }
          }
        }

        // ─── FOLLOW-UP AUTOMÁTICO ───
        else if (auto.tipo === "follow_up") {
          // Agenda mensagem pra ser enviada em X horas SE cliente não responder
          if (isGroupJid(chatJid)) continue;
          const hours = cfg.hours_delay ?? 24;
          const scheduleFor = new Date(Date.now() + hours * 60 * 60 * 1000);
          await supabase.from("whatsapp_scheduled_messages").insert({
            instance_id: msg.instance_id,
            chat_jid: chatJid,
            telefone: msg.telefone,
            associado_id: msg.associado_id,
            tipo: "text",
            payload: { texto: cfg.mensagem || "Ainda está com dúvidas? Posso ajudar?" },
            scheduled_for: scheduleFor.toISOString(),
            automation_id: auto.id,
            status: "pending",
          });
          results.push({ automation: auto.nome, triggered: true, scheduled_for: scheduleFor.toISOString() });
        }
      } catch (e: any) {
        results.push({ automation: auto.nome, error: e.message });
        await logRun(supabase, auto.id, chatJid, msg.telefone, message_id, "failed", e.message);
      }
    }

    return json({ success: true, results });
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────

async function sendAutoReply(
  supabase: any,
  instanceId: string,
  chatJid: string,
  telefone: string,
  texto: string,
) {
  // Chama whatsapp-send com skip_signature=true (é o bot falando)
  await supabase.functions.invoke("whatsapp-send", {
    body: {
      instance_id: instanceId,
      chat_jid: chatJid,
      telefone,
      texto,
      skip_signature: true,
    },
  });
}

async function logRun(
  supabase: any,
  automationId: string,
  chatJid: string,
  telefone: string,
  messageId: string,
  resultado: string,
  erro?: string,
) {
  await supabase.from("whatsapp_automation_runs").insert({
    automation_id: automationId,
    chat_jid: chatJid,
    telefone,
    message_id: messageId,
    resultado,
    erro: erro ?? null,
  }).catch(() => {});
}

// whatsapp-ai-agent — Camada 2 (IA Claude)
// Recebe { atendimento_id, instance_id, telefone, setor }
// 1) Busca config IA do setor (system_prompt, modelo, threshold)
// 2) Busca últimas N mensagens (contexto)
// 3) Chama Claude com contexto + system prompt
// 4) Parser: resposta + confiança + intencao + sentimento
// 5) Se confiança >= threshold: envia resposta e deixa em 'aguardando_cliente'
// 6) Se < threshold OU IA pede escalation: status='em_humano', fica na fila do setor

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { atendimento_id, instance_id, telefone, setor } = await req.json();

    // Config IA do setor
    const { data: cfg } = await supa.from("whatsapp_ia_config")
      .select("*").eq("setor", setor).maybeSingle();
    if (!cfg?.ativo) {
      return new Response(JSON.stringify({ ok: false, error: "IA desligada pro setor" }), { status: 403, headers: cors });
    }

    // Contexto: últimas N mensagens
    const { data: msgs } = await supa.from("whatsapp_messages")
      .select("direction, body, tipo, criado_em")
      .eq("instance_id", instance_id)
      .eq("telefone", telefone)
      .order("criado_em", { ascending: false })
      .limit(cfg.contexto_msgs || 6);

    const historico = (msgs || []).reverse()
      .map((m: any) => `${m.direction === "in" ? "Cliente" : "Atendente"}: ${m.body ?? `[${m.tipo}]`}`)
      .join("\n");

    // Chamar Claude API
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "ANTHROPIC_API_KEY ausente" }), { status: 500, headers: cors });
    }

    const systemPrompt = `${cfg.system_prompt}

IMPORTANTE — responda SEMPRE no formato JSON:
{
  "resposta": "texto pro cliente (ou null se não souber responder)",
  "confianca": 0.0 a 1.0,
  "intencao": "boleto|sinistro|rastreador|cadastro|cancelamento|reclamacao|duvida|outro",
  "sentimento": "positivo|neutro|irritado|desesperado",
  "escalar_humano": true/false,
  "motivo_escalation": "texto breve se escalar_humano=true"
}

Critério pra escalar_humano=true:
- Cliente irritado + problema não resolvível em 1 mensagem
- Pede explicitamente ("quero falar com pessoa")
- Caso fora do seu escopo definido`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.modelo || "claude-haiku-4-5-20251001",
        max_tokens: cfg.max_tokens || 600,
        temperature: Number(cfg.temperature ?? 0.4),
        system: systemPrompt,
        messages: [
          { role: "user", content: `Histórico da conversa:\n\n${historico}\n\nResponda em JSON conforme instrução.` },
        ],
      }),
    });
    const claudeData = await claudeRes.json();
    const text = claudeData?.content?.[0]?.text || "";

    // Parse JSON da resposta
    let parsed: any = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch { parsed = null; }

    if (!parsed) {
      // Fallback: escala pra humano
      await supa.from("whatsapp_atendimentos").update({
        status: "em_humano",
        fallback_motivo: "IA retornou formato inválido",
        ai_last_run: new Date().toISOString(),
        ai_runs_count: (cfg.ai_runs_count ?? 0) + 1,
      }).eq("id", atendimento_id);
      return new Response(JSON.stringify({ ok: true, fallback: "invalid_json" }), { headers: cors });
    }

    const confianca = Number(parsed.confianca ?? 0);
    const escalar = parsed.escalar_humano === true || confianca < Number(cfg.fallback_humano_threshold ?? 0.6);

    // Update contexto IA
    await supa.from("whatsapp_atendimentos").update({
      ai_context: { ultima: parsed, turns: (cfg.ai_runs_count ?? 0) + 1 },
      ai_last_run: new Date().toISOString(),
      ai_runs_count: (cfg.ai_runs_count ?? 0) + 1,
      intencao: parsed.intencao,
      sentimento: parsed.sentimento,
    }).eq("id", atendimento_id);

    if (escalar) {
      await supa.from("whatsapp_atendimentos").update({
        status: "em_humano",
        fallback_motivo: parsed.motivo_escalation ?? `IA confiança ${confianca.toFixed(2)} < threshold`,
      }).eq("id", atendimento_id);
      // Log handoff
      await supa.from("whatsapp_handoffs").insert({
        atendimento_id,
        tipo: "ia_to_humano",
        motivo: parsed.motivo_escalation ?? `Confiança baixa (${confianca.toFixed(2)})`,
        contexto: parsed,
      });
      return new Response(JSON.stringify({ ok: true, escalation: true, parsed }), { headers: cors });
    }

    // Envia resposta IA
    if (parsed.resposta && cfg.auto_responder) {
      await supa.functions.invoke("whatsapp-send", {
        body: {
          instance_id, telefone,
          texto: parsed.resposta,
          skip_signature: true,
        },
      });
      await supa.from("whatsapp_atendimentos").update({
        status: "aguardando_cliente",
      }).eq("id", atendimento_id);
    }

    return new Response(JSON.stringify({ ok: true, parsed }), { headers: cors });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: cors });
  }
});

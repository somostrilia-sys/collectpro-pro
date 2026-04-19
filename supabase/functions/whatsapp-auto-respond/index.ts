// whatsapp-auto-respond — Camada 1 (Auto)
// Recebe { atendimento_id, instance_id, telefone, body, setor, message_id }
// Matcha keywords de whatsapp_automacoes → age:
//   - 'resposta_texto': envia texto
//   - 'template': envia template Meta
//   - 'transferir_setor': muda setor do atendimento
//   - 'acionar_ia': dispara whatsapp-ai-agent
//   - 'encerrar': resolve atendimento
//
// Se não matcha nenhuma automação E config IA do setor estiver ativa:
// dispara ai-agent automaticamente.

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
    const { atendimento_id, instance_id, telefone, body, setor, message_id } = await req.json();
    if (!atendimento_id || !body) {
      return new Response(JSON.stringify({ ok: false, error: "missing args" }), { status: 400, headers: cors });
    }

    const textoLower = String(body).toLowerCase();

    // 1) Buscar automações aplicáveis (setor atual + 'geral'), ordenadas por prioridade
    const { data: autos } = await supa.from("whatsapp_automacoes")
      .select("*")
      .eq("ativo", true)
      .in("setor", [setor, "geral"])
      .order("prioridade", { ascending: false });

    let matched: any = null;
    for (const a of autos || []) {
      const kws: string[] = a.keywords || [];
      if (kws.some((k: string) => textoLower.includes(String(k).toLowerCase()))) {
        matched = a;
        break;
      }
    }

    if (matched) {
      // Agir conforme tipo
      if (matched.tipo === "resposta_texto" && matched.resposta_texto) {
        await supa.functions.invoke("whatsapp-send", {
          body: { instance_id, telefone, texto: matched.resposta_texto, skip_signature: true },
        });
      } else if (matched.tipo === "template" && matched.template_id) {
        await supa.functions.invoke("whatsapp-send", {
          body: { instance_id, telefone, template_id: matched.template_id, skip_signature: true },
        });
      } else if (matched.tipo === "transferir_setor" && matched.setor_destino) {
        const { data: prev } = await supa.from("whatsapp_atendimentos")
          .select("setor").eq("id", atendimento_id).single();
        await supa.from("whatsapp_atendimentos").update({
          setor: matched.setor_destino,
          status: "aberto",
        }).eq("id", atendimento_id);
        await supa.from("whatsapp_handoffs").insert({
          atendimento_id,
          tipo: "setor_to_setor",
          de_setor: prev?.setor,
          para_setor: matched.setor_destino,
          motivo: `Auto-roteamento: ${matched.nome}`,
        });
      } else if (matched.tipo === "acionar_ia") {
        await triggerAI(supa, atendimento_id, instance_id, telefone, setor);
      } else if (matched.tipo === "encerrar") {
        await supa.from("whatsapp_atendimentos").update({
          status: "resolvido",
          resolvido_em: new Date().toISOString(),
        }).eq("id", atendimento_id);
      }
      return new Response(JSON.stringify({ ok: true, matched: matched.nome, tipo: matched.tipo }), { headers: cors });
    }

    // 2) Sem match → checa config IA do setor
    const { data: iaCfg } = await supa.from("whatsapp_ia_config")
      .select("*").eq("setor", setor).maybeSingle();

    if (iaCfg?.ativo && iaCfg.auto_responder) {
      await triggerAI(supa, atendimento_id, instance_id, telefone, setor);
      return new Response(JSON.stringify({ ok: true, acionou_ia: true }), { headers: cors });
    }

    // 3) Sem match e IA off → fica aguardando humano na fila
    return new Response(JSON.stringify({ ok: true, aguardando_humano: true }), { headers: cors });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: cors });
  }
});

async function triggerAI(supa: any, atendimento_id: string, instance_id: string, telefone: string, setor: string) {
  await supa.from("whatsapp_atendimentos").update({ status: "em_ia" }).eq("id", atendimento_id);
  await supa.functions.invoke("whatsapp-ai-agent", {
    body: { atendimento_id, instance_id, telefone, setor },
  });
}

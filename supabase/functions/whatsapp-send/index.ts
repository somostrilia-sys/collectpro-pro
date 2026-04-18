// whatsapp-send — entrada única de disparo (uazapi + meta)
// Body: {
//   telefone?: string,
//   associado_id?: string,
//   boleto_id?: string,
//   instance_id?: string,       // se omitido, usa central default (ou do colaborador logado)
//   template_id?: string,       // OU texto livre
//   texto?: string,
//   variaveis?: Record<string, any>,
//   media?: { type, url, caption }
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, json, bad,
  normalizePhone, renderTemplate,
  uazapiSend, metaSendMessage,
} from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    let telefone = normalizePhone(body.telefone || "");
    const associadoId = body.associado_id ?? null;
    const boletoId = body.boleto_id ?? null;
    let instanceId = body.instance_id ?? null;
    const templateId = body.template_id ?? null;
    const variaveis = body.variaveis || {};
    const media = body.media ?? null;

    // Resolve associado se telefone não veio
    let associadoNome = variaveis.nome;
    if (!telefone && associadoId) {
      const { data: assoc } = await supabase
        .from("associados")
        .select("nome, telefone")
        .eq("id", associadoId).maybeSingle();
      if (assoc) {
        telefone = normalizePhone(assoc.telefone || "");
        associadoNome = associadoNome || assoc.nome?.split(" ")[0];
      }
    }
    if (!telefone) return bad("telefone ou associado_id com telefone válido obrigatório");

    // Resolve instance
    let instance: any = null;
    if (instanceId) {
      const { data } = await supabase.from("whatsapp_instances")
        .select("*").eq("id", instanceId).maybeSingle();
      instance = data;
    }
    if (!instance) {
      const { data } = await supabase.from("whatsapp_instances")
        .select("*")
        .eq("tipo", "central")
        .eq("is_default_central", true)
        .eq("ativo", true)
        .maybeSingle();
      instance = data;
    }
    if (!instance) return bad("Nenhuma instância WhatsApp disponível");
    if (instance.status !== "connected" && instance.tipo !== "meta_oficial") {
      return bad(`Instância ${instance.nome} desconectada (status: ${instance.status})`, 409);
    }

    // Resolve conteúdo
    let textoFinal: string | undefined = body.texto;
    let template: any = null;
    if (templateId) {
      const { data } = await supabase.from("whatsapp_templates")
        .select("*").eq("id", templateId).maybeSingle();
      template = data;
      if (template?.conteudo_texto) {
        textoFinal = renderTemplate(template.conteudo_texto, { nome: associadoNome, ...variaveis });
      }
    }

    // Dispatch
    let externalId: string | null = null;
    let statusEnvio: string = "failed";
    let errorMsg: string | null = null;
    let rawResp: any = null;

    if (instance.tipo === "meta_oficial") {
      // Meta: usa template aprovado
      const cfg = instance.meta_config || {};
      const payload: any = {
        messaging_product: "whatsapp",
        to: telefone,
      };
      if (template?.meta_template_name) {
        payload.type = "template";
        payload.template = {
          name: template.meta_template_name,
          language: { code: template.meta_language || "pt_BR" },
          components: template.componentes || [
            {
              type: "body",
              parameters: (template.variaveis || []).map((v: string) => ({
                type: "text",
                text: String(variaveis[v] ?? ""),
              })),
            },
          ],
        };
      } else {
        payload.type = "text";
        payload.text = { body: textoFinal || "" };
      }
      const r = await metaSendMessage(cfg, payload);
      rawResp = r.data;
      if (r.ok) {
        statusEnvio = "sent";
        externalId = r.data?.messages?.[0]?.id ?? null;
      } else {
        errorMsg = r.data?.error?.message || `HTTP ${r.status}`;
      }
    } else {
      // uazapi
      if (!instance.token) {
        errorMsg = "Instância sem token uazapi (conecte primeiro)";
      } else {
        const payload: any = { number: telefone };
        if (media) payload.media = media;
        else payload.text = textoFinal || "";
        const r = await uazapiSend(instance.token, payload);
        rawResp = r.data;
        if (r.ok) {
          statusEnvio = "sent";
          externalId = r.data?.id ?? r.data?.messageId ?? r.data?.key?.id ?? null;
        } else {
          errorMsg = r.data?.error || r.data?.message || `HTTP ${r.status}`;
        }
      }
    }

    // Log em whatsapp_messages
    const { data: msg } = await supabase.from("whatsapp_messages").insert({
      instance_id: instance.id,
      direction: "out",
      status: statusEnvio,
      telefone,
      associado_id: associadoId,
      boleto_id: boletoId,
      template_id: template?.id ?? null,
      tipo: media ? media.type : (template?.meta_template_name ? "template" : "text"),
      body: textoFinal,
      media_url: media?.url,
      external_id: externalId,
      error: errorMsg,
      raw: rawResp,
      enviado_em: statusEnvio === "sent" ? new Date().toISOString() : null,
    }).select().single();

    return json({
      success: statusEnvio === "sent",
      message_id: msg?.id,
      external_id: externalId,
      status: statusEnvio,
      error: errorMsg,
    }, statusEnvio === "sent" ? 200 : 502);
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

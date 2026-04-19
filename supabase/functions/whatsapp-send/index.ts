// whatsapp-send — entrada única de disparo (uazapi + meta)
//
// UAZAPI: envia com assinatura automática do atendente logado
// Meta: branch preservada intacta (não mexer)
//
// Body: {
//   telefone?: string,                // DM: número; Grupo: pode passar chat_jid
//   chat_jid?: string,                // JID completo (grupo ou DM)
//   associado_id?: string,
//   boleto_id?: string,
//   instance_id?: string,             // se omitido: central default (legacy) OU instância do colaborador
//   colaborador_id?: string,          // auto (do AuthContext no frontend)
//   template_id?: string,             // OU texto livre
//   texto?: string,
//   variaveis?: Record<string, any>,
//   media?: { type, url, caption },
//   contact?: { name, phone, vcard? },
//   location?: { latitude, longitude, name?, address? },
//   menu?: { type: "button"|"list"|"poll", ... },
//   carousel?: { items: [{ image, title, buttons[] }] },
//   pix?: { chave, valor, nome, descricao? },
//   payment?: { valor, descricao, referencia? },
//   status?: { tipo: "text"|"image"|"video", conteudo, ... },
//   sticker?: { url },
//   quoted?: { external_id },         // responder/citar
//   reply_to_external_id?: string,
//   skip_signature?: boolean          // só pra testes/admin
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, json, bad,
  normalizePhone, renderTemplate,
  isGroupJid, jidToPhone,
  metaSendMessage,
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
    const chatJid: string | null = body.chat_jid ?? null;
    const associadoId = body.associado_id ?? null;
    const boletoId = body.boleto_id ?? null;
    let instanceId = body.instance_id ?? null;
    let colaboradorId = body.colaborador_id ?? null;
    const templateId = body.template_id ?? null;
    const variaveis = body.variaveis || {};
    const media = body.media ?? null;
    const contact = body.contact ?? null;
    const location = body.location ?? null;
    const menu = body.menu ?? null;
    const carousel = body.carousel ?? null;
    const pix = body.pix ?? null;
    const payment = body.payment ?? null;
    const statusPost = body.status ?? null;
    const sticker = body.sticker ?? null;
    const quotedExternalId: string | null = body.quoted?.external_id ?? body.reply_to_external_id ?? null;
    const skipSignature = body.skip_signature === true;

    // Resolver telefone a partir de chat_jid
    if (!telefone && chatJid) {
      telefone = isGroupJid(chatJid) ? jidToPhone(chatJid) : jidToPhone(chatJid);
    }

    // Resolve associado se telefone não veio
    let associadoNome = variaveis.nome;
    if (!telefone && associadoId) {
      const { data: assoc } = await supabase.from("associados")
        .select("nome, whatsapp, telefone")
        .eq("id", associadoId).maybeSingle();
      if (assoc) {
        telefone = normalizePhone(assoc.whatsapp || assoc.telefone || "");
        associadoNome = associadoNome || assoc.nome?.split(" ")[0];
      }
    }
    if (!telefone && !chatJid) return bad("telefone, chat_jid ou associado_id obrigatório");

    // Resolve instance
    let instance: any = null;
    if (instanceId) {
      const { data } = await supabase.from("whatsapp_instances")
        .select("*").eq("id", instanceId).maybeSingle();
      instance = data;
    }
    // Se tem colaborador_id, tenta achar instância dele
    if (!instance && colaboradorId) {
      const { data } = await supabase.from("whatsapp_instances")
        .select("*")
        .eq("colaborador_id", colaboradorId)
        .eq("ativo", true)
        .eq("tipo", "colaborador")
        .maybeSingle();
      instance = data;
    }
    // Fallback legacy: central default
    if (!instance) {
      const { data } = await supabase.from("whatsapp_instances")
        .select("*")
        .eq("is_default_central", true)
        .eq("ativo", true)
        .maybeSingle();
      instance = data;
    }
    if (!instance) return bad("Nenhuma instância WhatsApp disponível");
    if (instance.status !== "connected" && instance.tipo !== "meta_oficial") {
      return bad(`Instância ${instance.nome} desconectada (status: ${instance.status})`, 409);
    }

    // Resolve conteúdo/template
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

    // ═══ DISPATCH POR PROVIDER ═══
    let externalId: string | null = null;
    let statusEnvio = "failed";
    let errorMsg: string | null = null;
    let rawResp: any = null;
    let finalBody = textoFinal; // body salvo no banco (sem prefix)
    let tipoMsg = "text";
    let colaboradorNomeSnap: string | null = null;

    // ╔══════════════════════════════════════════════════════════════╗
    // ║ META OFICIAL — BRANCH PRESERVADA (não alterar)              ║
    // ╚══════════════════════════════════════════════════════════════╝
    if (instance.tipo === "meta_oficial") {
      const cfg = instance.meta_config || {};
      const payload: any = { messaging_product: "whatsapp", to: telefone };
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
      tipoMsg = media ? media.type : (template?.meta_template_name ? "template" : "text");
    }
    // ╔══════════════════════════════════════════════════════════════╗
    // ║ UAZAPI — COM ASSINATURA AUTOMÁTICA DO ATENDENTE              ║
    // ╚══════════════════════════════════════════════════════════════╝
    else {
      if (!instance.token) {
        errorMsg = "Instância UAZAPI sem token (conecte primeiro)";
      } else {
        // ═══ Assinatura automática ═══
        let textoComAssinatura = textoFinal || "";
        if (!skipSignature) {
          if (!colaboradorId) colaboradorId = instance.colaborador_id ?? null;
          if (colaboradorId) {
            const { data: colab } = await supabase.from("profiles")
              .select("full_name").eq("id", colaboradorId).maybeSingle();
            if (colab?.full_name) {
              colaboradorNomeSnap = colab.full_name;
              if (textoComAssinatura) {
                textoComAssinatura = `*${colab.full_name}:*\n\n${textoComAssinatura}`;
              }
            }
          }
        }

        // Destino UAZAPI aceita número (DM) ou JID completo (grupo)
        const number = chatJid || telefone;
        const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
        const token = instance.token;

        // ═══ Roteamento por tipo ═══
        let endpoint = "/send/text";
        let payload: Record<string, any> = { number };

        if (media) {
          endpoint = "/send/media";
          payload.type = media.type; // image, video, audio, document
          payload.file = media.url;
          let caption = media.caption ?? "";
          if (!skipSignature && colaboradorNomeSnap && caption) {
            caption = `*${colaboradorNomeSnap}:*\n\n${caption}`;
          }
          payload.text = caption;
          tipoMsg = media.type;
        } else if (contact) {
          endpoint = "/send/contact";
          payload = {
            number,
            phone: contact.phone,
            fullName: contact.name,
            vcard: contact.vcard,
          };
          tipoMsg = "contact";
        } else if (location) {
          endpoint = "/send/location";
          payload = {
            number,
            latitude: location.latitude,
            longitude: location.longitude,
            name: location.name,
            address: location.address,
          };
          tipoMsg = "location";
        } else if (sticker) {
          endpoint = "/send/media";
          payload = { number, type: "sticker", file: sticker.url };
          tipoMsg = "sticker";
        } else if (menu) {
          endpoint = "/send/menu";
          payload = { number, ...menu };
          if (!skipSignature && colaboradorNomeSnap && payload.text) {
            payload.text = `*${colaboradorNomeSnap}:*\n\n${payload.text}`;
          }
          tipoMsg = "menu";
        } else if (carousel) {
          endpoint = "/send/carousel";
          payload = { number, ...carousel };
          tipoMsg = "carousel";
        } else if (pix) {
          endpoint = "/send/pix-button";
          payload = {
            number,
            pixKey: pix.chave,
            amount: pix.valor,
            name: pix.nome,
            description: pix.descricao,
          };
          tipoMsg = "pix";
        } else if (payment) {
          endpoint = "/send/request-payment";
          payload = {
            number,
            amount: payment.valor,
            description: payment.descricao,
            reference: payment.referencia,
          };
          tipoMsg = "payment";
        } else if (statusPost) {
          endpoint = "/send/status";
          payload = { ...statusPost };
          tipoMsg = "status";
        } else {
          // Texto
          payload.text = textoComAssinatura;
          tipoMsg = "text";
        }

        // Quoted message (responder)
        if (quotedExternalId) {
          payload.replyid = quotedExternalId;
        }

        // Chamada real à UAZAPI
        const started = Date.now();
        const res = await fetch(`${serverUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        rawResp = data;
        const durationMs = Date.now() - started;

        if (res.ok) {
          statusEnvio = "sent";
          externalId = data?.id ?? data?.messageId ?? data?.messageid
            ?? data?.key?.id ?? data?.message?.id ?? null;
        } else {
          errorMsg = data?.error || data?.message || `HTTP ${res.status}`;
        }

        // Log em whatsapp_send_attempts (observabilidade)
        await supabase.from("whatsapp_send_attempts").insert({
          instance_id: instance.id,
          colaborador_id: colaboradorId,
          endpoint,
          request_payload: payload,
          response_payload: data,
          status_code: res.status,
          sucesso: res.ok,
          erro: errorMsg,
          duration_ms: durationMs,
        });
      }
    }

    // ═══ Log em whatsapp_messages ═══
    // IMPORTANTE: body no banco guarda texto SEM prefix (a UI mostra limpo)
    const { data: msg } = await supabase.from("whatsapp_messages").insert({
      instance_id: instance.id,
      direction: "out",
      status: statusEnvio,
      telefone: telefone || jidToPhone(chatJid || ""),
      associado_id: associadoId,
      boleto_id: boletoId,
      colaborador_id: colaboradorId,
      colaborador_nome_snap: colaboradorNomeSnap,
      template_id: template?.id ?? null,
      tipo: tipoMsg,
      body: finalBody ?? null,
      media_url: media?.url ?? null,
      media_mime: null,
      external_id: externalId,
      message_external_id: externalId,
      reply_to_external_id: quotedExternalId,
      error: errorMsg,
      raw: rawResp,
      provider_tipo: instance.tipo === "meta_oficial" ? "meta" : "uazapi",
      enviado_em: statusEnvio === "sent" ? new Date().toISOString() : null,
    }).select().single();

    // ═══ UAZAPI: criar extensão uazapi_details ═══
    if (msg && instance.tipo !== "meta_oficial") {
      const resolvedJid = chatJid
        || (telefone ? `${telefone}@s.whatsapp.net` : null);
      if (resolvedJid) {
        await supabase.from("whatsapp_uazapi_details").insert({
          message_id: msg.id,
          is_group: isGroupJid(resolvedJid),
          chat_jid: resolvedJid,
          sender_jid: null,
          sender_name: colaboradorNomeSnap,
          quoted_external_id: quotedExternalId,
          file_url: media?.url ?? sticker?.url ?? null,
          message_type: tipoMsg,
          from_me: true,
          was_sent_by_api: true,
        }).then(() => {}).catch(() => {});
      }
    }

    return json({
      success: statusEnvio === "sent",
      message_id: msg?.id,
      external_id: externalId,
      status: statusEnvio,
      error: errorMsg,
      signed_as: colaboradorNomeSnap,
    }, statusEnvio === "sent" ? 200 : 502);
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

// whatsapp-send — dispatcher universal (UAZAPI + Meta)
//
// Assinatura de atendente (*Nome:*) aplicada ANTES do fork por provider.
// Meta: valida assignment lock + CSW (24h) + roteia por tipo de mensagem.
// UAZAPI: envio por endpoints UAZAPI (texto/media/contact/location/menu/carousel/pix/payment).
//
// Body: {
//   telefone?, chat_jid?, associado_id?, boleto_id?,
//   instance_id?,                     // default: central (is_default_central)
//   colaborador_id?,
//   template_id?, texto?, variaveis?,
//   media?:    { type, url, caption? },
//   contact?:  { name, phone, organization?, email?, url? },
//   location?: { latitude, longitude, name?, address? },
//   menu?:     { ... } (UAZAPI)
//   carousel?: { ... } (UAZAPI)
//   pix?:      { tipo, chave, nome }  (UAZAPI)
//   payment?:  { ... }                (UAZAPI)
//   sticker?:  { url }                (UAZAPI)
//   interactive?: {                   (META)
//     type: "button"|"list"|"cta_url"|"flow",
//     body: string, header?, footer?,
//     buttons?: [{id, title}],        // button
//     sections?: [...],               // list
//     cta?: {text, url},              // cta_url
//     flow?: {flow_id, flow_token, flow_cta, ...}
//   },
//   reaction?: { to_message_wamid, emoji }  (META)
//   quoted?: { external_id }, reply_to_external_id?,
//   skip_signature?: boolean
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, json, bad,
  normalizePhone, renderTemplate,
  isGroupJid, jidToPhone,
  resolveSignature, applySignature,
  checkOptoutOrBlock, checkMetaAssignment,
} from "../_shared/whatsapp.ts";
import * as meta from "../_shared/providers/meta.ts";

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
    const sticker = body.sticker ?? null;
    const interactive = body.interactive ?? null;  // META
    const reaction = body.reaction ?? null;        // META
    const quotedExternalId: string | null = body.quoted?.external_id ?? body.reply_to_external_id ?? null;
    const skipSignature = body.skip_signature === true;

    // Resolver telefone a partir de chat_jid
    if (!telefone && chatJid) {
      telefone = jidToPhone(chatJid);
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
    if (!instance && colaboradorId) {
      const { data } = await supabase.from("whatsapp_instances")
        .select("*")
        .eq("colaborador_id", colaboradorId)
        .eq("ativo", true)
        .eq("tipo", "colaborador")
        .maybeSingle();
      instance = data;
    }
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

    // LGPD: check de optout/blocks (universal Meta + UAZAPI, ignora grupos)
    if (!isGroupJid(chatJid || "") && telefone) {
      const check = await checkOptoutOrBlock(supabase, instance.id, telefone);
      if (check.blocked) {
        return bad(`Número ${telefone}: ${check.reason}`, 409);
      }
    }

    // Assignment lock — aplica apenas a Meta (UAZAPI cada atendente tem sua instância)
    if (instance.tipo === "meta_oficial" && telefone) {
      const lock = await checkMetaAssignment(supabase, instance.id, telefone, colaboradorId);
      if (!lock.allowed) {
        return bad(lock.reason ?? "Sem permissão pra essa conversa", 403);
      }
    }

    // Resolve template local (compartilhado)
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

    // ═══ ASSINATURA UNIVERSAL (antes do fork por provider) ═══
    if (!colaboradorId && instance.tipo !== "meta_oficial") {
      // UAZAPI fallback: se não recebeu colaborador, usa dono da instância
      colaboradorId = instance.colaborador_id ?? null;
    }
    const signature = await resolveSignature(supabase, colaboradorId, skipSignature);
    const colaboradorNomeSnap = signature.name;
    const sigPrefix = signature.prefix;

    // Estado do envio
    let externalId: string | null = null;
    let statusEnvio = "failed";
    let errorMsg: string | null = null;
    let errorCode: number | null = null;
    let rawResp: any = null;
    const finalBody = textoFinal;  // body gravado no banco (sem prefix — UI mostra limpo)
    let tipoMsg = "text";
    let metaPricing: any = null;   // preenchido no webhook statuses depois

    // ╔══════════════════════════════════════════════════════════════╗
    // ║ META OFICIAL — branch completa                               ║
    // ╚══════════════════════════════════════════════════════════════╝
    if (instance.tipo === "meta_oficial") {
      const cfg = (instance.meta_config || {}) as meta.MetaConfig;
      const to = telefone;

      // Check CSW (janela 24h) — só relevante pra mensagens não-template
      const { data: metaConv } = await supabase.from("whatsapp_meta_conversations")
        .select("csw_expires_at, is_free_entry, free_entry_expires_at")
        .eq("instance_id", instance.id)
        .eq("telefone", telefone)
        .maybeSingle();

      const now = new Date();
      const cswOpen = metaConv?.csw_expires_at && new Date(metaConv.csw_expires_at) > now;
      const fepOpen = metaConv?.is_free_entry && metaConv?.free_entry_expires_at
        && new Date(metaConv.free_entry_expires_at) > now;
      const windowOpen = cswOpen || fepOpen;

      // Cliente Meta: se template, sempre permite. Se não-template e janela fechada, precisa usar template.
      const isTemplate = !!(template?.meta_template_name);
      if (!isTemplate && !windowOpen && !reaction) {
        return bad(
          "Janela de 24h fechada. Envie um template aprovado pra reabrir a conversa.",
          409,
        );
      }

      let r: meta.MetaResult;
      const opts = { contextWamid: quotedExternalId ?? undefined };

      if (reaction) {
        tipoMsg = "reaction";
        r = await meta.metaSendReaction(cfg, to, reaction.to_message_wamid, reaction.emoji);
      } else if (isTemplate) {
        tipoMsg = "template";
        // Template: injetar atendente se houver var {{atendente}}
        let components = template.componentes || [];
        if (!components.length) {
          components = [
            {
              type: "body",
              parameters: (template.variaveis || []).map((v: string) => ({
                type: "text",
                text: String(
                  v === "atendente" && colaboradorNomeSnap
                    ? colaboradorNomeSnap
                    : (variaveis[v] ?? ""),
                ),
              })),
            },
          ];
        }
        r = await meta.metaSendTemplate(
          cfg, to, template.meta_template_name, template.meta_language || "pt_BR", components,
        );
      } else if (media) {
        tipoMsg = media.type;
        const caption = media.caption ? applySignature(media.caption, sigPrefix) : undefined;
        r = await meta.metaSendMedia(cfg, to, media.type, {
          link: media.url, caption, filename: media.filename,
        }, opts);
      } else if (location) {
        tipoMsg = "location";
        r = await meta.metaSendLocation(cfg, to, {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          address: location.address,
        }, opts);
      } else if (contact) {
        tipoMsg = "contact";
        r = await meta.metaSendContacts(cfg, to, [{
          name: { formatted_name: contact.name, first_name: contact.name },
          phones: [{ phone: contact.phone, type: "CELL" }],
          ...(contact.email ? { emails: [{ email: contact.email, type: "WORK" }] } : {}),
          ...(contact.organization ? { org: { company: contact.organization } } : {}),
          ...(contact.url ? { urls: [{ url: contact.url }] } : {}),
        }], opts);
      } else if (interactive) {
        tipoMsg = "interactive";
        const header = interactive.header ? { type: "text" as const, value: interactive.header } : undefined;
        const bodyWithSig = applySignature(interactive.body, sigPrefix);

        if (interactive.type === "button") {
          r = await meta.metaSendInteractiveButton(cfg, to, bodyWithSig, interactive.buttons ?? [], {
            header, footer: interactive.footer, contextWamid: opts.contextWamid,
          });
        } else if (interactive.type === "list") {
          r = await meta.metaSendInteractiveList(cfg, to, bodyWithSig,
            interactive.button_text ?? "Ver opções",
            interactive.sections ?? [],
            {
              header: typeof header?.value === "string" ? (header.value as string) : undefined,
              footer: interactive.footer, contextWamid: opts.contextWamid,
            });
        } else if (interactive.type === "cta_url") {
          r = await meta.metaSendInteractiveCtaUrl(cfg, to, bodyWithSig,
            { text: interactive.cta?.text ?? "Abrir", url: interactive.cta?.url ?? "" },
            {
              header: typeof header?.value === "string" ? (header.value as string) : undefined,
              footer: interactive.footer, contextWamid: opts.contextWamid,
            });
        } else if (interactive.type === "flow" && interactive.flow) {
          r = await meta.metaSendFlow(cfg, to, bodyWithSig, interactive.flow, {
            header: typeof header?.value === "string" ? (header.value as string) : undefined,
            footer: interactive.footer, contextWamid: opts.contextWamid,
          });
        } else {
          return bad(`interactive.type inválido: ${interactive.type}`, 400);
        }
      } else {
        // Texto livre (só dentro da janela)
        tipoMsg = "text";
        const textoComSig = applySignature(textoFinal, sigPrefix);
        r = await meta.metaSendText(cfg, to, textoComSig, {
          previewUrl: body.preview_url === true,
          contextWamid: opts.contextWamid,
        });
      }

      rawResp = r.data;
      if (r.ok) {
        statusEnvio = "sent";
        externalId = r.data?.messages?.[0]?.id ?? null;
      } else {
        errorMsg = r.error || `HTTP ${r.status}`;
        errorCode = r.error_code ?? null;
      }

      // Log em whatsapp_send_attempts (observabilidade)
      await supabase.from("whatsapp_send_attempts").insert({
        instance_id: instance.id,
        colaborador_id: colaboradorId,
        endpoint: `meta:/${cfg.phone_number_id}/messages`,
        request_payload: { tipo: tipoMsg, to, provider: "meta" },
        response_payload: r.data,
        status_code: r.status,
        sucesso: r.ok,
        erro: errorMsg,
      }).then(() => {}).catch(() => {});

      // Tratamento automático de erros relevantes
      if (!r.ok && errorCode) {
        const classify = meta.classifyMetaError(errorCode);
        if (classify.kind === "optout") {
          // Marca opt-out automático
          await supabase.from("whatsapp_optouts").upsert({
            instance_id: instance.id,
            telefone,
            motivo: "meta_error_131050",
            palavra_detectada: "META_OPTOUT",
          }, { onConflict: "instance_id,telefone" }).then(() => {}).catch(() => {});
        }
      }
    }
    // ╔══════════════════════════════════════════════════════════════╗
    // ║ UAZAPI — envio com assinatura                                ║
    // ╚══════════════════════════════════════════════════════════════╝
    else {
      if (!instance.token) {
        errorMsg = "Instância UAZAPI sem token (conecte primeiro)";
      } else {
        const number = chatJid || telefone;
        const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
        const token = instance.token;

        let endpoint = "/send/text";
        let payload: Record<string, any> = { number };

        if (media) {
          endpoint = "/send/media";
          payload.type = media.type;
          payload.file = media.url;
          payload.text = applySignature(media.caption ?? "", sigPrefix);
          tipoMsg = media.type;
        } else if (contact) {
          endpoint = "/send/contact";
          payload = {
            number,
            fullName: contact.name,
            phoneNumber: contact.phone,
            organization: contact.organization,
            email: contact.email,
            url: contact.url,
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
          if (payload.text) payload.text = applySignature(payload.text, sigPrefix);
          tipoMsg = "menu";
        } else if (carousel) {
          endpoint = "/send/carousel";
          payload = { number, ...carousel };
          tipoMsg = "carousel";
        } else if (pix) {
          endpoint = "/send/pix-button";
          payload = {
            number,
            pixType: pix.tipo ?? "CPF",
            pixKey: pix.chave,
            pixName: pix.nome,
          };
          tipoMsg = "pix";
        } else if (payment) {
          endpoint = "/send/request-payment";
          payload = {
            number,
            amount: payment.valor,
            title: payment.titulo ?? payment.descricao ?? null,
            text: payment.texto ?? null,
            footer: payment.rodape ?? null,
            itemName: payment.item_nome ?? null,
            invoiceNumber: payment.referencia ?? payment.numero_fatura ?? null,
            pixKey: payment.pix_chave ?? null,
            pixType: payment.pix_tipo ?? null,
            pixName: payment.pix_nome ?? null,
            paymentLink: payment.link_pagamento ?? null,
            fileUrl: payment.arquivo_url ?? null,
            fileName: payment.arquivo_nome ?? null,
            boletoCode: payment.boleto_codigo ?? null,
          };
          tipoMsg = "payment";
        } else {
          payload.text = applySignature(textoFinal, sigPrefix);
          tipoMsg = "text";
        }

        if (quotedExternalId) payload.replyid = quotedExternalId;

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

    // ═══ Log em whatsapp_messages (ambos providers) ═══
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

    // ═══ Persistir detalhes provider-specific ═══
    if (msg && instance.tipo === "meta_oficial") {
      await supabase.from("whatsapp_meta_details").insert({
        message_id: msg.id,
        wamid: externalId,
        context_wamid: quotedExternalId,
        errors: errorMsg ? { code: errorCode, message: errorMsg } : null,
      }).then(() => {}).catch(() => {});
    } else if (msg && instance.tipo !== "meta_oficial") {
      const resolvedJid = chatJid || (telefone ? `${telefone}@s.whatsapp.net` : null);
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
      error_code: errorCode,
      signed_as: colaboradorNomeSnap,
      provider: instance.tipo === "meta_oficial" ? "meta" : "uazapi",
    }, statusEnvio === "sent" ? 200 : 502);
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

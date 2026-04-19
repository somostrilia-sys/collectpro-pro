// whatsapp-webhook-meta — Endpoint Meta Cloud API com roteamento por phone_number_id
//
// Suporta:
//   - 1 App Meta com N phone_numbers (Hub + sistemas externos via whatsapp_meta_routes)
//   - 13 event types: messages (12 subtipos), statuses, template_status/quality/category
//     updates, phone_number_quality/name updates, account_update/alerts/review_update,
//     business_capability_update, security, typing_indicator.
//
// GET: verificação via verify_token (instância meta_oficial ou rota).
// POST: processa eventos + valida HMAC via app_secret.
//
// Persistência:
//   - whatsapp_webhooks_raw (log bruto sempre)
//   - whatsapp_messages + whatsapp_meta_details (mensagens)
//   - whatsapp_meta_conversations (CSW 24h via trigger)
//   - whatsapp_meta_phone_quality_log (quality updates)
//   - whatsapp_meta_templates (template status)
//   - whatsapp_optouts (auto-detect via trigger já existente)
//
// Mídia: dispara cache SÍNCRONO (URL Meta expira em 5min).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, normalizePhone, verifyMetaSignature } from "../_shared/whatsapp.ts";
import * as meta from "../_shared/providers/meta.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [{ data: instances }, { data: routes }] = await Promise.all([
    supabase.from("whatsapp_instances").select("*").eq("tipo", "meta_oficial"),
    supabase.from("whatsapp_meta_routes").select("*").eq("ativo", true),
  ]);

  const instByPhoneId = new Map<string, any>();
  for (const i of instances || []) {
    const pid = i?.meta_config?.phone_number_id;
    if (pid) instByPhoneId.set(String(pid), i);
  }
  const instByWabaId = new Map<string, any>();
  for (const i of instances || []) {
    const wid = i?.meta_config?.waba_id;
    if (wid) instByWabaId.set(String(wid), i);
  }
  const routeByPhoneId = new Map<string, any>();
  for (const r of routes || []) {
    if (r.phone_number_id) routeByPhoneId.set(String(r.phone_number_id), r);
  }

  // ─── GET: verify ────────────────────────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token) {
      const matchInstance = (instances || []).find(
        (i: any) => i?.meta_config?.verify_token && i.meta_config.verify_token === token,
      );
      const matchRoute = (routes || []).find((r: any) => r.verify_token === token);
      if (matchInstance || matchRoute) {
        return new Response(challenge || "", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  // ─── POST: eventos ──────────────────────────────────────────────────
  const raw = await req.text();
  let payload: any = {};
  try { payload = JSON.parse(raw); } catch {}

  // Identifica phone_number_id ou waba_id
  const firstEntry = payload?.entry?.[0] ?? {};
  const firstChange = firstEntry?.changes?.[0] ?? {};
  const field = firstChange?.field ?? "unknown";
  const value = firstChange?.value ?? {};
  const phoneNumberId = String(value?.metadata?.phone_number_id ?? "");
  const wabaId = String(firstEntry?.id ?? "");

  const matchedInstance =
    (phoneNumberId && instByPhoneId.get(phoneNumberId)) ||
    (wabaId && instByWabaId.get(wabaId)) ||
    null;
  const matchedRoute = phoneNumberId ? routeByPhoneId.get(phoneNumberId) : null;

  // Validação HMAC
  const headerSig = req.headers.get("x-hub-signature-256");
  const appSecret = matchedInstance?.meta_config?.app_secret ?? matchedRoute?.app_secret ?? null;
  if (appSecret) {
    const ok = await verifyMetaSignature(appSecret, raw, headerSig);
    if (!ok) {
      await supabase.from("whatsapp_webhooks_raw").insert({
        provider_tipo: "meta",
        event_type: "signature_invalid",
        payload,
        erro: `HMAC inválido (phone_number_id=${phoneNumberId}, waba_id=${wabaId})`,
      });
      return new Response("invalid signature", { status: 401, headers: corsHeaders });
    }
  }

  // Log bruto
  const { data: rawRow } = await supabase.from("whatsapp_webhooks_raw").insert({
    provider_tipo: "meta",
    event_type: field,
    payload,
  }).select().single();

  // Proxy reverso pra sistemas externos
  if (!matchedInstance && matchedRoute?.forward_url) {
    try {
      const headersOut: Record<string, string> = { "Content-Type": "application/json" };
      if (headerSig) headersOut["x-hub-signature-256"] = headerSig;
      if (matchedRoute.forward_headers && typeof matchedRoute.forward_headers === "object") {
        for (const [k, v] of Object.entries(matchedRoute.forward_headers)) {
          headersOut[k] = String(v);
        }
      }
      const fwd = await fetch(matchedRoute.forward_url, {
        method: "POST", headers: headersOut, body: raw,
      });
      return new Response(await fwd.text(), {
        status: fwd.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      await supabase.from("whatsapp_webhooks_raw").insert({
        provider_tipo: "meta",
        event_type: "forward_error",
        payload,
        erro: `Falha proxy ${matchedRoute.forward_url}: ${e.message}`,
      });
      return new Response(JSON.stringify({ ok: false, proxy_error: e.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Processa todos os changes da instância local
  if (matchedInstance) {
    try {
      for (const entry of (payload?.entry || [])) {
        for (const ch of (entry?.changes || [])) {
          await processChange(supabase, matchedInstance, ch);
        }
      }
      if (rawRow?.id) {
        await supabase.from("whatsapp_webhooks_raw")
          .update({ processado: true }).eq("id", rawRow.id);
      }
    } catch (e: any) {
      console.error("meta webhook error:", e.message);
      if (rawRow?.id) {
        await supabase.from("whatsapp_webhooks_raw")
          .update({ erro: e.message }).eq("id", rawRow.id);
      }
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Não conhecido: loga e retorna 200 (Meta exige pra não retentar)
  await supabase.from("whatsapp_webhooks_raw").insert({
    provider_tipo: "meta",
    event_type: "unmapped",
    payload,
    erro: `phone_number_id=${phoneNumberId}, waba_id=${wabaId}`,
  });
  return new Response(JSON.stringify({ ok: true, unmapped: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Processamento por tipo de evento
// ═══════════════════════════════════════════════════════════════════════

async function processChange(supabase: any, instance: any, change: any) {
  const field = change?.field;
  const value = change?.value ?? {};

  switch (field) {
    case "messages":
      // Mensagens recebidas
      for (const msg of (value.messages || [])) {
        await handleInboundMessage(supabase, instance, msg, value);
      }
      // Statuses (sent/delivered/read/failed)
      for (const st of (value.statuses || [])) {
        await handleStatus(supabase, instance, st);
      }
      // Erros a nível de mensagem
      for (const err of (value.errors || [])) {
        await handleError(supabase, instance, err);
      }
      break;

    case "message_template_status_update":
      await handleTemplateStatusUpdate(supabase, instance, value);
      break;

    case "message_template_quality_update":
      await handleTemplateQualityUpdate(supabase, instance, value);
      break;

    case "template_category_update":
      await handleTemplateCategoryUpdate(supabase, instance, value);
      break;

    case "phone_number_quality_update":
      await handlePhoneQualityUpdate(supabase, instance, value);
      break;

    case "phone_number_name_update":
      await handlePhoneNameUpdate(supabase, instance, value);
      break;

    case "account_update":
    case "account_alerts":
    case "account_review_update":
    case "business_capability_update":
    case "security":
      await supabase.from("whatsapp_audit_log").insert({
        instance_id: instance.id,
        action_type: `meta_${field}`,
        entity_type: "account",
        entity_id: instance.id,
        metadata: value,
      }).then(() => {}).catch(() => {});
      break;

    default:
      // Log no audit pra eventos não tratados
      await supabase.from("whatsapp_audit_log").insert({
        instance_id: instance.id,
        action_type: `meta_unknown_${field}`,
        entity_type: "webhook",
        entity_id: null,
        metadata: value,
      }).then(() => {}).catch(() => {});
  }
}

// ─── Mensagens recebidas (12 subtipos) ─────────────────────────────────

async function handleInboundMessage(supabase: any, instance: any, msg: any, value: any) {
  const wamid = msg.id;
  const telefone = normalizePhone(msg.from);
  const type = msg.type ?? "text";
  const contextWamid = msg.context?.id ?? null;

  // Idempotência
  const { data: existing } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("instance_id", instance.id)
    .eq("message_external_id", wamid)
    .maybeSingle();
  if (existing) return;

  // Extração de body/conteúdo + mídia
  let body = "";
  let tipo = type;
  let mediaUrl: string | null = null;
  let mediaMime: string | null = null;
  let mediaId: string | null = null;
  const interactive_payload: any = null;
  const button_payload: any = null;

  switch (type) {
    case "text":
      body = msg.text?.body ?? "";
      break;
    case "image":
    case "video":
    case "audio":
    case "document":
    case "sticker": {
      const m = msg[type];
      if (m) {
        mediaId = m.id ?? null;
        mediaMime = m.mime_type ?? null;
        body = m.caption ?? "";
      }
      break;
    }
    case "location":
      body = `📍 ${msg.location?.latitude},${msg.location?.longitude}`;
      break;
    case "contacts":
      body = (msg.contacts ?? []).map((c: any) => c.name?.formatted_name).join(", ");
      break;
    case "reaction":
      body = `${msg.reaction?.emoji ?? ""} → ${msg.reaction?.message_id ?? ""}`;
      tipo = "reaction";
      break;
    case "button":
      body = msg.button?.text ?? "";
      tipo = "button";
      break;
    case "interactive": {
      const iv = msg.interactive ?? {};
      if (iv.type === "button_reply") {
        body = iv.button_reply?.title ?? "";
      } else if (iv.type === "list_reply") {
        body = iv.list_reply?.title ?? "";
      } else if (iv.type === "nfm_reply") {
        body = "[flow_response]";
      }
      tipo = "interactive";
      break;
    }
    case "order":
      body = `[order] ${msg.order?.catalog_id ?? ""}`;
      tipo = "order";
      break;
    case "system":
      body = msg.system?.body ?? "";
      tipo = "system";
      break;
  }

  // Resolve associado
  let associadoId: string | null = null;
  if (telefone) {
    const { data: assoc } = await supabase
      .from("associados")
      .select("id")
      .or(`whatsapp.eq.${telefone},telefone.eq.${telefone}`)
      .maybeSingle();
    if (assoc) associadoId = assoc.id;
  }

  const { data: newMsg } = await supabase
    .from("whatsapp_messages")
    .insert({
      instance_id: instance.id,
      direction: "in",
      status: "received",
      telefone,
      associado_id: associadoId,
      tipo,
      body,
      media_url: null, // será preenchido após cache
      media_mime: mediaMime,
      external_id: wamid,
      message_external_id: wamid,
      reply_to_external_id: contextWamid,
      raw: msg,
      provider_tipo: "meta",
    })
    .select()
    .single();

  if (newMsg) {
    // whatsapp_meta_details
    await supabase.from("whatsapp_meta_details").insert({
      message_id: newMsg.id,
      wamid,
      context_wamid: contextWamid,
      interactive_payload: msg.interactive ?? null,
      button_payload: msg.button ?? null,
      referral: msg.referral ?? null,
    }).then(() => {}).catch(() => {});

    // Mídia: cache síncrono (URL expira em 5min)
    if (mediaId) {
      cacheMetaMedia(supabase, instance, newMsg.id, mediaId, mediaMime, wamid)
        .catch((e) => console.error("media cache error:", e.message));
    }
  }
}

// ─── Cache síncrono de mídia Meta ──────────────────────────────────────

async function cacheMetaMedia(
  supabase: any,
  instance: any,
  messageId: string,
  mediaId: string,
  mimeTypeHint: string | null,
  sourceWamid: string | null,
) {
  const cfg = (instance.meta_config || {}) as meta.MetaConfig;

  // Verifica cache existente
  const { data: cached } = await supabase
    .from("whatsapp_meta_media_cache")
    .select("*")
    .eq("media_id", mediaId)
    .maybeSingle();

  if (cached?.storage_path) {
    // Já cacheado — só atualiza msg
    const { data: publicUrl } = await supabase
      .storage.from("whatsapp-media").createSignedUrl(cached.storage_path, 60 * 60 * 24 * 7);
    if (publicUrl?.signedUrl) {
      await supabase
        .from("whatsapp_messages")
        .update({ media_url: publicUrl.signedUrl })
        .eq("id", messageId);
    }
    return;
  }

  // 1. Busca URL (expira em 5min)
  const urlRes = await meta.metaGetMediaUrl(cfg, mediaId);
  if (!urlRes.ok || !urlRes.data?.url) return;

  // 2. Download binário
  const dl = await meta.metaDownloadMedia(cfg, urlRes.data.url);
  if (!dl.ok || !dl.buffer) return;

  const mime = dl.mimeType ?? urlRes.data.mime_type ?? mimeTypeHint ?? "application/octet-stream";
  const ext = mimeToExt(mime);
  const storagePath = `meta/${instance.id}/${mediaId}${ext}`;

  // 3. Upload pro Storage
  const { error: upErr } = await supabase
    .storage.from("whatsapp-media")
    .upload(storagePath, new Uint8Array(dl.buffer), { contentType: mime, upsert: true });
  if (upErr) {
    console.error("storage upload error:", upErr.message);
    return;
  }

  // 4. Registra cache
  await supabase.from("whatsapp_meta_media_cache").upsert({
    media_id: mediaId,
    storage_path: storagePath,
    mime_type: mime,
    file_size: urlRes.data.file_size ?? null,
    sha256: urlRes.data.sha256 ?? null,
    source_wamid: sourceWamid,
    ttl_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // 5. Atualiza msg com URL assinada
  const { data: signed } = await supabase
    .storage.from("whatsapp-media").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
  if (signed?.signedUrl) {
    await supabase
      .from("whatsapp_messages")
      .update({ media_url: signed.signedUrl, media_mime: mime })
      .eq("id", messageId);
  }
}

function mimeToExt(mime: string): string {
  if (mime.startsWith("image/jpeg")) return ".jpg";
  if (mime.startsWith("image/png")) return ".png";
  if (mime.startsWith("image/webp")) return ".webp";
  if (mime.startsWith("video/mp4")) return ".mp4";
  if (mime.startsWith("audio/ogg")) return ".ogg";
  if (mime.startsWith("audio/mpeg")) return ".mp3";
  if (mime.startsWith("audio/amr")) return ".amr";
  if (mime.includes("pdf")) return ".pdf";
  return "";
}

// ─── Status updates (sent/delivered/read/failed) ───────────────────────

async function handleStatus(supabase: any, instance: any, st: any) {
  const wamid = st.id;
  const update: any = { status: mapMetaStatus(st.status) };
  if (st.status === "delivered") update.entregue_em = new Date(Number(st.timestamp) * 1000).toISOString();
  if (st.status === "read") update.lido_em = new Date(Number(st.timestamp) * 1000).toISOString();
  if (st.status === "failed") {
    update.error = (st.errors?.[0]?.error_data?.details) || st.errors?.[0]?.message || "failed";
  }

  await supabase
    .from("whatsapp_messages")
    .update(update)
    .eq("instance_id", instance.id)
    .eq("message_external_id", wamid);

  // Atualiza pricing em whatsapp_meta_details
  if (st.pricing || st.conversation || st.errors) {
    const { data: msgRow } = await supabase
      .from("whatsapp_messages")
      .select("id")
      .eq("instance_id", instance.id)
      .eq("message_external_id", wamid)
      .maybeSingle();
    if (msgRow) {
      const metaUpdate: any = {};
      if (st.pricing) {
        metaUpdate.pricing_billable = st.pricing.billable;
        metaUpdate.pricing_model = st.pricing.pricing_model;
        metaUpdate.pricing_type = st.pricing.type;
        metaUpdate.pricing_category = st.pricing.category;
      }
      if (st.conversation) {
        metaUpdate.conversation_id = st.conversation.id;
        metaUpdate.conversation_origin_type = st.conversation.origin?.type;
      }
      if (st.errors) metaUpdate.errors = st.errors;

      await supabase
        .from("whatsapp_meta_details")
        .upsert({ message_id: msgRow.id, ...metaUpdate }, { onConflict: "message_id" });
    }
  }

  // Tratamento automático de erros Meta
  if (st.status === "failed" && st.errors?.[0]?.code) {
    const code = st.errors[0].code;
    const classify = meta.classifyMetaError(code);
    if (classify.kind === "optout") {
      // Marca opt-out automático pelo número
      const { data: msgRow } = await supabase
        .from("whatsapp_messages")
        .select("telefone")
        .eq("instance_id", instance.id)
        .eq("message_external_id", wamid)
        .maybeSingle();
      if (msgRow?.telefone) {
        await supabase.from("whatsapp_optouts").upsert({
          instance_id: instance.id,
          telefone: msgRow.telefone,
          motivo: `meta_error_${code}`,
          palavra_detectada: "META_OPTOUT",
        }, { onConflict: "instance_id,telefone" }).then(() => {}).catch(() => {});
      }
    }
  }
}

async function handleError(supabase: any, instance: any, err: any) {
  await supabase.from("whatsapp_audit_log").insert({
    instance_id: instance.id,
    action_type: "meta_error",
    entity_type: "system",
    metadata: err,
  }).then(() => {}).catch(() => {});
}

// ─── Template status updates ───────────────────────────────────────────

async function handleTemplateStatusUpdate(supabase: any, instance: any, value: any) {
  // value: { message_template_id, message_template_name, message_template_language,
  //         event, reason, disable_info }
  const wabaId = instance?.meta_config?.waba_id;
  if (!wabaId) return;
  const name = value.message_template_name;
  const language = value.message_template_language;
  const status = mapTemplateStatus(value.event);

  await supabase.from("whatsapp_meta_templates").upsert({
    waba_id: wabaId,
    external_id: String(value.message_template_id ?? ""),
    name,
    language,
    category: value.category ?? "UNKNOWN",
    status,
    components: value.components ?? [],
    rejection_reason: value.reason ?? null,
    last_synced_at: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "waba_id,name,language" }).then(() => {}).catch(() => {});
}

async function handleTemplateQualityUpdate(supabase: any, instance: any, value: any) {
  // value: { message_template_id, new_quality_score, previous_quality_score }
  const wabaId = instance?.meta_config?.waba_id;
  if (!wabaId) return;
  await supabase.from("whatsapp_meta_templates")
    .update({
      quality_score: value.new_quality_score,
      atualizado_em: new Date().toISOString(),
    })
    .eq("waba_id", wabaId)
    .eq("external_id", String(value.message_template_id ?? ""));
}

async function handleTemplateCategoryUpdate(supabase: any, instance: any, value: any) {
  const wabaId = instance?.meta_config?.waba_id;
  if (!wabaId) return;
  await supabase.from("whatsapp_meta_templates")
    .update({
      category: value.new_category ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("waba_id", wabaId)
    .eq("external_id", String(value.message_template_id ?? ""));
}

// ─── Phone number quality / name updates ──────────────────────────────

async function handlePhoneQualityUpdate(supabase: any, instance: any, value: any) {
  const phoneNumberId = instance?.meta_config?.phone_number_id;
  if (!phoneNumberId) return;

  await supabase.from("whatsapp_meta_phone_quality_log").insert({
    instance_id: instance.id,
    phone_number_id: String(phoneNumberId),
    quality_rating: value.new_quality_score ?? null,
    messaging_limit: value.current_limit ?? null,
  }).then(() => {}).catch(() => {});
}

async function handlePhoneNameUpdate(supabase: any, instance: any, value: any) {
  await supabase.from("whatsapp_audit_log").insert({
    instance_id: instance.id,
    action_type: "meta_phone_name_update",
    entity_type: "phone",
    metadata: value,
  }).then(() => {}).catch(() => {});
}

// ─── Helpers ───────────────────────────────────────────────────────────

function mapMetaStatus(s: string): string {
  switch (s) {
    case "sent": return "sent";
    case "delivered": return "delivered";
    case "read": return "read";
    case "failed": return "failed";
    default: return "sent";
  }
}

function mapTemplateStatus(event: string): string {
  switch (event?.toUpperCase()) {
    case "APPROVED": return "APPROVED";
    case "REJECTED": return "REJECTED";
    case "FLAGGED":
    case "PAUSED": return "PAUSED";
    case "DISABLED": return "DISABLED";
    case "PENDING_DELETION":
    case "DELETED": return "DISABLED";
    default: return "PENDING";
  }
}

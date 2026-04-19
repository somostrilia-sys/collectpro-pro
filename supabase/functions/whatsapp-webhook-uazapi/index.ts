// whatsapp-webhook-uazapi — recebe eventos da UAZAPI v2
// Eventos suportados: messages, messages_update, chats, contacts, groups,
// labels, presence, call, blocks, history, connection, sender
//
// Autenticação:
//   1. Se UAZAPI_WEBHOOK_SECRET estiver definido: valida `?key=` na URL
//      OU header `x-uazapi-webhook-secret`. Rejeita 401 se não bater.
//   2. Sempre exige que o `token` no payload corresponda a uma instância
//      do banco — rejeita 401 se não encontrar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  isGroupJid,
  jidToPhone,
  resolveConversationPhone,
  mapUazapiStatus,
} from "../_shared/whatsapp.ts";

// ═══════════════════════════════════════════════════════════════════════════
// Handler principal
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ─── Gate 1: secret na URL/header (opcional mas recomendado) ─────────
  const secretExpected = Deno.env.get("UAZAPI_WEBHOOK_SECRET") ?? "";
  if (secretExpected) {
    const url = new URL(req.url);
    const provided = url.searchParams.get("key")
      ?? req.headers.get("x-uazapi-webhook-secret")
      ?? "";
    if (provided !== secretExpected) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const eventType = payload?.event ?? payload?.type ?? "";

  // Log bruto sempre
  const { data: raw } = await supabase.from("whatsapp_webhooks_raw").insert({
    provider_tipo: "uazapi",
    event_type: eventType,
    payload,
  }).select().single();

  try {
    // Resolver instância pelo token ou instance name
    const instanceToken: string | null =
      payload?.token ?? payload?.instance?.token ?? req.headers.get("x-instance-token");
    const instanceName: string | null =
      payload?.instance?.name ?? payload?.instanceName ?? payload?.instance_name ?? payload?.owner;

    let instance: any = null;
    if (instanceToken) {
      const { data } = await supabase.from("whatsapp_instances")
        .select("*").eq("token", instanceToken).maybeSingle();
      instance = data;
    }
    if (!instance && instanceName) {
      const { data } = await supabase.from("whatsapp_instances")
        .select("*").eq("instance_name", instanceName).maybeSingle();
      instance = data;
    }

    // ─── Gate 2: token no payload DEVE mapear pra uma instância nossa ─
    // Rejeita chamadas fake que não correspondem a nenhuma instância do banco.
    if (!instance) {
      if (raw?.id) {
        await supabase.from("whatsapp_webhooks_raw")
          .update({ erro: "instance_not_found" }).eq("id", raw.id);
      }
      return new Response(JSON.stringify({ ok: false, error: "instance_not_found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Roteamento por tipo de evento
    if (eventType === "connection" || eventType === "status") {
      await handleConnection(supabase, instance, payload);
    } else if (eventType === "messages" || eventType === "message" || payload?.message) {
      await handleMessage(supabase, instance, payload);
    } else if (eventType === "messages_update" || eventType === "message_ack" || eventType === "ack") {
      await handleMessageUpdate(supabase, instance, payload);
    } else if (eventType === "chats") {
      await handleChat(supabase, instance, payload);
    } else if (eventType === "contacts") {
      await handleContact(supabase, instance, payload);
    } else if (eventType === "groups") {
      await handleGroup(supabase, instance, payload);
    } else if (eventType === "labels" || eventType === "chat_labels") {
      await handleLabel(supabase, instance, payload);
    } else if (eventType === "presence") {
      await handlePresence(supabase, instance, payload);
    } else if (eventType === "call") {
      await handleCall(supabase, instance, payload);
    } else if (eventType === "blocks") {
      await handleBlock(supabase, instance, payload);
    } else if (eventType === "history") {
      await handleHistory(supabase, instance, payload);
    }

    if (raw?.id) {
      await supabase.from("whatsapp_webhooks_raw")
        .update({ processado: true }).eq("id", raw.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (raw?.id) {
      await supabase.from("whatsapp_webhooks_raw")
        .update({ erro: e.message }).eq("id", raw.id);
    }
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Handlers específicos
// ═══════════════════════════════════════════════════════════════════════════

// ─── CONNECTION ───────────────────────────────────────────────────────
async function handleConnection(supabase: any, instance: any, payload: any) {
  if (!instance) return;
  const newStatus = payload?.status ?? payload?.connection ?? payload?.data?.status ?? null;
  if (!newStatus) return;

  const update: any = {
    status: mapUazapiStatus(newStatus),
    last_sync_at: new Date().toISOString(),
  };
  if (update.status === "connected") {
    update.qr_code = null;
    // Pegar telefone da instância se veio
    const phone = payload?.data?.wid ?? payload?.wid ?? payload?.phone;
    if (phone) update.telefone = String(phone).replace(/\D/g, "");
  }
  await supabase.from("whatsapp_instances").update(update).eq("id", instance.id);
}

// ─── MESSAGE (mensagem nova) ──────────────────────────────────────────
async function handleMessage(supabase: any, instance: any, payload: any) {
  if (!instance) return;

  // UAZAPI v2: payload.data = Message OU payload.message = Message OU payload = Message
  const msg = payload?.data ?? payload?.message ?? payload;

  // Campos principais (UAZAPI schema Message)
  const externalId: string = msg?.messageid ?? msg?.id ?? msg?.key?.id ?? "";
  const chatJid: string = msg?.chatid ?? msg?.key?.remoteJid ?? "";
  const senderJid: string = msg?.sender ?? msg?.key?.participant ?? msg?.participant ?? chatJid;
  const senderName: string = msg?.senderName ?? msg?.pushName ?? "";
  const senderLid: string | null = msg?.sender_lid ?? null;
  const senderPn: string | null = msg?.sender_pn ?? null;
  const isGroup: boolean = msg?.isGroup === true || isGroupJid(chatJid);
  const fromMe: boolean = msg?.fromMe === true || msg?.key?.fromMe === true;
  const messageType: string = msg?.messageType ?? detectTipo(msg);
  const text: string = msg?.text ?? msg?.body ?? msg?.message?.conversation
    ?? msg?.message?.extendedTextMessage?.text ?? "";
  const timestampMs: number | null = msg?.messageTimestamp ?? msg?.timestamp ?? null;
  const quoted: string | null = msg?.quoted ?? null;
  const fileUrl: string | null = msg?.fileURL ?? msg?.mediaUrl ?? msg?.media_url ?? null;
  const wasSentByApi: boolean = msg?.wasSentByApi === true;

  if (!chatJid && !externalId) return;

  // Telefone da conversa (pra compat com schema atual)
  const conversationPhone = resolveConversationPhone(chatJid, senderJid);

  // ═══ 1. Tentar achar mensagem existente (idempotência) ═══
  let messageId: string | null = null;
  if (externalId) {
    const { data: existing } = await supabase.from("whatsapp_messages")
      .select("id")
      .eq("instance_id", instance.id)
      .eq("message_external_id", externalId)
      .maybeSingle();
    if (existing) messageId = existing.id;
  }

  // ═══ 2. Upsert em whatsapp_messages ═══
  const messageRow: any = {
    instance_id: instance.id,
    direction: fromMe ? "out" : "in",
    status: fromMe ? "sent" : "received",
    telefone: conversationPhone,
    tipo: mapMessageType(messageType),
    body: text || null,
    media_url: fileUrl,
    external_id: externalId || null,
    message_external_id: externalId || null,
    message_timestamp_ms: timestampMs,
    provider_tipo: "uazapi",
    raw: msg,
  };

  // Tenta linkar ao associado pelo telefone (só em DMs)
  if (!isGroup && conversationPhone) {
    const { data: assoc } = await supabase.from("associados")
      .select("id")
      .or(`whatsapp.eq.${conversationPhone},whatsapp.eq.${conversationPhone.replace(/^55/, "")}`)
      .limit(1).maybeSingle();
    if (assoc) messageRow.associado_id = assoc.id;
  }

  if (messageId) {
    // Update — atualiza o que mudou (ex: status ou edição)
    await supabase.from("whatsapp_messages")
      .update(messageRow).eq("id", messageId);
  } else {
    const { data: inserted, error } = await supabase.from("whatsapp_messages")
      .insert(messageRow).select("id").single();
    if (error) {
      // Race condition: outro webhook inseriu ao mesmo tempo
      if (error.code === "23505" && externalId) {
        const { data: retry } = await supabase.from("whatsapp_messages")
          .select("id").eq("instance_id", instance.id)
          .eq("message_external_id", externalId).maybeSingle();
        if (retry) messageId = retry.id;
      } else {
        throw error;
      }
    } else {
      messageId = inserted.id;
    }
  }

  if (!messageId) return;

  // ═══ 3. Upsert em whatsapp_uazapi_details ═══
  const detailsRow: any = {
    message_id: messageId,
    is_group: isGroup,
    chat_jid: chatJid,
    sender_jid: senderJid,
    sender_lid: senderLid,
    sender_name: senderName,
    quoted_external_id: quoted,
    file_url: fileUrl,
    file_mime: msg?.media?.mimetype ?? msg?.mimetype ?? null,
    file_size: msg?.media?.fileLength ?? msg?.fileLength ?? null,
    message_type: messageType,
    from_me: fromMe,
    was_sent_by_api: wasSentByApi,
    forwarded: msg?.forwarded === true,
    raw: msg,
  };

  if (msg?.edited) detailsRow.edited_at = new Date().toISOString();
  if (messageType === "reaction") {
    // Reação é tratada separadamente — atualiza reactions da msg citada
    await handleReaction(supabase, instance.id, msg);
    return;
  }

  await supabase.from("whatsapp_uazapi_details")
    .upsert(detailsRow, { onConflict: "message_id" });

  // ═══ 4. Atualizar cache de contato (push name + avatar) ═══
  if (senderJid && !isGroup) {
    const senderPhone = jidToPhone(senderJid);
    if (senderPhone && senderName) {
      await supabase.from("whatsapp_contacts").upsert({
        instance_id: instance.id,
        telefone: senderPhone,
        jid: senderJid,
        push_name: senderName,
        last_refresh: new Date().toISOString(),
      }, { onConflict: "instance_id,jid" });
    }
  } else if (isGroup && senderJid && senderName) {
    // Em grupo, cachear o sender individual
    const senderPhone = jidToPhone(senderJid);
    if (senderPhone) {
      await supabase.from("whatsapp_contacts").upsert({
        instance_id: instance.id,
        telefone: senderPhone,
        jid: senderJid,
        push_name: senderName,
        last_refresh: new Date().toISOString(),
      }, { onConflict: "instance_id,jid" });
    }
  }

  // ═══ 5. Se é grupo e não temos info em cache, buscar sob demanda ═══
  if (isGroup) {
    const { data: groupCache } = await supabase.from("whatsapp_groups")
      .select("id, last_refresh")
      .eq("instance_id", instance.id)
      .eq("group_jid", chatJid)
      .maybeSingle();

    const needsRefresh = !groupCache
      || (Date.now() - new Date(groupCache.last_refresh).getTime() > 24 * 60 * 60 * 1000);

    if (needsRefresh && instance.token) {
      // Fire-and-forget: não bloqueia o webhook
      fetchGroupInfoBackground(supabase, instance, chatJid).catch(() => {});
    }
  }

  // ═══ 6. Dispara download de mídia assíncrono ═══
  if (fileUrl && messageType !== "text" && messageType !== "reaction") {
    // Cria row pendente em whatsapp_media
    const { data: existingMedia } = await supabase.from("whatsapp_media")
      .select("id").eq("message_id", messageId).maybeSingle();

    if (!existingMedia) {
      await supabase.from("whatsapp_media").insert({
        message_id: messageId,
        instance_id: instance.id,
        origem_url: fileUrl,
        mime_type: msg?.media?.mimetype ?? msg?.mimetype ?? null,
        file_name: msg?.media?.fileName ?? msg?.fileName ?? null,
        size_bytes: msg?.media?.fileLength ?? msg?.fileLength ?? null,
        status: "pending",
      });

      // Invoca downloader (fire-and-forget)
      invokeDownloader(messageId).catch(() => {});
    }
  }

  // Dispara motor de automação (fire-and-forget)
  if (!fromMe) {
    invokeAutomationEngine(messageId).catch(() => {});
  }
}

// ─── MESSAGE UPDATE (ack/status/edição/delete) ────────────────────────
async function handleMessageUpdate(supabase: any, instance: any, payload: any) {
  if (!instance) return;
  const data = payload?.data ?? payload;
  const externalId = data?.id ?? data?.messageid ?? data?.messageId ?? payload?.id;
  const ack = data?.ack ?? data?.status ?? payload?.ack ?? payload?.status;
  const edited = data?.edited ?? payload?.edited;

  if (!externalId) return;

  const update: any = {};
  if (ack !== undefined) {
    update.status = mapAck(ack);
    if (update.status === "delivered") update.entregue_em = new Date().toISOString();
    if (update.status === "read") update.lido_em = new Date().toISOString();
  }

  if (Object.keys(update).length > 0) {
    await supabase.from("whatsapp_messages")
      .update(update)
      .eq("instance_id", instance.id)
      .eq("message_external_id", externalId);
  }

  if (edited) {
    const { data: msgRow } = await supabase.from("whatsapp_messages")
      .select("id")
      .eq("instance_id", instance.id)
      .eq("message_external_id", externalId)
      .maybeSingle();
    if (msgRow) {
      await supabase.from("whatsapp_uazapi_details")
        .update({ edited_at: new Date().toISOString() })
        .eq("message_id", msgRow.id);
    }
  }
}

// ─── REAÇÃO ────────────────────────────────────────────────────────────
async function handleReaction(supabase: any, instanceId: string, msg: any) {
  const reactedId = msg?.reaction ?? msg?.reactionMessageId;
  const emoji = msg?.text ?? msg?.reactionText ?? "";
  const senderJid = msg?.sender ?? msg?.key?.participant ?? "";

  if (!reactedId) return;

  const { data: msgRow } = await supabase.from("whatsapp_messages")
    .select("id")
    .eq("instance_id", instanceId)
    .eq("message_external_id", reactedId)
    .maybeSingle();

  if (!msgRow) return;

  const { data: details } = await supabase.from("whatsapp_uazapi_details")
    .select("reactions")
    .eq("message_id", msgRow.id)
    .maybeSingle();

  const reactions = Array.isArray(details?.reactions) ? details.reactions : [];
  const idx = reactions.findIndex((r: any) => r.sender_jid === senderJid);
  if (emoji) {
    if (idx >= 0) reactions[idx] = { sender_jid: senderJid, emoji, at: new Date().toISOString() };
    else reactions.push({ sender_jid: senderJid, emoji, at: new Date().toISOString() });
  } else {
    if (idx >= 0) reactions.splice(idx, 1);
  }

  await supabase.from("whatsapp_uazapi_details")
    .update({ reactions })
    .eq("message_id", msgRow.id);
}

// ─── CHAT (atualização de chat) ───────────────────────────────────────
async function handleChat(supabase: any, instance: any, payload: any) {
  if (!instance) return;
  const chat = payload?.data ?? payload;
  const jid = chat?.wa_chatid ?? chat?.chatid ?? chat?.id;
  if (!jid) return;

  if (isGroupJid(jid)) {
    // Atualiza group info se tiver
    const update: any = {
      instance_id: instance.id,
      group_jid: jid,
      last_refresh: new Date().toISOString(),
    };
    if (chat?.wa_name || chat?.name) update.nome = chat.wa_name ?? chat.name;
    if (chat?.image) update.avatar_url = chat.image;
    if (chat?.wa_isGroup_announce !== undefined) update.is_announce = chat.wa_isGroup_announce;

    await supabase.from("whatsapp_groups")
      .upsert(update, { onConflict: "instance_id,group_jid" });
  } else {
    // Atualiza contato
    const phone = jidToPhone(jid);
    const update: any = {
      instance_id: instance.id,
      telefone: phone,
      jid,
      last_refresh: new Date().toISOString(),
    };
    if (chat?.wa_name) update.push_name = chat.wa_name;
    if (chat?.wa_contactName) update.contact_name = chat.wa_contactName;
    if (chat?.image) update.avatar_url = chat.image;
    if (chat?.imagePreview) update.avatar_preview_url = chat.imagePreview;
    if (chat?.wa_isBlocked !== undefined) update.is_blocked = chat.wa_isBlocked;

    await supabase.from("whatsapp_contacts")
      .upsert(update, { onConflict: "instance_id,jid" });

    // Se traz dados de lead, sincroniza
    if (chat?.lead_name || chat?.lead_status || chat?.lead_email) {
      await supabase.from("whatsapp_chat_leads").upsert({
        instance_id: instance.id,
        chat_jid: jid,
        lead_name: chat.lead_name ?? null,
        lead_full_name: chat.lead_fullName ?? null,
        lead_email: chat.lead_email ?? null,
        lead_personalid: chat.lead_personalid ?? null,
        lead_status: chat.lead_status ?? null,
        lead_tags: Array.isArray(chat.lead_tags) ? chat.lead_tags : [],
        lead_notes: chat.lead_notes ?? null,
        lead_kanban_order: chat.lead_kanbanOrder ?? null,
        lead_assigned_attendant_id: null,
        sync_from_uazapi: true,
      }, { onConflict: "instance_id,chat_jid" });
    }
  }
}

// ─── CONTACT ──────────────────────────────────────────────────────────
async function handleContact(supabase: any, instance: any, payload: any) {
  if (!instance) return;
  const contact = payload?.data ?? payload;
  const jid = contact?.id ?? contact?.jid ?? contact?.wa_chatid;
  if (!jid || isGroupJid(jid)) return;

  const phone = jidToPhone(jid);
  const update: any = {
    instance_id: instance.id,
    telefone: phone,
    jid,
    last_refresh: new Date().toISOString(),
  };
  if (contact?.pushName || contact?.wa_name) update.push_name = contact.pushName ?? contact.wa_name;
  if (contact?.name || contact?.wa_contactName) update.contact_name = contact.name ?? contact.wa_contactName;
  if (contact?.image || contact?.imageUrl || contact?.profilePic) {
    update.avatar_url = contact.image ?? contact.imageUrl ?? contact.profilePic;
  }

  await supabase.from("whatsapp_contacts")
    .upsert(update, { onConflict: "instance_id,jid" });
}

// ─── GROUP ────────────────────────────────────────────────────────────
async function handleGroup(supabase: any, instance: any, payload: any) {
  if (!instance) return;
  const group = payload?.data ?? payload;
  const jid = group?.JID ?? group?.id ?? group?.groupJid;
  if (!jid) return;

  const participants = Array.isArray(group?.Participants) ? group.Participants : [];
  const update: any = {
    instance_id: instance.id,
    group_jid: jid,
    last_refresh: new Date().toISOString(),
    participants_count: participants.length,
    participants,
  };
  if (group?.Name) update.nome = group.Name;
  if (group?.Topic) update.descricao = group.Topic;
  if (group?.OwnerJID) update.owner_jid = group.OwnerJID;
  if (group?.IsAnnounce !== undefined) update.is_announce = group.IsAnnounce;
  if (group?.IsLocked !== undefined) update.is_locked = group.IsLocked;
  if (group?.IsEphemeral !== undefined) update.is_ephemeral = group.IsEphemeral;
  if (group?.DisappearingTimer) update.disappearing_timer = group.DisappearingTimer;
  if (group?.IsParent !== undefined) update.is_parent = group.IsParent;
  if (group?.LinkedParentJID) update.linked_parent_jid = group.LinkedParentJID;
  if (group?.invite_link) update.invite_link = group.invite_link;
  update.raw = group;

  await supabase.from("whatsapp_groups")
    .upsert(update, { onConflict: "instance_id,group_jid" });
}

// ─── LABEL ────────────────────────────────────────────────────────────
async function handleLabel(supabase: any, instance: any, payload: any) {
  if (!instance) return;
  const label = payload?.data ?? payload;
  const id = label?.id ?? label?.labelId;
  if (!id) return;

  await supabase.from("whatsapp_labels").upsert({
    instance_id: instance.id,
    external_id: String(id),
    nome: label?.name ?? label?.nome ?? `Label ${id}`,
    cor: label?.color ?? null,
    ativo: label?.deleted !== true,
  }, { onConflict: "instance_id,external_id" });
}

// ─── PRESENCE ─────────────────────────────────────────────────────────
async function handlePresence(supabase: any, instance: any, payload: any) {
  if (!instance) return;
  const data = payload?.data ?? payload;
  const jid = data?.jid ?? data?.chatid ?? data?.from;
  if (!jid) return;
  const presence = data?.presence ?? data?.state ?? null; // available, unavailable, composing, recording, paused
  // Persistir último presence + timestamp em whatsapp_contacts (coluna raw.presence)
  await supabase.from("whatsapp_contacts").upsert({
    instance_id: instance.id,
    jid,
    telefone: jidToPhone(jid),
    last_presence: presence,
    last_presence_at: new Date().toISOString(),
  }, { onConflict: "instance_id,jid" }).then(() => {}).catch(() => {});
}

// ─── CALL ─────────────────────────────────────────────────────────────
async function handleCall(supabase: any, instance: any, payload: any) {
  if (!instance) return;
  const call = payload?.data ?? payload;
  const callId = call?.id ?? call?.callId;
  const chatJid = call?.chatid ?? call?.from;
  if (!callId) return;

  await supabase.from("whatsapp_call_log").upsert({
    instance_id: instance.id,
    external_id: String(callId),
    chat_jid: chatJid,
    telefone: chatJid ? jidToPhone(chatJid) : null,
    direction: call?.fromMe ? "out" : "in",
    status: call?.status ?? "incoming",
    duration_seconds: call?.duration ?? null,
    is_video: call?.isVideo ?? false,
    iniciada_em: call?.timestamp ? new Date(call.timestamp * 1000).toISOString() : new Date().toISOString(),
    raw: call,
  }, { onConflict: "external_id" } as any);
}

// ─── BLOCK ────────────────────────────────────────────────────────────
async function handleBlock(supabase: any, instance: any, payload: any) {
  if (!instance) return;
  const data = payload?.data ?? payload;
  const jid = data?.jid ?? data?.id;
  const blocked = data?.blocked === true || payload?.event === "block";
  if (!jid) return;

  if (blocked) {
    await supabase.from("whatsapp_blocks").upsert({
      instance_id: instance.id,
      jid,
      telefone: jidToPhone(jid),
    }, { onConflict: "instance_id,jid" });
  } else {
    await supabase.from("whatsapp_blocks")
      .delete()
      .eq("instance_id", instance.id)
      .eq("jid", jid);
  }
}

// ─── HISTORY ──────────────────────────────────────────────────────────
async function handleHistory(supabase: any, instance: any, payload: any) {
  if (!instance) return;
  // Histórico vem como array de mensagens em payload.data
  const messages = Array.isArray(payload?.data) ? payload.data : [];
  for (const msg of messages) {
    try {
      await handleMessage(supabase, instance, { data: msg });
    } catch { /* ignora msg com erro */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function mapAck(ack: any): string {
  const n = typeof ack === "number" ? ack : String(ack).toLowerCase();
  if (n === 3 || n === "read") return "read";
  if (n === 2 || n === "delivered") return "delivered";
  if (n === 1 || n === "sent") return "sent";
  if (n === -1 || n === "failed" || n === "error") return "failed";
  return "sent";
}

function detectTipo(msg: any): string {
  if (msg?.imageMessage || msg?.mediaType === "image") return "image";
  if (msg?.audioMessage || msg?.mediaType === "audio") return "audio";
  if (msg?.videoMessage || msg?.mediaType === "video") return "video";
  if (msg?.documentMessage || msg?.mediaType === "document") return "document";
  if (msg?.locationMessage) return "location";
  if (msg?.stickerMessage) return "sticker";
  if (msg?.contactMessage) return "contact";
  if (msg?.reactionMessage || msg?.reaction) return "reaction";
  return "text";
}

function mapMessageType(t: string): string {
  const lt = String(t || "").toLowerCase();
  if (lt.includes("image")) return "image";
  if (lt.includes("audio") || lt === "ptt") return "audio";
  if (lt.includes("video")) return "video";
  if (lt.includes("document")) return "document";
  if (lt.includes("sticker")) return "sticker";
  if (lt.includes("location")) return "location";
  if (lt.includes("contact")) return "contact";
  if (lt.includes("react")) return "reaction";
  return "text";
}

// Busca info de grupo em background (não bloqueia o webhook)
async function fetchGroupInfoBackground(supabase: any, instance: any, groupJid: string) {
  try {
    const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
    const res = await fetch(`${serverUrl}/group/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: instance.token },
      body: JSON.stringify({ groupJid }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const group = data?.group ?? data;

    const participants = Array.isArray(group?.Participants) ? group.Participants : [];
    await supabase.from("whatsapp_groups").upsert({
      instance_id: instance.id,
      group_jid: groupJid,
      nome: group?.Name ?? null,
      descricao: group?.Topic ?? null,
      owner_jid: group?.OwnerJID ?? null,
      is_announce: group?.IsAnnounce ?? false,
      is_locked: group?.IsLocked ?? false,
      participants,
      participants_count: participants.length,
      last_refresh: new Date().toISOString(),
      raw: group,
    }, { onConflict: "instance_id,group_jid" });
  } catch { /* silent */ }
}

// Dispara downloader de mídia via Edge Function
async function invokeDownloader(messageId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    await fetch(`${supabaseUrl}/functions/v1/whatsapp-media-downloader`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ message_id: messageId }),
    });
  } catch { /* silent */ }
}

// Dispara motor de automação
async function invokeAutomationEngine(messageId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    await fetch(`${supabaseUrl}/functions/v1/whatsapp-automation-engine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ message_id: messageId }),
    });
  } catch { /* silent */ }
}

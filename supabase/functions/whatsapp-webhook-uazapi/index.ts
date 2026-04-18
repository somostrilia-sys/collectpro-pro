// whatsapp-webhook-uazapi — recebe eventos uazapi (mensagem recebida, status, etc)
// Configure no painel uazapi: https://<supabase>/functions/v1/whatsapp-webhook-uazapi
// Endpoint público (sem JWT) — a verificação é via token da instância no payload

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, normalizePhone } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }

  // Log bruto (sempre)
  const { data: raw } = await supabase.from("whatsapp_webhooks_raw").insert({
    provider_tipo: "uazapi",
    event_type: payload?.event ?? payload?.type ?? null,
    payload,
  }).select().single();

  try {
    // Identificar instância pelo token/instance name
    const instanceToken: string | null =
      payload?.token ?? payload?.instance?.token ?? req.headers.get("x-instance-token");
    const instanceName: string | null =
      payload?.instance?.name ?? payload?.instanceName ?? payload?.instance_name;

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

    const event = payload?.event ?? payload?.type ?? "";

    // Evento de conexão
    if (event === "connection" || event === "status") {
      const newStatus = payload?.status ?? payload?.connection ?? null;
      if (instance && newStatus) {
        await supabase.from("whatsapp_instances").update({
          status: mapConnection(newStatus),
          last_sync_at: new Date().toISOString(),
          qr_code: null,
        }).eq("id", instance.id);
      }
    }

    // Mensagem recebida
    if (event === "messages" || event === "message" || payload?.message) {
      const msg = payload?.message ?? payload?.data ?? payload;
      const fromMe = msg?.fromMe ?? msg?.from_me ?? false;
      const telefone = normalizePhone(
        msg?.from ?? msg?.sender ?? msg?.chatId ?? msg?.jid ?? ""
      ).replace(/@.*/, "");
      const body = msg?.text ?? msg?.body ?? msg?.message?.conversation ?? msg?.message?.extendedTextMessage?.text ?? "";
      const externalId = msg?.id ?? msg?.messageId ?? msg?.key?.id ?? null;

      if (telefone && instance) {
        await supabase.from("whatsapp_messages").insert({
          instance_id: instance.id,
          direction: fromMe ? "out" : "in",
          status: fromMe ? "sent" : "received",
          telefone,
          tipo: detectTipo(msg),
          body,
          media_url: msg?.mediaUrl ?? msg?.media_url ?? null,
          external_id: externalId,
          raw: msg,
        });
      }
    }

    // Ack/status de mensagem
    if (event === "message_ack" || event === "ack" || payload?.ack) {
      const ack = payload?.ack ?? payload?.status;
      const externalId = payload?.id ?? payload?.messageId ?? payload?.key?.id;
      if (externalId && ack) {
        const newStatus = mapAck(ack);
        const update: any = { status: newStatus };
        if (newStatus === "delivered") update.entregue_em = new Date().toISOString();
        if (newStatus === "read") update.lido_em = new Date().toISOString();
        await supabase.from("whatsapp_messages")
          .update(update)
          .eq("external_id", externalId);
      }
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

function mapConnection(s: string): string {
  const v = String(s || "").toLowerCase();
  if (v === "connected" || v === "online" || v === "open") return "connected";
  if (v === "qrcode" || v === "pairing") return "qr_pending";
  if (v === "banned") return "banned";
  return "disconnected";
}

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
  return "text";
}

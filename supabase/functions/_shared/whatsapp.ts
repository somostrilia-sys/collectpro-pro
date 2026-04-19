// Shared helpers para integração WhatsApp (uazapi + Meta)
// Usado pelas edges: whatsapp-send, whatsapp-instance-connect, whatsapp-instance-status,
// whatsapp-webhook-uazapi, whatsapp-webhook-meta, whatsapp-meta-send

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function bad(msg: string, status = 400) {
  return json({ success: false, error: msg }, status);
}

// Normaliza telefone BR: remove não-dígitos, garante DDI 55
export function normalizePhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

// Render de template com {{var}}
export function renderTemplate(template: string, vars: Record<string, any>): string {
  return String(template || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => {
    const v = vars?.[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

// ─── UAZAPI JID helpers ────────────────────────────────────────────────
// JIDs possíveis:
//   DM:  5511999998888@s.whatsapp.net
//   Grupo: 120363020123456789@g.us
//   Newsletter: 12036304xxxxxxxxxx@newsletter
//   LID: 123456789@lid (anonimizado)

export function isGroupJid(jid: string | null | undefined): boolean {
  return !!jid && jid.endsWith("@g.us");
}

export function isNewsletterJid(jid: string | null | undefined): boolean {
  return !!jid && jid.endsWith("@newsletter");
}

export function jidToPhone(jid: string | null | undefined): string {
  if (!jid) return "";
  const bare = String(jid).split("@")[0];
  // Para DMs: é o telefone direto
  return bare.replace(/\D/g, "");
}

// Descobre o telefone "de fato" da conversa:
// DM → telefone do contato
// Grupo → usa o JID do grupo como "telefone" (já que vai agregar por chat_jid)
export function resolveConversationPhone(chatJid: string, senderJid?: string): string {
  if (isGroupJid(chatJid)) {
    // Em grupos, o "telefone" no whatsapp_messages é o JID do grupo normalizado
    return jidToPhone(chatJid);
  }
  return jidToPhone(chatJid || senderJid || "");
}

// ─── UAZAPI ───────────────────────────────────────────────────────────
export const UAZAPI_SERVER = "https://trilhoassist.uazapi.com";

export function uazapiAdminToken(): string {
  return Deno.env.get("UAZAPI_ADMIN_TOKEN") ?? "";
}

export interface UazapiSendPayload {
  number: string;
  text?: string;
  media?: { type: "image" | "video" | "audio" | "document"; url: string; caption?: string };
}

export async function uazapiSend(
  instanceToken: string,
  payload: UazapiSendPayload,
): Promise<{ ok: boolean; data: any; status: number }> {
  const body: Record<string, any> = { number: payload.number };
  let endpoint = "/send/text";
  if (payload.media) {
    endpoint = "/send/media";
    body.type = payload.media.type;
    body.file = payload.media.url;
    body.text = payload.media.caption || "";
  } else {
    body.text = payload.text || "";
  }
  const res = await fetch(`${UAZAPI_SERVER}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "token": instanceToken },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data, status: res.status };
}

// Admin API uazapi — cria/inicia instância, pega QR, status
// Endpoint /instance/create (o /instance/init é legacy e foi removido)
export async function uazapiAdminCreateInstance(
  instanceName: string,
): Promise<{ ok: boolean; token?: string; data: any }> {
  const res = await fetch(`${UAZAPI_SERVER}/instance/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "admintoken": uazapiAdminToken() },
    body: JSON.stringify({ name: instanceName }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, token: data?.token ?? data?.instance?.token, data };
}

export async function uazapiConnect(instanceToken: string): Promise<{ ok: boolean; qr?: string; data: any }> {
  const res = await fetch(`${UAZAPI_SERVER}/instance/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "token": instanceToken },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  // uazapi retorna QR em base64 ou campo "qrcode"
  const qr = data?.instance?.qrcode ?? data?.qrcode ?? data?.qr ?? null;
  return { ok: res.ok, qr, data };
}

export async function uazapiStatus(instanceToken: string): Promise<{ ok: boolean; status: string; data: any }> {
  const res = await fetch(`${UAZAPI_SERVER}/instance/status`, {
    method: "GET",
    headers: { "token": instanceToken },
  });
  const data = await res.json().catch(() => ({}));
  const rawStatus =
    data?.instance?.status ?? data?.status ?? (res.ok ? "connected" : "error");
  const normalized = mapUazapiStatus(rawStatus);
  return { ok: res.ok, status: normalized, data };
}

export async function uazapiDisconnect(instanceToken: string): Promise<boolean> {
  const res = await fetch(`${UAZAPI_SERVER}/instance/disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "token": instanceToken },
    body: JSON.stringify({}),
  });
  return res.ok;
}

export function mapUazapiStatus(raw: string): string {
  const s = String(raw || "").toLowerCase();
  if (s === "connected" || s === "online" || s === "open") return "connected";
  if (s === "qrcode" || s === "qr_pending" || s === "connecting" || s === "pairing") return "qr_pending";
  if (s === "banned" || s === "disconnected_banned") return "banned";
  if (s === "disconnected" || s === "close" || s === "closed" || s === "offline") return "disconnected";
  return "error";
}

// ─── UAZAPI — Configurar webhook da instância (POST /webhook) ──────────
export async function uazapiSetWebhook(
  instanceToken: string,
  webhookUrl: string,
  events: string[] = [
    "connection",
    "messages",
    "messages_update",
    "chats",
    "contacts",
    "groups",
    "labels",
    "presence",
    "call",
    "blocks",
    "history",
  ],
  serverUrl: string = UAZAPI_SERVER,
): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(`${serverUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: instanceToken },
    body: JSON.stringify({
      enabled: true,
      url: webhookUrl,
      events,
      addUrlEvents: false,
      addUrlTypesMessages: false,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// ─── UAZAPI — Info de grupo (POST /group/info) ─────────────────────────
export async function uazapiGroupInfo(
  instanceToken: string,
  groupJid: string,
  serverUrl: string = UAZAPI_SERVER,
): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(`${serverUrl}/group/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: instanceToken },
    body: JSON.stringify({ groupJid }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// ─── UAZAPI — Detalhes completos de chat (POST /chat/details) ──────────
export async function uazapiChatDetails(
  instanceToken: string,
  jid: string,
  serverUrl: string = UAZAPI_SERVER,
  preview: boolean = false,
): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(`${serverUrl}/chat/details`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: instanceToken },
    body: JSON.stringify({ number: jid, preview }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// ─── UAZAPI — Download de mídia de mensagem (POST /message/download) ───
export async function uazapiMessageDownload(
  instanceToken: string,
  messageExternalId: string,
  serverUrl: string = UAZAPI_SERVER,
): Promise<{ ok: boolean; data: any; buffer?: ArrayBuffer; mimeType?: string }> {
  const res = await fetch(`${serverUrl}/message/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: instanceToken },
    body: JSON.stringify({ id: messageExternalId }),
  });
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => ({}));
    // UAZAPI pode retornar URL pra baixar OU base64
    return { ok: res.ok, data };
  }
  const buffer = await res.arrayBuffer();
  return { ok: res.ok, data: {}, buffer, mimeType: contentType };
}

// ─── META CLOUD API ───────────────────────────────────────────────────
export interface MetaConfig {
  waba_id?: string;
  phone_number_id?: string;
  access_token?: string;
  app_secret?: string;
  verify_token?: string;
}

export async function metaSendMessage(
  cfg: MetaConfig,
  payload: Record<string, any>,
): Promise<{ ok: boolean; data: any; status: number }> {
  if (!cfg.phone_number_id || !cfg.access_token) {
    return { ok: false, status: 400, data: { error: "Meta não configurado" } };
  }
  const res = await fetch(`https://graph.facebook.com/v22.0/${cfg.phone_number_id}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cfg.access_token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data, status: res.status };
}

export async function verifyMetaSignature(
  appSecret: string,
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader || !appSecret) return false;
  const expected = signatureHeader.replace(/^sha256=/, "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(hex, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ─── ASSINATURA UNIVERSAL DO ATENDENTE ─────────────────────────────────
// Aplica prefixo "*Nome:*\n\n" em mensagens enviadas por colaborador.
// Usada tanto por UAZAPI quanto por Meta no whatsapp-send.
export async function resolveSignature(
  supabase: any,
  colaboradorId: string | null,
  skip: boolean,
): Promise<{ name: string | null; prefix: string }> {
  if (skip || !colaboradorId) return { name: null, prefix: "" };
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", colaboradorId)
    .maybeSingle();
  if (!data?.full_name) return { name: null, prefix: "" };
  return { name: data.full_name, prefix: `*${data.full_name}:*\n\n` };
}

export function applySignature(text: string | null | undefined, prefix: string): string {
  if (!text) return "";
  if (!prefix) return text;
  return `${prefix}${text}`;
}

// ─── CHECK DE OPT-OUT / BLOCKS (universal Meta + UAZAPI) ──────────────
// Retorna motivo se bloqueado; null se livre.
export async function checkOptoutOrBlock(
  supabase: any,
  instanceId: string,
  telefone: string,
): Promise<{ blocked: boolean; reason?: string }> {
  if (!telefone) return { blocked: false };
  const [opt, blk] = await Promise.all([
    supabase.from("whatsapp_optouts")
      .select("palavra_detectada").eq("instance_id", instanceId)
      .eq("telefone", telefone).is("revogado_em", null).maybeSingle(),
    supabase.from("whatsapp_blocks")
      .select("id").eq("instance_id", instanceId)
      .eq("telefone", telefone).maybeSingle(),
  ]);
  if (opt.data) return { blocked: true, reason: `opt-out (${opt.data.palavra_detectada ?? "manual"})` };
  if (blk.data) return { blocked: true, reason: "contato bloqueado" };
  return { blocked: false };
}

// ─── LOCK DE ATENDIMENTO META (assignment check) ──────────────────────
// Verifica se o colaborador está autorizado a enviar mensagens pela
// instância Meta pra esse telefone. Admin/Gestora bypassa.
export async function checkMetaAssignment(
  supabase: any,
  instanceId: string,
  telefone: string,
  colaboradorId: string | null,
): Promise<{ allowed: boolean; reason?: string; current_owner?: string | null }> {
  if (!telefone) return { allowed: true };

  // Admin/Gestora bypass
  if (colaboradorId) {
    const { data: prof } = await supabase
      .from("profiles").select("role").eq("id", colaboradorId).maybeSingle();
    if (prof && ["admin", "gestora", "diretor"].includes(String(prof.role).toLowerCase())) {
      return { allowed: true };
    }
  }

  const { data: assignment } = await supabase
    .from("whatsapp_chat_assignments")
    .select("colaborador_id, expires_at")
    .eq("instance_id", instanceId)
    .eq("telefone", telefone)
    .eq("provider_tipo", "meta")
    .is("liberado_em", null)
    .maybeSingle();

  // Sem assignment: qualquer atendente pode enviar (primeira resposta)
  if (!assignment) return { allowed: true, current_owner: null };

  // Expirado: permitir (auto-release será aplicado)
  if (assignment.expires_at && new Date(assignment.expires_at) < new Date()) {
    return { allowed: true, current_owner: null };
  }

  // Dono diferente: bloqueado
  if (assignment.colaborador_id !== colaboradorId) {
    return {
      allowed: false,
      reason: "Conversa atribuída a outro atendente",
      current_owner: assignment.colaborador_id,
    };
  }

  return { allowed: true, current_owner: assignment.colaborador_id };
}

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
export async function uazapiAdminCreateInstance(
  instanceName: string,
): Promise<{ ok: boolean; token?: string; data: any }> {
  const res = await fetch(`${UAZAPI_SERVER}/instance/init`, {
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

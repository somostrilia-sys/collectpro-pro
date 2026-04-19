// _shared/providers/meta.ts
// Helpers completos da WhatsApp Cloud API (Meta Graph API).
// Isolamento total: nada aqui depende ou toca em UAZAPI.

export const META_GRAPH_BASE = "https://graph.facebook.com/v22.0";

export interface MetaConfig {
  waba_id?: string;
  phone_number_id?: string;
  access_token?: string;
  app_secret?: string;
  verify_token?: string;
  app_id?: string;
}

export interface MetaResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
  error_code?: number;
}

// ─── Helper base de request ────────────────────────────────────────────

async function metaRequest<T = any>(
  cfg: MetaConfig,
  method: "GET" | "POST" | "DELETE" | "PUT",
  path: string,
  body?: Record<string, any>,
  params?: Record<string, string | number | boolean>,
): Promise<MetaResult<T>> {
  if (!cfg.access_token) {
    return { ok: false, status: 400, data: {} as T, error: "access_token ausente" };
  }
  const url = new URL(`${META_GRAPH_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  }
  const init: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${cfg.access_token}`,
      "Content-Type": "application/json",
    },
  };
  if (body && method !== "GET") init.body = JSON.stringify(body);
  const res = await fetch(url.toString(), init);
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    data,
    error: (data as any)?.error?.message,
    error_code: (data as any)?.error?.code,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ENVIO — POST /{phone_number_id}/messages
// ═══════════════════════════════════════════════════════════════════════

function sendBase(to: string, contextWamid?: string): Record<string, any> {
  const p: Record<string, any> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
  };
  if (contextWamid) p.context = { message_id: contextWamid };
  return p;
}

export async function metaSendText(
  cfg: MetaConfig,
  to: string,
  text: string,
  opts: { previewUrl?: boolean; contextWamid?: string } = {},
): Promise<MetaResult> {
  const payload = sendBase(to, opts.contextWamid);
  payload.type = "text";
  payload.text = { body: text, preview_url: opts.previewUrl ?? false };
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

export async function metaSendMedia(
  cfg: MetaConfig,
  to: string,
  mediaType: "image" | "video" | "audio" | "document" | "sticker",
  ref: { id?: string; link?: string; caption?: string; filename?: string },
  opts: { contextWamid?: string } = {},
): Promise<MetaResult> {
  const payload = sendBase(to, opts.contextWamid);
  payload.type = mediaType;
  const media: Record<string, any> = {};
  if (ref.id) media.id = ref.id;
  if (ref.link) media.link = ref.link;
  if (ref.caption && ["image", "video", "document"].includes(mediaType)) media.caption = ref.caption;
  if (ref.filename && mediaType === "document") media.filename = ref.filename;
  payload[mediaType] = media;
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

export async function metaSendLocation(
  cfg: MetaConfig,
  to: string,
  loc: { latitude: number; longitude: number; name?: string; address?: string },
  opts: { contextWamid?: string } = {},
): Promise<MetaResult> {
  const payload = sendBase(to, opts.contextWamid);
  payload.type = "location";
  payload.location = loc;
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

export async function metaSendContacts(
  cfg: MetaConfig,
  to: string,
  contacts: any[],
  opts: { contextWamid?: string } = {},
): Promise<MetaResult> {
  const payload = sendBase(to, opts.contextWamid);
  payload.type = "contacts";
  payload.contacts = contacts;
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

export async function metaSendReaction(
  cfg: MetaConfig,
  to: string,
  messageWamid: string,
  emoji: string,
): Promise<MetaResult> {
  const payload = sendBase(to);
  payload.type = "reaction";
  payload.reaction = { message_id: messageWamid, emoji };
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

export async function metaSendInteractiveButton(
  cfg: MetaConfig,
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>,
  opts: {
    header?: { type: "text" | "image" | "video" | "document"; value: string | { id?: string; link?: string } };
    footer?: string;
    contextWamid?: string;
  } = {},
): Promise<MetaResult> {
  if (buttons.length === 0 || buttons.length > 3) {
    return { ok: false, status: 400, data: {}, error: "buttons precisa ter 1-3 itens" };
  }
  const payload = sendBase(to, opts.contextWamid);
  payload.type = "interactive";
  const interactive: any = {
    type: "button",
    body: { text: body },
    action: {
      buttons: buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })),
    },
  };
  if (opts.header) {
    if (opts.header.type === "text") {
      interactive.header = { type: "text", text: opts.header.value as string };
    } else {
      interactive.header = { type: opts.header.type, [opts.header.type]: opts.header.value };
    }
  }
  if (opts.footer) interactive.footer = { text: opts.footer.slice(0, 60) };
  payload.interactive = interactive;
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

export async function metaSendInteractiveList(
  cfg: MetaConfig,
  to: string,
  body: string,
  buttonText: string,
  sections: Array<{ title?: string; rows: Array<{ id: string; title: string; description?: string }> }>,
  opts: { header?: string; footer?: string; contextWamid?: string } = {},
): Promise<MetaResult> {
  const payload = sendBase(to, opts.contextWamid);
  payload.type = "interactive";
  const interactive: any = {
    type: "list",
    body: { text: body },
    action: { button: buttonText.slice(0, 20), sections },
  };
  if (opts.header) interactive.header = { type: "text", text: opts.header };
  if (opts.footer) interactive.footer = { text: opts.footer.slice(0, 60) };
  payload.interactive = interactive;
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

export async function metaSendInteractiveCtaUrl(
  cfg: MetaConfig,
  to: string,
  body: string,
  button: { text: string; url: string },
  opts: { header?: string; footer?: string; contextWamid?: string } = {},
): Promise<MetaResult> {
  const payload = sendBase(to, opts.contextWamid);
  payload.type = "interactive";
  const interactive: any = {
    type: "cta_url",
    body: { text: body },
    action: {
      name: "cta_url",
      parameters: { display_text: button.text, url: button.url },
    },
  };
  if (opts.header) interactive.header = { type: "text", text: opts.header };
  if (opts.footer) interactive.footer = { text: opts.footer.slice(0, 60) };
  payload.interactive = interactive;
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

export async function metaSendFlow(
  cfg: MetaConfig,
  to: string,
  body: string,
  flow: {
    flow_id: string;
    flow_token: string;
    flow_cta: string;
    flow_action?: "navigate" | "data_exchange";
    flow_action_payload?: { screen: string; data?: Record<string, any> };
  },
  opts: { header?: string; footer?: string; contextWamid?: string } = {},
): Promise<MetaResult> {
  const payload = sendBase(to, opts.contextWamid);
  payload.type = "interactive";
  const interactive: any = {
    type: "flow",
    body: { text: body },
    action: {
      name: "flow",
      parameters: {
        flow_message_version: "3",
        flow_token: flow.flow_token,
        flow_id: flow.flow_id,
        flow_cta: flow.flow_cta,
        flow_action: flow.flow_action ?? "navigate",
        ...(flow.flow_action_payload ? { flow_action_payload: flow.flow_action_payload } : {}),
      },
    },
  };
  if (opts.header) interactive.header = { type: "text", text: opts.header };
  if (opts.footer) interactive.footer = { text: opts.footer.slice(0, 60) };
  payload.interactive = interactive;
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

export async function metaSendTemplate(
  cfg: MetaConfig,
  to: string,
  name: string,
  language: string,
  components?: any[],
): Promise<MetaResult> {
  const payload = sendBase(to);
  payload.type = "template";
  payload.template = { name, language: { code: language }, components: components ?? [] };
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

// ═══════════════════════════════════════════════════════════════════════
// INTERAÇÃO — mark as read + typing indicator
// ═══════════════════════════════════════════════════════════════════════

export async function metaMarkAsRead(
  cfg: MetaConfig,
  messageWamid: string,
  withTypingIndicator = false,
): Promise<MetaResult> {
  const payload: Record<string, any> = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageWamid,
  };
  if (withTypingIndicator) payload.typing_indicator = { type: "text" };
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/messages`, payload);
}

// ═══════════════════════════════════════════════════════════════════════
// MEDIA API
// ═══════════════════════════════════════════════════════════════════════

// Upload: POST /{phone_number_id}/media (multipart/form-data)
export async function metaUploadMedia(
  cfg: MetaConfig,
  file: Blob,
  mimeType: string,
): Promise<MetaResult<{ id?: string }>> {
  if (!cfg.access_token || !cfg.phone_number_id) {
    return { ok: false, status: 400, data: {}, error: "config Meta incompleta" };
  }
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", file, "upload");
  form.append("type", mimeType);

  const res = await fetch(`${META_GRAPH_BASE}/${cfg.phone_number_id}/media`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${cfg.access_token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data, error: (data as any)?.error?.message };
}

// Get URL: GET /{media_id} — URL expira em 5min!
export async function metaGetMediaUrl(
  cfg: MetaConfig,
  mediaId: string,
): Promise<MetaResult<{ url?: string; mime_type?: string; sha256?: string; file_size?: number }>> {
  return metaRequest(cfg, "GET", `/${mediaId}`, undefined, { phone_number_id: cfg.phone_number_id ?? "" });
}

// Download binário da URL
export async function metaDownloadMedia(
  cfg: MetaConfig,
  url: string,
): Promise<{ ok: boolean; status: number; buffer?: ArrayBuffer; mimeType?: string; error?: string }> {
  if (!cfg.access_token) return { ok: false, status: 400, error: "access_token ausente" };
  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${cfg.access_token}` },
  });
  if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
  const buffer = await res.arrayBuffer();
  return { ok: true, status: res.status, buffer, mimeType: res.headers.get("content-type") ?? undefined };
}

export async function metaDeleteMedia(cfg: MetaConfig, mediaId: string): Promise<MetaResult> {
  return metaRequest(cfg, "DELETE", `/${mediaId}`, undefined, { phone_number_id: cfg.phone_number_id ?? "" });
}

// ═══════════════════════════════════════════════════════════════════════
// BUSINESS PROFILE
// ═══════════════════════════════════════════════════════════════════════

export async function metaGetBusinessProfile(cfg: MetaConfig): Promise<MetaResult> {
  return metaRequest(cfg, "GET", `/${cfg.phone_number_id}/whatsapp_business_profile`, undefined, {
    fields: "about,address,description,email,profile_picture_url,websites,vertical",
  });
}

export async function metaUpdateBusinessProfile(
  cfg: MetaConfig,
  fields: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    websites?: string[];
    vertical?: string;
    profile_picture_handle?: string;
  },
): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/whatsapp_business_profile`, {
    messaging_product: "whatsapp",
    ...fields,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// PHONE NUMBERS
// ═══════════════════════════════════════════════════════════════════════

export async function metaListPhoneNumbers(cfg: MetaConfig): Promise<MetaResult> {
  return metaRequest(cfg, "GET", `/${cfg.waba_id}/phone_numbers`);
}

export async function metaGetPhoneNumber(cfg: MetaConfig): Promise<MetaResult> {
  return metaRequest(cfg, "GET", `/${cfg.phone_number_id}`, undefined, {
    fields: "verified_name,display_phone_number,quality_rating,code_verification_status,name_status,whatsapp_business_manager_messaging_limit",
  });
}

export async function metaRequestCode(
  cfg: MetaConfig,
  method: "SMS" | "VOICE" = "SMS",
  language = "pt_BR",
): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/request_code`, { code_method: method, language });
}

export async function metaVerifyCode(cfg: MetaConfig, code: string): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/verify_code`, { code });
}

export async function metaRegister(cfg: MetaConfig, pin: string): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/register`, {
    messaging_product: "whatsapp",
    pin,
  });
}

export async function metaDeregister(cfg: MetaConfig): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/deregister`);
}

export async function metaSet2FAPin(cfg: MetaConfig, pin: string): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}`, { pin });
}

// ═══════════════════════════════════════════════════════════════════════
// BLOCK USERS
// ═══════════════════════════════════════════════════════════════════════

export async function metaBlockUsers(cfg: MetaConfig, users: string[]): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${cfg.phone_number_id}/block_users`, {
    messaging_product: "whatsapp",
    block_users: users.map((u) => ({ user: u })),
  });
}

export async function metaUnblockUsers(cfg: MetaConfig, users: string[]): Promise<MetaResult> {
  return metaRequest(cfg, "DELETE", `/${cfg.phone_number_id}/block_users`, {
    messaging_product: "whatsapp",
    block_users: users.map((u) => ({ user: u })),
  });
}

export async function metaListBlockedUsers(cfg: MetaConfig): Promise<MetaResult> {
  return metaRequest(cfg, "GET", `/${cfg.phone_number_id}/block_users`);
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATES — Business Management API
// ═══════════════════════════════════════════════════════════════════════

export async function metaListTemplates(cfg: MetaConfig, limit = 100): Promise<MetaResult> {
  return metaRequest(cfg, "GET", `/${cfg.waba_id}/message_templates`, undefined, { limit });
}

export async function metaCreateTemplate(
  cfg: MetaConfig,
  template: {
    name: string;
    category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
    language: string;
    components: any[];
  },
): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${cfg.waba_id}/message_templates`, template);
}

export async function metaDeleteTemplate(cfg: MetaConfig, name: string, hsm_id?: string): Promise<MetaResult> {
  const params: Record<string, string> = { name };
  if (hsm_id) params.hsm_id = hsm_id;
  return metaRequest(cfg, "DELETE", `/${cfg.waba_id}/message_templates`, undefined, params);
}

// ═══════════════════════════════════════════════════════════════════════
// FLOWS
// ═══════════════════════════════════════════════════════════════════════

export async function metaListFlows(cfg: MetaConfig): Promise<MetaResult> {
  return metaRequest(cfg, "GET", `/${cfg.waba_id}/flows`);
}

export async function metaCreateFlow(
  cfg: MetaConfig,
  input: { name: string; categories: string[]; flow_json?: string; publish?: boolean; endpoint_uri?: string },
): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${cfg.waba_id}/flows`, input);
}

export async function metaGetFlow(cfg: MetaConfig, flowId: string): Promise<MetaResult> {
  return metaRequest(cfg, "GET", `/${flowId}`, undefined, {
    fields: "id,name,status,categories,validation_errors,json_version,endpoint_uri,health_status,preview",
  });
}

export async function metaPublishFlow(cfg: MetaConfig, flowId: string): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${flowId}/publish`);
}

export async function metaDeprecateFlow(cfg: MetaConfig, flowId: string): Promise<MetaResult> {
  return metaRequest(cfg, "POST", `/${flowId}/deprecate`);
}

export async function metaDeleteFlow(cfg: MetaConfig, flowId: string): Promise<MetaResult> {
  return metaRequest(cfg, "DELETE", `/${flowId}`);
}

// ═══════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════

export async function metaConversationAnalytics(
  cfg: MetaConfig,
  params: {
    start: number;            // unix timestamp
    end: number;
    granularity: "HALF_HOUR" | "DAILY" | "MONTHLY";
    metric_types?: string[];  // COST, CONVERSATION
    phone_numbers?: string[];
    country_codes?: string[];
    conversation_categories?: string[];
    conversation_types?: string[];
    conversation_directions?: string[];
    dimensions?: string[];
  },
): Promise<MetaResult> {
  const fields = buildAnalyticsFields("conversation_analytics", params);
  return metaRequest(cfg, "GET", `/${cfg.waba_id}`, undefined, { fields });
}

export async function metaTemplateAnalytics(
  cfg: MetaConfig,
  params: {
    start: number;
    end: number;
    template_ids: string[];
    metric_types?: string[];
    granularity?: string;
  },
): Promise<MetaResult> {
  const qs = [
    `start(${params.start})`,
    `end(${params.end})`,
    `granularity(${params.granularity ?? "DAILY"})`,
    `template_ids([${params.template_ids.join(",")}])`,
  ];
  if (params.metric_types?.length) qs.push(`metric_types([${params.metric_types.join(",")}])`);
  const fields = `template_analytics.${qs.join(".")}`;
  return metaRequest(cfg, "GET", `/${cfg.waba_id}`, undefined, { fields });
}

export async function metaPricingAnalytics(
  cfg: MetaConfig,
  params: {
    start: number;
    end: number;
    granularity: "HALF_HOUR" | "DAILY" | "MONTHLY";
    metric_types?: string[];
    phone_numbers?: string[];
    country_codes?: string[];
    pricing_categories?: string[];
    pricing_types?: string[];
    dimensions?: string[];
  },
): Promise<MetaResult> {
  const fields = buildAnalyticsFields("pricing_analytics", params);
  return metaRequest(cfg, "GET", `/${cfg.waba_id}`, undefined, { fields });
}

function buildAnalyticsFields(endpoint: string, params: Record<string, any>): string {
  const parts = [`start(${params.start})`, `end(${params.end})`, `granularity(${params.granularity})`];
  for (const [k, v] of Object.entries(params)) {
    if (["start", "end", "granularity"].includes(k)) continue;
    if (v == null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      parts.push(`${k}([${v.join(",")}])`);
    } else {
      parts.push(`${k}(${v})`);
    }
  }
  return `${endpoint}.${parts.join(".")}`;
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════

// Classifica error code Meta em categoria de ação automática
export function classifyMetaError(code?: number): {
  kind: "retry" | "optout" | "out_of_window" | "rate_limit" | "quality" | "unknown" | "ok";
  action?: string;
} {
  if (!code) return { kind: "ok" };
  if (code === 131050) return { kind: "optout", action: "marcar em whatsapp_optouts, não reenviar" };
  if (code === 131047) return { kind: "out_of_window", action: "janela 24h fechada; enviar template" };
  if (code === 131049) return { kind: "quality", action: "engagement baixo; aguardar 24h" };
  if (code === 131048) return { kind: "quality", action: "spam detected; parar" };
  if (code === 130429 || code === 131056) return { kind: "rate_limit", action: "backoff exponencial" };
  if (code === 131016 || code === 133004) return { kind: "retry", action: "serviço temporário; retry" };
  if (code === 132015) return { kind: "quality", action: "template pausado; reaprovar" };
  if (code === 132016) return { kind: "quality", action: "template desabilitado; criar novo" };
  return { kind: "unknown" };
}

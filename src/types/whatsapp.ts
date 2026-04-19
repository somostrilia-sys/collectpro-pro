export type InstanceTipo = "central" | "colaborador" | "meta_oficial";
export type InstanceStatus = "connected" | "disconnected" | "qr_pending" | "banned" | "error";
export type MessageDirection = "in" | "out";
export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "received";
export type MessageTipo = "text" | "template" | "image" | "audio" | "video" | "document" | "location" | "sticker" | "reaction" | "contact" | "menu" | "carousel" | "pix" | "payment" | "status";
export type TemplateCategoria = "cobranca" | "lembrete" | "acordo" | "negativacao" | "boas_vindas" | "manual" | "outro";
export type ProviderTipo = "uazapi" | "meta" | "both";
export type ProviderTipoMsg = "uazapi" | "meta";

export interface MetaConfig {
  waba_id?: string;
  phone_number_id?: string;
  access_token?: string;
  app_secret?: string;
  verify_token?: string;
}

export interface WhatsAppInstance {
  id: string;
  nome: string;
  tipo: InstanceTipo;
  servidor_url: string | null;
  instance_name: string | null;
  token: string | null;
  telefone: string | null;
  colaborador_id: string | null;
  meta_config: MetaConfig | null;
  status: InstanceStatus;
  qr_code: string | null;
  qr_expires_at: string | null;
  last_sync_at: string | null;
  is_default_central: boolean;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface WhatsAppTemplate {
  id: string;
  nome: string;
  categoria: TemplateCategoria;
  provider_tipo: ProviderTipo;
  conteudo_texto: string | null;
  meta_template_name: string | null;
  meta_language: string;
  componentes: any | null;
  variaveis: string[];
  aprovado_meta: boolean;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// ─── Message ─────────────────────────────────────────────────────────
export interface WhatsAppReaction {
  sender_jid: string;
  emoji: string;
  at: string;
}

export interface WhatsAppUazapiDetails {
  message_id: string;
  is_group: boolean;
  chat_jid: string;
  chat_lid: string | null;
  sender_jid: string | null;
  sender_lid: string | null;
  sender_name: string | null;
  sender_avatar_url: string | null;
  quoted_external_id: string | null;
  quoted_body: string | null;
  quoted_sender_jid: string | null;
  file_url: string | null;
  file_mime: string | null;
  file_size: number | null;
  message_type: string | null;
  reactions: WhatsAppReaction[];
  edited_at: string | null;
  deleted_at: string | null;
  forwarded: boolean;
  from_me: boolean;
  was_sent_by_api: boolean;
}

export interface WhatsAppMessage {
  id: string;
  instance_id: string | null;
  direction: MessageDirection;
  status: MessageStatus;
  telefone: string;
  associado_id: string | null;
  boleto_id: string | null;
  template_id: string | null;
  colaborador_id: string | null;
  colaborador_nome_snap: string | null;
  tipo: MessageTipo;
  body: string | null;
  media_url: string | null;
  media_mime: string | null;
  external_id: string | null;
  message_external_id: string | null;
  message_timestamp_ms: number | null;
  reply_to_external_id: string | null;
  error: string | null;
  raw: any | null;
  provider_tipo: ProviderTipoMsg;
  enviado_em: string | null;
  entregue_em: string | null;
  lido_em: string | null;
  criado_em: string;
  // joins/populated
  uazapi_details?: WhatsAppUazapiDetails | null;
  media?: WhatsAppMedia | null;
}

// ─── Conversation ────────────────────────────────────────────────────
export interface WhatsAppConversation {
  instance_id: string;
  telefone: string;
  chat_jid?: string | null;
  is_group?: boolean;
  chat_nome?: string | null;
  chat_avatar_url?: string | null;
  associado_id: string | null;
  total_mensagens: number;
  nao_lidas: number;
  ultima_mensagem_em: string;
  ultima_mensagem: string | null;
  ultima_direction: MessageDirection;
  ultima_sender_name?: string | null;
  associado_nome?: string | null;
  // Indicadores
  is_pinned?: boolean;
  is_muted?: boolean;
  is_archived?: boolean;
  labels?: WhatsAppLabel[];
}

// ─── Contact ─────────────────────────────────────────────────────────
export interface WhatsAppContact {
  id: string;
  instance_id: string;
  telefone: string;
  jid: string;
  push_name: string | null;
  contact_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
  avatar_preview_url: string | null;
  is_business: boolean;
  is_blocked: boolean;
  last_seen_at: string | null;
  last_refresh: string;
  criado_em: string;
  atualizado_em: string;
}

// ─── Group ───────────────────────────────────────────────────────────
export interface WhatsAppGroupParticipant {
  JID?: string;
  LID?: string;
  PhoneNumber?: string;
  IsAdmin?: boolean;
  IsSuperAdmin?: boolean;
  DisplayName?: string;
}

export interface WhatsAppGroup {
  id: string;
  instance_id: string;
  group_jid: string;
  nome: string | null;
  descricao: string | null;
  avatar_url: string | null;
  owner_jid: string | null;
  is_community: boolean;
  is_parent: boolean;
  linked_parent_jid: string | null;
  is_announce: boolean;
  is_locked: boolean;
  is_ephemeral: boolean;
  disappearing_timer: number | null;
  participants: WhatsAppGroupParticipant[];
  participants_count: number;
  invite_link: string | null;
  created_at_wa: string | null;
  last_refresh: string;
}

// ─── Media ───────────────────────────────────────────────────────────
export type MediaStatus = "pending" | "downloading" | "ready" | "failed";

export interface WhatsAppMedia {
  id: string;
  message_id: string;
  instance_id: string;
  storage_path: string | null;
  public_url: string | null;
  mime_type: string | null;
  file_name: string | null;
  size_bytes: number | null;
  sha256: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  origem_url: string | null;
  status: MediaStatus;
  erro: string | null;
  tentativas: number;
  baixado_em: string | null;
  criado_em: string;
}

// ─── Label ───────────────────────────────────────────────────────────
export interface WhatsAppLabel {
  id: string;
  instance_id: string;
  external_id: string | null;
  nome: string;
  cor: string | null;
  ativo: boolean;
  criado_em: string;
}

// ─── Quick Reply ─────────────────────────────────────────────────────
export interface WhatsAppQuickReply {
  id: string;
  instance_id: string | null;
  colaborador_id: string | null;
  external_id: string | null;
  atalho: string;
  conteudo: string;
  categoria: string | null;
  variaveis: string[];
  ativo: boolean;
  global: boolean;
  criado_em: string;
  atualizado_em: string;
}

// ─── Lead (CRM) ──────────────────────────────────────────────────────
export interface WhatsAppLead {
  id: string;
  instance_id: string;
  chat_jid: string;
  lead_name: string | null;
  lead_full_name: string | null;
  lead_email: string | null;
  lead_personalid: string | null;
  lead_status: string | null;
  lead_tags: string[];
  lead_notes: string | null;
  lead_kanban_order: number | null;
  lead_assigned_attendant_id: string | null;
  custom_fields: Record<string, any>;
  sync_from_uazapi: boolean;
  criado_em: string;
  atualizado_em: string;
}

// ─── Chat Note ───────────────────────────────────────────────────────
export interface WhatsAppChatNote {
  id: string;
  instance_id: string;
  chat_jid: string;
  conteudo: string;
  criado_por: string | null;
  criado_por_nome: string | null;
  criado_em: string;
  atualizado_em: string;
}

// ─── Automation ──────────────────────────────────────────────────────
export interface WhatsAppAutomation {
  id: string;
  instance_id: string | null;
  tipo: string;
  nome: string;
  ativo: boolean;
  config: Record<string, any>;
  prioridade: number;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

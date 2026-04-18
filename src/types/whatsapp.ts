export type InstanceTipo = "central" | "colaborador" | "meta_oficial";
export type InstanceStatus = "connected" | "disconnected" | "qr_pending" | "banned" | "error";
export type MessageDirection = "in" | "out";
export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "received";
export type MessageTipo = "text" | "template" | "image" | "audio" | "video" | "document" | "location" | "sticker" | "reaction";
export type TemplateCategoria = "cobranca" | "lembrete" | "acordo" | "negativacao" | "boas_vindas" | "manual" | "outro";
export type ProviderTipo = "uazapi" | "meta" | "both";

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
  tipo: MessageTipo;
  body: string | null;
  media_url: string | null;
  media_mime: string | null;
  external_id: string | null;
  reply_to_external_id: string | null;
  error: string | null;
  raw: any | null;
  enviado_em: string | null;
  entregue_em: string | null;
  lido_em: string | null;
  criado_em: string;
}

export interface WhatsAppConversation {
  instance_id: string;
  telefone: string;
  associado_id: string | null;
  total_mensagens: number;
  nao_lidas: number;
  ultima_mensagem_em: string;
  ultima_mensagem: string | null;
  ultima_direction: MessageDirection;
  associado_nome?: string | null;
}

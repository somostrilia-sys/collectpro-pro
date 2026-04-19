// Capabilities por provider — deriva de instance.tipo. Função pura.
// Usada pela UI pra renderizar botões/ações condicionalmente.

export type InstanceTipo = "central" | "colaborador" | "meta_oficial";

export interface Capabilities {
  supports_signature: boolean;
  supports_free_text: boolean;
  supports_template: boolean;
  supports_media: boolean;
  supports_interactive: boolean;       // button/list/cta_url/flow (Meta)
  supports_reactions: boolean;
  supports_reply: boolean;
  supports_edit: boolean;
  supports_delete: boolean;
  supports_pin: boolean;
  supports_groups: boolean;
  supports_newsletters: boolean;
  supports_calling: boolean;
  supports_read_receipts: boolean;
  supports_typing_outbound: boolean;
  requires_assignment: boolean;        // Meta: lock ativo, precisa assumir
  requires_template_outside_window: boolean;
  shared_inbox: boolean;               // Meta: múltiplos atendentes
  csw_hours: number | null;
  provider: "uazapi" | "meta";
}

export function getCapabilities(tipo: InstanceTipo | string | null | undefined): Capabilities {
  if (tipo === "meta_oficial") {
    return {
      supports_signature: true,
      supports_free_text: true,          // só dentro CSW
      supports_template: true,
      supports_media: true,
      supports_interactive: true,
      supports_reactions: true,
      supports_reply: true,
      supports_edit: false,
      supports_delete: false,
      supports_pin: false,
      supports_groups: false,
      supports_newsletters: false,
      supports_calling: true,
      supports_read_receipts: true,
      supports_typing_outbound: true,
      requires_assignment: true,
      requires_template_outside_window: true,
      shared_inbox: true,
      csw_hours: 24,
      provider: "meta",
    };
  }
  // uazapi (central/colaborador)
  return {
    supports_signature: true,
    supports_free_text: true,
    supports_template: true,
    supports_media: true,
    supports_interactive: false,
    supports_reactions: true,
    supports_reply: true,
    supports_edit: true,
    supports_delete: true,
    supports_pin: true,
    supports_groups: true,
    supports_newsletters: true,
    supports_calling: true,
    supports_read_receipts: true,
    supports_typing_outbound: true,
    requires_assignment: false,
    requires_template_outside_window: false,
    shared_inbox: false,
    csw_hours: null,
    provider: "uazapi",
  };
}

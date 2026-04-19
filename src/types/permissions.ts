// ─── Types ────────────────────────────────────────────────────────────────────

export type NivelAcesso = "total" | "proprio" | "visualizar" | "nenhum";
export type Perfil = "Gestora" | "Colaborador" | "Admin";

export interface Permissoes {
  dashboard: NivelAcesso;
  associados: NivelAcesso;
  boletos: NivelAcesso;
  cooperativas: NivelAcesso;
  colaboradores: NivelAcesso;
  ligacoes: NivelAcesso;
  acoes: NivelAcesso;
  regua: NivelAcesso;
  templates: NivelAcesso;
  acordos: NivelAcesso;
  negativacoes: NivelAcesso;
  cancelamentos: NivelAcesso;
  metricas: NivelAcesso;
  tickets: NivelAcesso;
  notificacoes: NivelAcesso;
  integracoes: NivelAcesso;
  auditoria: NivelAcesso;
  exportacao: NivelAcesso;
  acesso: NivelAcesso;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MODULOS: { key: keyof Permissoes; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "associados", label: "Associados" },
  { key: "boletos", label: "Boletos" },
  { key: "cooperativas", label: "Cooperativas" },
  { key: "colaboradores", label: "Colaboradores" },
  { key: "ligacoes", label: "Ligações" },
  { key: "acoes", label: "Ações de Cobrança" },
  { key: "regua", label: "Régua de Cobrança" },
  { key: "templates", label: "Templates" },
  { key: "acordos", label: "Acordos" },
  { key: "negativacoes", label: "Negativações" },
  { key: "cancelamentos", label: "Cancelamentos" },
  { key: "metricas", label: "Métricas" },
  { key: "tickets", label: "Tickets" },
  { key: "notificacoes", label: "Notificações" },
  { key: "integracoes", label: "Integrações" },
  { key: "auditoria", label: "Log Auditoria" },
  { key: "exportacao", label: "Exportação" },
  { key: "acesso", label: "Controle de Acesso" },
];

export const NIVEIS: { value: NivelAcesso; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "proprio", label: "Próprio" },
  { value: "visualizar", label: "Visualizar" },
  { value: "nenhum", label: "Nenhum" },
];

// ─── Default Permissions per Profile ─────────────────────────────────────────

export const permissoesGestora: Permissoes = {
  dashboard: "total", associados: "total", boletos: "total", cooperativas: "total",
  colaboradores: "total", ligacoes: "total", acoes: "total", regua: "total",
  templates: "total", acordos: "total", negativacoes: "total", cancelamentos: "total",
  metricas: "total", tickets: "total", notificacoes: "total", integracoes: "visualizar",
  auditoria: "total", exportacao: "total", acesso: "visualizar",
};

export const permissoesColaborador: Permissoes = {
  dashboard: "proprio", associados: "visualizar", boletos: "visualizar", cooperativas: "nenhum",
  colaboradores: "nenhum", ligacoes: "proprio", acoes: "proprio", regua: "visualizar",
  templates: "visualizar", acordos: "proprio", negativacoes: "visualizar", cancelamentos: "proprio",
  metricas: "proprio", tickets: "proprio", notificacoes: "proprio", integracoes: "nenhum",
  auditoria: "nenhum", exportacao: "nenhum", acesso: "nenhum",
};

export const permissoesAdmin: Permissoes = {
  dashboard: "total", associados: "total", boletos: "total", cooperativas: "total",
  colaboradores: "total", ligacoes: "total", acoes: "total", regua: "total",
  templates: "total", acordos: "total", negativacoes: "total", cancelamentos: "total",
  metricas: "total", tickets: "total", notificacoes: "total", integracoes: "total",
  auditoria: "total", exportacao: "total", acesso: "total",
};

export const getDefaultPermissoes = (perfil: Perfil): Permissoes => {
  if (perfil === "Gestora") return { ...permissoesGestora };
  if (perfil === "Admin") return { ...permissoesAdmin };
  return { ...permissoesColaborador };
};

// ─── Role Mapping ────────────────────────────────────────────────────────────

export const mapRoleToPerfil = (role: string | null): Perfil => {
  switch (role) {
    case "admin":
    case "ceo":
    case "diretor":
    case "cs":
      return "Admin";
    case "gestora":
    case "supervisor":
      return "Gestora";
    default:
      return "Colaborador";
  }
};

export const mapPerfilToRole = (perfil: Perfil): string => {
  switch (perfil) {
    case "Admin": return "admin";
    case "Gestora": return "gestora";
    default: return "colaborador";
  }
};

// ─── Route to Module Mapping ─────────────────────────────────────────────────

export const MODULE_ROUTE_MAP: Record<string, keyof Permissoes> = {
  "/": "dashboard",
  "/associados": "associados",
  "/cooperativas": "cooperativas",
  "/veiculos-indenizados": "associados",
  "/boletos": "boletos",
  "/financeiro": "boletos",
  "/reembolsos": "boletos",
  "/colaboradores": "colaboradores",
  "/ligacoes": "ligacoes",
  "/acoes-cobranca": "acoes",
  "/regua-cobranca": "regua",
  "/conversas": "templates",
  "/templates": "templates",
  "/acordos": "acordos",
  "/negativacoes": "negativacoes",
  "/cancelamentos": "cancelamentos",
  "/congelamentos": "cancelamentos",
  "/metricas": "metricas",
  "/exportacao": "exportacao",
  "/log-auditoria": "auditoria",
  "/tickets": "tickets",
  "/notificacoes": "notificacoes",
  "/integracoes": "integracoes",
  "/controle-acesso": "acesso",
};

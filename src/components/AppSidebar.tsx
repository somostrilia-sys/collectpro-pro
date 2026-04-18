import {
  BarChart3,
  Users,
  Building2,
  FileText,
  UserCheck,
  Phone,
  Zap,
  ClipboardList,
  MessageSquare,
  Handshake,
  AlertTriangle,
  UserMinus,
  Snowflake,
  TrendingUp,
  Ticket,
  Bell,
  History,
  Download,
  Shield,
  Plug,
  ShieldAlert,
  DollarSign,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MODULE_ROUTE_MAP } from "@/types/permissions";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface MenuGroup {
  label: string;
  items: { title: string; url: string; icon: any }[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", url: "/", icon: BarChart3 },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { title: "Associados", url: "/associados", icon: Users },
      { title: "Cooperativas", url: "/cooperativas", icon: Building2 },
      { title: "Veículos Indenizados", url: "/veiculos-indenizados", icon: ShieldAlert },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Boletos", url: "/boletos", icon: FileText },
      { title: "Recebimentos", url: "/financeiro", icon: DollarSign },
      { title: "Histórico Pagamentos", url: "/historico-pagamentos", icon: History },
      { title: "Reembolsos", url: "/reembolsos", icon: RotateCcw },
    ],
  },
  {
    label: "Cobrança",
    items: [
      { title: "Ações", url: "/acoes-cobranca", icon: Zap },
      { title: "Régua", url: "/regua-cobranca", icon: ClipboardList },
      { title: "Conversas", url: "/conversas", icon: MessageSquare },
      { title: "Templates", url: "/templates", icon: FileText },
      { title: "Acordos", url: "/acordos", icon: Handshake },
      { title: "Negativações", url: "/negativacoes", icon: AlertTriangle },
      { title: "Ligações", url: "/ligacoes", icon: Phone },
    ],
  },
  {
    label: "Operacional",
    items: [
      { title: "Cancelamentos", url: "/cancelamentos", icon: UserMinus },
      { title: "Congelamentos", url: "/congelamentos", icon: Snowflake },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { title: "Métricas", url: "/metricas", icon: TrendingUp },
      { title: "Exportação", url: "/exportacao", icon: Download },
      { title: "Auditoria", url: "/log-auditoria", icon: History },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Colaboradores", url: "/colaboradores", icon: UserCheck },
      { title: "Tickets", url: "/tickets", icon: Ticket },
      { title: "Notificações", url: "/notificacoes", icon: Bell },
      { title: "Integrações", url: "/integracoes", icon: Plug },
      { title: "Acesso", url: "/controle-acesso", icon: Shield },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { permissions } = useAuth();

  const isActive = (path: string) => currentPath === path;

  // Filter menu groups based on permissions
  const filteredGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const module = MODULE_ROUTE_MAP[item.url];
        if (!module || !permissions) return true;
        return permissions[module] !== "nenhum";
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="gap-0">
        {/* Logo */}
        <div className="p-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-base">C</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-heading font-bold text-base text-sidebar-accent-foreground tracking-tight">
                  CollectPro
                </h1>
                <p className="text-[11px] text-sidebar-foreground/50">
                  Gestão de Cobrança
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Menu Groups */}
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-[0.15em] px-5 mb-0.5 font-medium">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent transition-all duration-200 rounded-lg mx-2 px-3 py-2 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
                        activeClassName="bg-primary/15 text-primary font-semibold"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="text-[13px]">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

import {
  BarChart3,
  Users,
  FileText,
  UserCheck,
  Phone,
  Zap,
  ClipboardList,
  MessageSquare,
  Handshake,
  AlertTriangle,
  TrendingUp,
  Ticket,
  Bell,
  History,
  Download,
  Shield,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

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

const items = [
  { title: "Dashboard", url: "/", icon: BarChart3 },
  { title: "Associados", url: "/associados", icon: Users },
  { title: "Boletos", url: "/boletos", icon: FileText },
  { title: "Colaboradores", url: "/colaboradores", icon: UserCheck },
  { title: "Ligações", url: "/ligacoes", icon: Phone },
  { title: "Ações de Cobrança", url: "/acoes-cobranca", icon: Zap },
  { title: "Régua de Cobrança", url: "/regua-cobranca", icon: ClipboardList },
  { title: "Templates", url: "/templates", icon: MessageSquare },
  { title: "Acordos", url: "/acordos", icon: Handshake },
  { title: "Negativações", url: "/negativacoes", icon: AlertTriangle },
  { title: "Métricas Mensais", url: "/metricas", icon: TrendingUp },
  { title: "Tickets Desk", url: "/tickets", icon: Ticket },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
  { title: "Log de Auditoria", url: "/log-auditoria", icon: History },
  { title: "Exportação", url: "/exportacao", icon: Download },
  { title: "Controle de Acesso", url: "/controle-acesso", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isExpanded = items.some((i) => isActive(i.url));

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-lg text-primary">CollectPro</h1>
                <p className="text-xs text-muted-foreground">Gestão de Cobrança</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-accent hover:text-accent-foreground"
                      activeClassName="bg-primary text-primary-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
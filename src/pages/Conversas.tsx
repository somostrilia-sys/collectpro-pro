import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Users, Tag, Zap, Settings, BarChart3, LayoutGrid, Bot, Inbox } from "lucide-react";
import { useWhatsAppInstances, useInstancesRealtime } from "@/hooks/useWhatsApp";
import { ChatsTab } from "@/components/whatsapp/tabs/ChatsTab";
import { FilaTab } from "@/components/whatsapp/tabs/FilaTab";
import { GroupsTab } from "@/components/whatsapp/tabs/GroupsTab";
import { LabelsTab } from "@/components/whatsapp/tabs/LabelsTab";
import { QuickRepliesTab } from "@/components/whatsapp/tabs/QuickRepliesTab";
import { ConfigTab } from "@/components/whatsapp/tabs/ConfigTab";
import { AdminDashboardTab } from "@/components/whatsapp/tabs/AdminDashboardTab";
import { HubDashboardTab } from "@/components/whatsapp/tabs/HubDashboardTab";
import { KanbanTab } from "@/components/whatsapp/tabs/KanbanTab";
import { AutomationsTab } from "@/components/whatsapp/tabs/AutomationsTab";
import { useAuth } from "@/contexts/AuthContext";

export default function Conversas() {
  useInstancesRealtime();
  const { role, user } = useAuth();
  const { data: instances = [] } = useWhatsAppInstances();

  // Instância ativa pra abas secundárias
  const myInstance = useMemo(() => {
    if (role === "Admin" || role === "Gestora") {
      return instances.find((i) => i.tipo !== "meta_oficial" && i.is_default_central)
        ?? instances.find((i) => i.tipo !== "meta_oficial")
        ?? null;
    }
    return instances.find((i) => i.colaborador_id === user?.id) ?? null;
  }, [instances, role, user]);

  const [activeTab, setActiveTab] = useState("chats");
  const isAdmin = role === "Admin" || role === "Gestora";

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={isAdmin ? "grid grid-cols-9 w-full max-w-6xl" : "grid grid-cols-8 w-full max-w-5xl"}>
          <TabsTrigger value="chats" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Chats</span>
          </TabsTrigger>
          <TabsTrigger value="fila" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fila Hub</span>
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grupos</span>
          </TabsTrigger>
          <TabsTrigger value="labels" className="gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Etiquetas</span>
          </TabsTrigger>
          <TabsTrigger value="quickreplies" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Respostas</span>
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Automações</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="dashboard" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="chats" className="mt-4">
          <ChatsTab />
        </TabsContent>

        <TabsContent value="fila" className="mt-4">
          <FilaTab />
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <div className="border rounded-lg overflow-hidden bg-background h-[calc(100vh-12rem)]">
            <KanbanTab instanceId={myInstance?.id ?? null} />
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <div className="border rounded-lg overflow-hidden bg-background h-[calc(100vh-12rem)]">
            <GroupsTab instanceId={myInstance?.id ?? null} />
          </div>
        </TabsContent>

        <TabsContent value="labels" className="mt-4">
          <div className="border rounded-lg overflow-hidden bg-background h-[calc(100vh-12rem)]">
            <LabelsTab instanceId={myInstance?.id ?? null} />
          </div>
        </TabsContent>

        <TabsContent value="quickreplies" className="mt-4">
          <div className="border rounded-lg overflow-hidden bg-background h-[calc(100vh-12rem)]">
            <QuickRepliesTab instanceId={myInstance?.id ?? null} />
          </div>
        </TabsContent>

        <TabsContent value="automations" className="mt-4">
          <div className="border rounded-lg overflow-hidden bg-background h-[calc(100vh-12rem)]">
            <AutomationsTab instanceId={myInstance?.id ?? null} />
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <div className="border rounded-lg overflow-hidden bg-background h-[calc(100vh-12rem)] flex flex-col">
            <ConfigTab instanceId={myInstance?.id ?? null} />
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="dashboard" className="mt-4">
            <Tabs defaultValue="hub" className="w-full">
              <TabsList className="mb-3">
                <TabsTrigger value="hub" className="gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Hub (Meta cross-setor)</span>
                </TabsTrigger>
                <TabsTrigger value="instancia" className="gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  <span>Instância (uazapi)</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="hub">
                <HubDashboardTab />
              </TabsContent>
              <TabsContent value="instancia">
                <div className="border rounded-lg overflow-hidden bg-background h-[calc(100vh-16rem)] flex flex-col">
                  <AdminDashboardTab />
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

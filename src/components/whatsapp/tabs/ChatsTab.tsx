import { useMemo, useState, useEffect, useRef } from "react";
import { useDesktopNotifications } from "@/hooks/useDesktopNotifications";
import {
  useWhatsAppInstances,
  useConversations,
  useConversationsRealtime,
} from "@/hooks/useWhatsApp";
import { ChatList } from "@/components/whatsapp/ChatList";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { ChatInfoPanel } from "@/components/whatsapp/ChatInfoPanel";
import { QRConnect } from "@/components/whatsapp/QRConnect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, QrCode } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { WhatsAppConversation, WhatsAppInstance } from "@/types/whatsapp";
import { cn } from "@/lib/utils";

export function ChatsTab() {
  const { role, user } = useAuth();
  const { data: instances = [], isLoading } = useWhatsAppInstances();

  // Admin/Gestora veem todas (Meta oficial + colaboradores);
  // Atendente vê a instância Meta oficial (compartilhada) + a própria UAZAPI.
  // Sempre filtra instâncias inativas (ativo=false) — LuxSales e outras desativadas.
  const visibleInstances = useMemo(() => {
    const activeOnly = instances.filter((i: any) => i.ativo !== false);
    if (role === "Admin" || role === "Gestora") {
      return activeOnly;
    }
    return activeOnly.filter(
      (i) => i.tipo === "meta_oficial" || i.colaborador_id === user?.id,
    );
  }, [instances, role, user]);

  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<WhatsAppConversation | null>(null);
  const [qrInstance, setQrInstance] = useState<WhatsAppInstance | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "groups" | "contacts">("all");
  const [showInfo, setShowInfo] = useState(false);

  const activeInstanceId = selectedInstanceId
    ?? visibleInstances.find((i) => i.is_default_central)?.id
    ?? visibleInstances[0]?.id
    ?? null;

  const activeInstance = visibleInstances.find((i) => i.id === activeInstanceId) ?? null;

  const { data: conversations = [], isLoading: loadingConv } = useConversations(activeInstanceId);
  useConversationsRealtime(activeInstanceId);

  // Notificações desktop
  const { permission, request: requestNotif, notify } = useDesktopNotifications();
  const prevUnreadTotal = useRef<number | null>(null);
  const prevLastMsgAt = useRef<string | null>(null);

  useEffect(() => {
    const unread = conversations.reduce((s, c) => s + (c.nao_lidas || 0), 0);
    if (prevUnreadTotal.current !== null && unread > prevUnreadTotal.current) {
      // Pega a conversa mais recente com não lidas
      const recent = conversations
        .filter((c) => c.nao_lidas > 0)
        .sort((a, b) => (b.ultima_mensagem_em || "").localeCompare(a.ultima_mensagem_em || ""))[0];
      if (recent && recent.ultima_mensagem_em !== prevLastMsgAt.current) {
        const title = recent.chat_nome || recent.associado_nome || recent.telefone;
        notify(`Nova mensagem de ${title}`, {
          body: recent.ultima_mensagem || "(mídia)",
          tag: `wa-${recent.telefone}`,
        });
        prevLastMsgAt.current = recent.ultima_mensagem_em;
      }
    }
    prevUnreadTotal.current = unread;
  }, [conversations, notify]);

  // Pedir permissão na primeira carga
  useEffect(() => {
    if (permission === "default" && conversations.length > 0) {
      const askedAlready = sessionStorage.getItem("wa_notif_asked");
      if (!askedAlready) {
        sessionStorage.setItem("wa_notif_asked", "1");
        requestNotif();
      }
    }
  }, [permission, conversations.length, requestNotif]);

  const sortedInstances = useMemo(() => {
    return [...visibleInstances].sort((a, b) => {
      // Meta oficial no topo (canal corporativo compartilhado),
      // UAZAPI central depois, UAZAPI colaboradores por último.
      const order = { meta_oficial: 0, central: 1, colaborador: 2 } as any;
      return (order[a.tipo] ?? 9) - (order[b.tipo] ?? 9);
    });
  }, [visibleInstances]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)] text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (sortedInstances.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)] text-muted-foreground flex-col gap-2">
        <p className="text-sm">Você ainda não tem uma instância UAZAPI configurada</p>
        <p className="text-xs">Peça ao admin pra criar uma pra você em Integrações</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-lg overflow-hidden bg-background">
      {/* Coluna 1: Instâncias */}
      <div className="w-16 lg:w-20 border-r bg-muted/30 flex flex-col items-center py-3 gap-2">
        {sortedInstances.map((inst) => {
          const isActive = inst.id === activeInstanceId;
          const connected = inst.status === "connected";
          const letter = inst.tipo === "central"
            ? "C"
            : (inst.nome[0]?.toUpperCase() ?? "?");
          return (
            <button
              key={inst.id}
              onClick={() => { setSelectedInstanceId(inst.id); setSelected(null); }}
              className={cn(
                "relative h-11 w-11 rounded-xl flex items-center justify-center font-bold transition-all",
                isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-muted/30" : "",
                inst.tipo === "central"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
              title={`${inst.nome} — ${inst.status}`}
            >
              {letter}
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                  connected
                    ? "bg-success"
                    : inst.status === "qr_pending" ? "bg-warning" : "bg-muted-foreground/50",
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Coluna 2: Lista */}
      <div className="w-80 shrink-0 flex flex-col">
        {activeInstance && (
          <div className="p-3 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{activeInstance.nome}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {activeInstance.status === "connected" ? (
                    <Badge variant="outline" className="text-[10px] text-success border-success/40">
                      <Wifi className="h-2.5 w-2.5 mr-1" /> {activeInstance.telefone || "Online"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      <WifiOff className="h-2.5 w-2.5 mr-1" /> {activeInstance.status}
                    </Badge>
                  )}
                </div>
              </div>
              {activeInstance.status !== "connected" && (
                <Button size="sm" variant="outline" onClick={() => setQrInstance(activeInstance)}>
                  <QrCode className="h-3.5 w-3.5 mr-1" /> Conectar
                </Button>
              )}
            </div>
          </div>
        )}
        <ChatList
          conversations={conversations}
          selectedPhone={selected?.telefone ?? null}
          onSelect={setSelected}
          loading={loadingConv}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/* Coluna 3: Chat */}
      <ChatWindow
        instanceId={activeInstanceId}
        telefone={selected?.telefone ?? null}
        chatJid={selected?.chat_jid ?? null}
        nome={selected?.chat_nome ?? selected?.associado_nome}
        avatarUrl={selected?.chat_avatar_url}
        isGroup={selected?.is_group}
        associadoId={selected?.associado_id ?? null}
        onOpenInfo={() => setShowInfo((v) => !v)}
      />

      {/* Coluna 4: Info Panel (toggle) */}
      {showInfo && selected && activeInstanceId && (
        <ChatInfoPanel
          instanceId={activeInstanceId}
          chatJid={selected.chat_jid || `${selected.telefone}@s.whatsapp.net`}
          telefone={selected.telefone}
          nome={selected.chat_nome ?? selected.associado_nome}
          avatarUrl={selected.chat_avatar_url}
          isGroup={selected.is_group}
          associadoId={selected.associado_id}
          onClose={() => setShowInfo(false)}
        />
      )}

      <QRConnect
        instance={qrInstance}
        open={!!qrInstance}
        onOpenChange={(v) => { if (!v) setQrInstance(null); }}
      />
    </div>
  );
}

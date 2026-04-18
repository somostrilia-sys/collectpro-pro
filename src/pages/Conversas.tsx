import { useMemo, useState } from "react";
import {
  useWhatsAppInstances,
  useConversations,
  useInstancesRealtime,
} from "@/hooks/useWhatsApp";
import { ChatList } from "@/components/whatsapp/ChatList";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Wifi, WifiOff, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRConnect } from "@/components/whatsapp/QRConnect";
import type { WhatsAppConversation, WhatsAppInstance } from "@/types/whatsapp";
import { cn } from "@/lib/utils";

export default function Conversas() {
  useInstancesRealtime();
  const { data: instances = [], isLoading } = useWhatsAppInstances();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<WhatsAppConversation | null>(null);
  const [qrInstance, setQrInstance] = useState<WhatsAppInstance | null>(null);

  const activeInstanceId = selectedInstanceId
    ?? instances.find((i) => i.is_default_central)?.id
    ?? instances[0]?.id
    ?? null;

  const activeInstance = instances.find((i) => i.id === activeInstanceId) ?? null;

  const { data: conversations = [], isLoading: loadingConv } = useConversations(activeInstanceId);

  const sortedInstances = useMemo(() => {
    return [...instances].sort((a, b) => {
      const order = { central: 0, meta_oficial: 1, colaborador: 2 } as any;
      return (order[a.tipo] ?? 9) - (order[b.tipo] ?? 9);
    });
  }, [instances]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] border rounded-lg overflow-hidden bg-background">
      {/* Coluna 1: Instâncias */}
      <div className="w-16 lg:w-20 border-r bg-muted/30 flex flex-col items-center py-3 gap-2">
        {sortedInstances.length === 0 && (
          <div className="text-[10px] text-muted-foreground text-center px-1">
            Nenhuma instância
          </div>
        )}
        {sortedInstances.map((inst) => {
          const isActive = inst.id === activeInstanceId;
          const connected = inst.status === "connected";
          const letter = inst.tipo === "meta_oficial"
            ? "M"
            : inst.tipo === "central"
              ? "C"
              : (inst.nome[0]?.toUpperCase() ?? "?");
          return (
            <button
              key={inst.id}
              onClick={() => { setSelectedInstanceId(inst.id); setSelected(null); }}
              className={cn(
                "relative h-11 w-11 rounded-xl flex items-center justify-center font-bold transition-all",
                isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-muted/30" : "",
                inst.tipo === "central" ? "bg-primary/10 text-primary" :
                inst.tipo === "meta_oficial" ? "bg-emerald-500/10 text-emerald-600" :
                "bg-muted text-muted-foreground",
              )}
              title={`${inst.nome} — ${inst.status}`}
            >
              {letter}
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                  connected ? "bg-success" : inst.status === "qr_pending" ? "bg-warning" : "bg-muted-foreground/50",
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Coluna 2: Lista de conversas */}
      <div className="w-80 shrink-0 flex flex-col">
        {/* Header da instância */}
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
              {activeInstance.status !== "connected" && activeInstance.tipo !== "meta_oficial" && (
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
        />
      </div>

      {/* Coluna 3: Chat window */}
      <ChatWindow
        instanceId={activeInstanceId}
        telefone={selected?.telefone ?? null}
        nome={selected?.associado_nome ?? null}
        associadoId={selected?.associado_id ?? null}
      />

      <QRConnect
        instance={qrInstance}
        open={!!qrInstance}
        onOpenChange={(v) => { if (!v) setQrInstance(null); }}
      />
    </div>
  );
}

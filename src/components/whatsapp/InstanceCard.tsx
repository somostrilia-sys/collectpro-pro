import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wifi, WifiOff, QrCode, RefreshCw, Trash2, Smartphone, MessageSquare,
  AlertTriangle, Loader2, UserCog,
} from "lucide-react";
import type { WhatsAppInstance } from "@/types/whatsapp";
import { useRefreshStatus, useDeleteInstance } from "@/hooks/useWhatsApp";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  instance: WhatsAppInstance;
  colaboradorNome?: string;
  onConnect: (i: WhatsAppInstance) => void;
  onOpenChat?: (i: WhatsAppInstance) => void;
}

export function InstanceCard({ instance, colaboradorNome, onConnect, onOpenChat }: Props) {
  const { toast } = useToast();
  const refresh = useRefreshStatus();
  const del = useDeleteInstance();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh.mutateAsync(instance.id);
      toast({ title: "Status atualizado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remover instância "${instance.nome}"? Histórico de mensagens será preservado.`)) return;
    try {
      await del.mutateAsync(instance.id);
      toast({ title: "Removida" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const connected = instance.status === "connected";
  const Icon = instance.tipo === "colaborador" ? UserCog
    : instance.tipo === "meta_oficial" ? Smartphone : Smartphone;

  return (
    <Card className={cn("transition-all", connected && "border-success/40")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
              connected ? "bg-success/10" : "bg-muted",
            )}>
              <Icon className={cn("h-5 w-5", connected ? "text-success" : "text-muted-foreground")} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm truncate">{instance.nome}</p>
                <StatusBadge status={instance.status} />
                {instance.is_default_central && (
                  <Badge variant="outline" className="text-[10px] border-primary text-primary">
                    Default
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {instance.telefone ? formatPhone(instance.telefone) : "Sem número"}
                {colaboradorNome && ` · ${colaboradorNome}`}
              </p>
              {instance.last_sync_at && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Atualizado {new Date(instance.last_sync_at).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Atualizar status"
            >
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
            {!instance.is_default_central && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {instance.tipo !== "meta_oficial" && (
            <Button
              size="sm"
              variant={connected ? "outline" : "default"}
              onClick={() => onConnect(instance)}
              className="flex-1"
            >
              <QrCode className="h-3.5 w-3.5 mr-1.5" />
              {connected ? "Reconectar" : "Conectar"}
            </Button>
          )}
          {onOpenChat && connected && (
            <Button size="sm" variant="outline" onClick={() => onOpenChat(instance)}>
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Chat
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "connected":
      return <Badge className="bg-success/10 text-success border-success/30 text-[10px]"><Wifi className="h-2.5 w-2.5 mr-1" />Conectado</Badge>;
    case "qr_pending":
      return <Badge className="bg-warning/10 text-warning border-warning/30 text-[10px]">QR pendente</Badge>;
    case "banned":
      return <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]"><AlertTriangle className="h-2.5 w-2.5 mr-1" />Banido</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] text-muted-foreground"><WifiOff className="h-2.5 w-2.5 mr-1" />Desconectado</Badge>;
  }
}

function formatPhone(t: string) {
  const d = String(t).replace(/\D/g, "");
  if (d.length >= 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, -4)}-${d.slice(-4)}`;
  return t;
}

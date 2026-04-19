import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Clock, UserCheck, UserPlus, UserX } from "lucide-react";
import {
  useMetaConversation,
  useChatAssignment,
  useAssumeChat,
  useReleaseChat,
  type ChatAssignment,
} from "@/hooks/useWhatsApp";
import { useAuth } from "@/contexts/AuthContext";
import { getCapabilities } from "@/lib/whatsapp-capabilities";
import type { WhatsAppInstance } from "@/types/whatsapp";

interface Props {
  instance: WhatsAppInstance;
  telefone: string;
}

function formatCountdown(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

export function ConversationStatusHeader({ instance, telefone }: Props) {
  const { user, role } = useAuth();
  const caps = getCapabilities(instance.tipo);
  const isMeta = caps.provider === "meta";

  const { data: conv } = useMetaConversation(isMeta ? instance.id : null, isMeta ? telefone : null);
  const { data: assignment } = useChatAssignment(
    instance.id,
    isMeta ? telefone : `${telefone}@s.whatsapp.net`,
    caps.provider,
  );

  const [countdown, setCountdown] = useState<string | null>(null);
  useEffect(() => {
    if (!isMeta || !conv?.csw_expires_at) {
      setCountdown(null);
      return;
    }
    const tick = () => setCountdown(formatCountdown(conv.csw_expires_at));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [isMeta, conv?.csw_expires_at]);

  const assume = useAssumeChat();
  const release = useReleaseChat();

  const isMine = assignment?.colaborador_id === user?.id;
  const isAdmin = role === "Admin" || role === "Gestora" || role === "Diretor";
  const hasOwner = !!assignment && !assignment.liberado_em;

  async function handleAssume() {
    if (!user?.id) return;
    try {
      await assume.mutateAsync({
        instance_id: instance.id,
        provider_tipo: caps.provider,
        ...(isMeta ? { telefone } : { chat_jid: `${telefone}@s.whatsapp.net` }),
        colaborador_id: user.id,
        atribuido_por: user.id,
      });
      toast({ title: "Conversa assumida" });
    } catch (e: any) {
      toast({ title: "Não foi possível assumir", description: e.message, variant: "destructive" });
    }
  }

  async function handleRelease() {
    try {
      await release.mutateAsync({
        instance_id: instance.id,
        provider_tipo: caps.provider,
        ...(isMeta ? { telefone } : { chat_jid: `${telefone}@s.whatsapp.net` }),
      });
      toast({ title: "Conversa liberada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  }

  // Em UAZAPI, a conversa é sempre do dono da instância — sem lock visual
  if (!isMeta) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b text-xs">
      <Badge variant="outline" className="font-semibold">META OFICIAL</Badge>

      {countdown ? (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Janela: {countdown}
        </Badge>
      ) : (
        <Badge variant="destructive">Janela fechada — envie template</Badge>
      )}

      {hasOwner ? (
        <Badge variant={isMine ? "default" : "outline"} className="gap-1">
          <UserCheck className="h-3 w-3" />
          {isMine ? "Você está atendendo" : `Em atendimento: ${assignment?.profiles?.full_name ?? "outro atendente"}`}
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1">
          <UserX className="h-3 w-3" />
          Sem dono
        </Badge>
      )}

      <div className="ml-auto flex items-center gap-2">
        {!hasOwner && (
          <Button size="sm" variant="default" onClick={handleAssume} disabled={assume.isPending}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Assumir
          </Button>
        )}
        {hasOwner && isMine && (
          <Button size="sm" variant="outline" onClick={handleRelease} disabled={release.isPending}>
            Liberar
          </Button>
        )}
        {hasOwner && !isMine && isAdmin && (
          <Button size="sm" variant="outline" onClick={handleAssume}>
            Assumir (admin)
          </Button>
        )}
      </div>
    </div>
  );
}

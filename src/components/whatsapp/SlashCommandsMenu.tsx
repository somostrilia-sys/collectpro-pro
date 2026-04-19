import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FileText, Handshake, UserMinus, Phone, DollarSign, Zap,
} from "lucide-react";
import { useQuickReplies } from "@/hooks/useWhatsApp";
import type { WhatsAppQuickReply } from "@/types/whatsapp";

export interface SlashCommand {
  key: string;
  label: string;
  description: string;
  icon: any;
  action: () => void;
}

interface Props {
  visible: boolean;
  query: string;
  instanceId: string | null;
  colaboradorId?: string | null;
  onCloseMenu: () => void;
  onPickQuickReply: (qr: WhatsAppQuickReply) => void;
  onCommandBoleto?: () => void;
  onCommandAcordo?: () => void;
  onCommandCancelamento?: () => void;
  onCommandLigacao?: () => void;
  onCommandPix?: () => void;
  onCommandPagamento?: () => void;
}

export function SlashCommandsMenu({
  visible, query, instanceId, colaboradorId, onCloseMenu,
  onPickQuickReply,
  onCommandBoleto, onCommandAcordo, onCommandCancelamento, onCommandLigacao, onCommandPix, onCommandPagamento,
}: Props) {
  const { data: quickReplies = [] } = useQuickReplies(instanceId, colaboradorId ?? undefined);

  const commands: SlashCommand[] = useMemo(() => {
    const list: SlashCommand[] = [];
    if (onCommandBoleto) list.push({ key: "boleto", label: "/boleto", description: "Enviar último boleto em aberto", icon: FileText, action: onCommandBoleto });
    if (onCommandPix) list.push({ key: "pix", label: "/pix", description: "Enviar botão PIX", icon: Zap, action: onCommandPix });
    if (onCommandPagamento) list.push({ key: "pagamento", label: "/pagamento", description: "Solicitar pagamento", icon: DollarSign, action: onCommandPagamento });
    if (onCommandAcordo) list.push({ key: "acordo", label: "/acordo", description: "Criar acordo de cobrança", icon: Handshake, action: onCommandAcordo });
    if (onCommandCancelamento) list.push({ key: "cancelamento", label: "/cancelamento", description: "Abrir solicitação de cancelamento", icon: UserMinus, action: onCommandCancelamento });
    if (onCommandLigacao) list.push({ key: "ligacao", label: "/ligacao", description: "Registrar nova ligação", icon: Phone, action: onCommandLigacao });
    return list;
  }, [onCommandBoleto, onCommandPix, onCommandPagamento, onCommandAcordo, onCommandCancelamento, onCommandLigacao]);

  const q = query.toLowerCase().replace(/^\//, "");
  const filteredCommands = commands.filter((c) => !q || c.key.includes(q));
  const filteredQuickReplies = quickReplies.filter((qr) => !q || qr.atalho.toLowerCase().includes(q));

  if (!visible) return null;

  const hasItems = filteredCommands.length > 0 || filteredQuickReplies.length > 0;

  return (
    <div className="absolute bottom-full left-0 mb-1 w-72 max-h-60 overflow-y-auto rounded-lg bg-popover border shadow-lg text-sm z-50">
      {!hasItems && (
        <div className="p-3 text-xs text-muted-foreground text-center">Nenhum comando encontrado</div>
      )}

      {filteredCommands.length > 0 && (
        <div className="py-1">
          <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
            Comandos
          </p>
          {filteredCommands.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                onClick={() => { c.action(); onCloseMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left"
              >
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs">{c.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{c.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {filteredQuickReplies.length > 0 && (
        <div className="py-1 border-t">
          <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
            Respostas rápidas
          </p>
          {filteredQuickReplies.map((qr) => (
            <button
              key={qr.id}
              onClick={() => { onPickQuickReply(qr); onCloseMenu(); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left"
            >
              <code className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded">/{qr.atalho}</code>
              <p className="text-[11px] text-muted-foreground truncate flex-1">{qr.conteudo}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

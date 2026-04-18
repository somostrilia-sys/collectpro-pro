import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Check, CheckCheck, Clock, AlertCircle, Paperclip, MessageSquare } from "lucide-react";
import { useMessages, useSendMessage } from "@/hooks/useWhatsApp";
import { useToast } from "@/hooks/use-toast";
import type { WhatsAppMessage, MessageStatus } from "@/types/whatsapp";
import { cn } from "@/lib/utils";

interface Props {
  instanceId: string | null;
  telefone: string | null;
  nome?: string | null;
  associadoId?: string | null;
}

function formatTel(t: string): string {
  const d = String(t || "").replace(/\D/g, "");
  if (d.length >= 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, -4)}-${d.slice(-4)}`;
  return t;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case "queued": return <Clock className="h-3 w-3 opacity-60" />;
    case "sent": return <Check className="h-3 w-3 opacity-60" />;
    case "delivered": return <CheckCheck className="h-3 w-3 opacity-60" />;
    case "read": return <CheckCheck className="h-3 w-3 text-sky-400" />;
    case "failed": return <AlertCircle className="h-3 w-3 text-destructive" />;
    default: return null;
  }
}

export function ChatWindow({ instanceId, telefone, nome, associadoId }: Props) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: messages = [], isLoading } = useMessages(instanceId, telefone);
  const send = useSendMessage();

  // Scroll to bottom quando novas mensagens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, telefone]);

  if (!telefone || !instanceId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground gap-3">
        <MessageSquare className="h-20 w-20 opacity-30" />
        <p className="text-lg">Selecione uma conversa pra começar</p>
        <p className="text-sm">Ou dispare uma cobrança em Associados &gt; Ações</p>
      </div>
    );
  }

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText("");
    try {
      await send.mutateAsync({
        instance_id: instanceId,
        telefone,
        associado_id: associadoId ?? undefined,
        texto: msg,
      });
    } catch (e: any) {
      toast({ title: "Falha ao enviar", description: e.message, variant: "destructive" });
      setText(msg);
    }
  };

  const header = nome || formatTel(telefone);

  // Agrupar mensagens por data
  const groups: { date: string; msgs: WhatsAppMessage[] }[] = [];
  let lastDate = "";
  for (const m of messages) {
    const d = new Date(m.criado_em).toLocaleDateString("pt-BR");
    if (d !== lastDate) {
      groups.push({ date: d, msgs: [] });
      lastDate = d;
    }
    groups[groups.length - 1].msgs.push(m);
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-muted/20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shadow-sm">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {(nome || "??").split(" ").slice(0, 2).map((s) => s[0]?.toUpperCase() || "").join("") || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{header}</p>
          <p className="text-xs text-muted-foreground">{formatTel(telefone)}</p>
        </div>
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="flex justify-center pt-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-16">
            Nenhuma mensagem ainda. Mande a primeira.
          </div>
        ) : (
          groups.map((g, gi) => (
            <div key={gi} className="space-y-1.5">
              <div className="flex justify-center my-3">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
                  {g.date}
                </Badge>
              </div>
              {g.msgs.map((m) => {
                const mine = m.direction === "out";
                return (
                  <div
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
                        mine
                          ? "bg-[#d9fdd3] dark:bg-emerald-900/30 text-foreground rounded-tr-none"
                          : "bg-white dark:bg-card text-foreground rounded-tl-none",
                      )}
                    >
                      {m.body && (
                        <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                      )}
                      {m.media_url && !m.body && (
                        <p className="text-xs text-muted-foreground italic">[{m.tipo}]</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(m.criado_em)}
                        </span>
                        {mine && <StatusIcon status={m.status} />}
                      </div>
                      {m.error && (
                        <p className="text-[10px] text-destructive mt-1">{m.error}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex items-end gap-2">
          <Button size="icon" variant="ghost" disabled className="shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escreva uma mensagem"
            rows={1}
            className="resize-none min-h-10 max-h-32"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={send.isPending || !text.trim()}
            className="shrink-0"
          >
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send, Loader2, Check, CheckCheck, Clock, AlertCircle, MessageSquare,
  Mic, Users, Info, Search, Phone, MoreVertical,
} from "lucide-react";
import { useMessages, useSendMessage, useMessageAction, useSendPresence } from "@/hooks/useWhatsApp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { WhatsAppMessage, MessageStatus } from "@/types/whatsapp";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./ContactAvatar";
import { GroupSenderHeader } from "./GroupSenderHeader";
import { AttendantBadge } from "./AttendantBadge";
import { QuotedMessage } from "./QuotedMessage";
import { MediaBubble } from "./MediaBubble";
import { ReactionsBar } from "./ReactionsBar";
import { EmojiPicker } from "./EmojiPicker";
import { MessageActionsMenu } from "./MessageActionsMenu";
import { AttachmentPicker } from "./AttachmentPicker";
import {
  SendLocationDialog, SendContactDialog, SendPixDialog, SendPollDialog, SendPaymentDialog,
} from "./InteractiveSendDialogs";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  instanceId: string | null;
  telefone: string | null;
  chatJid?: string | null;
  nome?: string | null;
  avatarUrl?: string | null;
  isGroup?: boolean;
  participantsCount?: number;
  associadoId?: string | null;
  onOpenInfo?: () => void;
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

export function ChatWindow({
  instanceId, telefone, chatJid, nome, avatarUrl, isGroup, participantsCount, associadoId, onOpenInfo,
}: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<WhatsAppMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const [dialogLocation, setDialogLocation] = useState(false);
  const [dialogContact, setDialogContact] = useState(false);
  const [dialogPix, setDialogPix] = useState(false);
  const [dialogPoll, setDialogPoll] = useState(false);
  const [dialogPayment, setDialogPayment] = useState(false);

  const { data: messages = [], isLoading } = useMessages(instanceId, telefone);
  const send = useSendMessage();
  const msgAction = useMessageAction();
  const presence = useSendPresence();

  // Auto-scroll quando chegam novas mensagens
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
    setReplyingTo(null);
    try {
      await send.mutateAsync({
        instance_id: instanceId,
        telefone,
        chat_jid: chatJid ?? undefined,
        associado_id: associadoId ?? undefined,
        texto: msg,
        reply_to_external_id: replyingTo?.message_external_id ?? undefined,
      });
    } catch (e: any) {
      toast({ title: "Falha ao enviar", description: e.message, variant: "destructive" });
      setText(msg);
    }
  };

  const handleTyping = () => {
    if (typingTimerRef.current) return;
    presence.mutate({
      instance_id: instanceId,
      chat_jid: chatJid || `${telefone}@s.whatsapp.net`,
      presence: "composing",
    });
    typingTimerRef.current = window.setTimeout(() => {
      presence.mutate({
        instance_id: instanceId,
        chat_jid: chatJid || `${telefone}@s.whatsapp.net`,
        presence: "paused",
      });
      typingTimerRef.current = null;
    }, 3000);
  };

  const handleReact = async (msg: WhatsAppMessage, emoji: string) => {
    if (!msg.message_external_id) return;
    try {
      await msgAction.mutateAsync({
        instance_id: instanceId,
        action: "react",
        message_external_id: msg.message_external_id,
        emoji,
      });
    } catch (e: any) {
      toast({ title: "Falha ao reagir", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (msg: WhatsAppMessage) => {
    if (!msg.message_external_id) return;
    if (!confirm("Apagar essa mensagem pra todos?")) return;
    try {
      await msgAction.mutateAsync({
        instance_id: instanceId,
        action: "delete",
        message_external_id: msg.message_external_id,
      });
    } catch (e: any) {
      toast({ title: "Falha ao apagar", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = async (msg: WhatsAppMessage) => {
    const newText = prompt("Novo texto:", msg.body || "");
    if (!newText || newText === msg.body) return;
    try {
      await msgAction.mutateAsync({
        instance_id: instanceId,
        action: "edit",
        message_external_id: msg.message_external_id,
        new_text: newText,
      });
    } catch (e: any) {
      toast({ title: "Falha ao editar", description: e.message, variant: "destructive" });
    }
  };

  const handlePin = async (msg: WhatsAppMessage) => {
    try {
      await msgAction.mutateAsync({
        instance_id: instanceId,
        action: "pin",
        message_external_id: msg.message_external_id,
        pin: true,
      });
    } catch (e: any) {
      toast({ title: "Falha ao fixar", description: e.message, variant: "destructive" });
    }
  };

  const handleCopy = (msg: WhatsAppMessage) => {
    if (msg.body) navigator.clipboard.writeText(msg.body);
    toast({ title: "Texto copiado" });
  };

  const handleAttach = async (file: File, type: "image" | "video" | "audio" | "document") => {
    try {
      toast({ title: "Enviando arquivo..." });
      const form = new FormData();
      form.append("instance_id", instanceId);
      form.append("file", file);
      const { data, error } = await supabase.functions.invoke("whatsapp-upload-media", {
        body: form,
      });
      if (error) throw error;
      if (!data?.success || !data?.public_url) throw new Error("upload falhou");

      await send.mutateAsync({
        instance_id: instanceId,
        telefone,
        chat_jid: chatJid ?? undefined,
        associado_id: associadoId ?? undefined,
        media: {
          type,
          url: data.public_url,
          caption: text.trim() || undefined,
        },
      });
      setText("");
    } catch (e: any) {
      toast({ title: "Falha ao enviar arquivo", description: e.message, variant: "destructive" });
    }
  };

  const header = nome || formatTel(telefone);

  // Agrupar mensagens por data
  const groups = useMemo(() => {
    const result: { date: string; msgs: WhatsAppMessage[] }[] = [];
    let lastDate = "";
    for (const m of messages) {
      const d = new Date(m.criado_em).toLocaleDateString("pt-BR");
      if (d !== lastDate) {
        result.push({ date: d, msgs: [] });
        lastDate = d;
      }
      result[result.length - 1].msgs.push(m);
    }
    return result;
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-muted/20">
      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shadow-sm">
        <button onClick={onOpenInfo} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80">
          <ContactAvatar name={header} url={avatarUrl} isGroup={isGroup} size="md" />
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-sm truncate">{header}</p>
            <p className="text-xs text-muted-foreground">
              {isGroup
                ? `Grupo · ${participantsCount ?? "?"} participantes`
                : formatTel(telefone)}
            </p>
          </div>
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Buscar">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ligar">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Mais" onClick={onOpenInfo}>
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* ═══ Mensagens ═══ */}
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
            <div key={gi} className="space-y-1">
              <div className="flex justify-center my-3">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
                  {g.date}
                </Badge>
              </div>
              {g.msgs.map((m, idx) => {
                const mine = m.direction === "out";
                const details = m.uazapi_details;
                const prev = idx > 0 ? g.msgs[idx - 1] : null;
                const prevSame = prev && prev.direction === m.direction
                  && prev.uazapi_details?.sender_jid === details?.sender_jid;
                const showSenderInGroup = isGroup && !mine && !prevSame;
                const deleted = !!details?.deleted_at;

                return (
                  <div
                    key={m.id}
                    className={cn("group flex items-end gap-1", mine ? "justify-end" : "justify-start")}
                  >
                    {!mine && isGroup && !prevSame && (
                      <ContactAvatar
                        name={details?.sender_name}
                        url={details?.sender_avatar_url}
                        size="sm"
                        className="h-7 w-7 shrink-0"
                      />
                    )}
                    {!mine && isGroup && prevSame && <div className="w-7 shrink-0" />}

                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-2.5 py-1.5 shadow-sm relative",
                        mine
                          ? "bg-[#d9fdd3] dark:bg-emerald-900/30 text-foreground rounded-tr-none"
                          : "bg-white dark:bg-card text-foreground rounded-tl-none",
                      )}
                    >
                      {/* Sender em grupo */}
                      {showSenderInGroup && (
                        <GroupSenderHeader
                          name={details?.sender_name}
                          avatarUrl={details?.sender_avatar_url}
                          showAvatar={false}
                        />
                      )}

                      {/* Badge atendente quando mine */}
                      {mine && m.colaborador_nome_snap && (
                        <AttendantBadge name={m.colaborador_nome_snap} />
                      )}

                      {/* Mensagem citada */}
                      {details?.quoted_external_id && (
                        <QuotedMessage
                          senderName={null}
                          body={details.quoted_body}
                        />
                      )}

                      {/* Mídia */}
                      {m.media ? (
                        <MediaBubble
                          media={m.media}
                          caption={m.body}
                          fallbackType={m.tipo}
                          fallbackUrl={m.media_url}
                          onRetry={() => msgAction.mutate({
                            instance_id: instanceId,
                            action: "download",
                            message_external_id: m.message_external_id,
                          })}
                        />
                      ) : (m.media_url && !m.body) ? (
                        <MediaBubble
                          media={null}
                          fallbackType={m.tipo}
                          fallbackUrl={m.media_url}
                        />
                      ) : null}

                      {/* Texto */}
                      {m.body && !m.media && (
                        <p className={cn(
                          "text-sm whitespace-pre-wrap break-words",
                          deleted && "italic text-muted-foreground",
                        )}>
                          {deleted ? "🚫 Mensagem apagada" : m.body}
                        </p>
                      )}

                      {/* Footer: horário + status */}
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {details?.edited_at && (
                          <span className="text-[10px] text-muted-foreground italic mr-1">editada</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(m.criado_em)}
                        </span>
                        {mine && <StatusIcon status={m.status} />}
                      </div>

                      {/* Erro */}
                      {m.error && (
                        <p className="text-[10px] text-destructive mt-0.5">{m.error}</p>
                      )}

                      {/* Ações (hover) */}
                      <div className="absolute top-1 right-1">
                        <MessageActionsMenu
                          message={m}
                          onReply={(msg) => setReplyingTo(msg)}
                          onReact={(msg) => {
                            // Simplified: pick a default; ideally open emoji picker
                            handleReact(msg, "👍");
                          }}
                          onPin={handlePin}
                          onCopy={handleCopy}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      </div>
                    </div>

                    {/* Reações */}
                    {details?.reactions && details.reactions.length > 0 && (
                      <ReactionsBar reactions={details.reactions} className="mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* ═══ Reply preview ═══ */}
      {replyingTo && (
        <div className="flex items-start gap-2 px-3 py-2 bg-background border-t">
          <div className="flex-1">
            <QuotedMessage
              senderName={replyingTo.uazapi_details?.sender_name || (replyingTo.direction === "out" ? "Você" : "Cliente")}
              body={replyingTo.body || "(mídia)"}
            />
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}>
            ✕
          </Button>
        </div>
      )}

      {/* ═══ Input ═══ */}
      <div className="p-3 border-t bg-background">
        <div className="flex items-end gap-2">
          <AttachmentPicker
            onPickFile={handleAttach}
            onPickLocation={() => setDialogLocation(true)}
            onPickContact={() => setDialogContact(true)}
            onPickPix={() => setDialogPix(true)}
            onPickPoll={() => setDialogPoll(true)}
            onPickPayment={() => setDialogPayment(true)}
          />
          <EmojiPicker onPick={(e) => setText(text + e)} />
          <Textarea
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
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

      {/* Diálogos interativos */}
      <SendLocationDialog
        instanceId={instanceId} chatJid={chatJid} telefone={telefone} associadoId={associadoId}
        open={dialogLocation} onOpenChange={setDialogLocation}
      />
      <SendContactDialog
        instanceId={instanceId} chatJid={chatJid} telefone={telefone} associadoId={associadoId}
        open={dialogContact} onOpenChange={setDialogContact}
      />
      <SendPixDialog
        instanceId={instanceId} chatJid={chatJid} telefone={telefone} associadoId={associadoId}
        open={dialogPix} onOpenChange={setDialogPix}
      />
      <SendPollDialog
        instanceId={instanceId} chatJid={chatJid} telefone={telefone} associadoId={associadoId}
        open={dialogPoll} onOpenChange={setDialogPoll}
      />
      <SendPaymentDialog
        instanceId={instanceId} chatJid={chatJid} telefone={telefone} associadoId={associadoId}
        open={dialogPayment} onOpenChange={setDialogPayment}
      />
    </div>
  );
}

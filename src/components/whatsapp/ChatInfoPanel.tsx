import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, Users, MessageSquare, Tag, UserCheck, Trash2, Plus, Loader2,
  FileText, ArrowRightLeft,
} from "lucide-react";
import { ContactAvatar } from "./ContactAvatar";
import {
  useGroup,
  useChatNotes,
  useChatNoteActions,
  useLead,
  useLabels,
  useChatLabels,
  useLabelAction,
  useChatAssignment,
  useAssignmentAction,
} from "@/hooks/useWhatsApp";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  instanceId: string;
  chatJid: string;
  telefone: string;
  nome?: string | null;
  avatarUrl?: string | null;
  isGroup?: boolean;
  associadoId?: string | null;
  onClose: () => void;
  onTransfer?: () => void;
}

export function ChatInfoPanel({
  instanceId, chatJid, telefone, nome, avatarUrl, isGroup, associadoId, onClose, onTransfer,
}: Props) {
  const { toast } = useToast();
  const { user, fullName } = useAuth();

  // Queries
  const { data: group } = useGroup(instanceId, isGroup ? chatJid : null);
  const { data: notes = [], isLoading: loadingNotes } = useChatNotes(instanceId, chatJid);
  const { data: lead } = useLead(instanceId, chatJid);
  const { data: allLabels = [] } = useLabels(instanceId);
  const { data: chatLabels = [] } = useChatLabels(instanceId, chatJid);
  const { data: assignment } = useChatAssignment(instanceId, chatJid);

  // Mutations
  const noteAction = useChatNoteActions();
  const labelAction = useLabelAction();
  const assignAction = useAssignmentAction();

  // State
  const [newNote, setNewNote] = useState("");

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await noteAction.mutateAsync({
        instance_id: instanceId,
        chat_jid: chatJid,
        action: "notes_internal_add",
        conteudo: newNote,
        colaborador_id: user?.id,
        colaborador_nome: fullName,
      });
      setNewNote("");
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await noteAction.mutateAsync({
        instance_id: instanceId,
        chat_jid: chatJid,
        action: "notes_internal_delete",
        note_id: noteId,
      });
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const toggleLabel = async (labelExtId: string, isApplied: boolean) => {
    try {
      if (isApplied) {
        await labelAction.mutateAsync({
          instance_id: instanceId,
          action: "remove_from_chat",
          chat_jid: chatJid,
          label_external_id: labelExtId,
        });
      } else {
        const currentIds = chatLabels.map((cl: any) => cl.label?.external_id).filter(Boolean);
        await labelAction.mutateAsync({
          instance_id: instanceId,
          action: "apply_to_chat",
          chat_jid: chatJid,
          label_external_ids: [...currentIds, labelExtId],
        });
      }
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const selfAssign = async () => {
    try {
      const r = await assignAction.mutateAsync({
        instance_id: instanceId,
        action: "assign",
        chat_jid: chatJid,
        colaborador_id: user?.id,
        atribuido_por: user?.id,
      });
      if (r?.locked) {
        toast({ title: "Conversa em atendimento", description: r.error, variant: "destructive" });
      } else {
        toast({ title: "Atendimento iniciado" });
      }
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const release = async () => {
    try {
      await assignAction.mutateAsync({
        instance_id: instanceId,
        action: "release",
        chat_jid: chatJid,
      });
      toast({ title: "Atendimento liberado" });
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const chatLabelIds = new Set(chatLabels.map((cl: any) => cl.label?.external_id).filter(Boolean));

  return (
    <div className="w-80 border-l bg-background flex flex-col shrink-0">
      <div className="flex items-center justify-between p-3 border-b">
        <p className="font-semibold text-sm">Info</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Avatar + nome */}
          <div className="flex flex-col items-center gap-2">
            <ContactAvatar name={nome} url={avatarUrl} isGroup={isGroup} size="xl" />
            <p className="font-semibold text-center">{nome || telefone}</p>
            {isGroup ? (
              <p className="text-xs text-muted-foreground">
                Grupo · {group?.participants_count ?? "?"} participantes
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{telefone}</p>
            )}
            {group?.descricao && (
              <p className="text-xs text-center text-muted-foreground italic line-clamp-3">
                "{group.descricao}"
              </p>
            )}
          </div>

          {/* Atendimento */}
          {!isGroup && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Atendimento</p>
              {assignment ? (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-medium">
                      {(assignment as any).profiles?.full_name || "Atendente"}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Desde {new Date((assignment as any).atribuido_em).toLocaleString("pt-BR")}
                  </p>
                  <div className="flex gap-1 mt-2">
                    {(assignment as any).colaborador_id === user?.id && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onTransfer}>
                          <ArrowRightLeft className="h-3 w-3 mr-1" /> Transferir
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={release}>
                          Liberar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <Button size="sm" onClick={selfAssign} disabled={assignAction.isPending} className="w-full">
                  {assignAction.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  Iniciar atendimento
                </Button>
              )}
            </div>
          )}

          {/* Etiquetas */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
              <Tag className="h-3 w-3" /> Etiquetas
            </p>
            {allLabels.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem etiquetas. Crie em Conversas &gt; Etiquetas</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {allLabels.map((l: any) => {
                  const applied = chatLabelIds.has(l.external_id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleLabel(l.external_id, applied)}
                      className={cn(
                        "text-[10px] px-2 py-1 rounded-full font-medium border transition-opacity",
                        applied ? "opacity-100" : "opacity-40 hover:opacity-70",
                      )}
                      style={{
                        backgroundColor: (l.cor || "#3b82f6") + "20",
                        borderColor: l.cor || "#3b82f6",
                        color: l.cor || "#3b82f6",
                      }}
                    >
                      {l.nome}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lead info (CRM) */}
          {lead && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Lead (CRM)</p>
              <div className="space-y-1.5 text-xs rounded-lg bg-muted/30 p-2">
                {lead.lead_name && <div><span className="text-muted-foreground">Nome:</span> <strong>{lead.lead_name}</strong></div>}
                {lead.lead_email && <div><span className="text-muted-foreground">E-mail:</span> {lead.lead_email}</div>}
                {lead.lead_personalid && <div><span className="text-muted-foreground">CPF:</span> {lead.lead_personalid}</div>}
                {lead.lead_status && (
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <Badge variant="outline" className="text-[10px]">{lead.lead_status}</Badge>
                  </div>
                )}
                {lead.lead_notes && (
                  <div>
                    <span className="text-muted-foreground">Anotações:</span>
                    <p className="mt-0.5 italic">{lead.lead_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Participantes do grupo */}
          {isGroup && group?.participants && group.participants.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3" /> Participantes ({group.participants_count})
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {group.participants.slice(0, 50).map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 py-1">
                    <ContactAvatar
                      name={p.DisplayName || p.PhoneNumber || p.JID}
                      size="sm"
                      className="h-6 w-6"
                    />
                    <p className="text-xs truncate flex-1">
                      {p.DisplayName || p.PhoneNumber || p.JID?.split("@")[0]}
                    </p>
                    {p.IsAdmin && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">admin</Badge>
                    )}
                  </div>
                ))}
                {group.participants.length > 50 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    + {group.participants.length - 50} outros
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notas internas */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
              <FileText className="h-3 w-3" /> Notas internas
            </p>
            <div className="flex gap-1">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Nova nota..."
                rows={2}
                className="text-xs resize-none"
              />
              <Button
                size="icon"
                onClick={addNote}
                disabled={!newNote.trim() || noteAction.isPending}
                className="h-9 w-9 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1.5">
              {loadingNotes ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
              ) : notes.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Sem notas ainda</p>
              ) : (
                notes.map((n: any) => (
                  <div key={n.id} className="rounded-md bg-warning/5 border border-warning/20 p-2 group relative">
                    <p className="text-xs whitespace-pre-wrap break-words">{n.conteudo}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {n.criado_por_nome || "Equipe"} · {new Date(n.criado_em).toLocaleString("pt-BR")}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteNote(n.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

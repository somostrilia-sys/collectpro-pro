import { useState } from "react";
import { useGroups, useGroupAction } from "@/hooks/useWhatsApp";
import { ContactAvatar } from "../ContactAvatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Users, Loader2, Link as LinkIcon, LogOut, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  instanceId: string | null;
}

export function GroupsTab({ instanceId }: Props) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [dialogNew, setDialogNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParticipants, setNewParticipants] = useState("");

  const { data: groups = [], isLoading } = useGroups(instanceId, q);
  const action = useGroupAction();

  const handleCreate = async () => {
    if (!instanceId || !newName.trim()) return;
    const participants = newParticipants
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (participants.length === 0) {
      toast({ title: "Adicione pelo menos 1 participante", variant: "destructive" });
      return;
    }
    try {
      await action.mutateAsync({
        instance_id: instanceId,
        action: "create",
        name: newName,
        participants,
      });
      toast({ title: "Grupo criado!" });
      setDialogNew(false);
      setNewName("");
      setNewParticipants("");
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const handleLeave = async (groupJid: string, name: string | null) => {
    if (!instanceId) return;
    if (!confirm(`Sair do grupo "${name || groupJid}"?`)) return;
    try {
      await action.mutateAsync({
        instance_id: instanceId,
        action: "leave",
        group_jid: groupJid,
      });
      toast({ title: "Saiu do grupo" });
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const handleSync = async () => {
    if (!instanceId) return;
    try {
      await action.mutateAsync({
        instance_id: instanceId,
        action: "list_paginated",
        limit: 200,
      });
      toast({ title: "Grupos sincronizados" });
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  if (!instanceId) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Selecione uma instância</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar grupo..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSync}>Sincronizar</Button>
        <Button size="sm" onClick={() => setDialogNew(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo grupo
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhum grupo ainda. Clique em "Sincronizar" pra puxar do WhatsApp.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groups.map((g) => (
              <Card key={g.id} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-3 flex items-start gap-3">
                  <ContactAvatar name={g.nome} url={g.avatar_url} isGroup size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{g.nome || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {g.descricao || "Sem descrição"}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        <Users className="h-2.5 w-2.5 mr-1" /> {g.participants_count} membros
                      </Badge>
                      {g.is_announce && (
                        <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                          Só admins enviam
                        </Badge>
                      )}
                      {g.is_locked && (
                        <Badge variant="outline" className="text-[10px]">Info travada</Badge>
                      )}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {g.invite_link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { navigator.clipboard.writeText(g.invite_link!); toast({ title: "Link copiado" }); }}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" /> Link
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <Edit className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={() => handleLeave(g.group_jid, g.nome)}
                      >
                        <LogOut className="h-3 w-3 mr-1" /> Sair
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: criar grupo */}
      <Dialog open={dialogNew} onOpenChange={setDialogNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome do grupo *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Participantes (JIDs separados por vírgula ou quebra)</Label>
              <Textarea
                value={newParticipants}
                onChange={(e) => setNewParticipants(e.target.value)}
                placeholder="5511999998888@s.whatsapp.net, 5511988887777@s.whatsapp.net"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Cada número com @s.whatsapp.net</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={action.isPending}>
              {action.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Criar grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

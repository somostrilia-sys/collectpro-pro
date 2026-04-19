import { useState } from "react";
import { useQuickReplies, useQuickReplyAction } from "@/hooks/useWhatsApp";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Zap, Plus, Loader2, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { instanceId: string | null; }

export function QuickRepliesTab({ instanceId }: Props) {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const { data: replies = [], isLoading } = useQuickReplies(instanceId, user?.id);
  const action = useQuickReplyAction();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [atalho, setAtalho] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [global, setGlobal] = useState(false);

  const canGlobal = role === "Admin" || role === "Gestora";

  const openNew = () => {
    setEditingId(null); setAtalho(""); setConteudo(""); setCategoria(""); setGlobal(false); setDialogOpen(true);
  };
  const openEdit = (r: any) => {
    setEditingId(r.id); setAtalho(r.atalho); setConteudo(r.conteudo);
    setCategoria(r.categoria || ""); setGlobal(r.global); setDialogOpen(true);
  };

  const save = async () => {
    if (!instanceId || !atalho.trim() || !conteudo.trim()) return;
    try {
      if (editingId) {
        await action.mutateAsync({
          instance_id: instanceId,
          action: "update",
          id: editingId,
          atalho, conteudo, categoria: categoria || null,
        });
      } else {
        await action.mutateAsync({
          instance_id: instanceId,
          action: "create",
          atalho, conteudo,
          categoria: categoria || null,
          global: canGlobal && global,
          colaborador_id: user?.id,
        });
      }
      toast({ title: editingId ? "Atualizado" : "Criado" });
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const del = async (r: any) => {
    if (!instanceId) return;
    if (!confirm(`Apagar "${r.atalho}"?`)) return;
    try {
      await action.mutateAsync({ instance_id: instanceId, action: "delete", id: r.id });
      toast({ title: "Apagado" });
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  if (!instanceId) return <div className="p-8 text-center text-muted-foreground text-sm">Selecione uma instância</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <p className="text-sm font-medium">{replies.length} respostas</p>
          <p className="text-[11px] text-muted-foreground">Use <code className="bg-muted px-1 rounded">/atalho</code> no chat</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Nova resposta
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma resposta rápida ainda
          </div>
        ) : (
          <div className="space-y-2">
            {replies.map((r) => (
              <Card key={r.id} className="border-0 shadow-sm">
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <code className="text-sm font-bold bg-muted px-1.5 py-0.5 rounded">/{r.atalho}</code>
                        {r.categoria && <Badge variant="outline" className="text-[10px]">{r.categoria}</Badge>}
                        {r.global && <Badge className="text-[10px] bg-success/10 text-success border-0">Global</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap break-words">
                        {r.conteudo}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar resposta" : "Nova resposta rápida"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Atalho * (sem a /)</Label>
              <Input value={atalho} onChange={(e) => setAtalho(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))} />
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo *</Label>
              <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={5} />
              <p className="text-[11px] text-muted-foreground">
                Use {`{nome}`}, {`{valor}`} etc como variáveis
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="cobranca, duvidas..." />
              </div>
              {canGlobal && (
                <div className="flex items-center gap-2 mt-5">
                  <Switch checked={global} onCheckedChange={setGlobal} />
                  <Label className="cursor-pointer">Global (todos atendentes)</Label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={action.isPending}>
              {action.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

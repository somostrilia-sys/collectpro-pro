import { useState } from "react";
import { useLabels, useLabelAction } from "@/hooks/useWhatsApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tag, Plus, Loader2, Trash2, Edit, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LABEL_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#a855f7",
];

interface Props { instanceId: string | null; }

export function LabelsTab({ instanceId }: Props) {
  const { toast } = useToast();
  const { data: labels = [], isLoading } = useLabels(instanceId);
  const action = useLabelAction();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingExtId, setEditingExtId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(LABEL_COLORS[0]);

  const openNew = () => { setEditingId(null); setEditingExtId(null); setNome(""); setCor(LABEL_COLORS[0]); setDialogOpen(true); };
  const openEdit = (l: any) => { setEditingId(l.id); setEditingExtId(l.external_id); setNome(l.nome); setCor(l.cor || LABEL_COLORS[0]); setDialogOpen(true); };

  const save = async () => {
    if (!instanceId || !nome.trim()) return;
    try {
      if (editingExtId) {
        await action.mutateAsync({ instance_id: instanceId, action: "update", external_id: editingExtId, nome, cor });
      } else {
        await action.mutateAsync({ instance_id: instanceId, action: "create", nome, cor });
      }
      toast({ title: editingExtId ? "Etiqueta atualizada" : "Etiqueta criada" });
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const del = async (l: any) => {
    if (!instanceId) return;
    if (!confirm(`Apagar etiqueta "${l.nome}"?`)) return;
    try {
      await action.mutateAsync({ instance_id: instanceId, action: "delete", external_id: l.external_id });
      toast({ title: "Etiqueta apagada" });
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const refresh = async () => {
    if (!instanceId) return;
    try {
      await action.mutateAsync({ instance_id: instanceId, action: "refresh" });
      await action.mutateAsync({ instance_id: instanceId, action: "list" });
      toast({ title: "Etiquetas sincronizadas" });
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  if (!instanceId) return <div className="p-8 text-center text-muted-foreground text-sm">Selecione uma instância</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <p className="text-sm font-medium">{labels.length} etiqueta(s)</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sincronizar
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nova etiqueta
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : labels.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma etiqueta ainda
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {labels.map((l) => (
              <Card key={l.id} className="border-0 shadow-sm">
                <CardContent className="flex items-center gap-3 py-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (l.cor || "#3b82f6") + "20" }}
                  >
                    <Tag className="h-5 w-5" style={{ color: l.cor || "#3b82f6" }} />
                  </div>
                  <p className="flex-1 font-medium text-sm truncate">{l.nome}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del(l)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExtId ? "Editar etiqueta" : "Nova etiqueta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <UILabel>Nome *</UILabel>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <UILabel>Cor</UILabel>
              <div className="flex gap-1 flex-wrap">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={`h-8 w-8 rounded-full border-2 ${cor === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
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

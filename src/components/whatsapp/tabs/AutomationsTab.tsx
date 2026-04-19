import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Plus, Trash2, Edit, Loader2, Clock, MessageCircle, Tag, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLabels } from "@/hooks/useWhatsApp";

interface Props { instanceId: string | null; }

const TIPO_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  saudacao_inicial: { label: "Saudação inicial", icon: MessageCircle, color: "text-sky-600" },
  fora_horario: { label: "Fora de horário", icon: Clock, color: "text-amber-600" },
  keyword_reply: { label: "Resposta por palavra-chave", icon: MessageCircle, color: "text-violet-600" },
  keyword_label: { label: "Etiquetar por palavra-chave", icon: Tag, color: "text-emerald-600" },
  follow_up: { label: "Follow-up automático", icon: Repeat, color: "text-rose-600" },
};

export function AutomationsTab({ instanceId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["whatsapp-automations", instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      const { data } = await (supabase as any).from("whatsapp_automations")
        .select("*")
        .eq("instance_id", instanceId)
        .order("prioridade", { ascending: false });
      return data || [];
    },
    enabled: !!instanceId,
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await (supabase as any).from("whatsapp_automations").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("whatsapp_automations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-automations", instanceId] });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("whatsapp_automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-automations", instanceId] }),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<keyof typeof TIPO_LABELS>("saudacao_inicial");
  const [ativo, setAtivo] = useState(true);
  const [prioridade, setPrioridade] = useState(0);
  const [mensagem, setMensagem] = useState("");
  const [keywords, setKeywords] = useState("");
  const [stopOnMatch, setStopOnMatch] = useState(false);
  const [horaInicio, setHoraInicio] = useState(8);
  const [horaFim, setHoraFim] = useState(20);
  const [hoursDelay, setHoursDelay] = useState(24);
  const [labelExtId, setLabelExtId] = useState("");

  const { data: labels = [] } = useLabels(instanceId);

  const openNew = () => {
    setEditing(null); setNome(""); setTipo("saudacao_inicial"); setAtivo(true);
    setPrioridade(0); setMensagem(""); setKeywords(""); setStopOnMatch(false);
    setHoraInicio(8); setHoraFim(20); setHoursDelay(24); setLabelExtId("");
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    const cfg = a.config || {};
    setEditing(a); setNome(a.nome); setTipo(a.tipo); setAtivo(a.ativo); setPrioridade(a.prioridade ?? 0);
    setMensagem(cfg.mensagem || "");
    setKeywords(Array.isArray(cfg.keywords) ? cfg.keywords.join(", ") : "");
    setStopOnMatch(cfg.stop_on_match === true);
    setHoraInicio(cfg.hora_inicio ?? 8);
    setHoraFim(cfg.hora_fim ?? 20);
    setHoursDelay(cfg.hours_delay ?? 24);
    setLabelExtId(cfg.label_external_id || "");
    setDialogOpen(true);
  };

  const saveHandler = async () => {
    if (!instanceId || !nome.trim()) return;
    const config: any = { mensagem };
    if (tipo === "keyword_reply" || tipo === "keyword_label") {
      config.keywords = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      if (tipo === "keyword_reply") config.stop_on_match = stopOnMatch;
      if (tipo === "keyword_label") config.label_external_id = labelExtId;
    }
    if (tipo === "fora_horario") {
      config.hora_inicio = horaInicio;
      config.hora_fim = horaFim;
    }
    if (tipo === "follow_up") config.hours_delay = hoursDelay;

    try {
      await save.mutateAsync({
        id: editing?.id,
        instance_id: instanceId,
        tipo,
        nome,
        ativo,
        prioridade,
        config,
      });
      toast({ title: editing ? "Automação atualizada" : "Automação criada" });
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  const toggleActive = async (a: any) => {
    await save.mutateAsync({ id: a.id, ativo: !a.ativo });
  };

  const delHandler = async (a: any) => {
    if (!confirm(`Apagar "${a.nome}"?`)) return;
    try {
      await del.mutateAsync(a.id);
      toast({ title: "Apagada" });
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  if (!instanceId) return <div className="p-8 text-center text-muted-foreground text-sm">Selecione uma instância</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <p className="text-sm font-medium">{list.length} automação(ões)</p>
          <p className="text-[11px] text-muted-foreground">Disparadas automaticamente quando chega mensagem</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma automação. Crie uma pra responder clientes automaticamente.
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((a: any) => {
              const tipoInfo = TIPO_LABELS[a.tipo] || { label: a.tipo, icon: Bot, color: "" };
              const Icon = tipoInfo.icon;
              return (
                <Card key={a.id} className={`border-0 shadow-sm ${!a.ativo ? "opacity-50" : ""}`}>
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2 shrink-0">
                      <Icon className={`h-4 w-4 ${tipoInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-medium text-sm">{a.nome}</p>
                        <Badge variant="outline" className="text-[10px]">{tipoInfo.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {a.config?.mensagem || "—"}
                      </p>
                    </div>
                    <Switch checked={a.ativo} onCheckedChange={() => toggleActive(a)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => delHandler(a)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar automação" : "Nova automação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(tipo === "saudacao_inicial" || tipo === "fora_horario" || tipo === "keyword_reply" || tipo === "follow_up") && (
              <div>
                <Label>Mensagem de resposta</Label>
                <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={3} />
              </div>
            )}

            {(tipo === "keyword_reply" || tipo === "keyword_label") && (
              <div>
                <Label>Palavras-chave (separadas por vírgula)</Label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="boleto, pagar, cancelar" />
              </div>
            )}

            {tipo === "keyword_reply" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={stopOnMatch} onChange={(e) => setStopOnMatch(e.target.checked)} />
                Parar outras automações após disparar esta
              </label>
            )}

            {tipo === "keyword_label" && (
              <div>
                <Label>Etiqueta a aplicar</Label>
                <Select value={labelExtId} onValueChange={setLabelExtId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {labels.filter((l: any) => l.external_id).map((l: any) => (
                      <SelectItem key={l.id} value={l.external_id!}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipo === "fora_horario" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hora início (permitido)</Label>
                  <Input type="number" min="0" max="23" value={horaInicio} onChange={(e) => setHoraInicio(parseInt(e.target.value))} />
                </div>
                <div>
                  <Label>Hora fim (permitido)</Label>
                  <Input type="number" min="1" max="24" value={horaFim} onChange={(e) => setHoraFim(parseInt(e.target.value))} />
                </div>
              </div>
            )}

            {tipo === "follow_up" && (
              <div>
                <Label>Horas para follow-up</Label>
                <Input type="number" min="1" value={hoursDelay} onChange={(e) => setHoursDelay(parseInt(e.target.value))} />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Se cliente não responder em {hoursDelay}h, envia a mensagem. Se responder antes, cancela.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridade</Label>
                <Input type="number" value={prioridade} onChange={(e) => setPrioridade(parseInt(e.target.value) || 0)} />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <Switch checked={ativo} onCheckedChange={setAtivo} />
                <Label>Ativa</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveHandler} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

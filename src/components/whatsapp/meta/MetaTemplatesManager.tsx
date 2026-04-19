import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { FileText, RefreshCw, Plus, Trash2, Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";

interface Props {
  instanceId: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  UTILITY: "border-blue-500/50 text-blue-600",
  MARKETING: "border-purple-500/50 text-purple-600",
  AUTHENTICATION: "border-orange-500/50 text-orange-600",
};

const STATUS_ICONS: Record<string, any> = {
  APPROVED: CheckCircle2,
  PENDING: Clock,
  REJECTED: XCircle,
  PAUSED: AlertCircle,
  DISABLED: XCircle,
};

export function MetaTemplatesManager({ instanceId }: Props) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["meta_templates_mgr", instanceId, statusFilter],
    queryFn: async () => {
      if (!instanceId) return [];
      const { data } = await supabase.functions.invoke("whatsapp-meta-templates", {
        body: { instance_id: instanceId, action: "list_local", status: statusFilter || undefined },
      });
      return (data?.templates ?? []) as any[];
    },
    enabled: !!instanceId,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!instanceId) throw new Error("instance_id");
      const { data, error } = await supabase.functions.invoke("whatsapp-meta-templates", {
        body: { instance_id: instanceId, action: "sync" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (r) => {
      toast({ title: "Sincronização concluída", description: `${r?.synced ?? 0} templates atualizados` });
      qc.invalidateQueries({ queryKey: ["meta_templates_mgr"] });
      qc.invalidateQueries({ queryKey: ["meta_templates_local"] });
    },
    onError: (e: any) => toast({ title: "Erro na sincronização", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-meta-templates", {
        body: { instance_id: instanceId, action: "delete", name },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Template deletado" });
      qc.invalidateQueries({ queryKey: ["meta_templates_mgr"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (!instanceId) {
    return (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
        Selecione uma instância Meta oficial pra gerenciar templates.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Status:</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="APPROVED">Aprovados</SelectItem>
              <SelectItem value="PENDING">Pendentes</SelectItem>
              <SelectItem value="REJECTED">Rejeitados</SelectItem>
              <SelectItem value="PAUSED">Pausados</SelectItem>
              <SelectItem value="DISABLED">Desabilitados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Sincronizar com Meta
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Criar template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : templates.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum template ainda. Clique em "Sincronizar com Meta" pra importar ou "Criar template".
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t: any) => {
            const StatusIcon = STATUS_ICONS[t.status] ?? Clock;
            const bodyComp = (t.components || []).find((c: any) => c.type === "BODY");
            return (
              <Card key={t.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{t.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[t.category] ?? ""}`}>
                        {t.category}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <StatusIcon className="h-2.5 w-2.5" />
                        {t.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{t.language}</Badge>
                      {t.quality_score && (
                        <Badge
                          className={`text-[10px] ${
                            t.quality_score === "GREEN" ? "bg-emerald-100 text-emerald-700" :
                            t.quality_score === "YELLOW" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}
                        >
                          ⭐ {t.quality_score}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {bodyComp?.text ?? "—"}
                    </p>
                    {t.rejection_reason && (
                      <p className="text-[11px] text-destructive mt-1">Rejeitado: {t.rejection_reason}</p>
                    )}
                  </div>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => {
                      if (confirm(`Deletar template "${t.name}"?`)) deleteMutation.mutate(t.name);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        instanceId={instanceId}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["meta_templates_mgr"] })}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════

function CreateTemplateDialog({
  open, onOpenChange, instanceId, onSuccess,
}: { open: boolean; onOpenChange: (v: boolean) => void; instanceId: string; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"UTILITY" | "MARKETING" | "AUTHENTICATION">("UTILITY");
  const [language, setLanguage] = useState("pt_BR");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [sending, setSending] = useState(false);

  const handleCreate = async () => {
    if (!name || !body) {
      toast({ title: "Preencha nome e corpo", variant: "destructive" });
      return;
    }
    // Normaliza nome: snake_case minúsculo (Meta exige)
    const normalizedName = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    const components: any[] = [
      { type: "BODY", text: body },
    ];
    if (footer) components.push({ type: "FOOTER", text: footer });

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-meta-templates", {
        body: {
          instance_id: instanceId,
          action: "create",
          name: normalizedName,
          category,
          language,
          components,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha na criação");
      toast({ title: "Template enviado à Meta", description: "Aprovação em 15-30 min" });
      onSuccess();
      onOpenChange(false);
      setName(""); setBody(""); setFooter("");
    } catch (e: any) {
      toast({ title: "Erro criando template", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Criar template Meta</DialogTitle>
          <DialogDescription>
            Use variáveis como {"{{nome}}"}, {"{{valor}}"}, {"{{atendente}}"} pra deixar o template dinâmico.
            Aprovação da Meta leva 15-30 min.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome (snake_case)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cobranca_vencimento"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY">UTILITY (cobrança/serviço — grátis na janela)</SelectItem>
                  <SelectItem value="MARKETING">MARKETING (promoção)</SelectItem>
                  <SelectItem value="AUTHENTICATION">AUTHENTICATION (OTP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt_BR">Português (BR)</SelectItem>
                  <SelectItem value="en_US">English (US)</SelectItem>
                  <SelectItem value="es_ES">Español (ES)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Corpo da mensagem</Label>
            <Textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Olá {{nome}}, seu boleto no valor de {{valor}} vence em {{vencimento}}. Acesse: {{link}}"
            />
            <p className="text-[10px] text-muted-foreground">
              Não use frases promocionais agressivas em UTILITY (Meta recategoriza pra MARKETING e cobra).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Rodapé (opcional)</Label>
            <Input
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="Para parar, responda PARAR"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar pra aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

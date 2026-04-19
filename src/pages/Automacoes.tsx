// Automações — UI de criação/edição de regras Camada 1 (Auto keyword → ação)
// + Config de IA por setor (Camada 2)
// Localizada no CollectPro (Hub) — administra regras pros 4 setores

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Edit, Bot, MessageSquare, ArrowRightLeft, CheckCircle,
  Zap, Settings, AlertTriangle, Loader2, Brain,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SETORES = [
  { slug: "cobranca", nome: "Cobrança",       cor: "text-rose-600"   },
  { slug: "evento",   nome: "Eventos",        cor: "text-amber-600"  },
  { slug: "track",    nome: "Rastreamento",   cor: "text-emerald-600"},
  { slug: "gestao",   nome: "Gestão",         cor: "text-blue-600"   },
  { slug: "geral",    nome: "Geral",          cor: "text-slate-600"  },
];

const TIPOS_ACAO = [
  { value: "resposta_texto",    label: "Responder com texto",        icon: MessageSquare },
  { value: "template",          label: "Enviar template Meta",       icon: MessageSquare },
  { value: "transferir_setor",  label: "Transferir pra setor",       icon: ArrowRightLeft },
  { value: "acionar_ia",        label: "Acionar IA (Claude)",        icon: Bot },
  { value: "encerrar",          label: "Encerrar atendimento",       icon: CheckCircle },
];

interface Automacao {
  id: string;
  nome: string;
  setor: string | null;
  keywords: string[];
  tipo: string;
  resposta_texto: string | null;
  template_id: string | null;
  setor_destino: string | null;
  prioridade: number;
  ativo: boolean;
}

interface IaConfig {
  id: string;
  setor: string;
  ativo: boolean;
  modelo: string;
  system_prompt: string;
  max_tokens: number;
  temperature: number;
  fallback_humano_threshold: number;
  auto_responder: boolean;
  contexto_msgs: number;
}

// ─── Automação CRUD ─────────────────────────────────────────────────────

function AutomacoesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Automacao> | null>(null);
  const [kwInput, setKwInput] = useState("");

  const { data: automacoes = [], isLoading } = useQuery<Automacao[]>({
    queryKey: ["automacoes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_automacoes")
        .select("*")
        .order("prioridade", { ascending: false });
      if (error) throw error;
      return (data || []) as Automacao[];
    },
  });

  const save = useMutation({
    mutationFn: async (a: Partial<Automacao>) => {
      const payload = {
        nome: a.nome, setor: a.setor, keywords: a.keywords,
        tipo: a.tipo, resposta_texto: a.resposta_texto, template_id: a.template_id,
        setor_destino: a.setor_destino, prioridade: a.prioridade ?? 10, ativo: a.ativo ?? true,
      };
      if (a.id) {
        const { error } = await (supabase as any).from("whatsapp_automacoes").update(payload).eq("id", a.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("whatsapp_automacoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automacoes"] });
      setEditing(null);
      toast({ title: "Automação salva" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("whatsapp_automacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automacoes"] });
      toast({ title: "Removida" });
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await (supabase as any).from("whatsapp_automacoes").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automacoes"] }),
  });

  const openEdit = (a?: Automacao) => {
    setEditing(a ? { ...a } : {
      nome: "", setor: "geral", keywords: [], tipo: "resposta_texto",
      prioridade: 10, ativo: true,
    });
  };

  const addKw = () => {
    if (!kwInput.trim() || !editing) return;
    setEditing({ ...editing, keywords: [...(editing.keywords || []), kwInput.trim().toLowerCase()] });
    setKwInput("");
  };

  const rmKw = (i: number) => {
    if (!editing) return;
    const ks = [...(editing.keywords || [])];
    ks.splice(i, 1);
    setEditing({ ...editing, keywords: ks });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Regras de Automação (Camada 1)</h2>
          <p className="text-xs text-muted-foreground">Cliente envia mensagem → sistema matcha keyword → executa ação. Ordem por prioridade.</p>
        </div>
        <Button size="sm" onClick={() => openEdit()}>
          <Plus className="h-4 w-4 mr-1.5" /> Nova regra
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-2">
          {automacoes.map((a) => {
            const tipoMeta = TIPOS_ACAO.find((t) => t.value === a.tipo);
            const setorMeta = SETORES.find((s) => s.slug === a.setor);
            const Icon = tipoMeta?.icon || Zap;
            return (
              <Card key={a.id} className={a.ativo ? "" : "opacity-60"}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{a.nome}</p>
                        <Badge variant="outline" className="text-[10px]">P{a.prioridade}</Badge>
                        {setorMeta && <Badge variant="outline" className={`text-[10px] ${setorMeta.cor}`}>{setorMeta.nome}</Badge>}
                        <Badge variant="secondary" className="text-[10px]">{tipoMeta?.label}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {a.keywords.map((k, i) => (
                          <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{k}</span>
                        ))}
                      </div>
                      {a.resposta_texto && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                          "{a.resposta_texto}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={a.ativo} onCheckedChange={(v) => toggle.mutate({ id: a.id, ativo: v })} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => { if (confirm(`Remover "${a.nome}"?`)) del.mutate(a.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar" : "Nova"} automação</DialogTitle>
            <DialogDescription>
              Regras da Camada 1. Cliente envia mensagem, sistema busca por keywords e age.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={editing.nome || ""}
                  onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                  placeholder="Ex: Resposta de boleto"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Setor</Label>
                  <Select value={editing.setor || "geral"} onValueChange={(v) => setEditing({ ...editing, setor: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SETORES.map((s) => <SelectItem key={s.slug} value={s.slug}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <Input type="number" value={editing.prioridade ?? 10}
                    onChange={(e) => setEditing({ ...editing, prioridade: parseInt(e.target.value) })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Keywords (disparadores)</Label>
                <div className="flex gap-2">
                  <Input
                    value={kwInput}
                    onChange={(e) => setKwInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKw(); } }}
                    placeholder="boleto, 2ª via, pagamento..."
                  />
                  <Button size="sm" onClick={addKw}>Adicionar</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(editing.keywords || []).map((k, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                      {k}
                      <button onClick={() => rmKw(i)} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de ação</Label>
                <Select value={editing.tipo || "resposta_texto"} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_ACAO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {editing.tipo === "resposta_texto" && (
                <div className="space-y-1.5">
                  <Label>Texto da resposta</Label>
                  <Textarea
                    rows={4}
                    value={editing.resposta_texto || ""}
                    onChange={(e) => setEditing({ ...editing, resposta_texto: e.target.value })}
                    placeholder="Olá! Pra 2ª via do boleto, acesse..."
                  />
                </div>
              )}

              {editing.tipo === "transferir_setor" && (
                <div className="space-y-1.5">
                  <Label>Setor destino</Label>
                  <Select value={editing.setor_destino || ""} onValueChange={(v) => setEditing({ ...editing, setor_destino: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {SETORES.filter((s) => s.slug !== editing.setor).map((s) => (
                        <SelectItem key={s.slug} value={s.slug}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                <Label>Ativa</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending || !editing?.nome}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── IA Config por setor ────────────────────────────────────────────────

function IAConfigTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: configs = [], isLoading } = useQuery<IaConfig[]>({
    queryKey: ["ia-configs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_ia_config").select("*").order("setor");
      if (error) throw error;
      return (data || []) as IaConfig[];
    },
  });

  const save = useMutation({
    mutationFn: async (c: IaConfig) => {
      const { error } = await (supabase as any).from("whatsapp_ia_config").update({
        ativo: c.ativo, modelo: c.modelo, system_prompt: c.system_prompt,
        max_tokens: c.max_tokens, temperature: c.temperature,
        fallback_humano_threshold: c.fallback_humano_threshold,
        auto_responder: c.auto_responder, contexto_msgs: c.contexto_msgs,
      }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ia-configs"] });
      toast({ title: "Config IA salva" });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">IA Camada 2 — por setor</h2>
        <p className="text-xs text-muted-foreground">
          Quando nenhuma automação matcha, a IA do setor entra em ação (se ligada). Se não conseguir resolver com confiança X%, escala pra humano.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-3">
          {configs.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className={`h-4 w-4 ${c.ativo ? "text-violet-500" : "text-muted-foreground"}`} />
                    <CardTitle className="text-sm capitalize">{SETORES.find((s) => s.slug === c.setor)?.nome}</CardTitle>
                  </div>
                  <Switch checked={c.ativo} onCheckedChange={(v) => save.mutate({ ...c, ativo: v })} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1.5">
                  <Label className="text-xs">Prompt do sistema</Label>
                  <Textarea
                    rows={3}
                    value={c.system_prompt}
                    onChange={(e) => save.mutate({ ...c, system_prompt: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Modelo</Label>
                    <Input className="h-7 text-xs" value={c.modelo}
                      onChange={(e) => save.mutate({ ...c, modelo: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[10px]">Threshold humano</Label>
                    <Input className="h-7 text-xs" type="number" step="0.1" min="0" max="1"
                      value={c.fallback_humano_threshold}
                      onChange={(e) => save.mutate({ ...c, fallback_humano_threshold: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Contexto msgs</Label>
                    <Input className="h-7 text-xs" type="number"
                      value={c.contexto_msgs}
                      onChange={(e) => save.mutate({ ...c, contexto_msgs: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={c.auto_responder} onCheckedChange={(v) => save.mutate({ ...c, auto_responder: v })} />
                  <Label className="text-xs">Auto-responder (IA envia resposta sem revisão humana)</Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Automacoes() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Automações & IA</h1>
        <p className="text-sm text-muted-foreground">
          Fluxo Auto → IA → Humano. Regras de Camada 1 + Config IA Camada 2.
        </p>
      </div>

      <Tabs defaultValue="automacoes">
        <TabsList>
          <TabsTrigger value="automacoes" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Automações Camada 1
          </TabsTrigger>
          <TabsTrigger value="ia" className="gap-1.5">
            <Brain className="h-3.5 w-3.5" /> IA Camada 2
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automacoes" className="mt-4">
          <AutomacoesTab />
        </TabsContent>

        <TabsContent value="ia" className="mt-4">
          <IAConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

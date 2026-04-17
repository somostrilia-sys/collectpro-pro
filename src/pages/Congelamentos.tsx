import { useState } from "react";
import { Snowflake, Eye, Pencil, Search, X, CheckCircle, Clock, AlertTriangle, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

type Status = "Ativo" | "Aguardando" | "Expirado" | "Cancelado";

interface Congelamento {
  id: number; associado: string; cpf: string; cooperativa: string;
  motivo: string; inicio: string; fim: string; valor: number; status: Status;
  comentarios: string; atendente: string;
}

const MOCK: Congelamento[]  = [];

const MOTIVOS = ["Colisão Total","Colisão Parcial","Roubo de Veículo","Furto de Peças","Incêndio","Enchente/Alagamento","Granizo","Acidente com Terceiros"];
const COOPS = ["Todas","Coop Sul","Coop Norte","Coop Leste"];
const STATUS_LIST = ["Todos","Ativo","Aguardando","Expirado","Cancelado"];

const statusBadge = (s: Status) => {
  const map: Record<Status, string> = {
    Ativo: "bg-success/10 text-success",
    Aguardando: "bg-warning/10 text-warning",
    Expirado: "bg-muted text-muted-foreground",
    Cancelado: "bg-destructive/10 text-destructive",
  };
  return <Badge className={`${map[s]} border-0 font-medium`}>{s}</Badge>;
};

export default function Congelamentos() {
  const { toast } = useToast();
  const [data, setData] = useState<Congelamento[]>(MOCK);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroCoop, setFiltroCoop] = useState("Todas");
  const [viewItem, setViewItem] = useState<Congelamento | null>(null);
  const [editItem, setEditItem] = useState<Congelamento | null>(null);

  // Form Novo Congelamento
  const [form, setForm] = useState({ associado: "", motivo: "", inicio: "", fim: "", notifEmail: true, notifSms: false, notifWhatsapp: true, atendente: "" });

  const filtered = data.filter(r => {
    const q = busca.toLowerCase();
    const matchQ = !q || r.associado.toLowerCase().includes(q) || r.cpf.includes(q);
    const matchS = filtroStatus === "Todos" || r.status === filtroStatus;
    const matchC = filtroCoop === "Todas" || r.cooperativa === filtroCoop;
    return matchQ && matchS && matchC;
  });

  const kpi = {
    ativos: data.filter(r => r.status === "Ativo").length,
    aguardando: data.filter(r => r.status === "Aguardando").length,
    expirando: data.filter(r => r.status === "Ativo").length - 8, // mock: 4
    valor: data.filter(r => r.status === "Ativo").reduce((a, b) => a + b.valor, 0),
  };

  const handleEncerrar = (id: number) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, status: "Expirado" as Status } : r));
    setViewItem(null);
    toast({ title: "Congelamento encerrado", description: "Status atualizado com sucesso." });
  };

  const handleEstender = (id: number) => {
    toast({ title: "Congelamento estendido", description: "Prazo estendido em 30 dias." });
    setViewItem(null);
  };

  const handleSaveEdit = () => {
    if (!editItem) return;
    setData(prev => prev.map(r => r.id === editItem.id ? editItem : r));
    setEditItem(null);
    toast({ title: "Congelamento atualizado", description: "Dados salvos com sucesso." });
  };

  const handleRegistrar = () => {
    if (!form.associado || !form.motivo || !form.inicio || !form.fim) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    const novo: Congelamento = {
      id: Date.now(), associado: form.associado, cpf: "", cooperativa: "",
      motivo: form.motivo, inicio: form.inicio, fim: form.fim, valor: 0, status: "Aguardando",
      comentarios: "Registrado via formulário.", atendente: form.atendente || "Sistema",
    };
    setData(prev => [novo, ...prev]);
    setForm({ associado: "", motivo: "", inicio: "", fim: "", notifEmail: true, notifSms: false, notifWhatsapp: true, atendente: "" });
    toast({ title: "Congelamento registrado!", description: `${novo.associado} adicionado com sucesso.` });
  };

  // Relatórios mock
  const porCoop: { name: string; count: number; pct: number }[] = [];
  const porMotivo: { name: string; count: number }[] = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl p-2.5 bg-primary/10"><Snowflake className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Congelamento de Cobrança</h1>
          <p className="text-sm text-muted-foreground">Gerencie congelamentos por sinistro ou evento</p>
        </div>
      </div>

      <Tabs defaultValue="ativos">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="ativos">Congelamentos Ativos</TabsTrigger>
          <TabsTrigger value="novo">Novo Congelamento</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* TAB 1 */}
        <TabsContent value="ativos" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Ativos", value: kpi.ativos, icon: CheckCircle, iconColor: "text-success", bg: "bg-success/10" },
              { label: "Aguardando", value: kpi.aguardando, icon: Clock, iconColor: "text-warning", bg: "bg-warning/10" },
              { label: "Expiram em 7 dias", value: 0, icon: AlertTriangle, iconColor: "text-warning", bg: "bg-warning/10" },
              { label: "Valor Congelado", value: `R$ ${kpi.valor.toLocaleString("pt-BR")}`, icon: DollarSign, iconColor: "text-primary", bg: "bg-primary/10" },
            ].map(c => (
              <Card key={c.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2.5 ${c.bg}`}>
                      <c.icon className={`h-5 w-5 ${c.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                      <p className="text-2xl font-bold">{c.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar associado ou CPF..." className="pl-9 rounded-lg" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filtroCoop} onValueChange={setFiltroCoop}>
              <SelectTrigger className="w-40 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>{COOPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>{["Associado","CPF","Cooperativa","Motivo","Início","Fim","Valor/Mês","Status","Ações"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{r.associado}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.cpf}</td>
                        <td className="px-4 py-3">{r.cooperativa}</td>
                        <td className="px-4 py-3 max-w-32 truncate">{r.motivo}</td>
                        <td className="px-4 py-3">{r.inicio}</td>
                        <td className="px-4 py-3">{r.fim}</td>
                        <td className="px-4 py-3 font-medium text-primary">R$ {r.valor}</td>
                        <td className="px-4 py-3">{statusBadge(r.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setViewItem(r)}><Eye className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditItem({ ...r })}><Pencil className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2 */}
        <TabsContent value="novo" className="mt-4">
          <Card className="max-w-2xl border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Snowflake className="h-5 w-5 text-primary" />Registrar Novo Congelamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Buscar Associado *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Nome ou CPF do associado..." className="pl-9 rounded-lg" value={form.associado} onChange={e => setForm(f => ({ ...f, associado: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Motivo do Congelamento *</Label>
                <Select value={form.motivo} onValueChange={v => setForm(f => ({ ...f, motivo: v }))}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
                  <SelectContent>{MOTIVOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Data de Início *</Label>
                  <Input type="date" className="rounded-lg" value={form.inicio} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Data de Fim *</Label>
                  <Input type="date" className="rounded-lg" value={form.fim} onChange={e => setForm(f => ({ ...f, fim: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Atendente Responsável</Label>
                <Input placeholder="Nome do atendente..." className="rounded-lg" value={form.atendente} onChange={e => setForm(f => ({ ...f, atendente: e.target.value }))} />
              </div>
              <div className="space-y-3 pt-1">
                <Label>Notificações</Label>
                {[
                  { key: "notifEmail", label: "Notificar por E-mail" },
                  { key: "notifWhatsapp", label: "Notificar por WhatsApp" },
                  { key: "notifSms", label: "Notificar por SMS" },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">{n.label}</span>
                    <Switch checked={form[n.key as keyof typeof form] as boolean} onCheckedChange={v => setForm(f => ({ ...f, [n.key]: v }))} />
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={handleRegistrar}>
                <Snowflake className="h-4 w-4 mr-2" />Registrar Congelamento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3 */}
        <TabsContent value="relatorios" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="font-heading text-base">Resumo Mensal — Março 2026</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[["Novos congelamentos","0"],["Encerrados no período","0"],["Média de duração","—"],["Total congelado no mês","R$ 0"]].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-1 border-b last:border-0">
                    <span className="text-muted-foreground">{k}</span><span className="font-semibold">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="font-heading text-base">Por Cooperativa</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {porCoop.map(c => (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm mb-1"><span>{c.name}</span><span className="font-medium">{c.count} congelamentos</span></div>
                    <Progress value={c.pct} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="font-heading text-base">Por Motivo</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {porMotivo.map(m => (
                  <div key={m.name} className="flex justify-between items-center py-1.5 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{m.name}</span>
                    <Badge variant="secondary">{m.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="font-heading text-base">Impacto Financeiro</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between mb-1"><span className="text-muted-foreground">Valor congelado atual</span><span className="font-bold text-primary">R$ 0</span></div>
                  <Progress value={0} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-1">0% da meta mensal de congelamentos</p>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span className="text-muted-foreground">Recuperado após encerramento</span><span className="font-bold text-success">R$ 0</span></div>
                  <Progress value={0} className="h-3" />
                </div>
                <div className="rounded-lg bg-warning/10 p-3 mt-2">
                  <div className="flex items-center gap-2 text-warning font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    0 congelamentos expiram nos próximos 7 dias
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Valor a retomar: R$ 0/mês</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Visualizar */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Detalhes do Congelamento</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[["Associado",viewItem.associado],["CPF",viewItem.cpf],["Cooperativa",viewItem.cooperativa],["Motivo",viewItem.motivo],["Início",viewItem.inicio],["Fim",viewItem.fim],["Valor/Mês",`R$ ${viewItem.valor}`],["Atendente",viewItem.atendente]].map(([k,v]) => (
                  <div key={k}><p className="text-muted-foreground text-xs">{k}</p><p className="font-medium">{v}</p></div>
                ))}
              </div>
              <div><p className="text-muted-foreground text-xs mb-1">Status</p>{statusBadge(viewItem.status)}</div>
              <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground mb-1">Comentários</p><p>{viewItem.comentarios}</p></div>
            </div>
          )}
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => viewItem && handleEstender(viewItem.id)}>Estender</Button>
            <Button variant="destructive" onClick={() => viewItem && handleEncerrar(viewItem.id)}><X className="h-4 w-4 mr-1" />Encerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Editar Congelamento</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>Motivo</Label>
                <Select value={editItem.motivo} onValueChange={v => setEditItem(e => e ? { ...e, motivo: v } : e)}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>{MOTIVOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Data Início</Label><Input className="rounded-lg" value={editItem.inicio} onChange={e => setEditItem(ei => ei ? { ...ei, inicio: e.target.value } : ei)} /></div>
                <div className="space-y-1"><Label>Data Fim</Label><Input className="rounded-lg" value={editItem.fim} onChange={e => setEditItem(ei => ei ? { ...ei, fim: e.target.value } : ei)} /></div>
              </div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={editItem.status} onValueChange={v => setEditItem(e => e ? { ...e, status: v as Status } : e)}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>{(["Ativo","Aguardando","Expirado","Cancelado"] as Status[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Comentários</Label>
                <Input className="rounded-lg" value={editItem.comentarios} onChange={e => setEditItem(ei => ei ? { ...ei, comentarios: e.target.value } : ei)} />
              </div>
            </div>
          )}
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}><CheckCircle className="h-4 w-4 mr-1" />Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

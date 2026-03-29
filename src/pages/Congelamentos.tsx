import { useState } from "react";
import { Snowflake, Eye, Pencil, Search, X, CheckCircle } from "lucide-react";
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

const MOCK: Congelamento[] = [
  { id: 1, associado: "Carlos Mendes", cpf: "123.456.789-00", cooperativa: "Coop Sul", motivo: "Colisão Total", inicio: "01/03/2026", fim: "30/04/2026", valor: 290, status: "Ativo", comentarios: "Veículo em reparo na funilaria.", atendente: "Ana Silva" },
  { id: 2, associado: "Maria Souza", cpf: "234.567.890-11", cooperativa: "Coop Norte", motivo: "Roubo de Veículo", inicio: "15/02/2026", fim: "15/04/2026", valor: 315, status: "Ativo", comentarios: "BO registrado. Aguardando perito.", atendente: "Bruno Costa" },
  { id: 3, associado: "José Lima", cpf: "345.678.901-22", cooperativa: "Coop Sul", motivo: "Enchente/Alagamento", inicio: "20/03/2026", fim: "20/04/2026", valor: 180, status: "Aguardando", comentarios: "Aguardando laudo técnico.", atendente: "Carla Dias" },
  { id: 4, associado: "Ana Paula", cpf: "456.789.012-33", cooperativa: "Coop Leste", motivo: "Incêndio", inicio: "10/02/2026", fim: "10/03/2026", valor: 420, status: "Expirado", comentarios: "Período encerrado.", atendente: "Diego Nunes" },
  { id: 5, associado: "Pedro Rocha", cpf: "567.890.123-44", cooperativa: "Coop Norte", motivo: "Colisão Parcial", inicio: "05/03/2026", fim: "05/04/2026", valor: 260, status: "Ativo", comentarios: "Em reparo na concessionária.", atendente: "Ana Silva" },
  { id: 6, associado: "Fernanda Castro", cpf: "678.901.234-55", cooperativa: "Coop Sul", motivo: "Granizo", inicio: "25/01/2026", fim: "25/03/2026", valor: 195, status: "Cancelado", comentarios: "Cancelado a pedido do associado.", atendente: "Bruno Costa" },
  { id: 7, associado: "Lucas Moraes", cpf: "789.012.345-66", cooperativa: "Coop Leste", motivo: "Furto de Peças", inicio: "12/03/2026", fim: "12/04/2026", valor: 340, status: "Aguardando", comentarios: "Aguardando aprovação da diretoria.", atendente: "Carla Dias" },
  { id: 8, associado: "Juliana Ferreira", cpf: "890.123.456-77", cooperativa: "Coop Norte", motivo: "Acidente com Terceiros", inicio: "01/04/2026", fim: "01/05/2026", valor: 340, status: "Ativo", comentarios: "Processo judicial em andamento.", atendente: "Diego Nunes" },
];

const MOTIVOS = ["Colisão Total","Colisão Parcial","Roubo de Veículo","Furto de Peças","Incêndio","Enchente/Alagamento","Granizo","Acidente com Terceiros"];
const COOPS = ["Todas","Coop Sul","Coop Norte","Coop Leste"];
const STATUS_LIST = ["Todos","Ativo","Aguardando","Expirado","Cancelado"];

const statusBadge = (s: Status) => {
  const map: Record<Status, string> = {
    Ativo: "bg-green-100 text-green-700",
    Aguardando: "bg-yellow-100 text-yellow-700",
    Expirado: "bg-gray-100 text-gray-600",
    Cancelado: "bg-red-100 text-red-700",
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
      id: Date.now(), associado: form.associado, cpf: "000.000.000-00", cooperativa: "Coop Sul",
      motivo: form.motivo, inicio: form.inicio, fim: form.fim, valor: 250, status: "Aguardando",
      comentarios: "Registrado via formulário.", atendente: form.atendente || "Sistema",
    };
    setData(prev => [novo, ...prev]);
    setForm({ associado: "", motivo: "", inicio: "", fim: "", notifEmail: true, notifSms: false, notifWhatsapp: true, atendente: "" });
    toast({ title: "Congelamento registrado!", description: `${novo.associado} adicionado com sucesso.` });
  };

  // Relatórios mock
  const porCoop = [
    { name: "Coop Sul", count: 3, pct: 38 },
    { name: "Coop Norte", count: 3, pct: 38 },
    { name: "Coop Leste", count: 2, pct: 25 },
  ];
  const porMotivo = [
    { name: "Colisão Total", count: 2 }, { name: "Roubo de Veículo", count: 1 },
    { name: "Colisão Parcial", count: 1 }, { name: "Outros", count: 4 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg"><Snowflake className="h-6 w-6 text-blue-600" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Congelamento de Cobrança</h1>
          <p className="text-sm text-gray-500">Gerencie congelamentos por sinistro ou evento</p>
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
              { label: "Ativos", value: kpi.ativos, color: "text-green-600", bg: "bg-green-50" },
              { label: "Aguardando", value: kpi.aguardando, color: "text-yellow-600", bg: "bg-yellow-50" },
              { label: "Expiram em 7 dias", value: 4, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Valor Congelado", value: `R$ ${kpi.valor.toLocaleString("pt-BR")}`, color: "text-blue-600", bg: "bg-blue-50" },
            ].map(c => (
              <Card key={c.label} className={`${c.bg} border-0`}>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                  <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar associado ou CPF..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filtroCoop} onValueChange={setFiltroCoop}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{COOPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{["Associado","CPF","Cooperativa","Motivo","Início","Fim","Valor/Mês","Status","Ações"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium">{r.associado}</td>
                        <td className="px-4 py-3 text-gray-500">{r.cpf}</td>
                        <td className="px-4 py-3">{r.cooperativa}</td>
                        <td className="px-4 py-3 max-w-32 truncate">{r.motivo}</td>
                        <td className="px-4 py-3">{r.inicio}</td>
                        <td className="px-4 py-3">{r.fim}</td>
                        <td className="px-4 py-3 font-medium text-blue-700">R$ {r.valor}</td>
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
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2 */}
        <TabsContent value="novo" className="mt-4">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><Snowflake className="h-5 w-5 text-blue-500" />Registrar Novo Congelamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Buscar Associado *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input placeholder="Nome ou CPF do associado..." className="pl-9" value={form.associado} onChange={e => setForm(f => ({ ...f, associado: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Motivo do Congelamento *</Label>
                <Select value={form.motivo} onValueChange={v => setForm(f => ({ ...f, motivo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
                  <SelectContent>{MOTIVOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Data de Início *</Label>
                  <Input type="date" value={form.inicio} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Data de Fim *</Label>
                  <Input type="date" value={form.fim} onChange={e => setForm(f => ({ ...f, fim: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Atendente Responsável</Label>
                <Input placeholder="Nome do atendente..." value={form.atendente} onChange={e => setForm(f => ({ ...f, atendente: e.target.value }))} />
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
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleRegistrar}>
                <Snowflake className="h-4 w-4 mr-2" />Registrar Congelamento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3 */}
        <TabsContent value="relatorios" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Resumo Mensal — Março 2026</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[["Novos congelamentos","8"],["Encerrados no período","2"],["Média de duração","34 dias"],["Total congelado no mês","R$ 2.340"]].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-1 border-b last:border-0">
                    <span className="text-gray-500">{k}</span><span className="font-semibold">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Por Cooperativa</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {porCoop.map(c => (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm mb-1"><span>{c.name}</span><span className="font-medium">{c.count} congelamentos</span></div>
                    <Progress value={c.pct} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Por Motivo</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {porMotivo.map(m => (
                  <div key={m.name} className="flex justify-between items-center py-1.5 border-b last:border-0">
                    <span className="text-sm text-gray-600">{m.name}</span>
                    <Badge variant="secondary">{m.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Impacto Financeiro</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between mb-1"><span className="text-gray-500">Valor congelado atual</span><span className="font-bold text-blue-600">R$ 2.340</span></div>
                  <Progress value={65} className="h-3" />
                  <p className="text-xs text-gray-400 mt-1">65% da meta mensal de congelamentos</p>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span className="text-gray-500">Recuperado após encerramento</span><span className="font-bold text-green-600">R$ 615</span></div>
                  <Progress value={26} className="h-3" />
                </div>
                <div className="rounded-lg bg-orange-50 p-3 mt-2">
                  <p className="text-orange-700 font-medium">⚠ 4 congelamentos expiram nos próximos 7 dias</p>
                  <p className="text-xs text-orange-500 mt-0.5">Valor a retomar: R$ 1.070/mês</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Visualizar */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Congelamento</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[["Associado",viewItem.associado],["CPF",viewItem.cpf],["Cooperativa",viewItem.cooperativa],["Motivo",viewItem.motivo],["Início",viewItem.inicio],["Fim",viewItem.fim],["Valor/Mês",`R$ ${viewItem.valor}`],["Atendente",viewItem.atendente]].map(([k,v]) => (
                  <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="font-medium">{v}</p></div>
                ))}
              </div>
              <div><p className="text-gray-400 text-xs mb-1">Status</p>{statusBadge(viewItem.status)}</div>
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400 mb-1">Comentários</p><p>{viewItem.comentarios}</p></div>
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
          <DialogHeader><DialogTitle>Editar Congelamento</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>Motivo</Label>
                <Select value={editItem.motivo} onValueChange={v => setEditItem(e => e ? { ...e, motivo: v } : e)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOTIVOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Data Início</Label><Input value={editItem.inicio} onChange={e => setEditItem(ei => ei ? { ...ei, inicio: e.target.value } : ei)} /></div>
                <div className="space-y-1"><Label>Data Fim</Label><Input value={editItem.fim} onChange={e => setEditItem(ei => ei ? { ...ei, fim: e.target.value } : ei)} /></div>
              </div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={editItem.status} onValueChange={v => setEditItem(e => e ? { ...e, status: v as Status } : e)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["Ativo","Aguardando","Expirado","Cancelado"] as Status[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Comentários</Label>
                <Input value={editItem.comentarios} onChange={e => setEditItem(ei => ei ? { ...ei, comentarios: e.target.value } : ei)} />
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

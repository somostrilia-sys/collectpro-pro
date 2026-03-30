import { useState } from "react";
import { Search, Eye, Plus, ShieldAlert, Car, AlertTriangle, Calendar, TrendingUp, DollarSign, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

type StatusFidelidade = "Em Fidelidade" | "Fidelidade Cumprida" | "Encerrado";

interface VeiculoIndenizado {
  id: string; associado: string; cpf: string; placa: string; veiculo: string;
  tipoEvento: string; valorIndenizacao: number; dataEvento: string;
  fidelidadeAte: string; statusFidelidade: StatusFidelidade;
  cooperativa: string; observacoes: string;
}

const mockVeiculos: VeiculoIndenizado[] = [
  { id:"1", associado:"João Carlos da Silva", cpf:"123.456.789-00", placa:"ABC-1234", veiculo:"HB20 2022", tipoEvento:"Perda Total - Colisão", valorIndenizacao:45000, dataEvento:"15/01/2026", fidelidadeAte:"15/01/2027", statusFidelidade:"Em Fidelidade", cooperativa:"WALK SP", observacoes:"Colisão frontal em rodovia. Veículo declarado perda total." },
  { id:"2", associado:"Maria Santos", cpf:"987.654.321-00", placa:"XYZ-5678", veiculo:"Onix 2023", tipoEvento:"Roubo/Furto", valorIndenizacao:62000, dataEvento:"01/11/2025", fidelidadeAte:"01/11/2026", statusFidelidade:"Em Fidelidade", cooperativa:"WALK RJ", observacoes:"Roubo a mão armada. BO registrado." },
  { id:"3", associado:"Pedro Oliveira", cpf:"456.789.123-00", placa:"DEF-9012", veiculo:"Corolla 2021", tipoEvento:"Perda Total - Enchente", valorIndenizacao:85000, dataEvento:"10/06/2025", fidelidadeAte:"10/06/2026", statusFidelidade:"Em Fidelidade", cooperativa:"WALK MG", observacoes:"Veículo submerso durante enchente." },
  { id:"4", associado:"Ana Lima", cpf:"321.654.987-00", placa:"GHI-3456", veiculo:"Creta 2022", tipoEvento:"Perda Total - Colisão", valorIndenizacao:72000, dataEvento:"20/02/2025", fidelidadeAte:"20/02/2026", statusFidelidade:"Fidelidade Cumprida", cooperativa:"WALK SP", observacoes:"Colisão traseira. Perícia confirmou perda total." },
  { id:"5", associado:"Carlos Ferreira", cpf:"789.123.456-00", placa:"JKL-7890", veiculo:"Compass 2023", tipoEvento:"Roubo/Furto", valorIndenizacao:120000, dataEvento:"05/03/2026", fidelidadeAte:"05/03/2027", statusFidelidade:"Em Fidelidade", cooperativa:"WALK PR", observacoes:"Furto em estacionamento." },
  { id:"6", associado:"Fernanda Costa", cpf:"654.321.789-00", placa:"MNO-1234", veiculo:"Kicks 2022", tipoEvento:"Perda Total - Incêndio", valorIndenizacao:55000, dataEvento:"15/08/2025", fidelidadeAte:"15/08/2026", statusFidelidade:"Em Fidelidade", cooperativa:"WALK BA", observacoes:"Incêndio de origem elétrica." },
  { id:"7", associado:"Roberto Almeida", cpf:"147.258.369-00", placa:"PQR-5678", veiculo:"T-Cross 2021", tipoEvento:"Perda Total - Colisão", valorIndenizacao:68000, dataEvento:"01/01/2025", fidelidadeAte:"01/01/2026", statusFidelidade:"Fidelidade Cumprida", cooperativa:"WALK SP", observacoes:"Colisão em cruzamento. Sem vítimas." },
  { id:"8", associado:"Luciana Martins", cpf:"963.852.741-00", placa:"STU-9012", veiculo:"Tracker 2023", tipoEvento:"Roubo/Furto", valorIndenizacao:95000, dataEvento:"28/12/2025", fidelidadeAte:"28/12/2026", statusFidelidade:"Em Fidelidade", cooperativa:"WALK RS", observacoes:"Roubo durante a madrugada." },
];

const tentativasCancelamento = [
  { nome:"Pedro Oliveira", cpf:"456.789.123-00", data:"18/03/2026", status:"Bloqueado - Em fidelidade" },
  { nome:"Maria Santos", cpf:"987.654.321-00", data:"05/03/2026", status:"Bloqueado - Em fidelidade" },
  { nome:"Fernanda Costa", cpf:"654.321.789-00", data:"22/02/2026", status:"Bloqueado - Em fidelidade" },
];

const relatorioTipos = [
  { tipo:"Perda Total - Colisão", quantidade:18, valorTotal:1240000 },
  { tipo:"Roubo/Furto", quantidade:15, valorTotal:1580000 },
  { tipo:"Perda Total - Enchente", quantidade:6, valorTotal:390000 },
  { tipo:"Perda Total - Incêndio", quantidade:4, valorTotal:260000 },
  { tipo:"Outro", quantidade:2, valorTotal:85000 },
];

const relatorioCooperativas = [
  { cooperativa:"WALK SP", indenizacoes:14, valorTotal:980000 },
  { cooperativa:"WALK RJ", indenizacoes:9, valorTotal:620000 },
  { cooperativa:"WALK MG", indenizacoes:8, valorTotal:540000 },
  { cooperativa:"WALK PR", indenizacoes:7, valorTotal:480000 },
  { cooperativa:"WALK BA", indenizacoes:4, valorTotal:270000 },
  { cooperativa:"WALK RS", indenizacoes:3, valorTotal:165000 },
];

const evolucaoMensal = [
  { mes:"Out/2025", indenizacoes:6, valor:388000 },
  { mes:"Nov/2025", indenizacoes:8, valor:512000 },
  { mes:"Dez/2025", indenizacoes:7, valor:465000 },
  { mes:"Jan/2026", indenizacoes:9, valor:610000 },
  { mes:"Fev/2026", indenizacoes:5, valor:334000 },
  { mes:"Mar/2026", indenizacoes:10, valor:670000 },
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

function calcDiasRestantes(fidelidadeAte: string): number {
  const [d, m, y] = fidelidadeAte.split("/").map(Number);
  const ate = new Date(y, m - 1, d);
  return Math.max(0, Math.ceil((ate.getTime() - Date.now()) / 86400000));
}

function calcProgresso(dataEvento: string): number {
  const [d, m, y] = dataEvento.split("/").map(Number);
  const inicio = new Date(y, m - 1, d);
  const dias = Math.ceil((Date.now() - inicio.getTime()) / 86400000);
  return Math.min(100, Math.max(0, Math.round((dias / 365) * 100)));
}

function StatusBadge({ status }: { status: StatusFidelidade }) {
  if (status === "Em Fidelidade") return <Badge className="bg-destructive/10 text-destructive border-0">Em Fidelidade</Badge>;
  if (status === "Fidelidade Cumprida") return <Badge className="bg-success/10 text-success border-0">Fidelidade Cumprida</Badge>;
  return <Badge variant="secondary">Encerrado</Badge>;
}

function DialogDetalhes({ veiculo, onClose }: { veiculo: VeiculoIndenizado; onClose: () => void }) {
  const emFidelidade = veiculo.statusFidelidade === "Em Fidelidade";
  const timeline = [
    { label:"Sinistro Comunicado", data:veiculo.dataEvento, done:true },
    { label:"Análise Técnica", data:"3 dias após o evento", done:true },
    { label:"Aprovação da Indenização", data:"7 dias após o evento", done:true },
    { label:"Pagamento da Indenização", data:veiculo.dataEvento, done:true },
    { label:"Cláusula de Fidelidade Ativada", data:veiculo.dataEvento, done:true },
    { label:"Fidelidade Encerrada", data:veiculo.fidelidadeAte, done:!emFidelidade },
  ];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><Eye className="h-5 w-5" /> Detalhes da Indenização</DialogTitle>
          <DialogDescription>{veiculo.associado} · {veiculo.placa}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {emFidelidade && (
            <div className="rounded-lg bg-destructive/5 p-4 border-0">
              <div className="flex items-center gap-2 text-destructive font-semibold">
                <ShieldAlert className="h-5 w-5" /> Cancelamento Bloqueado -- Cláusula de Fidelidade Ativa
              </div>
              <p className="text-sm text-destructive/80 mt-1">
                Este associado está em cláusula de fidelidade até <strong>{veiculo.fidelidadeAte}</strong>. Cancelamento bloqueado.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted-foreground text-xs">Associado</p><p className="font-semibold">{veiculo.associado}</p></div>
            <div><p className="text-muted-foreground text-xs">CPF</p><p>{veiculo.cpf}</p></div>
            <div><p className="text-muted-foreground text-xs">Placa</p><Badge variant="outline">{veiculo.placa}</Badge></div>
            <div><p className="text-muted-foreground text-xs">Veículo</p><p>{veiculo.veiculo}</p></div>
            <div><p className="text-muted-foreground text-xs">Cooperativa</p><p>{veiculo.cooperativa}</p></div>
            <div><p className="text-muted-foreground text-xs">Status</p><StatusBadge status={veiculo.statusFidelidade} /></div>
          </div>
          <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
            <p className="font-semibold text-sm">Detalhes da Indenização</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Tipo:</span> {veiculo.tipoEvento}</div>
              <div><span className="text-muted-foreground">Valor:</span> <span className="font-semibold text-success">{fmt(veiculo.valorIndenizacao)}</span></div>
              <div><span className="text-muted-foreground">Data do evento:</span> {veiculo.dataEvento}</div>
              <div><span className="text-muted-foreground">Fidelidade até:</span> {veiculo.fidelidadeAte}</div>
            </div>
            <p className="text-sm"><span className="text-muted-foreground">Documentos:</span> BO nº 2024/987654 · Laudo de vistoria · Nota fiscal</p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-3">Timeline do Evento</p>
            <div className="space-y-2">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${t.done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {t.done ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`flex-1 ${t.done ? "font-medium" : "text-muted-foreground"}`}>{t.label}</span>
                  <span className="text-muted-foreground text-xs">{t.data}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border rounded-lg p-3 bg-muted/20">
            <p className="font-semibold text-sm mb-1">Comentários Internos</p>
            <p className="text-sm text-muted-foreground">{veiculo.observacoes}</p>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogRegistrar({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [associado, setAssociado] = useState("");
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [tipo, setTipo] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [cooperativa, setCooperativa] = useState("");
  const [obs, setObs] = useState("");
  const [fidelidade, setFidelidade] = useState(true);

  function handleSubmit() {
    if (!associado || !placa || !tipo || !valor) {
      toast({ title:"Campos obrigatórios", description:"Preencha associado, placa, tipo e valor.", variant:"destructive" });
      return;
    }
    toast({ title:"Indenização registrada!", description:`Registro de ${associado} criado com sucesso.` });
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><Plus className="h-5 w-5" /> Registrar Indenização</DialogTitle>
          <DialogDescription>Cadastre um novo evento de indenização de veículo</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Associado (nome/CPF) *</Label>
            <Input placeholder="Buscar associado..." value={associado} onChange={(e) => setAssociado(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Placa do Veículo *</Label>
              <Input placeholder="ABC-1234" value={placa} onChange={(e) => setPlaca(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Modelo/Ano</Label>
              <Input placeholder="HB20 2022" value={modelo} onChange={(e) => setModelo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Tipo de Evento *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Perda Total - Colisão">Perda Total - Colisão</SelectItem>
                <SelectItem value="Perda Total - Enchente">Perda Total - Enchente</SelectItem>
                <SelectItem value="Perda Total - Incêndio">Perda Total - Incêndio</SelectItem>
                <SelectItem value="Roubo/Furto">Roubo/Furto</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valor da Indenização (R$) *</Label>
              <Input placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data do Evento</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Cooperativa</Label>
            <Select value={cooperativa} onValueChange={setCooperativa}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {["WALK SP","WALK RJ","WALK MG","WALK PR","WALK BA","WALK RS"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Detalhes / Observações</Label>
            <Textarea placeholder="Descreva o ocorrido..." rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
            <div>
              <p className="font-medium text-sm">Ativar cláusula de fidelidade 12 meses</p>
              <p className="text-xs text-muted-foreground">O associado ficará vinculado por 12 meses após a indenização</p>
            </div>
            <Switch checked={fidelidade} onCheckedChange={setFidelidade} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VeiculosIndenizados() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCooperativa, setFiltroCooperativa] = useState("todas");
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoIndenizado | null>(null);
  const [showRegistrar, setShowRegistrar] = useState(false);

  const veiculosFiltrados = mockVeiculos.filter((v) => {
    const q = busca.toLowerCase();
    const matchBusca = !busca || v.associado.toLowerCase().includes(q) || v.cpf.includes(busca) || v.placa.toLowerCase().includes(q);
    const matchStatus = filtroStatus === "todos" || v.statusFidelidade === filtroStatus;
    const matchTipo = filtroTipo === "todos" || v.tipoEvento === filtroTipo;
    const matchCoop = filtroCooperativa === "todas" || v.cooperativa === filtroCooperativa;
    return matchBusca && matchStatus && matchTipo && matchCoop;
  });

  const emFidelidade = mockVeiculos.filter((v) => v.statusFidelidade === "Em Fidelidade");
  const totalValor = mockVeiculos.reduce((s, v) => s + v.valorIndenizacao, 0);
  const totalRelatorio = relatorioTipos.reduce((s, r) => s + r.valorTotal, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-destructive/10">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Veículos Indenizados</h1>
            <p className="text-sm text-muted-foreground">Gestão de indenizações e cláusula de fidelidade</p>
          </div>
        </div>
        <Button onClick={() => setShowRegistrar(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Registrar Indenização
        </Button>
      </div>

      <Tabs defaultValue="veiculos">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="veiculos">Veículos Indenizados</TabsTrigger>
          <TabsTrigger value="fidelidade">Cláusula de Fidelidade</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* Tab 1 */}
        <TabsContent value="veiculos" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="rounded-xl p-2.5 bg-primary/10"><Car className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">45</p><p className="text-sm text-muted-foreground">Total Indenizados</p></div></div></CardContent></Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="rounded-xl p-2.5 bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold text-primary">18</p><p className="text-sm text-muted-foreground">Ativas (12 meses)</p></div></div></CardContent></Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="rounded-xl p-2.5 bg-destructive/10"><ShieldAlert className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold text-destructive">15</p><p className="text-sm text-muted-foreground">Em Fidelidade</p></div></div></CardContent></Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="rounded-xl p-2.5 bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-xl font-bold text-success">R$ 892.500</p><p className="text-sm text-muted-foreground">Valor Total</p></div></div></CardContent></Card>
          </div>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow"><CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 rounded-lg" placeholder="Buscar nome, CPF, placa..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Status fidelidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="Em Fidelidade">Em Fidelidade</SelectItem>
                  <SelectItem value="Fidelidade Cumprida">Fidelidade Cumprida</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger><SelectValue placeholder="Tipo de evento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="Perda Total - Colisão">Perda Total - Colisão</SelectItem>
                  <SelectItem value="Perda Total - Enchente">Perda Total - Enchente</SelectItem>
                  <SelectItem value="Perda Total - Incêndio">Perda Total - Incêndio</SelectItem>
                  <SelectItem value="Roubo/Furto">Roubo/Furto</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroCooperativa} onValueChange={setFiltroCooperativa}>
                <SelectTrigger><SelectValue placeholder="Cooperativa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {["WALK SP","WALK RJ","WALK MG","WALK PR","WALK BA","WALK RS"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent></Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow"><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>{["Associado","CPF","Placa","Veículo","Tipo de Evento","Valor","Data Evento","Fidelidade até","Status","Ações"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {veiculosFiltrados.map((v, i) => (
                    <tr key={v.id} className={`border-b hover:bg-muted/30 ${i % 2 ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-3 font-medium">{v.associado}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.cpf}</td>
                      <td className="px-4 py-3"><Badge variant="outline">{v.placa}</Badge></td>
                      <td className="px-4 py-3">{v.veiculo}</td>
                      <td className="px-4 py-3 text-xs">{v.tipoEvento}</td>
                      <td className="px-4 py-3 font-medium text-success">{fmt(v.valorIndenizacao)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.dataEvento}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.fidelidadeAte}</td>
                      <td className="px-4 py-3"><StatusBadge status={v.statusFidelidade} /></td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedVeiculo(v)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {veiculosFiltrados.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">Nenhum registro encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Tab 2 */}
        <TabsContent value="fidelidade" className="space-y-4">
          <Card className="border-0 shadow-sm bg-primary/5"><CardContent className="pt-4">
            <div className="flex gap-3 items-start">
              <div className="rounded-xl p-2 bg-primary/10 flex-shrink-0"><ShieldAlert className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="font-semibold">O que é a Cláusula de Fidelidade?</p>
                <p className="text-sm text-muted-foreground mt-1">A cláusula de fidelidade determina que associados que receberam indenização devem permanecer vinculados por 12 meses. Durante este período, solicitações de cancelamento são <strong>bloqueadas automaticamente</strong>.</p>
              </div>            </div>
          </CardContent></Card>

          <Card className="border-0 shadow-sm bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {tentativasCancelamento.length} associados em fidelidade tentaram solicitar cancelamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tentativasCancelamento.map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border">
                    <div>
                      <p className="font-medium text-sm">{t.nome}</p>
                      <p className="text-xs text-muted-foreground">{t.cpf} · {t.data}</p>
                    </div>
                    <Badge className="bg-destructive/10 text-destructive border-0 text-xs">{t.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Associados em Cláusula de Fidelidade Ativa</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>{["Associado","CPF","Placa","Indenização","Desde","Até","Dias restantes","Progresso","Ações"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {emFidelidade.map((v, i) => {
                      const dias = calcDiasRestantes(v.fidelidadeAte);
                      const prog = calcProgresso(v.dataEvento);
                      return (
                        <tr key={v.id} className={`border-b hover:bg-muted/30 ${i % 2 ? "bg-muted/10" : ""}`}>
                          <td className="px-4 py-3 font-medium">{v.associado}</td>
                          <td className="px-4 py-3 text-muted-foreground">{v.cpf}</td>
                          <td className="px-4 py-3"><Badge variant="outline">{v.placa}</Badge></td>
                          <td className="px-4 py-3 font-medium text-success">{fmt(v.valorIndenizacao)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{v.dataEvento}</td>
                          <td className="px-4 py-3 text-muted-foreground">{v.fidelidadeAte}</td>
                          <td className="px-4 py-3"><span className={`font-semibold ${dias < 60 ? "text-red-600" : "text-orange-600"}`}>{dias} dias</span></td>
                          <td className="px-4 py-3 min-w-[130px]">
                            <div className="flex items-center gap-2">
                              <Progress value={prog} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground">{prog}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedVeiculo(v)}><Eye className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3 */}
        <TabsContent value="relatorios" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm bg-success/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-success" />Valor Total Indenizado</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">{fmt(totalValor)}</p>
                <p className="text-xs text-muted-foreground mt-1">Todos os períodos - {mockVeiculos.length} registros</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-primary/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Ticket Médio por Indenização</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{fmt(totalValor / mockVeiculos.length)}</p>
                <p className="text-xs text-muted-foreground mt-1">Baseado em {mockVeiculos.length} registros</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Por Tipo de Evento</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qtd</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor Total</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioTipos.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2">{r.tipo}</td>
                        <td className="px-4 py-2 text-right">{r.quantidade}</td>
                        <td className="px-4 py-2 text-right text-success font-medium">{fmt(r.valorTotal)}</td>
                        <td className="px-4 py-2 text-right">{Math.round((r.valorTotal / totalRelatorio) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Por Cooperativa</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Cooperativa</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Indenizações</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioCooperativas.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">{r.cooperativa}</td>
                        <td className="px-4 py-2 text-right">{r.indenizacoes}</td>
                        <td className="px-4 py-2 text-right text-success font-medium">{fmt(r.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Evolução Mensal (últimos 6 meses)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Mês</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Indenizações</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {evolucaoMensal.map((r, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{r.mes}</td>
                      <td className="px-4 py-2 text-right">{r.indenizacoes}</td>
                      <td className="px-4 py-2 text-right text-success font-medium">{fmt(r.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedVeiculo && <DialogDetalhes veiculo={selectedVeiculo} onClose={() => setSelectedVeiculo(null)} />}
      {showRegistrar && <DialogRegistrar onClose={() => setShowRegistrar(false)} />}
    </div>
  );
}

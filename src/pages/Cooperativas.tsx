import { useState } from "react";
import {
  Building2,
  Search,
  Users,
  DollarSign,
  TrendingDown,
  Award,
  MapPin,
  Phone,
  Mail,
  User,
  RefreshCw,
  FileBarChart,
  Download,
  Send,
  X,
  AlertTriangle,
  Trophy,
  Medal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Performance = "Excelente" | "Bom" | "Regular" | "Crítico";

interface Cooperativa {
  id: string;
  nome: string;
  cnpj: string;
  uf: string;
  cidade: string;
  responsavel: string;
  telefone: string;
  email: string;
  associados: number;
  faturamento: number;
  arrecadado: number;
  acordosAtivos: number;
  cancelamentos: number;
  voluntario: string;
  voluntarioTelefone: string;
  voluntarioEmail: string;
  diaVencimento: number;
}

interface Inadimplente {
  nome: string;
  cpf: string;
  valorAberto: number;
  diasAtraso: number;
}

const mockCooperativas: Cooperativa[]  = [];

const mockInadimplentes: Record<string, Inadimplente[]> = {};

// -- Helpers --
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v: number) => v.toLocaleString("pt-BR");

const getPerformance = (arrecadado: number, faturamento: number): Performance => {
  const pct = (arrecadado / faturamento) * 100;
  if (pct >= 90) return "Excelente";
  if (pct >= 75) return "Bom";
  if (pct >= 60) return "Regular";
  return "Crítico";
};

const inadimplPct = (c: Cooperativa) =>
  parseFloat((((c.faturamento - c.arrecadado) / c.faturamento) * 100).toFixed(1));

const perfBadge = (p: Performance) => {
  const map: Record<Performance, string> = {
    Excelente: "bg-success/10 text-success border-success/30",
    Bom: "bg-primary/10 text-primary border-primary/30",
    Regular: "bg-warning/10 text-warning border-warning/30",
    Crítico: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return map[p];
};

const diasBadge = (d: number) => {
  if (d > 60) return "bg-destructive/10 text-destructive border-destructive/30";
  if (d > 30) return "bg-warning/10 text-warning border-warning/30";
  return "bg-primary/10 text-primary border-primary/30";
};

const rankIcons = [
  <Trophy key="1" className="h-5 w-5 text-amber-500" />,
  <Medal key="2" className="h-5 w-5 text-slate-400" />,
  <Medal key="3" className="h-5 w-5 text-amber-700" />,
];

// -- Relatório Individual Dialog --
const RelatorioDialog = ({
  coop,
  open,
  onClose,
}: {
  coop: Cooperativa | null;
  open: boolean;
  onClose: () => void;
}) => {
  const [dataInicio, setDataInicio] = useState("2024-01-01");
  const [dataFim, setDataFim] = useState("2024-12-31");
  const [status, setStatus] = useState("todos");
  const [tipo, setTipo] = useState("faturamento");
  const [vencimento, setVencimento] = useState("todos");
  const [generated, setGenerated] = useState(false);

  if (!coop) return null;

  const inad = mockInadimplentes[coop.id] ?? [];
  const inadTotal = inad.reduce((s, i) => s + i.valorAberto, 0);

  const mockRows: { mes: string; fat: number; arr: number; acordos: number; cancel: number }[] = [];

  const totalFat = mockRows.reduce((s, r) => s + r.fat, 0);
  const totalArr = mockRows.reduce((s, r) => s + r.arr, 0);
  const totalAcordos = mockRows.reduce((s, r) => s + r.acordos, 0);
  const totalCancel = mockRows.reduce((s, r) => s + r.cancel, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 text-xl">
            <div className="rounded-xl p-2.5 bg-primary/10">
              <FileBarChart className="h-5 w-5 text-primary" />
            </div>
            Relatório — {coop.nome}
          </DialogTitle>
          <DialogDescription>Gere relatórios filtrados por período e tipo</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Data Início</label>
              <Input type="date" className="rounded-lg" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Data Fim</label>
              <Input type="date" className="rounded-lg" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Status Associado</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="adimplente">Adimplente</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="faturamento">Faturamento</SelectItem>
                  <SelectItem value="arrecadacao">Arrecadação</SelectItem>
                  <SelectItem value="inadimplencia">Inadimplência</SelectItem>
                  <SelectItem value="acordos">Acordos</SelectItem>
                  <SelectItem value="cancelamentos">Cancelamentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Dia de Vencimento</label>
              <Select value={vencimento} onValueChange={setVencimento}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="1">Dia 01</SelectItem>
                  <SelectItem value="10">Dia 10</SelectItem>
                  <SelectItem value="20">Dia 20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Voluntário</label>
              <Select defaultValue={coop.voluntario}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Array.from(new Set(mockCooperativas.map((c) => c.voluntario))).sort().map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={() => setGenerated(true)} className="w-full sm:w-auto">
            <FileBarChart className="h-4 w-4 mr-2" />
            Gerar Relatório
          </Button>

          {generated && (
            <>
              <Separator />
              <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Resumo — {dataInicio} até {dataFim}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                    <p className="text-sm font-bold">{fmt(totalFat)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Arrecadado</p>
                    <p className="text-sm font-bold text-success">{fmt(totalArr)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Inadimplência</p>
                    <p className="text-sm font-bold text-destructive">{fmt(inadTotal)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Taxa Arrec.</p>
                    <p className="text-sm font-bold text-primary">{((totalArr / totalFat) * 100).toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Arrecadado</TableHead>
                      <TableHead className="text-center">Acordos</TableHead>
                      <TableHead className="text-center">Cancelam.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.mes}/2024</TableCell>
                        <TableCell className="text-right">{fmt(r.fat)}</TableCell>
                        <TableCell className="text-right text-success">{fmt(r.arr)}</TableCell>
                        <TableCell className="text-center">{r.acordos}</TableCell>
                        <TableCell className="text-center">{r.cancel}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{fmt(totalFat)}</TableCell>
                      <TableCell className="text-right text-success">{fmt(totalArr)}</TableCell>
                      <TableCell className="text-center">{totalAcordos}</TableCell>
                      <TableCell className="text-center">{totalCancel}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success("PDF gerado!", { description: `Relatório ${coop.nome} exportado.` })}>
                  <Download className="h-4 w-4 mr-1.5" />Exportar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("CSV gerado!", { description: `Arquivo CSV de ${coop.nome} pronto.` })}>
                  <Download className="h-4 w-4 mr-1.5" />Exportar CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("Email enviado!", { description: `Relatório enviado para ${coop.email}` })}>
                  <Send className="h-4 w-4 mr-1.5" />Enviar por Email
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// -- Relatório Geral Dialog --
const RelatorioGeralDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const [dataInicio, setDataInicio] = useState("2024-01-01");
  const [dataFim, setDataFim] = useState("2024-12-31");
  const [coopFilter, setCoopFilter] = useState("todas");
  const [vencFilter, setVencFilter] = useState("todos");
  const [volFilter, setVolFilter] = useState("todos");
  const [generated, setGenerated] = useState(false);

  const allVoluntarios = Array.from(new Set(mockCooperativas.map((c) => c.voluntario))).sort();

  const coopsToShow = mockCooperativas.filter((c) => {
    const matchCoop = coopFilter === "todas" || c.id === coopFilter;
    const matchVenc = vencFilter === "todos" || c.diaVencimento === Number(vencFilter);
    const matchVol = volFilter === "todos" || c.voluntario === volFilter;
    return matchCoop && matchVenc && matchVol;
  });

  const withPerf = coopsToShow.map((c) => ({
    ...c,
    perf: getPerformance(c.arrecadado, c.faturamento),
    inadPct: inadimplPct(c),
  }));

  const totalFat = coopsToShow.reduce((s, c) => s + c.faturamento, 0);
  const totalArr = coopsToShow.reduce((s, c) => s + c.arrecadado, 0);
  const totalAssoc = coopsToShow.reduce((s, c) => s + c.associados, 0);
  const totalAcordos = coopsToShow.reduce((s, c) => s + c.acordosAtivos, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 text-xl">
            <div className="rounded-xl p-2.5 bg-primary/10">
              <FileBarChart className="h-5 w-5 text-primary" />
            </div>
            Relatório Geral — Todas as Cooperativas
          </DialogTitle>
          <DialogDescription>Visão consolidada e comparativa por cooperativa</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Data Início</label>
              <Input type="date" className="rounded-lg" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Data Fim</label>
              <Input type="date" className="rounded-lg" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Cooperativa</label>
              <Select value={coopFilter} onValueChange={setCoopFilter}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {mockCooperativas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Dia de Vencimento</label>
              <Select value={vencFilter} onValueChange={setVencFilter}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="1">Dia 01</SelectItem>
                  <SelectItem value="10">Dia 10</SelectItem>
                  <SelectItem value="20">Dia 20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Voluntário</label>
              <Select value={volFilter} onValueChange={setVolFilter}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {allVoluntarios.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={() => setGenerated(true)} className="w-full sm:w-auto">
            <FileBarChart className="h-4 w-4 mr-2" />
            Gerar Relatório Consolidado
          </Button>

          {generated && (
            <>
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Faturamento Total</p>
                    <p className="text-sm font-bold">{fmt(totalFat)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Arrecadado Total</p>
                    <p className="text-sm font-bold text-success">{fmt(totalArr)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Total Associados</p>
                    <p className="text-sm font-bold text-primary">{fmtNum(totalAssoc)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Acordos Ativos</p>
                    <p className="text-sm font-bold text-primary">{totalAcordos}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Cooperativa</TableHead>
                      <TableHead className="text-center">UF</TableHead>
                      <TableHead className="text-right">Associados</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Arrecadado</TableHead>
                      <TableHead className="text-center">Inad.%</TableHead>
                      <TableHead className="text-center">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withPerf.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{c.uf}</Badge></TableCell>
                        <TableCell className="text-right">{fmtNum(c.associados)}</TableCell>
                        <TableCell className="text-right">{fmt(c.faturamento)}</TableCell>
                        <TableCell className="text-right text-success">{fmt(c.arrecadado)}</TableCell>
                        <TableCell className="text-center">
                          <span className={c.inadPct >= 25 ? "text-destructive font-bold" : c.inadPct >= 15 ? "text-warning font-medium" : ""}>
                            {c.inadPct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={perfBadge(c.perf)}>{c.perf}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Totais</TableCell>
                      <TableCell />
                      <TableCell className="text-right">{fmtNum(totalAssoc)}</TableCell>
                      <TableCell className="text-right">{fmt(totalFat)}</TableCell>
                      <TableCell className="text-right text-success">{fmt(totalArr)}</TableCell>
                      <TableCell className="text-center">
                        {(((totalFat - totalArr) / totalFat) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success("PDF gerado!", { description: "Relatório geral exportado em PDF." })}>
                  <Download className="h-4 w-4 mr-1.5" />Exportar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("CSV gerado!", { description: "Arquivo CSV do relatório geral pronto." })}>
                  <Download className="h-4 w-4 mr-1.5" />Exportar CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("Email enviado!", { description: "Relatório geral enviado por email." })}>
                  <Send className="h-4 w-4 mr-1.5" />Enviar por Email
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// -- Detail Dialog --
const DetalheDialog = ({
  coop,
  open,
  onClose,
}: {
  coop: Cooperativa | null;
  open: boolean;
  onClose: () => void;
}) => {
  const [relatorioOpen, setRelatorioOpen] = useState(false);

  if (!coop) return null;
  const perf = getPerformance(coop.arrecadado, coop.faturamento);
  const progressPct = Math.round((coop.arrecadado / coop.faturamento) * 100);
  const inad = mockInadimplentes[coop.id] ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-xl">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              {coop.nome}
            </DialogTitle>
            <DialogDescription>Detalhes financeiros da unidade cooperativa</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Info geral */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">CNPJ</span>
                <span className="font-mono font-medium">{coop.cnpj}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{coop.cidade} / {coop.uf}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{coop.responsavel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{coop.telefone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{coop.email}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Dia de Vencimento</span>
                <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/30">
                  Dia {String(coop.diaVencimento).padStart(2, "0")}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Voluntário */}
            <div>
              <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Voluntário Responsável pelo Contrato
              </h3>
              <div className="rounded-lg border bg-muted/20 p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-semibold">{coop.voluntario}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="font-medium">{coop.voluntarioTelefone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium break-all">{coop.voluntarioEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* 4 mini cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                  <p className="text-sm font-bold">{fmt(coop.faturamento)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Arrecadado</p>
                  <p className="text-sm font-bold text-success">{fmt(coop.arrecadado)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Inadimplência</p>
                  <p className="text-sm font-bold text-destructive">{inadimplPct(coop)}%</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Performance</p>
                  <Badge variant="outline" className={perfBadge(perf)}>{perf}</Badge>
                </CardContent>
              </Card>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Arrecadação vs Faturamento</span>
                <span className="font-bold">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{fmt(coop.arrecadado)} arrecadado</span>
                <span>Meta: {fmt(coop.faturamento)}</span>
              </div>
            </div>

            <Separator />

            {/* Inadimplentes */}
            <div>
              <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Associados Inadimplentes ({inad.length})
              </h3>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Valor Aberto</TableHead>
                      <TableHead>Atraso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inad.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                          Nenhum inadimplente registrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      inad.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{p.nome}</TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">{p.cpf}</TableCell>
                          <TableCell className="text-sm font-medium text-destructive">{fmt(p.valorAberto)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={diasBadge(p.diasAtraso)}>
                              {p.diasAtraso}d
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Relatório section */}
            <div>
              <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Relatório
              </h3>
              <Button variant="outline" onClick={() => setRelatorioOpen(true)}>
                <FileBarChart className="h-4 w-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RelatorioDialog
        coop={coop}
        open={relatorioOpen}
        onClose={() => setRelatorioOpen(false)}
      />
    </>
  );
};

// -- Main Page --
const Cooperativas = () => {
  const [selectedCoop, setSelectedCoop] = useState<Cooperativa | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [relGeralOpen, setRelGeralOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroUF, setFiltroUF] = useState("todos");
  const [filtroPerf, setFiltroPerf] = useState("todas");
  const [filtroInad, setFiltroInad] = useState("todas");
  const [filtroAssoc, setFiltroAssoc] = useState("todos");
  const [filtroVenc, setFiltroVenc] = useState("todos");
  const [filtroVoluntario, setFiltroVoluntario] = useState("todos");

  const withPerf = mockCooperativas.map((c) => ({
    ...c,
    performance: getPerformance(c.arrecadado, c.faturamento),
    inadimplenciaPct: inadimplPct(c),
  }));

  const filtered = withPerf.filter((c) => {
    const matchSearch =
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.uf.toLowerCase().includes(searchTerm.toLowerCase());
    const matchUF = filtroUF === "todos" || c.uf === filtroUF;
    const matchPerf = filtroPerf === "todas" || c.performance === filtroPerf;

    const matchInad = (() => {
      const p = c.inadimplenciaPct;
      if (filtroInad === "todas") return true;
      if (filtroInad === "ate10") return p <= 10;
      if (filtroInad === "10-20") return p > 10 && p <= 20;
      if (filtroInad === "20-30") return p > 20 && p <= 30;
      if (filtroInad === "acima30") return p > 30;
      return true;
    })();

    const matchAssoc = (() => {
      const a = c.associados;
      if (filtroAssoc === "todos") return true;
      if (filtroAssoc === "ate300") return a <= 300;
      if (filtroAssoc === "300-500") return a > 300 && a <= 500;
      if (filtroAssoc === "500-1000") return a > 500 && a <= 1000;
      if (filtroAssoc === "acima1000") return a > 1000;
      return true;
    })();

    const matchVenc = filtroVenc === "todos" || c.diaVencimento === Number(filtroVenc);
    const matchVoluntario = filtroVoluntario === "todos" || c.voluntario === filtroVoluntario;

    return matchSearch && matchUF && matchPerf && matchInad && matchAssoc && matchVenc && matchVoluntario;
  });

  const hasActiveFilters =
    filtroUF !== "todos" ||
    filtroPerf !== "todas" ||
    filtroInad !== "todas" ||
    filtroAssoc !== "todos" ||
    filtroVenc !== "todos" ||
    filtroVoluntario !== "todos" ||
    searchTerm !== "";

  const clearFilters = () => {
    setSearchTerm("");
    setFiltroUF("todos");
    setFiltroPerf("todas");
    setFiltroInad("todas");
    setFiltroAssoc("todos");
    setFiltroVenc("todos");
    setFiltroVoluntario("todos");
  };

  const voluntarios = Array.from(new Set(mockCooperativas.map((c) => c.voluntario))).sort();

  const sorted = [...withPerf].sort(
    (a, b) => b.arrecadado / b.faturamento - a.arrecadado / a.faturamento
  );
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();

  const totalAssociados = mockCooperativas.reduce((s, c) => s + c.associados, 0);
  const totalArrecadado = mockCooperativas.reduce((s, c) => s + c.arrecadado, 0);
  const totalFaturamento = mockCooperativas.reduce((s, c) => s + c.faturamento, 0);
  const inadimplenciaGeral = (((totalFaturamento - totalArrecadado) / totalFaturamento) * 100).toFixed(1);

  const ufs = Array.from(new Set(mockCooperativas.map((c) => c.uf))).sort();

  const openDialog = (coop: Cooperativa) => {
    setSelectedCoop(coop);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Cooperativas</h1>
            <p className="text-sm text-muted-foreground">Visão financeira por unidade</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setRelGeralOpen(true)}>
            <FileBarChart className="h-4 w-4 mr-2" />
            Relatório Geral
          </Button>
          <Badge variant="outline" className="flex items-center gap-1.5 w-fit px-3 py-1.5 bg-primary/10 text-primary border-primary/30">
            <RefreshCw className="h-3.5 w-3.5" />
            Dados sincronizados do GIA
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-primary/10 flex-shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cooperativas Ativas</p>
              <p className="text-2xl font-bold">{mockCooperativas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-success/10 flex-shrink-0">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Associados</p>
              <p className="text-2xl font-bold">{fmtNum(totalAssociados)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-primary/10 flex-shrink-0">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Arrecadação Total</p>
              <p className="text-xl font-bold">{fmt(totalArrecadado)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-destructive/10 flex-shrink-0">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inadimplência Geral</p>
              <p className="text-2xl font-bold text-destructive">{inadimplenciaGeral}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cooperativa..."
              className="pl-9 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filtroUF} onValueChange={setFiltroUF}>
            <SelectTrigger className="w-[130px] rounded-lg">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos UFs</SelectItem>
              {ufs.map((uf) => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroPerf} onValueChange={setFiltroPerf}>
            <SelectTrigger className="w-[150px] rounded-lg">
              <SelectValue placeholder="Performance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="Excelente">Excelente</SelectItem>
              <SelectItem value="Bom">Bom</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="Crítico">Crítico</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroInad} onValueChange={setFiltroInad}>
            <SelectTrigger className="w-[170px] rounded-lg">
              <SelectValue placeholder="Inadimplência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas inad.</SelectItem>
              <SelectItem value="ate10">Até 10%</SelectItem>
              <SelectItem value="10-20">10% – 20%</SelectItem>
              <SelectItem value="20-30">20% – 30%</SelectItem>
              <SelectItem value="acima30">Acima de 30%</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroAssoc} onValueChange={setFiltroAssoc}>
            <SelectTrigger className="w-[170px] rounded-lg">
              <SelectValue placeholder="Associados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos assoc.</SelectItem>
              <SelectItem value="ate300">Até 300</SelectItem>
              <SelectItem value="300-500">300 – 500</SelectItem>
              <SelectItem value="500-1000">500 – 1.000</SelectItem>
              <SelectItem value="acima1000">Acima de 1.000</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroVenc} onValueChange={setFiltroVenc}>
            <SelectTrigger className="w-[160px] rounded-lg">
              <SelectValue placeholder="Vencimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos venc.</SelectItem>
              <SelectItem value="1">Dia 01</SelectItem>
              <SelectItem value="10">Dia 10</SelectItem>
              <SelectItem value="20">Dia 20</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroVoluntario} onValueChange={setFiltroVoluntario}>
            <SelectTrigger className="w-[180px] rounded-lg">
              <SelectValue placeholder="Voluntário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos voluntários</SelectItem>
              {voluntarios.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1.5" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Cooperativas ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Cooperativa</TableHead>
                  <TableHead className="text-center">UF</TableHead>
                  <TableHead>Voluntário</TableHead>
                  <TableHead className="text-center">Vencimento</TableHead>
                  <TableHead className="text-right">Associados</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Arrecadado</TableHead>
                  <TableHead className="text-center">Inadimpl.%</TableHead>
                  <TableHead className="text-center">Acordos</TableHead>
                  <TableHead className="text-center">Cancelam.</TableHead>
                  <TableHead className="text-center">Performance</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-10">
                      Nenhuma cooperativa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{c.uf}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.voluntario}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          Dia {String(c.diaVencimento).padStart(2, "0")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{fmtNum(c.associados)}</TableCell>
                      <TableCell className="text-right">{fmt(c.faturamento)}</TableCell>
                      <TableCell className="text-right text-success font-medium">{fmt(c.arrecadado)}</TableCell>
                      <TableCell className="text-center">
                        <span className={c.inadimplenciaPct >= 25 ? "text-destructive font-bold" : c.inadimplenciaPct >= 15 ? "text-warning font-medium" : "text-foreground"}>
                          {c.inadimplenciaPct}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{c.acordosAtivos}</TableCell>
                      <TableCell className="text-center">{c.cancelamentos}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={perfBadge(c.performance)}>
                          {c.performance}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline" onClick={() => openDialog(c)}>
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Top 3 Melhores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {top3.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {rankIcons[i]}
                  <div>
                    <p className="font-medium text-sm">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.uf} · {fmtNum(c.associados)} assoc.</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={perfBadge(c.performance)}>{c.performance}</Badge>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.inadimplenciaPct}% inad.</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Top 3 Piores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bottom3.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <div>
                    <p className="font-medium text-sm">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.uf} · {fmtNum(c.associados)} assoc.</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={perfBadge(c.performance)}>{c.performance}</Badge>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.inadimplenciaPct}% inad.</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <DetalheDialog
        coop={selectedCoop}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />

      {/* Relatório Geral Dialog */}
      <RelatorioGeralDialog
        open={relGeralOpen}
        onClose={() => setRelGeralOpen(false)}
      />
    </div>
  );
};

export default Cooperativas;

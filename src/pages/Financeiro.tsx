import { useState } from "react";
import {
  Eye, RotateCcw, QrCode, FileText, Copy, Download,
  DollarSign, TrendingUp, Clock, AlertCircle, ArrowDownCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// ── Types ──────────────────────────────────────────────────────────────────
type FormaPagamento = "PIX QR Code" | "Boleto Código de Barras" | "Transferência" | "Outros";
type StatusRecebimento = "Confirmado" | "Pendente" | "Estornado";

interface Recebimento {
  id: string;
  dataHora: string;
  associado: string;
  cpf: string;
  cooperativa: string;
  valor: number;
  forma: FormaPagamento;
  codigoTransacao: string;
  referenciaBoleto: string;
  status: StatusRecebimento;
}

// ── Mock Data ─────────────────────────────────────────────────────────────
const mockRecebimentos: Recebimento[] = [
  { id: "1",  dataHora: "29/03 08:15", associado: "João Carlos da Silva", cpf: "123.456.789-00", cooperativa: "Central SP",      valor: 189.90, forma: "PIX QR Code",             codigoTransacao: "PIX-2026032908150001",  referenciaBoleto: "—",                                                                   status: "Confirmado" },
  { id: "2",  dataHora: "29/03 08:22", associado: "Maria Santos",          cpf: "987.654.321-00", cooperativa: "Central RJ",      valor: 129.90, forma: "Boleto Código de Barras", codigoTransacao: "—",                     referenciaBoleto: "23793.38128 60000.000018 23456.789012 1 92650000012990",           status: "Confirmado" },
  { id: "3",  dataHora: "29/03 08:45", associado: "Pedro Oliveira",        cpf: "456.789.123-00", cooperativa: "Central SP",      valor: 249.90, forma: "PIX QR Code",             codigoTransacao: "PIX-2026032908450002",  referenciaBoleto: "—",                                                                   status: "Confirmado" },
  { id: "4",  dataHora: "29/03 09:10", associado: "Ana Lima",              cpf: "321.654.987-00", cooperativa: "Minas Proteção",  valor: 159.90, forma: "Boleto Código de Barras", codigoTransacao: "—",                     referenciaBoleto: "23793.38128 60000.000024 34567.890123 2 92650000015990",           status: "Confirmado" },
  { id: "5",  dataHora: "29/03 09:30", associado: "Carlos Ferreira",       cpf: "789.123.456-00", cooperativa: "Sul Proteção",    valor: 199.90, forma: "PIX QR Code",             codigoTransacao: "PIX-2026032909300003",  referenciaBoleto: "—",                                                                   status: "Confirmado" },
  { id: "6",  dataHora: "29/03 09:55", associado: "Fernanda Costa",        cpf: "654.321.789-00", cooperativa: "Central SP",      valor: 179.90, forma: "Boleto Código de Barras", codigoTransacao: "—",                     referenciaBoleto: "23793.38128 60000.000036 45678.901234 3 92650000017990",           status: "Pendente"   },
  { id: "7",  dataHora: "29/03 10:12", associado: "Roberto Almeida",       cpf: "147.258.369-00", cooperativa: "Centro-Oeste",    valor: 219.90, forma: "PIX QR Code",             codigoTransacao: "PIX-2026032910120004",  referenciaBoleto: "—",                                                                   status: "Confirmado" },
  { id: "8",  dataHora: "29/03 10:40", associado: "Luciana Martins",       cpf: "963.852.741-00", cooperativa: "Litoral",         valor: 149.90, forma: "PIX QR Code",             codigoTransacao: "PIX-2026032910400005",  referenciaBoleto: "—",                                                                   status: "Confirmado" },
  { id: "9",  dataHora: "29/03 11:05", associado: "Marcos Ribeiro",        cpf: "258.147.369-00", cooperativa: "Nordeste",        valor: 209.90, forma: "Boleto Código de Barras", codigoTransacao: "—",                     referenciaBoleto: "23793.38128 60000.000048 56789.012345 4 92650000020990",           status: "Confirmado" },
  { id: "10", dataHora: "29/03 11:30", associado: "Patrícia Souza",        cpf: "369.258.147-00", cooperativa: "Central RJ",      valor: 169.90, forma: "PIX QR Code",             codigoTransacao: "PIX-2026032911300006",  referenciaBoleto: "—",                                                                   status: "Confirmado" },
  { id: "11", dataHora: "29/03 12:00", associado: "Não identificado",      cpf: "—",              cooperativa: "—",               valor: 189.90, forma: "PIX QR Code",             codigoTransacao: "PIX-2026032912000007",  referenciaBoleto: "—",                                                                   status: "Pendente"   },
  { id: "12", dataHora: "29/03 12:25", associado: "Ricardo Santos",        cpf: "741.852.963-00", cooperativa: "Norte",           valor: 239.90, forma: "Transferência",           codigoTransacao: "TED-2026032912250001",  referenciaBoleto: "—",                                                                   status: "Confirmado" },
  { id: "13", dataHora: "29/03 13:00", associado: "Não identificado",      cpf: "—",              cooperativa: "—",               valor: 159.90, forma: "PIX QR Code",             codigoTransacao: "PIX-2026032913000008",  referenciaBoleto: "—",                                                                   status: "Pendente"   },
];

const mockConciliacao = [
  { id: "1", associado: "João Carlos da Silva",  esperado: 189.90, recebido: 189.90, status: "Conciliado"    },
  { id: "2", associado: "Maria Santos",           esperado: 129.90, recebido: 129.90, status: "Conciliado"    },
  { id: "3", associado: "Ana Lima",               esperado: 159.90, recebido: 159.90, status: "Conciliado"    },
  { id: "4", associado: "Fernanda Costa",         esperado: 179.90, recebido: 0,      status: "Não recebido"  },
  { id: "5", associado: "Roberto Almeida",        esperado: 219.90, recebido: 219.90, status: "Conciliado"    },
  { id: "6", associado: "Marcos Ribeiro",         esperado: 209.90, recebido: 209.90, status: "Conciliado"    },
  { id: "7", associado: "Sílvia Duarte",          esperado: 189.90, recebido: 100.00, status: "Parcial"       },
  { id: "8", associado: "Tiago Moraes",           esperado: 149.90, recebido: 0,      status: "Não recebido"  },
  { id: "9", associado: "Renata Braga",           esperado: 199.90, recebido: 250.00, status: "Excedente"     },
  { id: "10", associado: "Gustavo Neves",         esperado: 169.90, recebido: 0,      status: "Não recebido"  },
];

// ── Helper Components ─────────────────────────────────────────────────────
function FormaBadge({ forma }: { forma: FormaPagamento }) {
  if (forma === "PIX QR Code")
    return <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1"><QrCode className="h-3 w-3" />PIX QR Code</Badge>;
  if (forma === "Boleto Código de Barras")
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><FileText className="h-3 w-3" />Boleto</Badge>;
  if (forma === "Transferência")
    return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><ArrowDownCircle className="h-3 w-3" />Transferência</Badge>;
  return <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1">Outros</Badge>;
}

function StatusBadge({ status }: { status: StatusRecebimento }) {
  if (status === "Confirmado") return <Badge className="bg-green-100 text-green-700 border-green-200">Confirmado</Badge>;
  if (status === "Pendente")   return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendente</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200">Estornado</Badge>;
}

function ConciliacaoBadge({ status }: { status: string }) {
  if (status === "Conciliado")   return <Badge className="bg-green-100 text-green-700 border-green-200">Conciliado</Badge>;
  if (status === "Parcial")      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Parcial</Badge>;
  if (status === "Excedente")    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Excedente</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200">Não recebido</Badge>;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function Financeiro() {
  const { toast } = useToast();

  // Filters
  const [search, setSearch]       = useState("");
  const [formaFiltro, setForma]   = useState("Todos");
  const [dataFiltro, setData]     = useState("2026-03-29");

  // Dialogs
  const [detalheItem, setDetalheItem]   = useState<Recebimento | null>(null);
  const [estornoItem, setEstornoItem]   = useState<Recebimento | null>(null);
  const [vincularBusca, setVincular]    = useState("");

  // Conciliação
  const [dataConciliacao, setDataConc] = useState("2026-03-29");

  // Extrato
  const [extratoInicio, setExtratoInicio] = useState("2026-03-23");
  const [extratoFim, setExtratoFim]       = useState("2026-03-29");

  // ── Derived ────────────────────────────────────────────────────────────
  const filtered = mockRecebimentos.filter((r) => {
    const matchSearch = search === "" ||
      r.associado.toLowerCase().includes(search.toLowerCase()) ||
      r.cpf.includes(search) ||
      r.codigoTransacao.toLowerCase().includes(search.toLowerCase());
    const matchForma = formaFiltro === "Todos" || r.forma === formaFiltro;
    return matchSearch && matchForma;
  });

  const totalHoje    = mockRecebimentos.reduce((s, r) => s + (r.status !== "Estornado" ? r.valor : 0), 0);
  const totalPix     = mockRecebimentos.filter(r => r.forma === "PIX QR Code" && r.status !== "Estornado").reduce((s, r) => s + r.valor, 0);
  const totalBoleto  = mockRecebimentos.filter(r => r.forma === "Boleto Código de Barras" && r.status !== "Estornado").reduce((s, r) => s + r.valor, 0);
  const pendentesId  = mockRecebimentos.filter(r => r.associado === "Não identificado").length;

  // Extrato mock (últimos 7 dias)
  const extratoItems = [
    { id: "e1", dataHora: "29/03 13:00", desc: "Não identificado — PIX",           cod: "PIX-2026032913000008", valor: 159.90,  tipo: "entrada" },
    { id: "e2", dataHora: "29/03 12:25", desc: "Ricardo Santos — Transferência",    cod: "TED-2026032912250001", valor: 239.90,  tipo: "entrada" },
    { id: "e3", dataHora: "29/03 12:00", desc: "Não identificado — PIX",           cod: "PIX-2026032912000007", valor: 189.90,  tipo: "entrada" },
    { id: "e4", dataHora: "29/03 11:30", desc: "Patrícia Souza — PIX",             cod: "PIX-2026032911300006", valor: 169.90,  tipo: "entrada" },
    { id: "e5", dataHora: "29/03 11:05", desc: "Marcos Ribeiro — Boleto",          cod: "BOL-20260329110500",   valor: 209.90,  tipo: "entrada" },
    { id: "e6", dataHora: "28/03 14:10", desc: "Fernanda Costa — Boleto",          cod: "BOL-20260328141000",   valor: 179.90,  tipo: "estorno"  },
    { id: "e7", dataHora: "28/03 10:00", desc: "Carlos Ferreira — PIX",            cod: "PIX-2026032810000001", valor: 199.90,  tipo: "entrada" },
    { id: "e8", dataHora: "27/03 09:30", desc: "Luciana Martins — PIX",            cod: "PIX-2026032709300001", valor: 149.90,  tipo: "entrada" },
    { id: "e9", dataHora: "26/03 16:00", desc: "João Carlos — PIX",                cod: "PIX-2026032616000001", valor: 189.90,  tipo: "entrada" },
    { id: "e10",dataHora: "25/03 11:00", desc: "Pedro Oliveira — PIX",             cod: "PIX-2026032511000001", valor: 249.90,  tipo: "entrada" },
  ];
  const totalEntradas = extratoItems.filter(e => e.tipo === "entrada").reduce((s, e) => s + e.valor, 0);
  const totalEstornos = extratoItems.filter(e => e.tipo === "estorno").reduce((s, e) => s + e.valor, 0);
  let saldoAcc = 0;
  const extratoComSaldo = extratoItems.slice().reverse().map((e) => {
    saldoAcc += e.tipo === "entrada" ? e.valor : -e.valor;
    return { ...e, saldo: saldoAcc };
  }).reverse();

  // Relatórios
  const porForma = [
    { forma: "PIX QR Code",             qtd: 8,  total: 7230.00, pct: 58.1 },
    { forma: "Boleto Código de Barras", qtd: 4,  total: 5220.00, pct: 41.9 },
    { forma: "Transferência",           qtd: 1,  total: 239.90,  pct: 1.9  },
    { forma: "Outros",                  qtd: 0,  total: 0,       pct: 0    },
  ];
  const porCoop = [
    { coop: "Central SP",     rec: 3, total: 619.70,  ticket: 206.57 },
    { coop: "Central RJ",     rec: 2, total: 299.80,  ticket: 149.90 },
    { coop: "Minas Proteção", rec: 1, total: 159.90,  ticket: 159.90 },
    { coop: "Sul Proteção",   rec: 1, total: 199.90,  ticket: 199.90 },
    { coop: "Centro-Oeste",   rec: 1, total: 219.90,  ticket: 219.90 },
    { coop: "Norte",          rec: 1, total: 239.90,  ticket: 239.90 },
    { coop: "Nordeste",       rec: 1, total: 209.90,  ticket: 209.90 },
    { coop: "Litoral",        rec: 1, total: 149.90,  ticket: 149.90 },
  ];
  const evolucao = [
    { data: "23/03", rec: 18, valor: 3210.00, comp: "+4,2%" },
    { data: "24/03", rec: 22, valor: 3890.00, comp: "+21,2%" },
    { data: "25/03", rec: 20, valor: 3540.00, comp: "-9,0%" },
    { data: "26/03", rec: 25, valor: 4350.00, comp: "+22,9%" },
    { data: "27/03", rec: 19, valor: 3210.00, comp: "-26,2%" },
    { data: "28/03", rec: 28, valor: 4980.00, comp: "+55,1%" },
    { data: "29/03", rec: 13, valor: 2669.70, comp: "-46,4%" },
  ];
  const horarios = [
    { faixa: "08h–10h", qtd: 5, valor: 929.50  },
    { faixa: "10h–12h", qtd: 4, valor: 749.60  },
    { faixa: "12h–14h", qtd: 3, valor: 589.70  },
    { faixa: "14h–16h", qtd: 0, valor: 0       },
    { faixa: "16h–18h", qtd: 0, valor: 0       },
    { faixa: "18h–20h", qtd: 0, valor: 0       },
  ];
  const maxHor = Math.max(...horarios.map(h => h.qtd));

  // ── Handlers ──────────────────────────────────────────────────────────
  function copiar(texto: string, label: string) {
    navigator.clipboard.writeText(texto).catch(() => {});
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência.` });
  }

  function confirmarEstorno() {
    setEstornoItem(null);
    toast({ title: "Estorno solicitado", description: "O recebimento foi estornado com sucesso.", variant: "destructive" });
  }

  function gerarComprovante() {
    toast({ title: "Gerando comprovante…", description: "O comprovante PDF será baixado em instantes." });
  }

  function exportarExtrato(tipo: string) {
    toast({ title: `Exportando ${tipo}…`, description: "O arquivo será baixado em instantes." });
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" /> Financeiro
        </h1>
        <p className="text-muted-foreground text-sm">Recebimentos, conciliação e extrato financeiro</p>
      </div>

      <Tabs defaultValue="recebimentos">
        <TabsList className="mb-4">
          <TabsTrigger value="recebimentos">Recebimentos</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação Diária</TabsTrigger>
          <TabsTrigger value="extrato">Extrato</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════
            TAB 1 — RECEBIMENTOS
        ══════════════════════════════════════════════════════════ */}
        <TabsContent value="recebimentos" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground">Recebido Hoje</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><p className="text-xl font-bold text-green-600">{fmt(totalHoje)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground">Recebido no Mês</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><p className="text-xl font-bold">{fmt(285620)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><QrCode className="h-3 w-3 text-purple-500" />Via PIX/QR Code</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><p className="text-xl font-bold text-purple-600">{fmt(totalPix)}</p><p className="text-xs text-muted-foreground">hoje</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3 text-blue-500" />Via Boleto</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><p className="text-xl font-bold text-blue-600">{fmt(totalBoleto)}</p><p className="text-xs text-muted-foreground">hoje</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3 text-yellow-500" />Pendentes Identificação</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><p className="text-xl font-bold text-yellow-600">{pendentesId}</p></CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={dataFiltro} onChange={e => setData(e.target.value)} className="w-36" />
                </div>
                <div>
                  <Label className="text-xs">De</Label>
                  <Input type="date" className="w-36" />
                </div>
                <div>
                  <Label className="text-xs">Até</Label>
                  <Input type="date" className="w-36" />
                </div>
                <div className="min-w-[180px]">
                  <Label className="text-xs">Forma de Pagamento</Label>
                  <Select value={formaFiltro} onValueChange={setForma}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="PIX QR Code">PIX QR Code</SelectItem>
                      <SelectItem value="Boleto Código de Barras">Boleto Código de Barras</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[180px]">
                  <Label className="text-xs">Cooperativa</Label>
                  <Select defaultValue="Todas">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas">Todas</SelectItem>
                      <SelectItem value="Central SP">Central SP</SelectItem>
                      <SelectItem value="Central RJ">Central RJ</SelectItem>
                      <SelectItem value="Minas Proteção">Minas Proteção</SelectItem>
                      <SelectItem value="Sul Proteção">Sul Proteção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">Buscar nome/CPF/código</Label>
                  <Input placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Data/Hora</TableHead>
                      <TableHead>Associado</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Cooperativa</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Forma Pagamento</TableHead>
                      <TableHead className="whitespace-nowrap">Cód. Transação</TableHead>
                      <TableHead className="whitespace-nowrap">Ref. Boleto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id} className={r.associado === "Não identificado" ? "bg-yellow-50" : ""}>
                        <TableCell className="whitespace-nowrap text-sm">{r.dataHora}</TableCell>
                        <TableCell className="font-medium text-sm">{r.associado}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.cpf}</TableCell>
                        <TableCell className="text-sm">{r.cooperativa}</TableCell>
                        <TableCell className="font-semibold text-sm">{fmt(r.valor)}</TableCell>
                        <TableCell><FormaBadge forma={r.forma} /></TableCell>
                        <TableCell className="text-xs font-mono max-w-[160px] truncate">{r.codigoTransacao}</TableCell>
                        <TableCell className="text-xs font-mono max-w-[160px] truncate">{r.referenciaBoleto}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver Detalhes" onClick={() => setDetalheItem(r)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Estornar" onClick={() => setEstornoItem(r)}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 2 — CONCILIAÇÃO DIÁRIA
        ══════════════════════════════════════════════════════════ */}
        <TabsContent value="conciliacao" className="space-y-4">
          <div className="flex items-center gap-4">
            <div>
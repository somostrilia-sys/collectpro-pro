import { useState } from "react";
import {
  Eye, RotateCcw, QrCode, FileText, Copy, Download,
  DollarSign, AlertCircle, ArrowDownCircle, Wallet, CreditCard, BarChart3,
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

type FormaPagamento = "PIX QR Code" | "Boleto Código de Barras" | "Transferência" | "Outros";
type StatusRec = "Confirmado" | "Pendente" | "Estornado";

interface Recebimento {
  id: string; dataHora: string; associado: string; cpf: string;
  cooperativa: string; valor: number; forma: FormaPagamento;
  codigoTransacao: string; referenciaBoleto: string; status: StatusRec;
}

const mockRec: Recebimento[]  = [];

const mockConc = [];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

function FormaBadge({ forma }: { forma: FormaPagamento }) {
  if (forma === "PIX QR Code")
    return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200 gap-1 text-xs"><QrCode className="h-3 w-3" />PIX QR Code</Badge>;
  if (forma === "Boleto Código de Barras")
    return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs"><FileText className="h-3 w-3" />Boleto</Badge>;
  if (forma === "Transferência")
    return <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1 text-xs"><ArrowDownCircle className="h-3 w-3" />Transferência</Badge>;
  return <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">Outros</Badge>;
}

function StatusBadge({ status }: { status: StatusRec }) {
  if (status === "Confirmado") return <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">Confirmado</Badge>;
  if (status === "Pendente")   return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">Pendente</Badge>;
  return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Estornado</Badge>;
}

function ConcBadge({ status }: { status: string }) {
  if (status === "Conciliado")   return <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">Conciliado</Badge>;
  if (status === "Parcial")      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">Parcial</Badge>;
  if (status === "Excedente")    return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">Excedente</Badge>;
  return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Não recebido</Badge>;
}

export default function Financeiro() {
  const { toast } = useToast();
  const [search, setSearch]   = useState("");
  const [formaF, setFormaF]   = useState("Todos");
  const [dataF, setDataF]     = useState(new Date().toISOString().slice(0,10));
  const [detalhe, setDetalhe] = useState<Recebimento | null>(null);
  const [estorno, setEstorno] = useState<Recebimento | null>(null);
  const [vincBusca, setVinc]  = useState("");
  const [dataCon, setDataCon] = useState(new Date().toISOString().slice(0,10));

  const filtered = mockRec.filter(r => {
    const s = search.toLowerCase();
    const mS = !search || r.associado.toLowerCase().includes(s) || r.cpf.includes(s) || r.codigoTransacao.toLowerCase().includes(s);
    const mF = formaF === "Todos" || r.forma === formaF;
    return mS && mF;
  });

  const totalHoje   = mockRec.filter(r => r.status !== "Estornado").reduce((s,r) => s+r.valor, 0);
  const totalPix    = mockRec.filter(r => r.forma === "PIX QR Code" && r.status !== "Estornado").reduce((s,r) => s+r.valor, 0);
  const totalBoleto = mockRec.filter(r => r.forma === "Boleto Código de Barras" && r.status !== "Estornado").reduce((s,r) => s+r.valor, 0);
  const pendId      = mockRec.filter(r => r.associado === "Não identificado").length;

  const extratoRaw: { id: string; dataHora: string; desc: string; cod: string; valor: number; tipo: "entrada" | "estorno" }[] = [];
  let acc = 0;
  const extrato = extratoRaw.slice().reverse().map(e => {
    acc += e.tipo === "entrada" ? e.valor : -e.valor;
    return { ...e, saldo: acc };
  }).reverse();
  const totEntradas = extratoRaw.filter(e => e.tipo === "entrada").reduce((s,e) => s+e.valor, 0);
  const totEstornos = extratoRaw.filter(e => e.tipo === "estorno").reduce((s,e) => s+e.valor, 0);

  const porForma: { forma: string; qtd: number; total: number; pct: number }[] = [];
  const porCoop: { coop: string; rec: number; total: number; ticket: number }[] = [];
  const evolucao: { data: string; rec: number; valor: number; comp: string; neg: boolean }[] = [];
  const horarios: { faixa: string; qtd: number; valor: number }[] = [];
  const maxH = Math.max(...horarios.map(h => h.qtd), 1);

  function copiar(txt: string, label: string) {
    navigator.clipboard.writeText(txt).catch(() => {});
    toast({ title:"Copiado!", description:`${label} copiado para a área de transferência.` });
  }
  function confirmarEstorno() {
    setEstorno(null);
    toast({ title:"Estorno solicitado", description:"Recebimento estornado com sucesso.", variant:"destructive" });
  }
  function exportar(tipo: string) {
    toast({ title:`Exportando ${tipo}...`, description:"O arquivo será baixado em instantes." });
  }

  const recCount = filtered.length;
  const concCount = mockConc.length;
  const extCount = extrato.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-primary/10">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          Financeiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Recebimentos, conciliação e extrato financeiro</p>
      </div>

      <Tabs defaultValue="recebimentos">
        <TabsList className="mb-4">
          <TabsTrigger value="recebimentos" className="gap-1.5">
            Recebimentos
            <Badge variant="secondary" className="text-xs h-5 px-1.5">{recCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="conciliacao" className="gap-1.5">
            Conciliação Diária
            <Badge variant="secondary" className="text-xs h-5 px-1.5">{concCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="extrato" className="gap-1.5">
            Extrato
            <Badge variant="secondary" className="text-xs h-5 px-1.5">{extCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* TAB 1: RECEBIMENTOS */}
        <TabsContent value="recebimentos" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-xl p-2 bg-success/10">
                    <Wallet className="h-4 w-4 text-success" />
                  </div>
                  <span className="text-xs text-muted-foreground">Recebido Hoje</span>
                </div>
                <p className="text-xl font-bold text-success">{fmt(totalHoje)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-xl p-2 bg-primary/10">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Recebido no Mês</span>
                </div>
                <p className="text-xl font-bold">{fmt(0)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-xl p-2 bg-purple-500/10">
                    <QrCode className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Via PIX/QR Code</span>
                </div>
                <p className="text-xl font-bold text-purple-600">{fmt(totalPix)}</p>
                <p className="text-xs text-muted-foreground">hoje</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-xl p-2 bg-primary/10">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Via Boleto</span>
                </div>
                <p className="text-xl font-bold text-primary">{fmt(totalBoleto)}</p>
                <p className="text-xs text-muted-foreground">hoje</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-xl p-2 bg-warning/10">
                    <AlertCircle className="h-4 w-4 text-warning" />
                  </div>
                  <span className="text-xs text-muted-foreground">Pendentes ID</span>
                </div>
                <p className="text-xl font-bold text-warning">{pendId}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <Label className="text-xs mb-1 block">Data</Label>
                  <Input type="date" value={dataF} onChange={e => setDataF(e.target.value)} className="w-36" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">De</Label>
                  <Input type="date" className="w-36" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Até</Label>
                  <Input type="date" className="w-36" />
                </div>
                <div className="min-w-[190px]">
                  <Label className="text-xs mb-1 block">Forma de Pagamento</Label>
                  <Select value={formaF} onValueChange={setFormaF}>
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
                <div className="min-w-[160px]">
                  <Label className="text-xs mb-1 block">Cooperativa</Label>
                  <Select defaultValue="Todas">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas">Todas</SelectItem>
                      <SelectItem value="Central SP">Central SP</SelectItem>
                      <SelectItem value="Central RJ">Central RJ</SelectItem>
                      <SelectItem value="Minas Proteção">Minas Proteção</SelectItem>
                      <SelectItem value="Sul Proteção">Sul Proteção</SelectItem>
                      <SelectItem value="Centro-Oeste">Centro-Oeste</SelectItem>
                      <SelectItem value="Norte">Norte</SelectItem>
                      <SelectItem value="Nordeste">Nordeste</SelectItem>
                      <SelectItem value="Litoral">Litoral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs mb-1 block">Buscar nome / CPF / código</Label>
                  <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Associado</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Cooperativa</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Forma Pagamento</TableHead>
                      <TableHead>Cód. Transação</TableHead>
                      <TableHead>Ref. Boleto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-8 w-8 opacity-40" />
                            <p className="text-sm">Nenhum recebimento encontrado.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filtered.map(r => (
                      <TableRow key={r.id} className={r.associado === "Não identificado" ? "bg-warning/5" : ""}>
                        <TableCell className="whitespace-nowrap text-sm">{r.dataHora}</TableCell>
                        <TableCell className="font-medium text-sm">{r.associado}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.cpf}</TableCell>
                        <TableCell className="text-sm">{r.cooperativa}</TableCell>
                        <TableCell className="font-semibold text-sm">{fmt(r.valor)}</TableCell>
                        <TableCell><FormaBadge forma={r.forma} /></TableCell>
                        <TableCell className="text-xs font-mono max-w-[130px] truncate">{r.codigoTransacao}</TableCell>
                        <TableCell className="text-xs font-mono max-w-[110px] truncate">{r.referenciaBoleto}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver Detalhes" onClick={() => setDetalhe(r)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Estornar" onClick={() => setEstorno(r)}>
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

        {/* TAB 2: CONCILIAÇÃO DIÁRIA */}
        <TabsContent value="conciliacao" className="space-y-6">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Data da Conciliação:</Label>
            <Input type="date" value={dataCon} onChange={e => setDataCon(e.target.value)} className="w-40" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">Total Esperado</p>
                <p className="text-xl font-bold">{fmt(0)}</p>
                <p className="text-xs text-muted-foreground">boletos vencidos</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
                <p className="text-xl font-bold text-success">{fmt(0)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">Diferença</p>
                <p className="text-xl font-bold text-destructive">{fmt(0)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">Taxa de Recebimento</p>
                <p className="text-xl font-bold text-primary">0%</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-heading">Recebido vs Esperado</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              <Progress value={0} className="h-4" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{fmt(0)} recebido</span>
                <span>0%</span>
                <span>{fmt(0)} esperado</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Associado</TableHead>
                      <TableHead>Valor Esperado</TableHead>
                      <TableHead>Valor Recebido</TableHead>
                      <TableHead>Diferença</TableHead>
                      <TableHead>Status Conciliação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockConc.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.associado}</TableCell>
                        <TableCell className="text-sm">{fmt(c.esperado)}</TableCell>
                        <TableCell className="text-sm">{c.recebido > 0 ? fmt(c.recebido) : "—"}</TableCell>
                        <TableCell className={`text-sm font-medium ${c.recebido >= c.esperado ? "text-success" : "text-destructive"}`}>
                          {c.recebido >= c.esperado ? "+" : ""}{fmt(c.recebido - c.esperado)}
                        </TableCell>
                        <TableCell><ConcBadge status={c.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: EXTRATO */}
        <TabsContent value="extrato" className="space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs mb-1 block">De</Label>
              <Input type="date" className="w-36" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Até</Label>
              <Input type="date" className="w-36" />
            </div>
            <Button variant="outline" className="gap-2" onClick={() => exportar("CSV")}>
              <Download className="h-4 w-4" />Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => exportar("PDF")}>
              <FileText className="h-4 w-4" />Exportar PDF
            </Button>
          </div>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="divide-y">
                {extrato.map(e => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-xl p-2 ${e.tipo === "entrada" ? "bg-success/10" : "bg-destructive/10"}`}>
                        <ArrowDownCircle className={`h-4 w-4 ${e.tipo === "entrada" ? "text-success" : "text-destructive rotate-180"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.desc}</p>
                        <p className="text-xs text-muted-foreground font-mono">{e.cod}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${e.tipo === "entrada" ? "text-success" : "text-destructive"}`}>
                        {e.tipo === "entrada" ? "+" : "-"}{fmt(e.valor)}
                      </p>
                      <p className="text-xs text-muted-foreground">{e.dataHora}</p>
                      <p className="text-xs text-muted-foreground">Saldo: {fmt(e.saldo)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Total de Entradas</p>
                  <p className="text-lg font-bold text-success">+{fmt(totEntradas)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de Estornos</p>
                  <p className="text-lg font-bold text-destructive">-{fmt(totEstornos)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Líquido</p>
                  <p className="text-lg font-bold">{fmt(totEntradas - totEstornos)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: RELATÓRIOS */}
        <TabsContent value="relatorios" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-heading flex items-center gap-2">
                  <div className="rounded-xl p-1.5 bg-purple-500/10">
                    <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
                  </div>
                  Por Forma de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Forma</TableHead>
                      <TableHead className="text-xs">Qtd</TableHead>
                      <TableHead className="text-xs">Total</TableHead>
                      <TableHead className="text-xs">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porForma.map(f => (
                      <TableRow key={f.forma}>
                        <TableCell className="text-xs">{f.forma}</TableCell>
                        <TableCell className="text-xs">{f.qtd}</TableCell>
                        <TableCell className="text-xs font-medium">{fmt(f.total)}</TableCell>
                        <TableCell className="text-xs">{f.pct}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-heading flex items-center gap-2">
                  <div className="rounded-xl p-1.5 bg-primary/10">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Por Cooperativa
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Cooperativa</TableHead>
                      <TableHead className="text-xs">Rec.</TableHead>
                      <TableHead className="text-xs">Total</TableHead>
                      <TableHead className="text-xs">Ticket Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porCoop.map(c => (
                      <TableRow key={c.coop}>
                        <TableCell className="text-xs">{c.coop}</TableCell>
                        <TableCell className="text-xs">{c.rec}</TableCell>
                        <TableCell className="text-xs font-medium">{fmt(c.total)}</TableCell>
                        <TableCell className="text-xs">{fmt(c.ticket)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-heading">Evolução Diária (últimos 7 dias)</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Recebimentos</TableHead>
                      <TableHead className="text-xs">Valor</TableHead>
                      <TableHead className="text-xs">vs Dia Ant.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evolucao.map(e => (
                      <TableRow key={e.data}>
                        <TableCell className="text-xs font-medium">{e.data}</TableCell>
                        <TableCell className="text-xs">{e.rec}</TableCell>
                        <TableCell className="text-xs font-medium">{fmt(e.valor)}</TableCell>
                        <TableCell className={`text-xs font-medium ${e.neg ? "text-destructive" : "text-success"}`}>{e.comp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-heading">Horários de Pico</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {horarios.map(h => (
                  <div key={h.faixa}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{h.faixa}</span>
                      <span className="text-muted-foreground">{h.qtd} pagamentos — {fmt(h.valor)}</span>
                    </div>
                    <Progress value={(h.qtd / maxH) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG: VER DETALHES */}
      <Dialog open={!!detalhe} onOpenChange={o => { if (!o) { setDetalhe(null); setVinc(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              Detalhes do Recebimento
            </DialogTitle>
            <DialogDescription>Informações completas da transação</DialogDescription>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm p-4 rounded-lg bg-muted/30">
                <div><p className="text-xs text-muted-foreground">Data/Hora</p><p className="font-medium">{detalhe.dataHora}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={detalhe.status} /></div>
                <div><p className="text-xs text-muted-foreground">Associado</p><p className="font-medium">{detalhe.associado}</p></div>
                <div><p className="text-xs text-muted-foreground">CPF</p><p className="font-medium">{detalhe.cpf}</p></div>
                <div><p className="text-xs text-muted-foreground">Cooperativa</p><p className="font-medium">{detalhe.cooperativa}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor</p><p className="font-bold text-success">{fmt(detalhe.valor)}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Forma de Pagamento</p><FormaBadge forma={detalhe.forma} /></div>
              </div>

              {detalhe.codigoTransacao !== "—" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Código da Transação</p>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                    {detalhe.forma === "PIX QR Code" && (
                      <QrCode className="h-8 w-8 text-purple-500 flex-shrink-0" />
                    )}
                    <code className="text-xs font-mono flex-1">{detalhe.codigoTransacao}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copiar(detalhe.codigoTransacao, "Código da transação")}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {detalhe.referenciaBoleto !== "—" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Código de Barras</p>
                  <div className="flex items-start gap-2 bg-muted/50 rounded-lg px-3 py-2">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <code className="text-xs font-mono flex-1 break-all">{detalhe.referenciaBoleto}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => copiar(detalhe.referenciaBoleto, "Código de barras")}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {detalhe.associado === "Não identificado" && (
                <div className="rounded-lg p-3 bg-warning/5 border border-warning/20 space-y-2">
                  <p className="text-xs font-medium text-warning">Recebimento pendente de identificação</p>
                  <Label className="text-xs">Vincular a Associado (nome ou CPF)</Label>
                  <Input
                    placeholder="Buscar associado..."
                    value={vincBusca}
                    onChange={e => setVinc(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" className="w-full" onClick={() => {
                    if (vincBusca) {
                      toast({ title:"Associado vinculado!", description:`Recebimento vinculado a: ${vincBusca}` });
                      setVinc("");
                      setDetalhe(null);
                    }
                  }}>
                    Vincular
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { toast({ title:"Gerando comprovante...", description:"O comprovante PDF será baixado em instantes." }); }}>
              <Download className="h-4 w-4 mr-1" />Gerar Comprovante PDF
            </Button>
            <Button variant="outline" onClick={() => { setDetalhe(null); setVinc(""); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CONFIRMAR ESTORNO */}
      <Dialog open={!!estorno} onOpenChange={o => { if (!o) setEstorno(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Confirmar Estorno</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja estornar este recebimento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {estorno && (
            <div className="rounded-lg p-3 bg-muted/50 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Associado:</span> <strong>{estorno.associado}</strong></p>
              <p><span className="text-muted-foreground">Valor:</span> <strong className="text-success">{fmt(estorno.valor)}</strong></p>
              <p><span className="text-muted-foreground">Data/Hora:</span> {estorno.dataHora}</p>
              <p><span className="text-muted-foreground">Cód. Transação:</span> <code className="text-xs">{estorno.codigoTransacao}</code></p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstorno(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarEstorno}>
              <RotateCcw className="h-4 w-4 mr-1" />Confirmar Estorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

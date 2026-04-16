import { useState } from "react";
import { Search, Filter, Send, Eye, RefreshCw, Copy, MessageCircle, Mail, FileDown, Receipt, CheckCircle2, AlertTriangle, TrendingUp, ExternalLink, QrCode, Loader2, Clock, Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useBoletos, useBoletosKPIs, useSyncGIA, useCreateAcordo, useRegistrarPagamento, type BoletoRow } from "@/hooks/useCollectData";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, string> = {
    pago: "bg-success/10 text-success border-success/20",
    baixado: "bg-success/10 text-success border-success/20",
    aberto: "bg-warning/10 text-warning border-warning/20",
    pendente: "bg-warning/10 text-warning border-warning/20",
    vencido: "bg-destructive/10 text-destructive border-destructive/20",
    cancelado: "bg-muted text-muted-foreground border-muted",
    acordo: "bg-primary/10 text-primary border-primary/20",
    congelado: "bg-blue-100 text-blue-700 border-blue-200",
  };
  const label: Record<string, string> = {
    pago: "Pago", baixado: "Pago", aberto: "Aberto", pendente: "Pendente",
    vencido: "Vencido", cancelado: "Cancelado", acordo: "Acordo", congelado: "Congelado",
  };
  return (
    <Badge variant="outline" className={`${config[status] || config.cancelado} text-xs font-medium`}>
      {label[status] || status}
    </Badge>
  );
}

function getMesLabel(mesRef: string) {
  if (!mesRef) return "—";
  const [y, m] = mesRef.split("-");
  const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[parseInt(m)] || m}/${y}`;
}

const Boletos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [mesFilter, setMesFilter] = useState("todos");
  const [tab, setTab] = useState("mes_atual");

  const [viewBoleto, setViewBoleto] = useState<BoletoRow | null>(null);
  const [sendBoleto, setSendBoleto] = useState<BoletoRow | null>(null);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const { data: kpis, isLoading: loadingKpis } = useBoletosKPIs();
  const syncGIA = useSyncGIA();

  const hoje = new Date().toISOString().split("T")[0];
  const mesAtual = hoje.slice(0, 7);

  // Filtro baseado na tab
  const filtroQuery = tab === "atrasados"
    ? { status: "vencido" }
    : tab === "mes_atual"
    ? { mesRef: mesAtual, status: statusFilter !== "todos" ? statusFilter : undefined }
    : { mesRef: mesFilter !== "todos" ? mesFilter : undefined, status: statusFilter !== "todos" ? statusFilter : undefined };

  const { data: boletos = [], isLoading } = useBoletos(filtroQuery as any);

  // Filtragem por busca
  const filtered = boletos.filter((b) => {
    const term = searchTerm.toLowerCase();
    return !term || b.associado.toLowerCase().includes(term) || b.cpf.includes(term);
  });

  // KPIs do filtro
  const totalFiltro = filtered.length;
  const valorFiltro = filtered.reduce((s, b) => s + b.valor, 0);

  const handleSync = () => {
    syncGIA.mutate("inadimplentes", {
      onSuccess: (data: any) => {
        toast({ title: "Sincronização concluída", description: `${data?.resultado?.inadimplentes?.synced || 0} registros atualizados.` });
      },
      onError: () => {
        toast({ title: "Erro na sincronização", variant: "destructive" });
      },
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((b) => b.id)));
    }
  };

  const handleDisparoAvulso = () => {
    const count = selectedIds.size;
    if (count === 0) {
      toast({ title: "Selecione boletos", description: "Marque os boletos para disparar.", variant: "destructive" });
      return;
    }
    toast({ title: `Disparo enviado para ${count} associado(s)`, description: "Boletos enviados via WhatsApp." });
    setSelectedIds(new Set());
  };

  const handleSendConfirm = () => {
    if (!sendBoleto) return;
    const channels: string[] = [];
    if (sendWhatsApp) channels.push("WhatsApp");
    if (sendEmail) channels.push("E-mail");
    if (channels.length === 0) {
      toast({ title: "Selecione um canal", variant: "destructive" });
      return;
    }
    toast({ title: "Boleto enviado!", description: `Enviado para ${sendBoleto.associado} via ${channels.join(" e ")}.` });
    setSendBoleto(null);
  };

  // ── Unificação de Boletos ──
  const { user } = useAuth();
  const [dialogUnificar, setDialogUnificar] = useState(false);
  const [unificarDesconto, setUnificarDesconto] = useState("");
  const [unificarObs, setUnificarObs] = useState("");
  const [unificando, setUnificando] = useState(false);

  const boletosParaUnificar = filtered.filter((b) => selectedIds.has(b.id) && ["aberto", "vencido"].includes(b.status));
  const valorTotalUnificar = boletosParaUnificar.reduce((s, b) => s + b.valor, 0);
  const associadosUnicos = [...new Set(boletosParaUnificar.map((b) => b.associado))];

  const handleAbrirUnificar = () => {
    if (boletosParaUnificar.length < 2) {
      toast({ title: "Selecione pelo menos 2 boletos vencidos/abertos do mesmo associado", variant: "destructive" });
      return;
    }
    if (associadosUnicos.length > 1) {
      toast({ title: "Selecione boletos de um único associado", description: "A unificação só funciona para boletos do mesmo associado.", variant: "destructive" });
      return;
    }
    setUnificarDesconto("");
    setUnificarObs("");
    setDialogUnificar(true);
  };

  const handleConfirmarUnificacao = async () => {
    setUnificando(true);
    try {
      const desconto = parseFloat(unificarDesconto) || 0;
      const valorComDesconto = valorTotalUnificar - (valorTotalUnificar * desconto / 100);
      const boleto = boletosParaUnificar[0];

      // Buscar associado_id pelo nome (primeiro boleto)
      const { data: assocData } = await supabase
        .from("associados")
        .select("id")
        .eq("nome", boleto.associado)
        .limit(1)
        .single();

      // Criar acordo unificado
      const { data: acordo, error: acordoError } = await supabase.from("acordos").insert({
        associado_id: assocData?.id || null,
        valor_original: valorTotalUnificar,
        valor_acordo: valorComDesconto,
        parcelas: 1,
        parcelas_detalhes: [{
          numero: 1,
          valor: valorComDesconto,
          vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          status: "pendente",
        }],
        status: "ativo",
      }).select().single();
      if (acordoError) throw acordoError;

      // Marcar boletos como "acordo"
      const ids = boletosParaUnificar.map((b) => b.id);
      await supabase.from("boletos").update({ status: "acordo" }).in("id", ids);

      toast({
        title: "Boletos unificados!",
        description: `${boletosParaUnificar.length} boletos unificados em acordo de ${valorComDesconto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      });
      setDialogUnificar(false);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast({ title: "Erro ao unificar", description: e.message, variant: "destructive" });
    } finally {
      setUnificando(false);
    }
  };

  function BoletoTable({ data }: { data: BoletoRow[] }) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={selectedIds.size === data.length && data.length > 0} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead>Associado</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Mês Ref.</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Nenhum boleto encontrado.
              </TableCell>
            </TableRow>
          ) : (
            data.map((b) => (
              <TableRow key={b.id} className={selectedIds.has(b.id) ? "bg-primary/5" : ""}>
                <TableCell>
                  <Checkbox checked={selectedIds.has(b.id)} onCheckedChange={() => toggleSelect(b.id)} />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{b.associado}</p>
                    <p className="text-xs text-muted-foreground">{b.cpf}</p>
                  </div>
                </TableCell>
                <TableCell>{formatDate(b.vencimento)}</TableCell>
                <TableCell className="text-xs">{getMesLabel(b.mesReferencia)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(b.valor)}</TableCell>
                <TableCell><StatusPill status={b.status} /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewBoleto(b)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {b.linkBoleto && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(b.linkBoleto!, "_blank")}>
                        <ExternalLink className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSendBoleto(b); setSendWhatsApp(true); setSendEmail(false); }}>
                      <Send className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold">Boletos</h1>
          <p className="text-sm text-muted-foreground">Cobranças mensais sincronizadas do GIA</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button onClick={handleDisparoAvulso} className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Disparar ({selectedIds.size})
              </Button>
              <Button variant="outline" onClick={handleAbrirUnificar} className="gap-2">
                <Merge className="h-4 w-4" />
                Unificar Boletos
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleSync} disabled={syncGIA.isPending}>
            {syncGIA.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar GIA
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-warning/10"><Receipt className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Abertos</p>
                <p className="text-2xl font-bold">{loadingKpis ? "..." : kpis?.abertos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidos (Atrasados)</p>
                <p className="text-2xl font-bold text-destructive">{loadingKpis ? "..." : kpis?.vencidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-destructive/10"><TrendingUp className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Valor em Aberto</p>
                <p className="text-2xl font-bold text-destructive">{loadingKpis ? "..." : formatCurrency(kpis?.valorAberto || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Mês Atual</p>
                <p className="text-2xl font-bold">{loadingKpis ? "..." : kpis?.mesAtual}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Mês Atual / Por Mês / Atrasados */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mes_atual">Mês Atual</TabsTrigger>
          <TabsTrigger value="por_mes">Por Mês</TabsTrigger>
          <TabsTrigger value="atrasados" className="text-destructive">Atrasados</TabsTrigger>
        </TabsList>

        <TabsContent value="mes_atual" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome ou CPF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading">Boletos — {getMesLabel(mesAtual)}</CardTitle>
              <CardDescription>{isLoading ? "Carregando..." : `${totalFiltro} boleto(s) — ${formatCurrency(valorFiltro)}`}</CardDescription>
            </CardHeader>
            <CardContent><BoletoTable data={filtered} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="por_mes" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap">
                <Select value={mesFilter} onValueChange={setMesFilter}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os meses</SelectItem>
                    {(kpis?.mesesDisponiveis || []).map((m) => (
                      <SelectItem key={m} value={m}>{getMesLabel(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading">Boletos {mesFilter !== "todos" ? `— ${getMesLabel(mesFilter)}` : "— Todos"}</CardTitle>
              <CardDescription>{isLoading ? "Carregando..." : `${totalFiltro} boleto(s)`}</CardDescription>
            </CardHeader>
            <CardContent><BoletoTable data={filtered} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atrasados" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Boletos Atrasados
              </CardTitle>
              <CardDescription>{isLoading ? "Carregando..." : `${totalFiltro} boleto(s) vencidos — ${formatCurrency(valorFiltro)} em aberto`}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <BoletoTable data={filtered} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Ver Boleto */}
      <Dialog open={!!viewBoleto} onOpenChange={(open) => !open && setViewBoleto(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Detalhes do Boleto
            </DialogTitle>
          </DialogHeader>
          {viewBoleto && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm p-4 rounded-lg bg-muted/30">
                <div><p className="text-muted-foreground text-xs mb-1">Associado</p><p className="font-medium">{viewBoleto.associado}</p></div>
                <div><p className="text-muted-foreground text-xs mb-1">CPF</p><p className="font-medium">{viewBoleto.cpf}</p></div>
                <div><p className="text-muted-foreground text-xs mb-1">Valor</p><p className="font-bold text-lg">{formatCurrency(viewBoleto.valor)}</p></div>
                <div><p className="text-muted-foreground text-xs mb-1">Vencimento</p><p className="font-medium">{formatDate(viewBoleto.vencimento)}</p></div>
                <div><p className="text-muted-foreground text-xs mb-1">Status</p><StatusPill status={viewBoleto.status} /></div>
                <div><p className="text-muted-foreground text-xs mb-1">Mês Ref.</p><p className="font-medium">{getMesLabel(viewBoleto.mesReferencia)}</p></div>
                {viewBoleto.whatsapp && <div><p className="text-muted-foreground text-xs mb-1">WhatsApp</p><p className="font-medium">{viewBoleto.whatsapp}</p></div>}
                {viewBoleto.nossoNumero && <div><p className="text-muted-foreground text-xs mb-1">Nosso Número</p><p className="font-mono">{viewBoleto.nossoNumero}</p></div>}
              </div>

              {/* Código de barras */}
              {viewBoleto.linhaDigitavel && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground mb-1">Código de Barras</p>
                  <p className="font-mono text-xs break-all">{viewBoleto.linhaDigitavel}</p>
                  <Button variant="ghost" size="sm" className="mt-1 gap-1.5" onClick={() => handleCopy(viewBoleto.linhaDigitavel!, "Código de barras")}>
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </div>
              )}

              {/* PIX */}
              {viewBoleto.pixCopiaCola && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><QrCode className="h-3 w-3" /> PIX Copia e Cola</p>
                  <p className="font-mono text-xs break-all">{viewBoleto.pixCopiaCola}</p>
                  <Button variant="ghost" size="sm" className="mt-1 gap-1.5" onClick={() => handleCopy(viewBoleto.pixCopiaCola!, "PIX")}>
                    <Copy className="h-3 w-3" /> Copiar PIX
                  </Button>
                </div>
              )}

              {/* Ações */}
              <div className="border-t pt-4 flex gap-2 flex-wrap">
                {viewBoleto.linkBoleto && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(viewBoleto.linkBoleto!, "_blank")}>
                    <ExternalLink className="h-4 w-4" /> Abrir PDF
                  </Button>
                )}
                {viewBoleto.linhaDigitavel && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => handleCopy(viewBoleto.linhaDigitavel!, "Código")}>
                    <Copy className="h-4 w-4" /> Copiar Barras
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-2 text-success border-success/30 hover:bg-success/5" onClick={() => { setSendBoleto(viewBoleto); setViewBoleto(null); }}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewBoleto(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Enviar */}
      <Dialog open={!!sendBoleto} onOpenChange={(open) => !open && setSendBoleto(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Enviar Boleto</DialogTitle>
            <DialogDescription>{sendBoleto ? `Enviar para ${sendBoleto.associado}?` : ""}</DialogDescription>
          </DialogHeader>
          {sendBoleto && (
            <div className="space-y-4 py-2">
              <div className="text-sm p-3 rounded-lg bg-muted/30">
                <span className="font-medium">{formatCurrency(sendBoleto.valor)}</span> — Venc. {formatDate(sendBoleto.vencimento)}
                {sendBoleto.whatsapp && <p className="text-xs text-muted-foreground mt-1">WhatsApp: {sendBoleto.whatsapp}</p>}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium">Canais:</p>
                <div className="flex items-center gap-2">
                  <Checkbox id="sw" checked={sendWhatsApp} onCheckedChange={(c) => setSendWhatsApp(c === true)} />
                  <Label htmlFor="sw" className="flex items-center gap-2 cursor-pointer"><MessageCircle className="h-4 w-4 text-success" />WhatsApp</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="se" checked={sendEmail} onCheckedChange={(c) => setSendEmail(c === true)} />
                  <Label htmlFor="se" className="flex items-center gap-2 cursor-pointer"><Mail className="h-4 w-4 text-primary" />E-mail</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSendBoleto(null)}>Cancelar</Button>
            <Button onClick={handleSendConfirm}><Send className="h-4 w-4 mr-2" />Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Unificar Boletos */}
      <Dialog open={dialogUnificar} onOpenChange={setDialogUnificar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Unificar Boletos em Acordo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium">Associado: {associadosUnicos[0]}</p>
              <p className="text-sm">{boletosParaUnificar.length} boletos selecionados</p>
              <p className="text-lg font-bold">Total: {formatCurrency(valorTotalUnificar)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                max="100"
                value={unificarDesconto}
                onChange={(e) => setUnificarDesconto(e.target.value)}
              />
              {unificarDesconto && parseFloat(unificarDesconto) > 0 && (
                <p className="text-sm text-success">
                  Valor com desconto: {formatCurrency(valorTotalUnificar - (valorTotalUnificar * parseFloat(unificarDesconto) / 100))}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea
                placeholder="Observações sobre a unificação..."
                value={unificarObs}
                onChange={(e) => setUnificarObs(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Boletos incluídos:</p>
              {boletosParaUnificar.map((b) => (
                <p key={b.id}>- Venc. {formatDate(b.vencimento)} — {formatCurrency(b.valor)} ({b.mesReferencia})</p>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogUnificar(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarUnificacao} disabled={unificando}>
              {unificando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar Unificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Boletos;

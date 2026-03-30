import { useState } from "react";
import { Search, Filter, Send, Eye, RefreshCw, Copy, MessageCircle, Mail, FileDown, Receipt, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Boletos mensais individuais — sem parcelamento
const mockBoletos = [
  {
    id: "1",
    associado: "João Carlos da Silva",
    cpf: "123.456.789-00",
    cooperativa: "Central SP",
    vencimento: "2024-01-15",
    valor: 189.90,
    status: "Pago",
    dataPagamento: "2024-01-14",
    dataEmissao: "2024-01-01",
  },
  {
    id: "2",
    associado: "Maria Aparecida Santos",
    cpf: "987.654.321-00",
    cooperativa: "Central RJ",
    vencimento: "2024-01-10",
    valor: 129.90,
    status: "Vencido",
    dataPagamento: null,
    dataEmissao: "2023-12-26",
  },
  {
    id: "3",
    associado: "Pedro Henrique Oliveira",
    cpf: "456.789.123-00",
    cooperativa: "Central SP",
    vencimento: "2024-01-20",
    valor: 249.90,
    status: "Pendente",
    dataPagamento: null,
    dataEmissao: "2024-01-05",
  },
  {
    id: "4",
    associado: "Ana Beatriz Lima",
    cpf: "321.654.987-00",
    cooperativa: "Minas Proteção",
    vencimento: "2024-01-05",
    valor: 159.90,
    status: "Vencido",
    dataPagamento: null,
    dataEmissao: "2023-12-21",
  },
  {
    id: "5",
    associado: "Carlos Eduardo Ferreira",
    cpf: "789.123.456-00",
    cooperativa: "Sul Proteção",
    vencimento: "2024-01-18",
    valor: 199.90,
    status: "Pago",
    dataPagamento: "2024-01-17",
    dataEmissao: "2024-01-03",
  },
  {
    id: "6",
    associado: "Fernanda Costa",
    cpf: "654.321.789-00",
    cooperativa: "Nordeste",
    vencimento: "2024-01-12",
    valor: 179.90,
    status: "Vencido",
    dataPagamento: null,
    dataEmissao: "2023-12-28",
  },
  {
    id: "7",
    associado: "Roberto Almeida",
    cpf: "147.258.369-00",
    cooperativa: "Central SP",
    vencimento: "2024-01-25",
    valor: 219.90,
    status: "Pendente",
    dataPagamento: null,
    dataEmissao: "2024-01-10",
  },
  {
    id: "8",
    associado: "Luciana Martins",
    cpf: "963.852.741-00",
    cooperativa: "Centro-Oeste",
    vencimento: "2024-01-08",
    valor: 149.90,
    status: "Pago",
    dataPagamento: "2024-01-07",
    dataEmissao: "2023-12-24",
  },
];

type Boleto = typeof mockBoletos[0];

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
    Pago: "bg-success/10 text-success border-success/20",
    Pendente: "bg-warning/10 text-warning border-warning/20",
    Vencido: "bg-destructive/10 text-destructive border-destructive/20",
    Cancelado: "bg-muted text-muted-foreground border-muted",
  };

  const cls = config[status] || config["Cancelado"];
  return (
    <Badge variant="outline" className={`${cls} text-xs font-medium`}>
      {status}
    </Badge>
  );
}

const Boletos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [cooperativaFilter, setCooperativaFilter] = useState("todas");

  // Modals
  const [viewBoleto, setViewBoleto] = useState<Boleto | null>(null);
  const [sendBoleto, setSendBoleto] = useState<Boleto | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Checkboxes no modal enviar
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);

  const { toast } = useToast();

  // Lista de cooperativas únicas
  const cooperativas = Array.from(new Set(mockBoletos.map((b) => b.cooperativa))).sort();

  // Filtragem
  const filteredBoletos = mockBoletos.filter((b) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      b.associado.toLowerCase().includes(term) ||
      b.cpf.toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === "todos" || b.status === statusFilter;
    const matchesCooperativa =
      cooperativaFilter === "todas" || b.cooperativa === cooperativaFilter;
    return matchesSearch && matchesStatus && matchesCooperativa;
  });

  // KPIs
  const totalBoletos = filteredBoletos.length;
  const boletosPagos = filteredBoletos.filter((b) => b.status === "Pago");
  const boletosEmAberto = filteredBoletos.filter(
    (b) => b.status === "Pendente" || b.status === "Vencido"
  );
  const valorPagos = boletosPagos.reduce((acc, b) => acc + b.valor, 0);
  const valorEmAberto = boletosEmAberto.reduce((acc, b) => acc + b.valor, 0);
  const taxaPagamento =
    totalBoletos > 0 ? Math.round((boletosPagos.length / totalBoletos) * 100) : 0;

  // Ações
  const handleCopyLink = () => {
    toast({
      title: "Link copiado!",
      description: "Link do boleto copiado para a área de transferência.",
    });
  };

  const handleSendWhatsAppAction = (boleto: Boleto) => {
    toast({
      title: "WhatsApp enviado!",
      description: `Boleto enviado via WhatsApp para ${boleto.associado}`,
    });
  };

  const handleSendEmailAction = (boleto: Boleto) => {
    toast({
      title: "E-mail enviado!",
      description: `Boleto enviado por e-mail para ${boleto.associado}`,
    });
  };

  const handleSendConfirm = () => {
    if (!sendBoleto) return;
    const channels: string[] = [];
    if (sendWhatsApp) channels.push("WhatsApp");
    if (sendEmail) channels.push("E-mail");
    if (channels.length === 0) {
      toast({
        title: "Selecione um canal",
        description: "Escolha pelo menos um canal de envio.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Boleto enviado!",
      description: `Boleto enviado para ${sendBoleto.associado} via ${channels.join(" e ")}.`,
    });
    setSendBoleto(null);
    setSendWhatsApp(true);
    setSendEmail(false);
  };

  const handleSyncGIA = () => {
    toast({
      title: "Sincronização iniciada...",
      description: "Buscando boletos no GIA. Aguarde.",
    });
    setImportOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold">Boletos</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de cobranças mensais — boletos gerados no GIA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Importar Boletos
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: "Exportação iniciada",
                description: "Gerando arquivo CSV...",
              })
            }
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Boletos</p>
                <p className="text-2xl font-bold">{totalBoletos}</p>
                <p className="text-xs text-muted-foreground">no filtro atual</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Boletos Pagos</p>
                <p className="text-2xl font-bold text-success">{boletosPagos.length}</p>
                <p className="text-sm font-medium text-success">{formatCurrency(valorPagos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Boletos em Aberto</p>
                <p className="text-2xl font-bold text-destructive">{boletosEmAberto.length}</p>
                <p className="text-sm font-medium text-destructive">{formatCurrency(valorEmAberto)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Pagamento</p>
                <p className="text-2xl font-bold">{taxaPagamento}%</p>
                <p className="text-xs text-muted-foreground">{boletosPagos.length} de {totalBoletos} pagos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cooperativaFilter} onValueChange={setCooperativaFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Cooperativa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as cooperativas</SelectItem>
                {cooperativas.map((coop) => (
                  <SelectItem key={coop} value={coop}>
                    {coop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="font-heading">Lista de Boletos</CardTitle>
          <CardDescription>
            {filteredBoletos.length} boleto(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Associado</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Cooperativa</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoletos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum boleto encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBoletos.map((boleto) => (
                  <TableRow key={boleto.id}>
                    <TableCell className="font-medium">{boleto.associado}</TableCell>
                    <TableCell className="text-muted-foreground">{boleto.cpf}</TableCell>
                    <TableCell>{boleto.cooperativa}</TableCell>
                    <TableCell>{formatDate(boleto.vencimento)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(boleto.valor)}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={boleto.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(boleto.dataPagamento)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Visualizar boleto"
                          onClick={() => setViewBoleto(boleto)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Enviar boleto"
                          onClick={() => {
                            setSendBoleto(boleto);
                            setSendWhatsApp(true);
                            setSendEmail(false);
                          }}
                        >
                          <Send className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: Visualizar Boleto */}
      <Dialog open={!!viewBoleto} onOpenChange={(open) => !open && setViewBoleto(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              Detalhes do Boleto
            </DialogTitle>
            <DialogDescription>
              Informações completas do boleto mensal
            </DialogDescription>
          </DialogHeader>

          {viewBoleto && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Associado</p>
                  <p className="font-medium">{viewBoleto.associado}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">CPF</p>
                  <p className="font-medium">{viewBoleto.cpf}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Cooperativa</p>
                  <p className="font-medium">{viewBoleto.cooperativa}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Valor</p>
                  <p className="font-bold text-lg">{formatCurrency(viewBoleto.valor)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Vencimento</p>
                  <p className="font-medium">{formatDate(viewBoleto.vencimento)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Emissão</p>
                  <p className="font-medium">{formatDate(viewBoleto.dataEmissao)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Status</p>
                  <StatusPill status={viewBoleto.status} />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Data Pagamento</p>
                  <p className="font-medium">{formatDate(viewBoleto.dataPagamento)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-3">Enviar boleto:</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendWhatsAppAction(viewBoleto)}
                    className="gap-2 text-success border-success/30 hover:bg-success/5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendEmailAction(viewBoleto)}
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    E-mail
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewBoleto(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Enviar Boleto */}
      <Dialog open={!!sendBoleto} onOpenChange={(open) => !open && setSendBoleto(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Enviar Boleto</DialogTitle>
            <DialogDescription>
              {sendBoleto
                ? `Enviar boleto para ${sendBoleto.associado}?`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {sendBoleto && (
            <div className="space-y-4 py-2">
              <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
                <span className="font-medium text-foreground">
                  {formatCurrency(sendBoleto.valor)}
                </span>{" "}
                — Vencimento {formatDate(sendBoleto.vencimento)}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Canais de envio:</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="send-whatsapp"
                    checked={sendWhatsApp}
                    onCheckedChange={(checked) =>
                      setSendWhatsApp(checked === true)
                    }
                  />
                  <Label htmlFor="send-whatsapp" className="flex items-center gap-2 cursor-pointer">
                    <MessageCircle className="h-4 w-4 text-success" />
                    WhatsApp
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="send-email"
                    checked={sendEmail}
                    onCheckedChange={(checked) =>
                      setSendEmail(checked === true)
                    }
                  />
                  <Label htmlFor="send-email" className="flex items-center gap-2 cursor-pointer">
                    <Mail className="h-4 w-4 text-primary" />
                    E-mail
                  </Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSendBoleto(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSendConfirm}>
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Importar Boletos (GIA) */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Importar Boletos do GIA</DialogTitle>
            <DialogDescription>
              Os boletos são gerados no sistema GIA e importados para o
              CollectPro para envio aos associados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-sm text-muted-foreground">
            <p>
              O CollectPro sincroniza automaticamente com o GIA para buscar
              novos boletos mensais emitidos para os associados.
            </p>
            <p>
              Cada boleto é individual e mensal — não há parcelamento. Clique em
              <strong> Sincronizar com GIA</strong> para buscar os boletos mais
              recentes.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSyncGIA}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar com GIA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Boletos;

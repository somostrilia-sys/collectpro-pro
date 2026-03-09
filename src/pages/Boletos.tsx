import { useState } from "react";
import { Plus, Search, Filter, Send, Download, Upload, Eye, FileText } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";

const mockBoletos = [
  {
    id: "1",
    associado: "João Carlos da Silva",
    vencimento: "2024-01-15",
    valor: 189.90,
    status: "Pago",
    parcela: "1/12",
    dataEmissao: "2024-01-01",
  },
  {
    id: "2",
    associado: "Maria Aparecida Santos",
    vencimento: "2024-01-10",
    valor: 129.90,
    status: "Vencido",
    parcela: "3/12",
    dataEmissao: "2023-12-26",
  },
  {
    id: "3",
    associado: "Pedro Henrique Oliveira",
    vencimento: "2024-01-20",
    valor: 249.90,
    status: "Pendente",
    parcela: "2/12",
    dataEmissao: "2024-01-05",
  },
  {
    id: "4",
    associado: "Ana Beatriz Lima",
    vencimento: "2024-01-05",
    valor: 159.90,
    status: "Vencido",
    parcela: "5/12",
    dataEmissao: "2023-12-21",
  },
  {
    id: "5",
    associado: "Carlos Eduardo Ferreira",
    vencimento: "2024-01-18",
    valor: 199.90,
    status: "Pago",
    parcela: "1/12",
    dataEmissao: "2024-01-03",
  },
  {
    id: "6",
    associado: "Fernanda Cristina Souza",
    vencimento: "2024-01-25",
    valor: 139.90,
    status: "Pendente",
    parcela: "4/12",
    dataEmissao: "2024-01-10",
  },
];

const Boletos = () => {
  const [boletos, setBoletos] = useState(mockBoletos);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { toast } = useToast();

  const filteredBoletos = boletos.filter((b) => {
    const matchesSearch = b.associado.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSendWhatsApp = (boleto: typeof mockBoletos[0]) => {
    toast({
      title: "WhatsApp enviado!",
      description: `Cobrança enviada para ${boleto.associado}`,
    });
  };

  const handleImport = () => {
    toast({
      title: "Importação iniciada!",
      description: "Processando arquivo de boletos...",
    });
    setIsImportModalOpen(false);
  };

  const handleExport = () => {
    toast({
      title: "Exportação iniciada!",
      description: "Gerando arquivo CSV dos boletos...",
    });
  };

  const totalAberto = filteredBoletos
    .filter((b) => b.status !== "Pago")
    .reduce((acc, b) => acc + b.valor, 0);

  const totalVencido = filteredBoletos
    .filter((b) => b.status === "Vencido")
    .reduce((acc, b) => acc + b.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Boletos</h1>
          <p className="text-muted-foreground">Gestão de boletos e cobranças</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importar Lote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Boletos em Lote</DialogTitle>
                <DialogDescription>
                  Selecione um arquivo CSV ou XLSX com os boletos
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Arraste um arquivo ou clique para selecionar
                  </p>
                  <Button variant="outline" size="sm">
                    Selecionar Arquivo
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleImport}>Importar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Boleto
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">
              R$ {totalAberto.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Total em Aberto</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">
              R$ {totalVencido.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Total Vencido</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">
              {filteredBoletos.filter((b) => b.status === "Pago").length}
            </div>
            <p className="text-sm text-muted-foreground">Boletos Pagos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por associado..."
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
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Boletos</CardTitle>
          <CardDescription>
            {filteredBoletos.length} boleto(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Associado</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoletos.map((boleto) => (
                <TableRow key={boleto.id}>
                  <TableCell className="font-medium">{boleto.associado}</TableCell>
                  <TableCell>
                    {new Date(boleto.vencimento).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{boleto.parcela}</TableCell>
                  <TableCell className="font-medium">
                    R$ {boleto.valor.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={boleto.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSendWhatsApp(boleto)}
                        disabled={boleto.status === "Pago"}
                      >
                        <Send className="h-4 w-4 text-success" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Boletos;
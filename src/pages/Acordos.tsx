import { useState } from "react";
import { Plus, Search, Eye, Edit, Handshake, Calendar, DollarSign, Check, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";

const mockAcordos = [
  {
    id: "1",
    associado: "Maria Aparecida Santos",
    valorOriginal: 890.0,
    valorAcordo: 750.0,
    desconto: 15.7,
    parcelas: 3,
    valorParcela: 250.0,
    parcelasPagas: 2,
    status: "Em dia",
    dataAcordo: "2024-01-05",
    proximoVencimento: "2024-02-05",
  },
  {
    id: "2",
    associado: "Ana Beatriz Lima",
    valorOriginal: 1250.0,
    valorAcordo: 1000.0,
    desconto: 20.0,
    parcelas: 5,
    valorParcela: 200.0,
    parcelasPagas: 1,
    status: "Em dia",
    dataAcordo: "2024-01-10",
    proximoVencimento: "2024-02-10",
  },
  {
    id: "3",
    associado: "João Carlos da Silva",
    valorOriginal: 450.0,
    valorAcordo: 450.0,
    desconto: 0,
    parcelas: 2,
    valorParcela: 225.0,
    parcelasPagas: 2,
    status: "Quitado",
    dataAcordo: "2023-12-15",
    proximoVencimento: "-",
  },
  {
    id: "4",
    associado: "Pedro Henrique Oliveira",
    valorOriginal: 680.0,
    valorAcordo: 600.0,
    desconto: 11.8,
    parcelas: 4,
    valorParcela: 150.0,
    parcelasPagas: 0,
    status: "Atrasado",
    dataAcordo: "2024-01-02",
    proximoVencimento: "2024-01-15",
  },
];

const Acordos = () => {
  const [acordos, setAcordos] = useState(mockAcordos);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAcordo, setNewAcordo] = useState({
    associado: "",
    valorOriginal: 0,
    valorAcordo: 0,
    parcelas: 1,
  });

  const filteredAcordos = acordos.filter((a) =>
    a.associado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddAcordo = () => {
    const novo = {
      ...newAcordo,
      id: String(acordos.length + 1),
      desconto: ((newAcordo.valorOriginal - newAcordo.valorAcordo) / newAcordo.valorOriginal) * 100,
      valorParcela: newAcordo.valorAcordo / newAcordo.parcelas,
      parcelasPagas: 0,
      status: "Em dia",
      dataAcordo: new Date().toISOString().split("T")[0],
      proximoVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    };
    setAcordos([...acordos, novo]);
    setIsAddModalOpen(false);
    setNewAcordo({ associado: "", valorOriginal: 0, valorAcordo: 0, parcelas: 1 });
  };

  const stats = {
    total: acordos.length,
    emDia: acordos.filter((a) => a.status === "Em dia").length,
    quitados: acordos.filter((a) => a.status === "Quitado").length,
    atrasados: acordos.filter((a) => a.status === "Atrasado").length,
    valorTotal: acordos.reduce((acc, a) => acc + a.valorAcordo, 0),
    valorRecuperado: acordos.reduce((acc, a) => acc + a.valorParcela * a.parcelasPagas, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Acordos</h1>
          <p className="text-muted-foreground">Gestão de renegociações e parcelamentos</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Acordo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Acordo</DialogTitle>
              <DialogDescription>
                Configure os termos do parcelamento
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Associado</Label>
                <Input
                  value={newAcordo.associado}
                  onChange={(e) =>
                    setNewAcordo({ ...newAcordo, associado: e.target.value })
                  }
                  placeholder="Nome do associado"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Valor Original (R$)</Label>
                  <Input
                    type="number"
                    value={newAcordo.valorOriginal}
                    onChange={(e) =>
                      setNewAcordo({ ...newAcordo, valorOriginal: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Valor do Acordo (R$)</Label>
                  <Input
                    type="number"
                    value={newAcordo.valorAcordo}
                    onChange={(e) =>
                      setNewAcordo({ ...newAcordo, valorAcordo: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Parcelas</Label>
                <Select
                  value={String(newAcordo.parcelas)}
                  onValueChange={(value) =>
                    setNewAcordo({ ...newAcordo, parcelas: Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x de R$ {(newAcordo.valorAcordo / n).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newAcordo.valorOriginal > 0 && newAcordo.valorAcordo > 0 && (
                <div className="p-4 bg-success/10 rounded-lg">
                  <p className="text-sm text-success font-medium">
                    Desconto:{" "}
                    {(((newAcordo.valorOriginal - newAcordo.valorAcordo) / newAcordo.valorOriginal) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddAcordo}>Criar Acordo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Handshake className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total de Acordos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{stats.quitados}</div>
                <p className="text-sm text-muted-foreground">Quitados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-collectpro-blue-accent/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-collectpro-blue-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold text-collectpro-blue-accent">{stats.emDia}</div>
                <p className="text-sm text-muted-foreground">Em Dia</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{stats.atrasados}</div>
                <p className="text-sm text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total em Acordos</p>
              <p className="text-2xl font-bold">R$ {stats.valorTotal.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor Já Recuperado</p>
              <p className="text-2xl font-bold text-success">
                R$ {stats.valorRecuperado.toLocaleString()}
              </p>
            </div>
          </div>
          <Progress value={(stats.valorRecuperado / stats.valorTotal) * 100} className="mt-4 h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {((stats.valorRecuperado / stats.valorTotal) * 100).toFixed(1)}% recuperado
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por associado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Acordos</CardTitle>
          <CardDescription>
            {filteredAcordos.length} acordo(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Associado</TableHead>
                <TableHead>Valor Original</TableHead>
                <TableHead>Valor Acordo</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAcordos.map((acordo) => (
                <TableRow key={acordo.id}>
                  <TableCell className="font-medium">{acordo.associado}</TableCell>
                  <TableCell className="text-muted-foreground">
                    R$ {acordo.valorOriginal.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-medium">
                    R$ {acordo.valorAcordo.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {acordo.desconto > 0 ? (
                      <Badge className="bg-success/10 text-success">
                        -{acordo.desconto.toFixed(1)}%
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {acordo.parcelasPagas}/{acordo.parcelas}x R$ {acordo.valorParcela.toFixed(2)}
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <Progress
                      value={(acordo.parcelasPagas / acordo.parcelas) * 100}
                      className="h-2"
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={acordo.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
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

export default Acordos;
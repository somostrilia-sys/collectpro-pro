import { useState } from "react";
import { Plus, Search, AlertTriangle, FileText, Check, X, Clock, Upload } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

const mockNegativacoes = [
  {
    id: "1",
    associado: "Ana Beatriz Lima",
    cpf: "789.123.456-00",
    valorDevido: 1250.0,
    diasAtraso: 45,
    orgao: "SPC",
    status: "Negativado",
    dataInclusao: "2024-01-10",
    motivo: "Boletos vencidos há mais de 30 dias",
  },
  {
    id: "2",
    associado: "Carlos Eduardo Ferreira",
    cpf: "321.654.987-00",
    valorDevido: 890.0,
    diasAtraso: 38,
    orgao: "Serasa",
    status: "Negativado",
    dataInclusao: "2024-01-05",
    motivo: "Inadimplência recorrente",
  },
  {
    id: "3",
    associado: "João Carlos da Silva",
    cpf: "123.456.789-00",
    valorDevido: 0,
    diasAtraso: 0,
    orgao: "SPC/Serasa",
    status: "Retirado",
    dataInclusao: "2023-12-01",
    dataRetirada: "2024-01-15",
    motivo: "Débito quitado",
  },
  {
    id: "4",
    associado: "Fernanda Cristina Souza",
    cpf: "654.987.321-00",
    valorDevido: 560.0,
    diasAtraso: 32,
    orgao: "Pendente",
    status: "Aguardando",
    dataInclusao: "-",
    motivo: "Prazo de 30 dias atingido",
  },
];

const Negativacoes = () => {
  const [negativacoes, setNegativacoes] = useState(mockNegativacoes);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const [newNegativacao, setNewNegativacao] = useState({
    associado: "",
    cpf: "",
    valorDevido: 0,
    orgao: "SPC",
  });

  const filteredNegativacoes = negativacoes.filter((n) =>
    n.associado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleIncluir = (id: string) => {
    setNegativacoes(
      negativacoes.map((n) =>
        n.id === id
          ? {
              ...n,
              status: "Negativado",
              orgao: "SPC/Serasa",
              dataInclusao: new Date().toISOString().split("T")[0],
            }
          : n
      )
    );
    toast({
      title: "Negativação enviada!",
      description: "O associado foi incluído nos órgãos de proteção",
    });
  };

  const handleRetirar = (id: string) => {
    setNegativacoes(
      negativacoes.map((n) =>
        n.id === id
          ? {
              ...n,
              status: "Retirado",
              dataRetirada: new Date().toISOString().split("T")[0],
            }
          : n
      )
    );
    toast({
      title: "Negativação retirada!",
      description: "O associado foi removido dos órgãos de proteção",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Negativado":
        return <Badge className="bg-destructive/10 text-destructive border-0">Negativado</Badge>;
      case "Retirado":
        return <Badge className="bg-success/10 text-success border-0">Retirado</Badge>;
      case "Aguardando":
        return <Badge className="bg-warning/10 text-warning border-0">Aguardando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: negativacoes.length,
    negativados: negativacoes.filter((n) => n.status === "Negativado").length,
    retirados: negativacoes.filter((n) => n.status === "Retirado").length,
    aguardando: negativacoes.filter((n) => n.status === "Aguardando").length,
    valorNegativado: negativacoes
      .filter((n) => n.status === "Negativado")
      .reduce((acc, n) => acc + n.valorDevido, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold">Negativações</h1>
          <p className="text-sm text-muted-foreground">Controle de inclusão SPC/Serasa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Enviar Lote
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nova Negativação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Incluir Negativação</DialogTitle>
                <DialogDescription>
                  Registre uma nova inclusão nos órgãos de proteção
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Associado</Label>
                  <Input
                    value={newNegativacao.associado}
                    onChange={(e) =>
                      setNewNegativacao({ ...newNegativacao, associado: e.target.value })
                    }
                    placeholder="Nome do associado"
                    className="rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>CPF</Label>
                    <Input
                      value={newNegativacao.cpf}
                      onChange={(e) =>
                        setNewNegativacao({ ...newNegativacao, cpf: e.target.value })
                      }
                      placeholder="000.000.000-00"
                      className="rounded-lg"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor Devido (R$)</Label>
                    <Input
                      type="number"
                      value={newNegativacao.valorDevido}
                      onChange={(e) =>
                        setNewNegativacao({ ...newNegativacao, valorDevido: Number(e.target.value) })
                      }
                      className="rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Órgão</Label>
                  <Select
                    value={newNegativacao.orgao}
                    onValueChange={(value) =>
                      setNewNegativacao({ ...newNegativacao, orgao: value })
                    }
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPC">SPC</SelectItem>
                      <SelectItem value="Serasa">Serasa</SelectItem>
                      <SelectItem value="SPC/Serasa">SPC e Serasa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button className="bg-destructive hover:bg-destructive/90">
                  Incluir Negativação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total</p>
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
                <div className="text-2xl font-bold text-destructive">{stats.negativados}</div>
                <p className="text-sm text-muted-foreground">Negativados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-success/10">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{stats.retirados}</div>
                <p className="text-sm text-muted-foreground">Retirados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{stats.aguardando}</div>
                <p className="text-sm text-muted-foreground">Aguardando</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value Summary */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total Negativado</p>
                <p className="font-heading text-3xl font-bold text-destructive">
                  R$ {stats.valorNegativado.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por associado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="font-heading">Registro de Negativações</CardTitle>
          <CardDescription>
            {filteredNegativacoes.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Associado</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Valor Devido</TableHead>
                <TableHead>Dias Atraso</TableHead>
                <TableHead>Órgão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Inclusão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNegativacoes.map((neg) => (
                <TableRow key={neg.id}>
                  <TableCell className="font-medium">{neg.associado}</TableCell>
                  <TableCell>{neg.cpf}</TableCell>
                  <TableCell>
                    {neg.valorDevido > 0 ? (
                      <span className="font-medium text-destructive">
                        R$ {neg.valorDevido.toFixed(2)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {neg.diasAtraso > 0 ? (
                      <Badge variant="outline">{neg.diasAtraso} dias</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{neg.orgao}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(neg.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {neg.dataInclusao}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {neg.status === "Aguardando" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleIncluir(neg.id)}
                        >
                          Incluir
                        </Button>
                      )}
                      {neg.status === "Negativado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetirar(neg.id)}
                        >
                          Retirar
                        </Button>
                      )}
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

export default Negativacoes;

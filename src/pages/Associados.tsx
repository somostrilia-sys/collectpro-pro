import { useState } from "react";
import { Plus, Eye, Edit, Trash2, Search, Filter, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DataTable } from "@/components/ui/data-table";

// Mock data
const mockAssociados = [
  {
    id: "1",
    nome: "João Carlos da Silva",
    cpf: "123.456.789-00",
    placa: "ABC-1234",
    plano: "Premium",
    status: "Ativo",
    telefone: "(11) 98765-4321",
    email: "joao.silva@email.com",
    score: "Bom",
    valorAberto: 0,
  },
  {
    id: "2",
    nome: "Maria Aparecida Santos",
    cpf: "987.654.321-00",
    placa: "XYZ-5678",
    plano: "Básico",
    status: "Inadimplente",
    telefone: "(21) 99876-5432",
    email: "maria.santos@email.com",
    score: "Regular",
    valorAberto: 450.0,
  },
  {
    id: "3",
    nome: "Pedro Henrique Oliveira",
    cpf: "456.789.123-00",
    placa: "DEF-9012",
    plano: "Premium",
    status: "Ativo",
    telefone: "(31) 97654-3210",
    email: "pedro.oliveira@email.com",
    score: "Bom",
    valorAberto: 0,
  },
];

const getScoreColor = (score: string) => {
  switch (score) {
    case "Bom":
      return "bg-success/10 text-success";
    case "Regular":
      return "bg-warning/10 text-warning";
    case "Crítico":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const Associados = () => {
  const [associados, setAssociados] = useState(mockAssociados);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedAssociado, setSelectedAssociado] = useState<typeof mockAssociados[0] | null>(null);
  const [newAssociado, setNewAssociado] = useState({
    nome: "",
    cpf: "",
    placa: "",
    plano: "Básico",
    telefone: "",
    email: "",
  });

  const handleDelete = (id: string) => {
    setAssociados(associados.filter((a) => a.id !== id));
  };

  const columns = [
    {
      accessorKey: "nome",
      header: "Nome",
    },
    {
      accessorKey: "cpf",
      header: "CPF",
    },
    {
      accessorKey: "placa",
      header: "Placa",
    },
    {
      accessorKey: "plano",
      header: "Plano",
      cell: ({ row }: any) => <Badge variant="outline">{row.original.plano}</Badge>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ row }: any) => (
        <Badge className={getScoreColor(row.original.score)}>{row.original.score}</Badge>
      ),
    },
    {
      accessorKey: "valorAberto",
      header: "Valor Aberto",
      cell: ({ row }: any) => {
        const valor = row.original.valorAberto;
        return valor > 0 ? (
          <span className="text-destructive font-medium">R$ {valor.toFixed(2)}</span>
        ) : (
          <span className="text-success">-</span>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }: any) => {
        const associado = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedAssociado(associado);
                setIsViewModalOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(associado.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleAddAssociado = () => {
    const novo = {
      ...newAssociado,
      id: String(associados.length + 1),
      status: "Ativo",
      score: "Bom",
      valorAberto: 0,
    };
    setAssociados([...associados, novo]);
    setIsAddModalOpen(false);
    setNewAssociado({ nome: "", cpf: "", placa: "", plano: "Básico", telefone: "", email: "" });
  };

  const filteredAssociados = associados.filter((a) => {
    return statusFilter === "todos" || a.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Associados</h1>
          <p className="text-muted-foreground">Gestão de associados da proteção veicular</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Associado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Associado</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo associado
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={newAssociado.nome}
                  onChange={(e) => setNewAssociado({ ...newAssociado, nome: e.target.value })}
                  placeholder="Digite o nome completo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={newAssociado.cpf}
                    onChange={(e) => setNewAssociado({ ...newAssociado, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="placa">Placa</Label>
                  <Input
                    id="placa"
                    value={newAssociado.placa}
                    onChange={(e) => setNewAssociado({ ...newAssociado, placa: e.target.value })}
                    placeholder="ABC-1234"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plano">Plano</Label>
                <Select
                  value={newAssociado.plano}
                  onValueChange={(value) => setNewAssociado({ ...newAssociado, plano: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Básico">Básico</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={newAssociado.telefone}
                    onChange={(e) => setNewAssociado({ ...newAssociado, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAssociado.email}
                    onChange={(e) => setNewAssociado({ ...newAssociado, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddAssociado}>Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inadimplente">Inadimplente</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DataTable
            columns={columns}
            data={filteredAssociados}
            searchColumn="nome"
            searchPlaceholder="Buscar por nome..."
          />
        </CardContent>
      </Card>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Associado</DialogTitle>
          </DialogHeader>
          {selectedAssociado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{selectedAssociado.nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CPF</Label>
                  <p className="font-medium">{selectedAssociado.cpf}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Placa</Label>
                  <p className="font-medium">{selectedAssociado.placa}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plano</Label>
                  <Badge variant="outline">{selectedAssociado.plano}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <StatusBadge status={selectedAssociado.status} />
                </div>
                <div>
                  <Label className="text-muted-foreground">Score</Label>
                  <Badge className={getScoreColor(selectedAssociado.score)}>
                    {selectedAssociado.score}
                  </Badge>
                </div>
              </div>
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedAssociado.telefone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedAssociado.email}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Associados;
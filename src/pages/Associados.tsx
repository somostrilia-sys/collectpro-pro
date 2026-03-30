import { useState } from "react";
import { Plus, Eye, Edit, Trash2, Search, Filter, Phone, Mail, Users } from "lucide-react";
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
  {
    id: "4",
    nome: "Ana Paula Ferreira",
    cpf: "321.654.987-11",
    placa: "GHI-3456",
    plano: "Standard",
    status: "Inadimplente",
    telefone: "(41) 98123-4567",
    email: "ana.ferreira@email.com",
    score: "Crítico",
    valorAberto: 890.0,
  },
  {
    id: "5",
    nome: "Carlos Roberto Mendes",
    cpf: "654.321.098-22",
    placa: "JKL-7890",
    plano: "Premium",
    status: "Ativo",
    telefone: "(51) 97890-1234",
    email: "carlos.mendes@email.com",
    score: "Bom",
    valorAberto: 0,
  },
  {
    id: "6",
    nome: "Fernanda Lima Souza",
    cpf: "789.012.345-33",
    placa: "MNO-2345",
    plano: "Básico",
    status: "Pendente",
    telefone: "(61) 99234-5678",
    email: "fernanda.souza@email.com",
    score: "Regular",
    valorAberto: 320.0,
  },
  {
    id: "7",
    nome: "Rodrigo Alves Teixeira",
    cpf: "012.345.678-44",
    placa: "PQR-6789",
    plano: "Standard",
    status: "Ativo",
    telefone: "(71) 98456-7890",
    email: "rodrigo.teixeira@email.com",
    score: "Bom",
    valorAberto: 0,
  },
  {
    id: "8",
    nome: "Luciana Costa Barbosa",
    cpf: "345.678.901-55",
    placa: "STU-0123",
    plano: "Premium",
    status: "Inadimplente",
    telefone: "(81) 97567-8901",
    email: "luciana.barbosa@email.com",
    score: "Regular",
    valorAberto: 1250.0,
  },
  {
    id: "9",
    nome: "Marcos Vinicius Pereira",
    cpf: "678.901.234-66",
    placa: "VWX-4567",
    plano: "Básico",
    status: "Ativo",
    telefone: "(91) 99678-9012",
    email: "marcos.pereira@email.com",
    score: "Bom",
    valorAberto: 0,
  },
  {
    id: "10",
    nome: "Patrícia Gomes Nascimento",
    cpf: "901.234.567-77",
    placa: "YZA-8901",
    plano: "Standard",
    status: "Inadimplente",
    telefone: "(11) 96789-0123",
    email: "patricia.nascimento@email.com",
    score: "Crítico",
    valorAberto: 670.0,
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
      cell: ({ row }: any) => (
        <Badge variant="outline" className="font-medium">
          {row.original.plano}
        </Badge>
      ),
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
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setSelectedAssociado(associado);
                setIsViewModalOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold">Associados</h1>
          <p className="text-sm text-muted-foreground">Gestão de associados da proteção veicular</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Associado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Cadastrar Novo Associado</DialogTitle>
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

      {/* Filter + Table Card */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
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

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              Detalhes do Associado
            </DialogTitle>
          </DialogHeader>
          {selectedAssociado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <p className="font-medium text-sm">{selectedAssociado.nome}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">CPF</Label>
                  <p className="font-medium text-sm">{selectedAssociado.cpf}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Placa</Label>
                  <p className="font-medium text-sm">{selectedAssociado.placa}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Plano</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="font-medium">{selectedAssociado.plano}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <StatusBadge status={selectedAssociado.status} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Score</Label>
                  <div className="mt-1">
                    <Badge className={getScoreColor(selectedAssociado.score)}>
                      {selectedAssociado.score}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="rounded-xl p-2 bg-primary/10">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm">{selectedAssociado.telefone}</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="rounded-xl p-2 bg-primary/10">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm">{selectedAssociado.email}</span>
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

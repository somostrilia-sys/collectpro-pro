import { useState } from "react";
import { Plus, Search, Trophy, TrendingUp, Target } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const mockColaboradores = [
  {
    id: "1",
    nome: "Maria Silva",
    cargo: "Analista de Cobrança",
    meta: 40000,
    recuperado: 45200,
    ligacoes: 245,
    acordos: 28,
    email: "maria.silva@collectpro.com",
  },
  {
    id: "2",
    nome: "João Santos",
    cargo: "Analista de Cobrança",
    meta: 35000,
    recuperado: 38500,
    ligacoes: 198,
    acordos: 22,
    email: "joao.santos@collectpro.com",
  },
  {
    id: "3",
    nome: "Ana Costa",
    cargo: "Analista Sênior",
    meta: 45000,
    recuperado: 42000,
    ligacoes: 175,
    acordos: 31,
    email: "ana.costa@collectpro.com",
  },
  {
    id: "4",
    nome: "Carlos Lima",
    cargo: "Analista de Cobrança",
    meta: 30000,
    recuperado: 35800,
    ligacoes: 156,
    acordos: 19,
    email: "carlos.lima@collectpro.com",
  },
  {
    id: "5",
    nome: "Fernanda Oliveira",
    cargo: "Supervisora",
    meta: 50000,
    recuperado: 52300,
    ligacoes: 89,
    acordos: 35,
    email: "fernanda.oliveira@collectpro.com",
  },
];

const Colaboradores = () => {
  const [colaboradores, setColaboradores] = useState(mockColaboradores);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newColaborador, setNewColaborador] = useState({
    nome: "",
    cargo: "",
    email: "",
    meta: 30000,
  });

  const filteredColaboradores = colaboradores.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedByRecovery = [...filteredColaboradores].sort(
    (a, b) => b.recuperado - a.recuperado
  );

  const handleAddColaborador = () => {
    const novo = {
      ...newColaborador,
      id: String(colaboradores.length + 1),
      recuperado: 0,
      ligacoes: 0,
      acordos: 0,
    };
    setColaboradores([...colaboradores, novo]);
    setIsAddModalOpen(false);
    setNewColaborador({ nome: "", cargo: "", email: "", meta: 30000 });
  };

  const getProgressColor = (atual: number, meta: number) => {
    const percentual = (atual / meta) * 100;
    if (percentual >= 100) return "bg-success";
    if (percentual >= 80) return "bg-warning";
    return "bg-destructive";
  };

  const getRankingBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Badge className="bg-warning text-warning-foreground">🥇 1º</Badge>;
      case 1:
        return <Badge className="bg-muted-foreground text-secondary">🥈 2º</Badge>;
      case 2:
        return <Badge className="bg-destructive text-destructive-foreground">🥉 3º</Badge>;
      default:
        return <Badge variant="outline">{index + 1}º</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground">Gestão e ranking da equipe</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Colaborador</DialogTitle>
              <DialogDescription>
                Adicione um novo membro à equipe
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={newColaborador.nome}
                  onChange={(e) =>
                    setNewColaborador({ ...newColaborador, nome: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={newColaborador.cargo}
                  onChange={(e) =>
                    setNewColaborador({ ...newColaborador, cargo: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newColaborador.email}
                  onChange={(e) =>
                    setNewColaborador({ ...newColaborador, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meta">Meta Mensal (R$)</Label>
                <Input
                  id="meta"
                  type="number"
                  value={newColaborador.meta}
                  onChange={(e) =>
                    setNewColaborador({ ...newColaborador, meta: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddColaborador}>Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ranking Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedByRecovery.slice(0, 3).map((c, index) => (
          <Card key={c.id} className={index === 0 ? "border-yellow-500 border-2" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {c.nome.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getRankingBadge(index)}
                    <span className="font-semibold">{c.nome}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.cargo}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-success">
                    R$ {c.recuperado.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">recuperado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
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
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Ranking de Colaboradores
          </CardTitle>
          <CardDescription>
            Performance mensal da equipe de cobrança
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ranking</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Ligações</TableHead>
                <TableHead>Acordos</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Recuperado</TableHead>
                <TableHead>Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByRecovery.map((colaborador, index) => (
                <TableRow key={colaborador.id}>
                  <TableCell>{getRankingBadge(index)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {colaborador.nome.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{colaborador.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>{colaborador.cargo}</TableCell>
                  <TableCell>{colaborador.ligacoes}</TableCell>
                  <TableCell>{colaborador.acordos}</TableCell>
                  <TableCell>R$ {colaborador.meta.toLocaleString()}</TableCell>
                  <TableCell className="font-medium text-success">
                    R$ {colaborador.recuperado.toLocaleString()}
                  </TableCell>
                  <TableCell className="w-[150px]">
                    <div className="space-y-1">
                      <Progress
                        value={(colaborador.recuperado / colaborador.meta) * 100}
                        className={`h-2 ${getProgressColor(colaborador.recuperado, colaborador.meta)}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {((colaborador.recuperado / colaborador.meta) * 100).toFixed(0)}%
                      </span>
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

export default Colaboradores;
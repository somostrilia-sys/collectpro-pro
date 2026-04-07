import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Trophy, TrendingUp, Target, Award, Medal, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface ColaboradorRow {
  id: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  ativo: boolean;
  meta: number;
  recuperado: number;
  ligacoes: number;
  acordos: number;
}

const Colaboradores = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newColaborador, setNewColaborador] = useState({
    nome: "",
    cargo: "",
    email: "",
    meta: 30000,
  });

  // ── Fetch colaboradores from Supabase ─────────────────────────────────────
  const { data: colaboradores = [], isLoading, isError } = useQuery<ColaboradorRow[]>({
    queryKey: ["colaboradores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, email, telefone, ativo, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: String(c.id),
        nome: c.nome || "Sem nome",
        cargo: c.cargo || "",
        email: c.email || "",
        telefone: c.telefone || "",
        ativo: c.ativo ?? true,
        meta: 30000,
        recuperado: 0,
        ligacoes: 0,
        acordos: 0,
      }));
    },
    staleTime: 30_000,
  });

  const filteredColaboradores = colaboradores.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedByRecovery = [...filteredColaboradores].sort(
    (a, b) => b.recuperado - a.recuperado
  );

  // ── Add colaborador mutation ──────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: async (payload: { nome: string; cargo: string; email: string }) => {
      const { data, error } = await supabase
        .from("colaboradores")
        .insert({
          nome: payload.nome.trim(),
          cargo: payload.cargo.trim(),
          email: payload.email.trim(),
          ativo: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      setIsAddModalOpen(false);
      setNewColaborador({ nome: "", cargo: "", email: "", meta: 30000 });
      toast({ title: "Colaborador cadastrado!", description: "O novo colaborador foi adicionado com sucesso." });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao cadastrar", description: err.message || "Tente novamente.", variant: "destructive" });
    },
  });

  const handleAddColaborador = () => {
    if (!newColaborador.nome.trim()) {
      toast({ title: "Campo obrigatório", description: "O nome é obrigatório.", variant: "destructive" });
      return;
    }
    addMutation.mutate(newColaborador);
  };

  const getProgressColor = (atual: number, meta: number) => {
    const percentual = meta > 0 ? (atual / meta) * 100 : 0;
    if (percentual >= 100) return "bg-success";
    if (percentual >= 80) return "bg-warning";
    return "bg-destructive";
  };

  const getRankingIcon = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="rounded-xl p-2 bg-warning/10">
            <Trophy className="h-4 w-4 text-warning" />
          </div>
        );
      case 1:
        return (
          <div className="rounded-xl p-2 bg-muted">
            <Award className="h-4 w-4 text-muted-foreground" />
          </div>
        );
      case 2:
        return (
          <div className="rounded-xl p-2 bg-primary/10">
            <Medal className="h-4 w-4 text-primary" />
          </div>
        );
      default:
        return null;
    }
  };

  const getRankingBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Badge className="bg-warning/10 text-warning border-warning/20">1o</Badge>;
      case 1:
        return <Badge className="bg-muted text-muted-foreground">2o</Badge>;
      case 2:
        return <Badge className="bg-primary/10 text-primary border-primary/20">3o</Badge>;
      default:
        return <Badge variant="outline">{index + 1}o</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">Gestão e ranking da equipe</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Cadastrar Colaborador</DialogTitle>
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
              <Button onClick={handleAddColaborador} disabled={addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando colaboradores...</span>
        </div>
      )}
      {isError && (
        <div className="flex items-center justify-center py-12 text-destructive">
          Erro ao carregar colaboradores. Tente novamente.
        </div>
      )}

      {/* Top 3 Ranking Cards */}
      {!isLoading && !isError && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedByRecovery.slice(0, 3).map((c, index) => (
          <Card
            key={c.id}
            className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
              index === 0 ? "ring-2 ring-warning/30" : ""
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {c.nome.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1">
                    {getRankingIcon(index)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getRankingBadge(index)}
                    <span className="font-semibold truncate">{c.nome}</span>
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
              <div className="mt-4 space-y-1">
                <Progress
                  value={c.meta > 0 ? (c.recuperado / c.meta) * 100 : 0}
                  className={`h-1.5 ${getProgressColor(c.recuperado, c.meta)}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{(c.meta > 0 ? (c.recuperado / c.meta) * 100 : 0).toFixed(0)}% da meta</span>
                  <span>R$ {c.meta.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>}

      {/* Search */}
      <Card className="border-0 shadow-sm">
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
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <div className="rounded-xl p-2.5 bg-warning/10">
              <Trophy className="h-5 w-5 text-warning" />
            </div>
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
              {sortedByRecovery.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8 opacity-40" />
                      <p className="text-sm">Nenhum colaborador cadastrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedByRecovery.map((colaborador, index) => (
                <TableRow key={colaborador.id}>
                  <TableCell>{getRankingBadge(index)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {colaborador.nome.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{colaborador.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{colaborador.cargo}</TableCell>
                  <TableCell>{colaborador.ligacoes}</TableCell>
                  <TableCell>{colaborador.acordos}</TableCell>
                  <TableCell className="text-muted-foreground">R$ {colaborador.meta.toLocaleString()}</TableCell>
                  <TableCell className="font-medium text-success">
                    R$ {colaborador.recuperado.toLocaleString()}
                  </TableCell>
                  <TableCell className="w-[150px]">
                    <div className="space-y-1">
                      <Progress
                        value={colaborador.meta > 0 ? (colaborador.recuperado / colaborador.meta) * 100 : 0}
                        className={`h-2 ${getProgressColor(colaborador.recuperado, colaborador.meta)}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {(colaborador.meta > 0 ? (colaborador.recuperado / colaborador.meta) * 100 : 0).toFixed(0)}%
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

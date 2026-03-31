import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Handshake,
  DollarSign,
  Check,
  Clock,
  Send,
  Filter,
  MessageSquare,
  History,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useAcordosList, useCreateAcordo, useUpdateAcordo } from "@/hooks/useCollectData";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

type StatusAcordo = "Pendente" | "Pago" | "Cancelado" | "Vencido";

interface Comentario {
  id: string;
  autor: string;
  dataHora: string;
  texto: string;
}

interface HistoricoItem {
  id: string;
  descricao: string;
  dataHora: string;
}

interface Acordo {
  id: string;
  associado: string;
  cpf: string;
  valorOriginal: number;
  valorAcordo: number;
  status: StatusAcordo;
  dataAcordo: string;
  dataVencimento: string;
  atendente: string;
  observacao: string;
  comentarios: Comentario[];
  historico: HistoricoItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const calcDesconto = (original: number, acordo: number): number => {
  if (!original || original <= 0) return 0;
  return ((original - acordo) / original) * 100;
};

const formatDate = (iso: string) => {
  if (!iso || iso === "-") return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const atendentes = ["Rayanne Donato", "Laleska Gelinske", "Carla Mendes", "Fernanda Lima"];

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadgeAcordo = ({ status }: { status: StatusAcordo }) => {
  switch (status) {
    case "Pago":
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">Pago</Badge>;
    case "Pendente":
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">Pendente</Badge>;
    case "Cancelado":
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Cancelado</Badge>;
    case "Vencido":
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-300/30 text-xs">Vencido</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// ─── (mock data removed — data now comes from Supabase) ──────────────────────

// ─── Form vazio ───────────────────────────────────────────────────────────────

const emptyForm = {
  associado: "",
  cpf: "",
  valorOriginal: "" as string | number,
  valorAcordo: "" as string | number,
  dataVencimento: "",
  atendente: "Rayanne Donato",
  observacao: "",
  status: "Pendente" as StatusAcordo,
};

// ─── Desconto info inline ─────────────────────────────────────────────────────

const DescontoInfo = ({
  valorOriginal,
  valorAcordo,
}: {
  valorOriginal: string | number;
  valorAcordo: string | number;
}) => {
  const o = Number(valorOriginal);
  const a = Number(valorAcordo);
  if (!o || !a) return null;
  if (a > o) {
    return (
      <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
        <p className="text-sm text-destructive font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Valor acordado maior que o original
        </p>
      </div>
    );
  }
  const desconto = calcDesconto(o, a);
  return (
    <div className="p-3 rounded-lg bg-success/5 border border-success/20">
      <p className="text-sm text-success font-medium flex items-center gap-2">
        <Check className="h-4 w-4" />
        Desconto: <span className="text-base font-bold">{desconto.toFixed(1)}%</span>
        <span className="ml-2 text-muted-foreground font-normal">
          (economia de {formatCurrency(o - a)})
        </span>
      </p>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const Acordos = () => {
  const { toast } = useToast();

  const { data: acordosData = [], isLoading: loadingAcordos } = useAcordosList();
  const createAcordo = useCreateAcordo();
  const updateAcordo = useUpdateAcordo();

  // local overlay for comments and historico (these aren't persisted to DB):
  const [localOverlays, setLocalOverlays] = useState<Record<string, { comentarios: Comentario[]; historico: HistoricoItem[] }>>({});

  // Merge overlays into acordos for display
  const acordos: Acordo[] = acordosData.map((a) => ({
    ...a,
    comentarios: localOverlays[a.id]?.comentarios ?? a.comentarios,
    historico: localOverlays[a.id]?.historico ?? a.historico,
  }));

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAtendente, setFiltroAtendente] = useState("todos");

  // Dialog Novo Acordo
  const [openNovo, setOpenNovo] = useState(false);
  const [formNovo, setFormNovo] = useState(emptyForm);

  // Dialog Visualizar
  const [openVisualizar, setOpenVisualizar] = useState(false);
  const [acordoVisualizado, setAcordoVisualizado] = useState<Acordo | null>(null);
  const [novoComentario, setNovoComentario] = useState("");

  // Dialog Editar
  const [openEditar, setOpenEditar] = useState(false);
  const [formEditar, setFormEditar] = useState(emptyForm);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // ── Filtros ────────────────────────────────────────────────────────────────

  const acordosFiltrados = acordos
    .filter((a) => {
      const termo = searchTerm.toLowerCase();
      return (
        a.associado.toLowerCase().includes(termo) || a.cpf.includes(termo)
      );
    })
    .filter((a) => filtroStatus === "todos" || a.status === filtroStatus)
    .filter((a) => filtroAtendente === "todos" || a.atendente === filtroAtendente);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    total: acordos.length,
    pagos: acordos.filter((a) => a.status === "Pago").length,
    pendentes: acordos.filter((a) => a.status === "Pendente").length,
    valorTotalOriginal: acordos.reduce((acc, a) => acc + a.valorOriginal, 0),
    valorRecuperado: acordos
      .filter((a) => a.status === "Pago")
      .reduce((acc, a) => acc + a.valorAcordo, 0),
  };

  // ── Novo Acordo ────────────────────────────────────────────────────────────

  const handleCriarAcordo = () => {
    const vOrig = Number(formNovo.valorOriginal);
    const vAcord = Number(formNovo.valorAcordo);
    if (!vOrig || !vAcord || !formNovo.dataVencimento) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha valores e data de vencimento.",
        variant: "destructive",
      });
      return;
    }
    createAcordo.mutate({
      valorOriginal: vOrig,
      valorAcordo: vAcord,
      dataVencimento: formNovo.dataVencimento,
      associadoNome: formNovo.associado,
      atendente: formNovo.atendente,
      observacao: formNovo.observacao,
    }, {
      onSuccess: () => {
        setOpenNovo(false);
        setFormNovo(emptyForm);
        toast({
          title: "Acordo criado!",
          description: "Acordo registrado com sucesso.",
        });
      },
      onError: () => {
        toast({
          title: "Erro ao criar acordo",
          description: "Não foi possível salvar o acordo. Tente novamente.",
          variant: "destructive",
        });
      },
    });
  };

  // ── Visualizar ─────────────────────────────────────────────────────────────

  const handleVisualizar = (acordo: Acordo) => {
    setAcordoVisualizado(acordo);
    setNovoComentario("");
    setOpenVisualizar(true);
  };

  const handleAdicionarComentario = () => {
    if (!acordoVisualizado || !novoComentario.trim()) return;
    const comentario: Comentario = {
      id: `cm${Date.now()}`,
      autor: "Rayanne Donato",
      dataHora: new Date().toISOString().slice(0, 16).replace("T", " "),
      texto: novoComentario,
    };
    const id = acordoVisualizado.id;
    const existing = localOverlays[id] ?? { comentarios: acordoVisualizado.comentarios, historico: acordoVisualizado.historico };
    setLocalOverlays((prev) => ({
      ...prev,
      [id]: { ...existing, comentarios: [comentario, ...existing.comentarios] },
    }));
    setAcordoVisualizado((prev) =>
      prev ? { ...prev, comentarios: [comentario, ...prev.comentarios] } : prev
    );
    setNovoComentario("");
    toast({ title: "Comentário adicionado!" });
  };

  // ── Editar ─────────────────────────────────────────────────────────────────

  const handleAbrirEditar = (acordo: Acordo) => {
    setEditandoId(acordo.id);
    setFormEditar({
      associado: acordo.associado,
      cpf: acordo.cpf,
      valorOriginal: acordo.valorOriginal,
      valorAcordo: acordo.valorAcordo,
      dataVencimento: acordo.dataVencimento,
      atendente: acordo.atendente,
      observacao: acordo.observacao,
      status: acordo.status,
    });
    setOpenEditar(true);
  };

  const handleSalvarEdicao = () => {
    if (!editandoId) return;
    const vOrig = Number(formEditar.valorOriginal);
    const vAcord = Number(formEditar.valorAcordo);
    const acordoAtual = acordos.find((a) => a.id === editandoId);
    if (!acordoAtual) return;

    const statusMudou = acordoAtual.status !== formEditar.status;
    const agora = new Date().toISOString().slice(0, 16).replace("T", " ");

    // Update historico overlay locally
    if (statusMudou) {
      const existing = localOverlays[editandoId] ?? { comentarios: acordoAtual.comentarios, historico: acordoAtual.historico };
      setLocalOverlays((prev) => ({
        ...prev,
        [editandoId]: {
          ...existing,
          historico: [
            ...existing.historico,
            {
              id: `h${Date.now()}`,
              descricao: `Status alterado para ${formEditar.status}`,
              dataHora: agora,
            },
          ],
        },
      }));
    }

    updateAcordo.mutate({
      id: editandoId,
      status: formEditar.status,
      valorOriginal: vOrig,
      valorAcordo: vAcord,
      dataVencimento: formEditar.dataVencimento,
    }, {
      onSuccess: () => {
        setOpenEditar(false);
        setEditandoId(null);
        if (formEditar.status === "Pago") {
          toast({
            title: "Acordo marcado como pago!",
            description: `Acordo de ${formEditar.associado} foi quitado com sucesso.`,
          });
        } else {
          toast({ title: "Acordo atualizado!", description: "As alterações foram salvas." });
        }
      },
      onError: () => {
        toast({
          title: "Erro ao atualizar acordo",
          description: "Não foi possível salvar as alterações. Tente novamente.",
          variant: "destructive",
        });
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold">Acordos</h1>
          <p className="text-sm text-muted-foreground">Gestão de acordos com desconto à vista</p>
        </div>
        <Button
          onClick={() => {
            setFormNovo(emptyForm);
            setOpenNovo(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Acordo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <Handshake className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total de Acordos</p>
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
                <div className="text-2xl font-bold text-success">{stats.pagos}</div>
                <p className="text-sm text-muted-foreground">Pagos</p>
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
                <div className="text-2xl font-bold text-warning">{stats.pendentes}</div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-lg font-bold text-success leading-tight">
                  {formatCurrency(stats.valorRecuperado)}
                </div>
                <p className="text-sm text-muted-foreground">Valor Recuperado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progresso de recuperação */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total Original</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.valorTotalOriginal)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor Recuperado (acordos pagos)</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(stats.valorRecuperado)}
              </p>
            </div>
          </div>
          <Progress
            value={
              stats.valorTotalOriginal > 0
                ? (stats.valorRecuperado / stats.valorTotalOriginal) * 100
                : 0
            }
            className="h-2"
          />
          <p className="text-sm text-muted-foreground mt-2">
            {stats.valorTotalOriginal > 0
              ? ((stats.valorRecuperado / stats.valorTotalOriginal) * 100).toFixed(1)
              : "0"}
            % recuperado
          </p>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[170px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroAtendente} onValueChange={setFiltroAtendente}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Atendente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Atendentes</SelectItem>
                {atendentes.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="font-heading">Lista de Acordos</CardTitle>
          <CardDescription>{acordosFiltrados.length} acordo(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Associado</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Valor Original</TableHead>
                  <TableHead>Valor Acordado</TableHead>
                  <TableHead>Desconto (%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data do Acordo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Atendente</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAcordos ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 opacity-40 animate-spin" />
                        <p className="text-sm">Carregando acordos...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : acordosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Handshake className="h-8 w-8 opacity-40" />
                        <p className="text-sm">Nenhum acordo encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                {acordosFiltrados.map((acordo) => {
                  const desconto = calcDesconto(acordo.valorOriginal, acordo.valorAcordo);
                  return (
                    <TableRow key={acordo.id}>
                      <TableCell className="font-medium">{acordo.associado}</TableCell>
                      <TableCell className="text-muted-foreground">{acordo.cpf}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(acordo.valorOriginal)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(acordo.valorAcordo)}
                      </TableCell>
                      <TableCell>
                        {desconto > 0 ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                            -{desconto.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadgeAcordo status={acordo.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(acordo.dataAcordo)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(acordo.dataVencimento)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {acordo.atendente}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Visualizar"
                            onClick={() => handleVisualizar(acordo)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar"
                            onClick={() => handleAbrirEditar(acordo)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Dialog: Novo Acordo ── */}
      <Dialog open={openNovo} onOpenChange={setOpenNovo}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <Handshake className="h-4 w-4 text-primary" />
              </div>
              Criar Novo Acordo
            </DialogTitle>
            <DialogDescription>
              Registre um acordo com desconto à vista para o associado
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Associado *</Label>
              <Input
                placeholder="Nome completo do associado"
                value={formNovo.associado}
                onChange={(e) => setFormNovo({ ...formNovo, associado: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={formNovo.cpf}
                onChange={(e) => setFormNovo({ ...formNovo, cpf: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Valor Original (R$) *</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  min={0}
                  step="0.01"
                  value={formNovo.valorOriginal}
                  onChange={(e) =>
                    setFormNovo({ ...formNovo, valorOriginal: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Valor Acordado (R$) *</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  min={0}
                  step="0.01"
                  value={formNovo.valorAcordo}
                  onChange={(e) =>
                    setFormNovo({ ...formNovo, valorAcordo: e.target.value })
                  }
                />
              </div>
            </div>
            <DescontoInfo
              valorOriginal={formNovo.valorOriginal}
              valorAcordo={formNovo.valorAcordo}
            />
            <div className="grid gap-2">
              <Label>Data de Vencimento *</Label>
              <Input
                type="date"
                value={formNovo.dataVencimento}
                onChange={(e) =>
                  setFormNovo({ ...formNovo, dataVencimento: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Atendente</Label>
              <Select
                value={formNovo.atendente}
                onValueChange={(v) => setFormNovo({ ...formNovo, atendente: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {atendentes.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Observação</Label>
              <Textarea
                placeholder="Informações adicionais sobre o acordo..."
                value={formNovo.observacao}
                onChange={(e) => setFormNovo({ ...formNovo, observacao: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovo(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarAcordo}>
              <Handshake className="h-4 w-4 mr-2" />
              Criar Acordo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Visualizar ── */}
      <Dialog open={openVisualizar} onOpenChange={setOpenVisualizar}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {acordoVisualizado && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-2">
                  <div className="rounded-xl p-2.5 bg-primary/10">
                    <Handshake className="h-4 w-4 text-primary" />
                  </div>
                  Acordo #{acordoVisualizado.id}
                </DialogTitle>
                <DialogDescription>
                  {acordoVisualizado.associado} — {acordoVisualizado.cpf}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2">
                {/* Dados do acordo */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
                  <div>
                    <Label className="text-xs text-muted-foreground">Associado</Label>
                    <p className="text-sm font-medium">{acordoVisualizado.associado}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <p className="text-sm font-medium">{acordoVisualizado.cpf}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor Original</Label>
                    <p className="text-sm font-medium">{formatCurrency(acordoVisualizado.valorOriginal)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor Acordado</Label>
                    <p className="text-sm font-bold text-primary">{formatCurrency(acordoVisualizado.valorAcordo)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Desconto</Label>
                    <p className="text-sm font-bold text-success">
                      {calcDesconto(acordoVisualizado.valorOriginal, acordoVisualizado.valorAcordo).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <StatusBadgeAcordo status={acordoVisualizado.status} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data do Acordo</Label>
                    <p className="text-sm">{formatDate(acordoVisualizado.dataAcordo)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Vencimento</Label>
                    <p className="text-sm">{formatDate(acordoVisualizado.dataVencimento)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Atendente</Label>
                    <p className="text-sm">{acordoVisualizado.atendente}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Observação</Label>
                    <p className="text-sm">{acordoVisualizado.observacao || "—"}</p>
                  </div>
                </div>

                {/* Comentários Internos */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-4">
                    <h3 className="font-heading font-semibold flex items-center gap-2 mb-3">
                      <div className="rounded-xl p-1.5 bg-primary/10">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      </div>
                      Comentários Internos
                    </h3>
                    <ScrollArea className="h-[200px] pr-2">
                      {acordoVisualizado.comentarios.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum comentário ainda.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {acordoVisualizado.comentarios.map((c) => (
                            <div key={c.id} className="flex gap-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                  {c.autor
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 rounded-lg bg-muted/50 p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold">{c.autor}</span>
                                  <span className="text-xs text-muted-foreground">{c.dataHora}</span>
                                </div>
                                <p className="text-sm">{c.texto}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    <div className="flex gap-2 mt-3">
                      <Textarea
                        placeholder="Adicionar comentário interno..."
                        value={novoComentario}
                        onChange={(e) => setNovoComentario(e.target.value)}
                        className="min-h-[70px] text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) handleAdicionarComentario();
                        }}
                      />
                      <Button
                        onClick={handleAdicionarComentario}
                        disabled={!novoComentario.trim()}
                        className="h-auto"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Ctrl+Enter para enviar</p>
                  </CardContent>
                </Card>

                {/* Histórico */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-4">
                    <h3 className="font-heading font-semibold flex items-center gap-2 mb-3">
                      <div className="rounded-xl p-1.5 bg-primary/10">
                        <History className="h-3.5 w-3.5 text-primary" />
                      </div>
                      Histórico
                    </h3>
                    <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                      {acordoVisualizado.historico.map((h) => (
                        <div key={h.id} className="flex items-start gap-3 text-sm relative">
                          <div className="h-4 w-4 rounded-full bg-primary/20 border-2 border-primary flex-shrink-0 mt-0.5 z-10" />
                          <div className="flex-1">
                            <p>{h.descricao}</p>
                            <p className="text-xs text-muted-foreground">{h.dataHora}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenVisualizar(false)}>
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setOpenVisualizar(false);
                    handleAbrirEditar(acordoVisualizado);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Acordo
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar ── */}
      <Dialog open={openEditar} onOpenChange={setOpenEditar}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar Acordo</DialogTitle>
            <DialogDescription>
              Atualize os dados do acordo
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Associado</Label>
              <Input
                value={formEditar.associado}
                onChange={(e) => setFormEditar({ ...formEditar, associado: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>CPF</Label>
              <Input
                value={formEditar.cpf}
                onChange={(e) => setFormEditar({ ...formEditar, cpf: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Valor Original (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formEditar.valorOriginal}
                  onChange={(e) =>
                    setFormEditar({ ...formEditar, valorOriginal: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Valor Acordado (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formEditar.valorAcordo}
                  onChange={(e) =>
                    setFormEditar({ ...formEditar, valorAcordo: e.target.value })
                  }
                />
              </div>
            </div>
            <DescontoInfo
              valorOriginal={formEditar.valorOriginal}
              valorAcordo={formEditar.valorAcordo}
            />
            <div className="grid gap-2">
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={formEditar.dataVencimento}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, dataVencimento: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Atendente</Label>
              <Select
                value={formEditar.atendente}
                onValueChange={(v) => setFormEditar({ ...formEditar, atendente: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {atendentes.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={formEditar.status}
                onValueChange={(v) =>
                  setFormEditar({ ...formEditar, status: v as StatusAcordo })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Observação</Label>
              <Textarea
                value={formEditar.observacao}
                onChange={(e) => setFormEditar({ ...formEditar, observacao: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditar(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicao}>
              <Check className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Acordos;

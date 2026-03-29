import { useState } from "react";
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
} from "lucide-react";
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
      return <Badge className="bg-success/10 text-success border-success/30">Pago</Badge>;
    case "Pendente":
      return <Badge className="bg-warning/10 text-warning border-warning/30">Pendente</Badge>;
    case "Cancelado":
      return <Badge variant="destructive">Cancelado</Badge>;
    case "Vencido":
      return <Badge className="bg-orange-500/10 text-orange-500 border-orange-300/30">Vencido</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockAcordos: Acordo[] = [
  {
    id: "1",
    associado: "Maria Aparecida Santos",
    cpf: "987.654.321-00",
    valorOriginal: 890.0,
    valorAcordo: 750.0,
    status: "Pago",
    dataAcordo: "2024-01-05",
    dataVencimento: "2024-01-20",
    atendente: "Rayanne Donato",
    observacao: "Associado vendeu o veículo, quitou pendência com desconto",
    comentarios: [
      {
        id: "cm1",
        autor: "Rayanne Donato",
        dataHora: "2024-01-05 09:15",
        texto: "Acordo firmado via WhatsApp. Associada confirmou pagamento via PIX.",
      },
      {
        id: "cm2",
        autor: "Laleska Gelinske",
        dataHora: "2024-01-20 11:00",
        texto: "Pagamento confirmado. Baixa realizada no sistema.",
      },
    ],
    historico: [
      { id: "h1", descricao: "Acordo criado por Rayanne Donato", dataHora: "2024-01-05 09:00" },
      { id: "h2", descricao: "Status alterado para Pago", dataHora: "2024-01-20 11:00" },
    ],
  },
  {
    id: "2",
    associado: "Ana Beatriz Lima",
    cpf: "321.654.987-00",
    valorOriginal: 1250.0,
    valorAcordo: 1000.0,
    status: "Pendente",
    dataAcordo: "2024-01-10",
    dataVencimento: "2024-02-10",
    atendente: "Laleska Gelinske",
    observacao: "Associada com dificuldades financeiras, solicitou desconto",
    comentarios: [
      {
        id: "cm3",
        autor: "Laleska Gelinske",
        dataHora: "2024-01-10 14:30",
        texto: "Associada comprometeu pagamento para dia 10/02. Aguardando confirmação.",
      },
    ],
    historico: [
      { id: "h3", descricao: "Acordo criado por Laleska Gelinske", dataHora: "2024-01-10 14:00" },
    ],
  },
  {
    id: "3",
    associado: "João Carlos da Silva",
    cpf: "123.456.789-00",
    valorOriginal: 450.0,
    valorAcordo: 450.0,
    status: "Pago",
    dataAcordo: "2023-12-15",
    dataVencimento: "2023-12-30",
    atendente: "Carla Mendes",
    observacao: "Pagou sem desconto, apenas renegociou prazo",
    comentarios: [],
    historico: [
      { id: "h4", descricao: "Acordo criado por Carla Mendes", dataHora: "2023-12-15 10:00" },
      { id: "h5", descricao: "Status alterado para Pago", dataHora: "2023-12-30 16:30" },
    ],
  },
  {
    id: "4",
    associado: "Pedro Henrique Oliveira",
    cpf: "456.789.123-00",
    valorOriginal: 680.0,
    valorAcordo: 570.0,
    status: "Vencido",
    dataAcordo: "2024-01-02",
    dataVencimento: "2024-01-15",
    atendente: "Fernanda Lima",
    observacao: "Associado não retornou após aceite do acordo",
    comentarios: [
      {
        id: "cm4",
        autor: "Fernanda Lima",
        dataHora: "2024-01-16 09:00",
        texto: "Tentei contato via WhatsApp e ligação. Sem retorno. Acordo venceu ontem.",
      },
    ],
    historico: [
      { id: "h6", descricao: "Acordo criado por Fernanda Lima", dataHora: "2024-01-02 08:00" },
      { id: "h7", descricao: "Status alterado para Vencido", dataHora: "2024-01-16 09:00" },
    ],
  },
  {
    id: "5",
    associado: "Carlos Eduardo Ferreira",
    cpf: "654.321.098-00",
    valorOriginal: 920.0,
    valorAcordo: 736.0,
    status: "Pendente",
    dataAcordo: "2024-01-18",
    dataVencimento: "2024-02-05",
    atendente: "Rayanne Donato",
    observacao: "Desconto de 20% concedido. Associado confirmará pagamento na próxima semana.",
    comentarios: [],
    historico: [
      { id: "h8", descricao: "Acordo criado por Rayanne Donato", dataHora: "2024-01-18 11:00" },
    ],
  },
  {
    id: "6",
    associado: "Fernanda Costa Ribeiro",
    cpf: "741.852.963-00",
    valorOriginal: 560.0,
    valorAcordo: 476.0,
    status: "Cancelado",
    dataAcordo: "2024-01-08",
    dataVencimento: "2024-01-22",
    atendente: "Carla Mendes",
    observacao: "Associada desistiu do acordo após negociação",
    comentarios: [
      {
        id: "cm5",
        autor: "Carla Mendes",
        dataHora: "2024-01-09 15:00",
        texto: "Associada ligou desistindo. Disse que vai regularizar de outra forma.",
      },
    ],
    historico: [
      { id: "h9", descricao: "Acordo criado por Carla Mendes", dataHora: "2024-01-08 10:00" },
      { id: "h10", descricao: "Status alterado para Cancelado", dataHora: "2024-01-09 15:30" },
    ],
  },
];

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
      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive font-medium">
          ⚠️ Valor acordado maior que o original
        </p>
      </div>
    );
  }
  const desconto = calcDesconto(o, a);
  return (
    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
      <p className="text-sm text-success font-medium">
        ✅ Desconto: <span className="text-base font-bold">{desconto.toFixed(1)}%</span>
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

  const [acordos, setAcordos] = useState<Acordo[]>(mockAcordos);

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
    if (!formNovo.associado.trim() || !vOrig || !vAcord || !formNovo.dataVencimento) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha associado, valores e data de vencimento.",
        variant: "destructive",
      });
      return;
    }
    const agora = new Date().toISOString().slice(0, 16).replace("T", " ");
    const novo: Acordo = {
      id: String(acordos.length + 1),
      associado: formNovo.associado,
      cpf: formNovo.cpf,
      valorOriginal: vOrig,
      valorAcordo: vAcord,
      status: "Pendente",
      dataAcordo: new Date().toISOString().split("T")[0],
      dataVencimento: formNovo.dataVencimento,
      atendente: formNovo.atendente,
      observacao: formNovo.observacao,
      comentarios: [],
      historico: [
        {
          id: `h${Date.now()}`,
          descricao: `Acordo criado por ${formNovo.atendente}`,
          dataHora: agora,
        },
      ],
    };
    setAcordos([novo, ...acordos]);
    setOpenNovo(false);
    setFormNovo(emptyForm);
    toast({
      title: "Acordo criado!",
      description: `Acordo para ${novo.associado} registrado com sucesso.`,
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
    const updated = acordos.map((a) =>
      a.id === acordoVisualizado.id
        ? { ...a, comentarios: [comentario, ...a.comentarios] }
        : a
    );
    setAcordos(updated);
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

    const novoHistorico: HistoricoItem[] = statusMudou
      ? [
          ...acordoAtual.historico,
          {
            id: `h${Date.now()}`,
            descricao: `Status alterado para ${formEditar.status}`,
            dataHora: agora,
          },
        ]
      : acordoAtual.historico;

    const updated = acordos.map((a) =>
      a.id === editandoId
        ? {
            ...a,
            associado: formEditar.associado,
            cpf: formEditar.cpf,
            valorOriginal: vOrig,
            valorAcordo: vAcord,
            dataVencimento: formEditar.dataVencimento,
            atendente: formEditar.atendente,
            observacao: formEditar.observacao,
            status: formEditar.status,
            historico: novoHistorico,
          }
        : a
    );
    setAcordos(updated);
    setOpenEditar(false);
    setEditandoId(null);

    if (formEditar.status === "Pago") {
      toast({
        title: "✅ Acordo marcado como pago!",
        description: `Acordo de ${formEditar.associado} foi quitado com sucesso.`,
      });
    } else {
      toast({ title: "Acordo atualizado!", description: "As alterações foram salvas." });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Acordos</h1>
          <p className="text-muted-foreground">Gestão de acordos com desconto à vista</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
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
                <div className="text-2xl font-bold text-success">{stats.pagos}</div>
                <p className="text-sm text-muted-foreground">Pagos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{stats.pendentes}</div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
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
      <Card>
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
      <Card>
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
      <Card>
        <CardHeader>
          <CardTitle>Lista de Acordos</CardTitle>
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
                {acordosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      Nenhum acordo encontrado.
                    </TableCell>
                  </TableRow>
                )}
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
                          <Badge className="bg-success/10 text-success border-success/30">
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
                            title="Visualizar"
                            onClick={() => handleVisualizar(acordo)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
            <DialogTitle>Criar Novo Acordo</DialogTitle>
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
                <DialogTitle className="flex items-center gap-2">
                  <Handshake className="h-5 w-5 text-primary" />
                  Acordo #{acordoVisualizado.id}
                </DialogTitle>
                <DialogDescription>
                  {acordoVisualizado.associado} — {acordoVisualizado.cpf}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2">
                {/* Dados do acordo */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20">
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
                <div className="space-y-3 p-4 rounded-lg border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
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
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {c.autor
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 rounded-lg bg-muted p-3">
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
                  <div className="flex gap-2">
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
                  <p className="text-xs text-muted-foreground">Ctrl+Enter para enviar</p>
                </div>

                {/* Histórico */}
                <div className="space-y-3 p-4 rounded-lg border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Histórico
                  </h3>
                  <div className="space-y-2">
                    {acordoVisualizado.historico.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 text-sm">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p>{h.descricao}</p>
                          <p className="text-xs text-muted-foreground">{h.dataHora}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
            <DialogTitle>Editar Acordo</DialogTitle>
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

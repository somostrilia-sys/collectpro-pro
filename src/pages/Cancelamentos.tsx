import { useState } from "react";
import {
  Search,
  UserMinus,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Copy,
  Mail,
  FileText,
  Download,
  Send,
  Plus,
  Filter,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// ─── Types ─────────────────────────────────────────────────────────────────

type StatusCancelamento = "PENDENTE" | "EM ATENDIMENTO" | "URGENTE" | "CONCLUÍDO";

interface Comentario {
  id: string;
  autor: string;
  dataHora: string;
  texto: string;
}

interface SolicitacaoCancelamento {
  id: string;
  nome: string;
  cpf: string;
  placa: string;
  plano: string;
  email: string;
  status: StatusCancelamento;
  atendente: string;
  dataAgendada: string | null;
  criadoEm: string;
  motivo: string;
  comentarios: Comentario[];
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const mockAssociados = [
  { id: "A1", nome: "João Carlos da Silva",    cpf: "123.456.789-00", placa: "ABC-1234", plano: "Premium",  email: "joao.silva@email.com" },
  { id: "A2", nome: "Maria Aparecida Santos",  cpf: "987.654.321-00", placa: "XYZ-5678", plano: "Básico",   email: "maria.santos@email.com" },
  { id: "A3", nome: "Pedro Henrique Oliveira", cpf: "456.789.123-00", placa: "DEF-9012", plano: "Premium",  email: "pedro.oliveira@email.com" },
  { id: "A4", nome: "Ana Beatriz Lima",        cpf: "321.654.987-00", placa: "GHI-3456", plano: "Standard", email: "ana.lima@email.com" },
  { id: "A5", nome: "Carlos Eduardo Ferreira", cpf: "654.321.098-00", placa: "JKL-7890", plano: "Básico",   email: "carlos.ferreira@email.com" },
];

const atendentes = ["Rayanne Donato", "Laleska Gelinske", "Carla Mendes", "Fernanda Lima"];

const mockSolicitacoes: SolicitacaoCancelamento[] = [
  {
    id: "C001",
    nome: "Maria Aparecida Santos",
    cpf: "987.654.321-00",
    placa: "XYZ-5678",
    plano: "Básico",
    email: "maria.santos@email.com",
    status: "PENDENTE",
    atendente: "Rayanne Donato",
    dataAgendada: null,
    criadoEm: "2024-01-15 09:00",
    motivo: "Dificuldades financeiras",
    comentarios: [
      { id: "cm1", autor: "Rayanne Donato", dataHora: "2024-01-15 09:05", texto: "Associada entrou em contato via WhatsApp solicitando cancelamento urgente." },
    ],
  },
  {
    id: "C002",
    nome: "Ana Beatriz Lima",
    cpf: "321.654.987-00",
    placa: "GHI-3456",
    plano: "Standard",
    email: "ana.lima@email.com",
    status: "EM ATENDIMENTO",
    atendente: "Laleska Gelinske",
    dataAgendada: "2024-01-18 14:00",
    criadoEm: "2024-01-14 11:30",
    motivo: "Mudança de cidade, não precisa mais do plano",
    comentarios: [
      { id: "cm2", autor: "Laleska Gelinske", dataHora: "2024-01-14 11:35", texto: "Conversei com a associada. Vou tentar retenção antes de concluir o cancelamento." },
      { id: "cm3", autor: "Carla Mendes",     dataHora: "2024-01-15 10:00", texto: "Ligação feita. Associada mantém decisão de cancelar." },
    ],
  },
  {
    id: "C003",
    nome: "Carlos Eduardo Ferreira",
    cpf: "654.321.098-00",
    placa: "JKL-7890",
    plano: "Básico",
    email: "carlos.ferreira@email.com",
    status: "URGENTE",
    atendente: "Carla Mendes",
    dataAgendada: null,
    criadoEm: "2024-01-15 08:00",
    motivo: "Associado com reclamação grave — cobertura negada indevidamente",
    comentarios: [],
  },
  {
    id: "C004",
    nome: "Pedro Henrique Oliveira",
    cpf: "456.789.123-00",
    placa: "DEF-9012",
    plano: "Premium",
    email: "pedro.oliveira@email.com",
    status: "CONCLUÍDO",
    atendente: "Fernanda Lima",
    dataAgendada: "2024-01-10 10:00",
    criadoEm: "2024-01-08 16:00",
    motivo: "Vendeu o veículo",
    comentarios: [
      { id: "cm4", autor: "Fernanda Lima", dataHora: "2024-01-10 10:30", texto: "Cancelamento concluído com sucesso. Documentação enviada por e-mail." },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const getStatusBadge = (status: StatusCancelamento) => {
  switch (status) {
    case "PENDENTE":
      return <Badge className="bg-warning/10 text-warning border-warning/30">Pendente</Badge>;
    case "EM ATENDIMENTO":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-300/30">Em Atendimento</Badge>;
    case "URGENTE":
      return <Badge variant="destructive">Urgente</Badge>;
    case "CONCLUÍDO":
      return <Badge className="bg-success/10 text-success border-success/30">Concluído</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const formatDate = (iso: string) => {
  const [date, time] = iso.split(" ");
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}${time ? " " + time : ""}`;
};

// ─── Term helper ────────────────────────────────────────────────────────────

const buildTermo = (s: SolicitacaoCancelamento) => `TERMO DE CANCELAMENTO

Eu, ${s.nome}, portador(a) do CPF ${s.cpf}, associado(a) ao plano ${s.plano} da CollectPro Proteção Veicular, referente ao veículo de placa ${s.placa}, solicito formalmente o cancelamento da minha associação.

Declaro estar ciente de que:
1. A proteção veicular será encerrada após o processamento desta solicitação;
2. Eventuais débitos pendentes deverão ser quitados;
3. O cancelamento é irreversível após a conclusão do processo;
4. Não haverá cobertura para sinistros ocorridos após a data de cancelamento.

Motivo do cancelamento: ${s.motivo}

Data da solicitação: ${formatDate(s.criadoEm)}
Data do cancelamento efetivo: ${s.status === "CONCLUÍDO" ? formatDate(new Date().toISOString().slice(0, 16).replace("T", " ")) : "___/___/______"}

_________________________
${s.nome}
CPF: ${s.cpf}

_________________________
Rayanne Donato
CEO — Grupo WALK Holding Corporation`;

// ─── Component ──────────────────────────────────────────────────────────────

const Cancelamentos = () => {
  const { toast } = useToast();

  // Solicitações state
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCancelamento[]>(mockSolicitacoes);

  // Busca de associado
  const [busca, setBusca] = useState("");
  const [associadoEncontrado, setAssociadoEncontrado] = useState<typeof mockAssociados[0] | null>(null);
  const [openNovaSolicitacao, setOpenNovaSolicitacao] = useState(false);
  const [motivoNovo, setMotivoNovo] = useState("");

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAtendente, setFiltroAtendente] = useState("todos");

  // Dialog principal de detalhe
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<SolicitacaoCancelamento | null>(null);
  const [openDetalhe, setOpenDetalhe] = useState(false);

  // Agendamento
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [mensagemAgendamento, setMensagemAgendamento] = useState("");

  // Comentário
  const [novoComentario, setNovoComentario] = useState("");

  // Termo
  const [openTermo, setOpenTermo] = useState(false);
  const [termoSolicitacao, setTermoSolicitacao] = useState<SolicitacaoCancelamento | null>(null);

  // Confirmar conclusão
  const [openConfirmaConclusao, setOpenConfirmaConclusao] = useState(false);
  const [solicitacaoParaConcluir, setSolicitacaoParaConcluir] = useState<SolicitacaoCancelamento | null>(null);

  // ── Busca ──────────────────────────────────────────────────────────────────

  const handleBuscar = () => {
    const termo = busca.toLowerCase();
    const found = mockAssociados.find(
      (a) =>
        a.nome.toLowerCase().includes(termo) ||
        a.cpf.includes(termo) ||
        a.placa.toLowerCase().includes(termo)
    );
    if (found) {
      setAssociadoEncontrado(found);
    } else {
      setAssociadoEncontrado(null);
      toast({ title: "Associado não encontrado", description: "Verifique nome, CPF ou placa.", variant: "destructive" });
    }
  };

  const handleAbrirSolicitacao = () => {
    if (!associadoEncontrado || !motivoNovo.trim()) return;
    const nova: SolicitacaoCancelamento = {
      id: `C${String(solicitacoes.length + 1).padStart(3, "0")}`,
      nome: associadoEncontrado.nome,
      cpf: associadoEncontrado.cpf,
      placa: associadoEncontrado.placa,
      plano: associadoEncontrado.plano,
      email: associadoEncontrado.email,
      status: "PENDENTE",
      atendente: "Rayanne Donato",
      dataAgendada: null,
      criadoEm: new Date().toISOString().slice(0, 16).replace("T", " "),
      motivo: motivoNovo,
      comentarios: [],
    };
    setSolicitacoes([nova, ...solicitacoes]);
    setOpenNovaSolicitacao(false);
    setMotivoNovo("");
    setBusca("");
    setAssociadoEncontrado(null);
    toast({ title: "Solicitação criada!", description: `Solicitação ${nova.id} aberta para ${nova.nome}.` });
  };

  // ── Atendente ──────────────────────────────────────────────────────────────

  const handleChangeAtendente = (id: string, atendente: string) => {
    setSolicitacoes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, atendente } : s))
    );
    if (solicitacaoSelecionada?.id === id) {
      setSolicitacaoSelecionada((prev) => prev && { ...prev, atendente });
    }
  };

  // ── Status ─────────────────────────────────────────────────────────────────

  const handleChangeStatus = (id: string, status: StatusCancelamento) => {
    if (status === "CONCLUÍDO") {
      const s = solicitacoes.find((s) => s.id === id) || null;
      setSolicitacaoParaConcluir(s);
      setOpenConfirmaConclusao(true);
      return;
    }
    atualizarStatus(id, status);
  };

  const atualizarStatus = (id: string, status: StatusCancelamento) => {
    setSolicitacoes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    if (solicitacaoSelecionada?.id === id) {
      setSolicitacaoSelecionada((prev) => prev && { ...prev, status });
    }
  };

  const confirmarConclusao = () => {
    if (!solicitacaoParaConcluir) return;
    atualizarStatus(solicitacaoParaConcluir.id, "CONCLUÍDO");
    setOpenConfirmaConclusao(false);
    toast({
      title: "Cancelamento concluído!",
      description: `Email de confirmação enviado para ${solicitacaoParaConcluir.email}.`,
    });
  };

  // ── Agendamento ────────────────────────────────────────────────────────────

  const handleSalvarAgendamento = () => {
    if (!solicitacaoSelecionada || !dataAgendamento) return;
    const [datePart, timePart] = dataAgendamento.split("T");
    const [y, m, d] = datePart.split("-");
    const dataFormatada = `${d}/${m}/${y}`;
    const horaFormatada = timePart || "00:00";

    const msg = `Olá ${solicitacaoSelecionada.nome}, sua solicitação de cancelamento foi agendada para o dia ${dataFormatada} às ${horaFormatada}. Por favor, esteja disponível neste horário para que possamos prosseguir com o atendimento. Equipe CollectPro - Proteção Veicular.`;

    setSolicitacoes((prev) =>
      prev.map((s) =>
        s.id === solicitacaoSelecionada.id
          ? { ...s, dataAgendada: `${datePart} ${horaFormatada}` }
          : s
      )
    );
    setSolicitacaoSelecionada((prev) =>
      prev ? { ...prev, dataAgendada: `${datePart} ${horaFormatada}` } : prev
    );
    setMensagemAgendamento(msg);
    toast({ title: "Agendamento salvo!", description: `Atendimento marcado para ${dataFormatada} às ${horaFormatada}.` });
  };

  const handleCopiarMensagem = () => {
    navigator.clipboard.writeText(mensagemAgendamento);
    toast({ title: "Mensagem copiada!", description: "Cole no WhatsApp ou e-mail." });
  };

  const handleEnviarEmailAgendamento = () => {
    toast({ title: "E-mail enviado! (simulado)", description: `Mensagem de agendamento enviada para ${solicitacaoSelecionada?.email}.` });
  };

  // ── Comentários ────────────────────────────────────────────────────────────

  const handleAdicionarComentario = () => {
    if (!solicitacaoSelecionada || !novoComentario.trim()) return;
    const comentario: Comentario = {
      id: `cm${Date.now()}`,
      autor: "Rayanne Donato",
      dataHora: new Date().toISOString().slice(0, 16).replace("T", " "),
      texto: novoComentario,
    };
    const updated = solicitacoes.map((s) =>
      s.id === solicitacaoSelecionada.id
        ? { ...s, comentarios: [comentario, ...s.comentarios] }
        : s
    );
    setSolicitacoes(updated);
    setSolicitacaoSelecionada((prev) =>
      prev ? { ...prev, comentarios: [comentario, ...prev.comentarios] } : prev
    );
    setNovoComentario("");
  };

  // ── Termo ──────────────────────────────────────────────────────────────────

  const handleAbrirTermo = (s: SolicitacaoCancelamento) => {
    setTermoSolicitacao(s);
    setOpenTermo(true);
  };

  const handleBaixarTermo = () => {
    if (!termoSolicitacao) return;
    const texto = buildTermo(termoSolicitacao);
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `termo-cancelamento-${termoSolicitacao.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Termo baixado!", description: "Arquivo salvo no seu dispositivo." });
  };

  const handleCopiarTermo = () => {
    if (!termoSolicitacao) return;
    navigator.clipboard.writeText(buildTermo(termoSolicitacao));
    toast({ title: "Termo copiado!" });
  };

  const handleEnviarEmailTermo = () => {
    toast({ title: "Termo enviado! (simulado)", description: `Termo enviado para ${termoSolicitacao?.email}.` });
  };

  // ── Detalhes ───────────────────────────────────────────────────────────────

  const abrirDetalhe = (s: SolicitacaoCancelamento) => {
    setSolicitacaoSelecionada(s);
    setDataAgendamento(s.dataAgendada ? s.dataAgendada.replace(" ", "T") : "");
    setMensagemAgendamento("");
    setNovoComentario("");
    setOpenDetalhe(true);
  };

  // ── Filtros ────────────────────────────────────────────────────────────────

  const solicitacoesFiltradas = solicitacoes
    .filter((s) => filtroStatus === "todos" || s.status === filtroStatus)
    .filter((s) => filtroAtendente === "todos" || s.atendente === filtroAtendente)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    total: solicitacoes.length,
    pendentes: solicitacoes.filter((s) => s.status === "PENDENTE").length,
    emAtendimento: solicitacoes.filter((s) => s.status === "EM ATENDIMENTO").length,
    urgentes: solicitacoes.filter((s) => s.status === "URGENTE").length,
    concluidos: solicitacoes.filter((s) => s.status === "CONCLUÍDO").length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cancelamentos</h1>
        <p className="text-muted-foreground">Gestão de solicitações de cancelamento de associados</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserMinus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{stats.pendentes}</div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">{stats.emAtendimento}</div>
                <p className="text-xs text-muted-foreground">Em Atendimento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{stats.urgentes}</div>
                <p className="text-xs text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{stats.concluidos}</div>
                <p className="text-xs text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca de Associado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buscar Associado</CardTitle>
          <CardDescription>Pesquise por nome, CPF ou placa para abrir uma nova solicitação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome, CPF ou placa..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleBuscar}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>

          {associadoEncontrado && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/30 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{associadoEncontrado.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p className="font-medium">{associadoEncontrado.cpf}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Placa</p>
                  <p className="font-medium">{associadoEncontrado.placa}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <Badge variant="outline">{associadoEncontrado.plano}</Badge>
                </div>
              </div>
              <Button
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => setOpenNovaSolicitacao(true)}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Abrir Solicitação de Cancelamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtros + Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitações de Cancelamento</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-3 flex-wrap mb-4">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="EM ATENDIMENTO">Em Atendimento</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
                <SelectItem value="CONCLUÍDO">Concluído</SelectItem>
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
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">Nome</th>
                  <th className="text-left py-3 px-2 font-medium">CPF</th>
                  <th className="text-left py-3 px-2 font-medium">Plano</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="text-left py-3 px-2 font-medium">Atendente</th>
                  <th className="text-left py-3 px-2 font-medium">Data Agendada</th>
                  <th className="text-left py-3 px-2 font-medium">Criado em</th>
                  <th className="text-right py-3 px-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhuma solicitação encontrada.
                    </td>
                  </tr>
                )}
                {solicitacoesFiltradas.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 font-medium">{s.nome}</td>
                    <td className="py-3 px-2 text-muted-foreground">{s.cpf}</td>
                    <td className="py-3 px-2">
                      <Badge variant="outline">{s.plano}</Badge>
                    </td>
                    <td className="py-3 px-2">{getStatusBadge(s.status)}</td>
                    <td className="py-3 px-2">
                      <Select
                        value={s.atendente}
                        onValueChange={(v) => handleChangeAtendente(s.id, v)}
                      >
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {atendentes.map((a) => (
                            <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {s.dataAgendada ? formatDate(s.dataAgendada) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{formatDate(s.criadoEm)}</td>
                    <td className="py-3 px-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => abrirDetalhe(s)}
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => handleAbrirTermo(s)}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Termo
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Dialog: Nova Solicitação ── */}
      <Dialog open={openNovaSolicitacao} onOpenChange={setOpenNovaSolicitacao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Solicitação de Cancelamento</DialogTitle>
            <DialogDescription>
              Confirme os dados e informe o motivo do cancelamento
            </DialogDescription>
          </DialogHeader>
          {associadoEncontrado && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Nome</Label>
                  <p className="font-medium text-sm">{associadoEncontrado.nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">CPF</Label>
                  <p className="font-medium text-sm">{associadoEncontrado.cpf}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Placa</Label>
                  <p className="font-medium text-sm">{associadoEncontrado.placa}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Plano</Label>
                  <Badge variant="outline">{associadoEncontrado.plano}</Badge>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="motivo">Motivo do cancelamento *</Label>
                <Textarea
                  id="motivo"
                  placeholder="Descreva o motivo informado pelo associado..."
                  value={motivoNovo}
                  onChange={(e) => setMotivoNovo(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovaSolicitacao(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleAbrirSolicitacao}
              disabled={!motivoNovo.trim()}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Abrir Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalhes / Agendamento / Comentários ── */}
      <Dialog open={openDetalhe} onOpenChange={setOpenDetalhe}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {solicitacaoSelecionada && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserMinus className="h-5 w-5 text-destructive" />
                  Solicitação {solicitacaoSelecionada.id}
                </DialogTitle>
                <DialogDescription>{solicitacaoSelecionada.nome} — {solicitacaoSelecionada.plano}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2">
                {/* Info + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <p className="text-sm font-medium">{solicitacaoSelecionada.cpf}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Placa</Label>
                    <p className="text-sm font-medium">{solicitacaoSelecionada.placa}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <p className="text-sm font-medium">{solicitacaoSelecionada.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Motivo</Label>
                    <p className="text-sm">{solicitacaoSelecionada.motivo}</p>
                  </div>
                </div>

                {/* Status + Atendente */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={solicitacaoSelecionada.status}
                      onValueChange={(v) => handleChangeStatus(solicitacaoSelecionada.id, v as StatusCancelamento)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDENTE">Pendente</SelectItem>
                        <SelectItem value="EM ATENDIMENTO">Em Atendimento</SelectItem>
                        <SelectItem value="URGENTE">Urgente</SelectItem>
                        <SelectItem value="CONCLUÍDO">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Atendente</Label>
                    <Select
                      value={solicitacaoSelecionada.atendente}
                      onValueChange={(v) => handleChangeAtendente(solicitacaoSelecionada.id, v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {atendentes.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Agendamento */}
                <div className="space-y-3 p-4 rounded-lg border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Agendamento de Atendimento
                  </h3>
                  <div className="flex gap-3 items-end flex-wrap">
                    <div className="grid gap-1 flex-1 min-w-[200px]">
                      <Label htmlFor="dataAgendamento">Data e Hora</Label>
                      <Input
                        id="dataAgendamento"
                        type="datetime-local"
                        value={dataAgendamento}
                        onChange={(e) => setDataAgendamento(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSalvarAgendamento} disabled={!dataAgendamento}>
                      Salvar Agendamento
                    </Button>
                  </div>

                  {mensagemAgendamento && (
                    <div className="space-y-2">
                      <Label>Mensagem pronta para o associado</Label>
                      <div className="p-3 rounded-md bg-muted text-sm leading-relaxed">
                        {mensagemAgendamento}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopiarMensagem}>
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Copiar Mensagem
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleEnviarEmailAgendamento}>
                          <Mail className="h-3.5 w-3.5 mr-1.5" />
                          Enviar por E-mail
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comentários Internos */}
                <div className="space-y-3 p-4 rounded-lg border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Comentários Internos
                  </h3>

                  <ScrollArea className="h-[220px] pr-2">
                    {solicitacaoSelecionada.comentarios.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum comentário ainda.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {solicitacaoSelecionada.comentarios.map((c) => (
                          <div key={c.id} className="flex gap-3">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {c.autor.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 rounded-lg bg-muted p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold">{c.autor}</span>
                                <span className="text-xs text-muted-foreground">{formatDate(c.dataHora)}</span>
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
              </div>

              <DialogFooter className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleAbrirTermo(solicitacaoSelecionada)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Termo
                </Button>
                <Button variant="outline" onClick={() => setOpenDetalhe(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Termo de Cancelamento ── */}
      <Dialog open={openTermo} onOpenChange={setOpenTermo}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Termo de Cancelamento</DialogTitle>
            <DialogDescription>
              {termoSolicitacao?.nome} — Solicitação {termoSolicitacao?.id}
            </DialogDescription>
          </DialogHeader>

          {termoSolicitacao && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/20 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                {buildTermo(termoSolicitacao)}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleBaixarTermo}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Termo (PDF)
                </Button>
                <Button variant="outline" onClick={handleCopiarTermo}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Termo
                </Button>
                <Button variant="outline" onClick={handleEnviarEmailTermo}>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar por E-mail
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTermo(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Conclusão ── */}
      <Dialog open={openConfirmaConclusao} onOpenChange={setOpenConfirmaConclusao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Confirmar Conclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza? Um e-mail de confirmação será enviado ao associado.
            </DialogDescription>
          </DialogHeader>

          {solicitacaoParaConcluir && (
            <div className="py-2 space-y-3">
              <div className="p-3 rounded-lg border bg-muted/20 text-sm space-y-1">
                <p><span className="text-muted-foreground">Associado:</span> <span className="font-medium">{solicitacaoParaConcluir.nome}</span></p>
                <p><span className="text-muted-foreground">Plano:</span> {solicitacaoParaConcluir.plano}</p>
                <p><span className="text-muted-foreground">Placa:</span> {solicitacaoParaConcluir.placa}</p>
                <p><span className="text-muted-foreground">E-mail:</span> {solicitacaoParaConcluir.email}</p>
              </div>
              <div className="p-3 rounded-lg border border-dashed bg-muted/10 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">E-mail que será enviado:</p>
                <p><strong>Assunto:</strong> Confirmação de Cancelamento - CollectPro Proteção Veicular</p>
                <p className="mt-1">
                  Prezado(a) {solicitacaoParaConcluir.nome}, confirmamos o cancelamento da sua associação ao plano{" "}
                  {solicitacaoParaConcluir.plano} da CollectPro Proteção Veicular, referente ao veículo de placa{" "}
                  {solicitacaoParaConcluir.placa}. Data do cancelamento efetivo:{" "}
                  {formatDate(new Date().toISOString().slice(0, 10).replace("T", " "))}. Agradecemos por ter sido
                  nosso(a) associado(a). Atenciosamente, Equipe CollectPro - Proteção Veicular.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenConfirmaConclusao(false)}>
              Cancelar
            </Button>
            <Button className="bg-success hover:bg-success/90 text-white" onClick={confirmarConclusao}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cancelamentos;

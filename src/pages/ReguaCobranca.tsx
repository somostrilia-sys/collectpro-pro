import { useState } from "react";
import {
  Settings,
  MessageSquare,
  Phone,
  Mail,
  AlertTriangle,
  Check,
  Clock,
  Send,
  SkipForward,
  Search,
  Wifi,
  WifiOff,
  ChevronRight,
  Bell,
  Shield,
  FileWarning,
  Ban,
  Zap,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// --- Types ---

interface EtapaRegua {
  id: string;
  dia: string;
  diaNum: number;
  titulo: string;
  descricao: string;
  canais: string[];
  ativo: boolean;
  mensagem: string;
  color: "blue" | "yellow" | "orange" | "red";
}

interface AssociadoRegua {
  id: string;
  nome: string;
  cpf: string;
  etapaAtual: string;
  diasAtraso: number;
  valor: number;
  proximoDisparo: string;
  canal: string;
  fase: "pre" | "pos";
}

// --- Data: Pre-Vencimento ---

const etapasPreVencimento: EtapaRegua[] = [
  {
    id: "pre_d7",
    dia: "D-7",
    diaNum: -7,
    titulo: "Envio do Boleto",
    descricao: "Envio antecipado do boleto para pagamento em dia",
    canais: ["WhatsApp"],
    ativo: true,
    mensagem:
      "Olá {nome}! Seu boleto de R$ {valor} referente ao plano {plano} vence em 7 dias ({vencimento}). Segue o boleto: {link_boleto}. CollectPro - Proteção Veicular",
    color: "blue",
  },
  {
    id: "pre_d5",
    dia: "D-5",
    diaNum: -5,
    titulo: "Lembrete de Vencimento",
    descricao: "Lembrete para pagamento com 5 dias de antecedência",
    canais: ["WhatsApp"],
    ativo: true,
    mensagem:
      "Olá {nome}! Lembrando que seu boleto de R$ {valor} vence em 5 dias ({vencimento}). Pague em dia e evite transtornos! {link_boleto}",
    color: "blue",
  },
  {
    id: "pre_d3",
    dia: "D-3",
    diaNum: -3,
    titulo: "Lembrete Próximo",
    descricao: "Terceiro aviso preventivo antes do vencimento",
    canais: ["WhatsApp"],
    ativo: true,
    mensagem:
      "Olá {nome}! Faltam 3 dias para o vencimento do seu boleto de R$ {valor} ({vencimento}). {link_boleto}",
    color: "blue",
  },
  {
    id: "pre_d1",
    dia: "D-1",
    diaNum: -1,
    titulo: "Último Lembrete",
    descricao: "Aviso final — boleto vence amanhã",
    canais: ["WhatsApp"],
    ativo: true,
    mensagem:
      "Olá {nome}! Seu boleto de R$ {valor} vence AMANHÃ ({vencimento}). Não esqueça! {link_boleto}",
    color: "blue",
  },
  {
    id: "pre_d0",
    dia: "D0",
    diaNum: 0,
    titulo: "Dia do Vencimento",
    descricao: "Notificação no dia do vencimento do boleto",
    canais: ["WhatsApp"],
    ativo: true,
    mensagem:
      "Olá {nome}! Hoje é o dia do vencimento do seu boleto de R$ {valor}. Pague agora: {link_boleto}",
    color: "blue",
  },
];

// --- Data: Pos-Vencimento ---

const etaposPosVencimento: EtapaRegua[] = [
  {
    id: "pos_d1",
    dia: "D+1",
    diaNum: 1,
    titulo: "WhatsApp Amigável",
    descricao: "Primeiro aviso amigável — boleto venceu ontem, tom cordial",
    canais: ["WhatsApp"],
    ativo: true,
    mensagem:
      "Olá {nome}! Tudo bem? Notamos que seu boleto de R$ {valor} venceu ontem ({vencimento}). Pode ter sido um esquecimento — sem problemas! Regularize pelo link: {link_boleto}. Qualquer dúvida, estamos aqui. 😊",
    color: "yellow",
  },
  {
    id: "pos_d3",
    dia: "D+3",
    diaNum: 3,
    titulo: "Segundo Aviso",
    descricao: "Segundo lembrete — 3 dias de atraso",
    canais: ["WhatsApp"],
    ativo: true,
    mensagem:
      "Olá {nome}! Seu boleto de R$ {valor} está 3 dias em atraso. Evite a suspensão da sua proteção veicular. {link_boleto}",
    color: "yellow",
  },
  {
    id: "pos_d5",
    dia: "D+5",
    diaNum: 5,
    titulo: "Terceiro Aviso",
    descricao: "Terceiro aviso — risco de suspensão",
    canais: ["WhatsApp"],
    ativo: true,
    mensagem:
      "Olá {nome}! Atenção: 5 dias de atraso no valor de R$ {valor}. Sua proteção pode ser suspensa. Regularize agora: {link_boleto}",
    color: "yellow",
  },
  {
    id: "pos_d7",
    dia: "D+7",
    diaNum: 7,
    titulo: "Contato Direto",
    descricao: "WhatsApp + ligação para negociação",
    canais: ["WhatsApp", "Ligação"],
    ativo: true,
    mensagem:
      "{nome}, seu débito de R$ {valor} está 7 dias em atraso. Entre em contato conosco para negociar. {telefone_contato}",
    color: "orange",
  },
  {
    id: "pos_d10",
    dia: "D+10",
    diaNum: 10,
    titulo: "Notificação Formal",
    descricao: "Notificação via WhatsApp e e-mail",
    canais: ["WhatsApp", "E-mail"],
    ativo: true,
    mensagem:
      "{nome}, notificação formal: débito de R$ {valor} em aberto há 10 dias. Regularize para evitar medidas administrativas. {link_boleto}",
    color: "orange",
  },
  {
    id: "pos_d15",
    dia: "D+15",
    diaNum: 15,
    titulo: "Última Chance + VoIP IA",
    descricao: "Última tentativa — WhatsApp + ligação + e-mail + ligação automática VoIP IA",
    canais: ["WhatsApp", "Ligação", "E-mail", "VoIP IA"],
    ativo: true,
    mensagem:
      "{nome}, ÚLTIMA TENTATIVA: seu débito de R$ {valor} está 15 dias em atraso. Nossa IA de cobrança entrará em contato por telefone para negociar. Após este prazo, medidas de negativação serão iniciadas. Regularize agora: {link_boleto} ou ligue: {telefone_contato}",
    color: "orange",
  },
  {
    id: "pos_d25",
    dia: "D+25",
    diaNum: 25,
    titulo: "Aviso de Negativação",
    descricao: "Aviso final antes da inclusão no SPC/Serasa",
    canais: ["WhatsApp", "E-mail"],
    ativo: true,
    mensagem:
      "{nome}, AVISO FINAL: seu débito de R$ {valor} será enviado para negativação (SPC/Serasa) em 5 dias. Esta é sua última chance de regularizar. {telefone_contato}",
    color: "red",
  },
  {
    id: "pos_d30",
    dia: "D+30",
    diaNum: 30,
    titulo: "Negativação",
    descricao: "Inclusão automática no SPC/Serasa",
    canais: ["Sistema"],
    ativo: true,
    mensagem:
      "Negativação automática — inclusão no SPC/Serasa",
    color: "red",
  },
];

// --- Mock: Associados na Regua ---

const mockAssociados: AssociadoRegua[] = [
  { id: "1", nome: "Maria Santos", cpf: "123.456.789-00", etapaAtual: "D-7", diasAtraso: -7, valor: 320.0, proximoDisparo: "Hoje 08:00", canal: "WhatsApp", fase: "pre" },
  { id: "2", nome: "João Silva", cpf: "234.567.890-11", etapaAtual: "D-3", diasAtraso: -3, valor: 450.0, proximoDisparo: "Hoje 09:00", canal: "WhatsApp", fase: "pre" },
  { id: "3", nome: "Ana Lima", cpf: "345.678.901-22", etapaAtual: "D0", diasAtraso: 0, valor: 189.0, proximoDisparo: "Hoje 10:00", canal: "WhatsApp", fase: "pre" },
  { id: "4", nome: "Carlos Souza", cpf: "456.789.012-33", etapaAtual: "D+1", diasAtraso: 1, valor: 275.0, proximoDisparo: "Amanhã 08:00", canal: "WhatsApp", fase: "pos" },
  { id: "5", nome: "Pedro Costa", cpf: "567.890.123-44", etapaAtual: "D+3", diasAtraso: 3, valor: 390.0, proximoDisparo: "27/01 08:00", canal: "WhatsApp", fase: "pos" },
  { id: "6", nome: "Lucia Ferreira", cpf: "678.901.234-55", etapaAtual: "D+7", diasAtraso: 7, valor: 520.0, proximoDisparo: "28/01 09:00", canal: "WhatsApp + Ligação", fase: "pos" },
  { id: "7", nome: "Roberto Alves", cpf: "789.012.345-66", etapaAtual: "D+10", diasAtraso: 10, valor: 870.0, proximoDisparo: "29/01 10:00", canal: "WhatsApp + E-mail", fase: "pos" },
  { id: "8", nome: "Fernanda Rocha", cpf: "890.123.456-77", etapaAtual: "D+15", diasAtraso: 15, valor: 640.0, proximoDisparo: "30/01 08:00", canal: "WhatsApp + Ligação + E-mail", fase: "pos" },
  { id: "9", nome: "Marcos Nunes", cpf: "901.234.567-88", etapaAtual: "D+25", diasAtraso: 25, valor: 1200.0, proximoDisparo: "01/02 08:00", canal: "WhatsApp + E-mail", fase: "pos" },
  { id: "10", nome: "Patrícia Gomes", cpf: "012.345.678-99", etapaAtual: "D+30", diasAtraso: 30, valor: 980.0, proximoDisparo: "Aguardando", canal: "Sistema", fase: "pos" },
];

// --- Helpers ---

const canalIcons: Record<string, React.ReactNode> = {
  WhatsApp: <MessageSquare className="h-3 w-3" />,
  Ligação: <Phone className="h-3 w-3" />,
  "E-mail": <Mail className="h-3 w-3" />,
  Sistema: <Shield className="h-3 w-3" />,
  "VoIP IA": <Zap className="h-3 w-3" />,
};

const etapaStepIcon = (color: EtapaRegua["color"], canais: string[]) => {
  if (canais.includes("Sistema")) return Ban;
  if (canais.includes("Ligação") && canais.includes("E-mail")) return Zap;
  if (canais.includes("Ligação")) return Phone;
  if (canais.includes("E-mail")) return Mail;
  return MessageSquare;
};

const colorClasses: Record<
  EtapaRegua["color"],
  { badge: string; dot: string; border: string; icon: string; bg: string }
> = {
  blue: {
    badge: "bg-primary/10 text-primary border-primary/30",
    dot: "bg-primary",
    border: "border-primary/20",
    icon: "text-primary",
    bg: "bg-primary/5",
  },
  yellow: {
    badge: "bg-warning/10 text-warning border-warning/30",
    dot: "bg-warning",
    border: "border-warning/20",
    icon: "text-warning",
    bg: "bg-warning/5",
  },
  orange: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    border: "border-orange-200",
    icon: "text-orange-600",
    bg: "bg-orange-50",
  },
  red: {
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    dot: "bg-destructive",
    border: "border-destructive/20",
    icon: "text-destructive",
    bg: "bg-destructive/5",
  },
};

const getEtapaColor = (etapa: string): EtapaRegua["color"] => {
  if (etapa.startsWith("D-") || etapa === "D0") return "blue";
  const num = parseInt(etapa.replace("D+", ""));
  if (num <= 5) return "yellow";
  if (num <= 15) return "orange";
  return "red";
};

const getEtapaBadgeClass = (etapa: string) => {
  const color = getEtapaColor(etapa);
  return colorClasses[color].badge;
};

// --- Sub-component: Timeline Step ---

interface TimelineStepProps {
  etapa: EtapaRegua;
  isLast: boolean;
  onToggle: (id: string) => void;
  onEditMessage: (etapa: EtapaRegua) => void;
}

const TimelineStep = ({ etapa, isLast, onToggle, onEditMessage }: TimelineStepProps) => {
  const c = colorClasses[etapa.color];
  const StepIcon = etapaStepIcon(etapa.color, etapa.canais);

  return (
    <div className="flex gap-4">
      {/* Spine */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-all",
            etapa.ativo
              ? cn(c.bg, c.border, c.icon)
              : "bg-muted border-muted-foreground/20 text-muted-foreground"
          )}
        >
          <StepIcon className="h-5 w-5" />
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 my-1 min-h-[24px]",
              etapa.ativo ? c.dot : "bg-muted"
            )}
          />
        )}
      </div>

      {/* Card */}
      <div
        className={cn(
          "flex-1 mb-4 rounded-xl border p-4 transition-all",
          etapa.ativo ? cn(c.bg, c.border) : "bg-muted/40 border-border"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "font-bold text-sm px-3 py-0.5",
                etapa.ativo ? c.badge : ""
              )}
            >
              {etapa.dia}
            </Badge>
            <div>
              <p className="font-semibold text-foreground leading-tight">{etapa.titulo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{etapa.descricao}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Canais */}
            <div className="flex gap-1">
              {etapa.canais.map((canal) => (
                <Badge
                  key={canal}
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  {canalIcons[canal]}
                  {canal}
                </Badge>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => onEditMessage(etapa)}
            >
              Editar Mensagem
            </Button>

            <Switch
              checked={etapa.ativo}
              onCheckedChange={() => onToggle(etapa.id)}
            />
          </div>
        </div>

        {/* Preview mensagem */}
        <div className="mt-3 p-2 bg-background/70 rounded-lg border border-border/50 text-xs text-muted-foreground line-clamp-2">
          {etapa.mensagem}
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

const ReguaCobranca = () => {
  const { toast } = useToast();

  // State: etapas
  const [etapasPre, setEtapasPre] = useState<EtapaRegua[]>(etapasPreVencimento);
  const [etaposPos, setEtaposPos] = useState<EtapaRegua[]>(etaposPosVencimento);

  // State: dialog edição de mensagem
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<EtapaRegua | null>(null);
  const [editingMensagem, setEditingMensagem] = useState("");

  // State: config WhatsApp dialog (header button)
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // State: associados — filtros
  const [filtroEtapa, setFiltroEtapa] = useState("all");
  const [busca, setBusca] = useState("");

  // State: config WhatsApp
  const [whatsappConfig, setWhatsappConfig] = useState({
    provedor: "whatsapp-business",
    apiUrl: "",
    token: "",
    instancia: "",
    webhookUrl: "https://app.collectpro.com.br/webhooks/whatsapp",
  });
  const [horarioConfig, setHorarioConfig] = useState({
    inicio: "08:00",
    fim: "20:00",
    diasSemana: ["seg", "ter", "qua", "qui", "sex"],
    respeitarHorario: true,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // -- Toggle etapa --

  const toggleEtapaPre = (id: string) =>
    setEtapasPre((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ativo: !e.ativo } : e))
    );

  const toggleEtapaPos = (id: string) =>
    setEtaposPos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ativo: !e.ativo } : e))
    );

  // -- Edit message dialog --

  const openEditDialog = (etapa: EtapaRegua) => {
    setEditingEtapa(etapa);
    setEditingMensagem(etapa.mensagem);
    setEditDialogOpen(true);
  };

  const saveEditedMessage = () => {
    if (!editingEtapa) return;
    const updater = (prev: EtapaRegua[]) =>
      prev.map((e) =>
        e.id === editingEtapa.id ? { ...e, mensagem: editingMensagem } : e
      );
    if (editingEtapa.id.startsWith("pre_")) {
      setEtapasPre(updater);
    } else {
      setEtaposPos(updater);
    }
    setEditDialogOpen(false);
    toast({
      title: "Mensagem salva!",
      description: `Template de ${editingEtapa.dia} atualizado com sucesso.`,
    });
  };

  // -- WhatsApp test connection --

  const handleTestarConexao = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setIsConnected(true);
      toast({
        title: "Conexão estabelecida!",
        description: "WhatsApp API conectada com sucesso.",
      });
    }, 2000);
  };

  const handleSalvarConfig = () => {
    toast({
      title: "Configuração salva!",
      description: "As configurações do WhatsApp foram salvas.",
    });
  };

  // -- Associados filtrados --

  const associadosFiltrados = mockAssociados.filter((a) => {
    const matchEtapa = filtroEtapa === "all" || a.etapaAtual === filtroEtapa;
    const matchBusca =
      !busca ||
      a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      a.cpf.includes(busca);
    return matchEtapa && matchBusca;
  });

  const todasEtapas = [
    ...etapasPreVencimento.map((e) => e.dia),
    ...etaposPosVencimento.map((e) => e.dia),
  ];

  // -- Toggle dia da semana --

  const toggleDiaSemana = (dia: string) => {
    setHorarioConfig((prev) => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter((d) => d !== dia)
        : [...prev.diasSemana, dia],
    }));
  };

  const diasSemanaOpts = [
    { value: "seg", label: "Seg" },
    { value: "ter", label: "Ter" },
    { value: "qua", label: "Qua" },
    { value: "qui", label: "Qui" },
    { value: "sex", label: "Sex" },
    { value: "sab", label: "Sáb" },
    { value: "dom", label: "Dom" },
  ];

  // -- Render --

  return (
    <div className="p-6 space-y-6">
      {/* -- Header -- */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-primary/10">
            <Gauge className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Régua de Cobrança</h1>
            <p className="text-sm text-muted-foreground">
              Configure os disparos automáticos de cobrança via WhatsApp
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setConfigDialogOpen(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurar WhatsApp API
        </Button>
      </div>

      {/* -- Tabs -- */}
      <Tabs defaultValue="pre-vencimento" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="pre-vencimento">Pré-Vencimento</TabsTrigger>
          <TabsTrigger value="pos-vencimento">Pós-Vencimento</TabsTrigger>
          <TabsTrigger value="associados">Associados na Régua</TabsTrigger>
          <TabsTrigger value="config-whatsapp">Configuração WhatsApp</TabsTrigger>
        </TabsList>

        {/* TAB: PRE-VENCIMENTO */}
        <TabsContent value="pre-vencimento" className="mt-6">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-heading">Pré-Vencimento — Envio de Boleto</CardTitle>
                  <CardDescription>
                    Disparos preventivos antes do vencimento para garantir o pagamento em dia
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="pt-2">
                {etapasPre.map((etapa, index) => (
                  <TimelineStep
                    key={etapa.id}
                    etapa={etapa}
                    isLast={index === etapasPre.length - 1}
                    onToggle={toggleEtapaPre}
                    onEditMessage={openEditDialog}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: POS-VENCIMENTO */}
        <TabsContent value="pos-vencimento" className="mt-6">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <CardTitle className="font-heading">Pós-Vencimento — Cobrança</CardTitle>
                  <CardDescription>
                    Régua de cobrança progressiva após o vencimento até a negativação
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="pt-2">
                {etaposPos.map((etapa, index) => (
                  <TimelineStep
                    key={etapa.id}
                    etapa={etapa}
                    isLast={index === etaposPos.length - 1}
                    onToggle={toggleEtapaPos}
                    onEditMessage={openEditDialog}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: ASSOCIADOS NA REGUA */}
        <TabsContent value="associados" className="mt-6">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="font-heading">Associados na Régua de Cobrança</CardTitle>
                  <CardDescription>
                    Acompanhe em qual etapa cada associado está e faça disparos manuais
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou CPF..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-9 w-64 rounded-lg"
                    />
                  </div>
                  <Select value={filtroEtapa} onValueChange={setFiltroEtapa}>
                    <SelectTrigger className="w-40 rounded-lg">
                      <SelectValue placeholder="Filtrar etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as etapas</SelectItem>
                      {todasEtapas.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Etapa Atual</TableHead>
                    <TableHead>Dias de Atraso</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Próximo Disparo</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {associadosFiltrados.map((assoc) => (
                    <TableRow key={assoc.id}>
                      <TableCell className="font-medium">{assoc.nome}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{assoc.cpf}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("font-semibold", getEtapaBadgeClass(assoc.etapaAtual))}
                        >
                          {assoc.etapaAtual}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assoc.diasAtraso < 0 ? (
                          <span className="text-primary font-medium">
                            {Math.abs(assoc.diasAtraso)}d antes
                          </span>
                        ) : assoc.diasAtraso === 0 ? (
                          <span className="text-primary font-medium">Vence hoje</span>
                        ) : (
                          <span className="text-destructive font-medium">
                            {assoc.diasAtraso}d em atraso
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        R$ {assoc.valor.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {assoc.proximoDisparo}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{assoc.canal}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() =>
                              toast({
                                title: "Disparo enviado!",
                                description: `Mensagem enviada para ${assoc.nome}`,
                              })
                            }
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Enviar Agora
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() =>
                              toast({
                                title: "Etapa pulada",
                                description: `${assoc.nome} avançado para próxima etapa`,
                              })
                            }
                          >
                            <SkipForward className="h-3 w-3 mr-1" />
                            Pular Etapa
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {associadosFiltrados.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum associado encontrado para os filtros selecionados.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: CONFIGURAÇÃO WHATSAPP */}
        <TabsContent value="config-whatsapp" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conexão */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-heading">Configuração da API</CardTitle>
                    <CardDescription>
                      Configure o provedor de WhatsApp para disparos automáticos
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      isConnected
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                    }
                  >
                    {isConnected ? (
                      <>
                        <Wifi className="h-3 w-3 mr-1" /> Conectado
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 mr-1" /> Desconectado
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provedor</Label>
                  <Select
                    value={whatsappConfig.provedor}
                    onValueChange={(v) =>
                      setWhatsappConfig({ ...whatsappConfig, provedor: v })
                    }
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp-business">WhatsApp Business API</SelectItem>
                      <SelectItem value="z-api">Z-API</SelectItem>
                      <SelectItem value="evolution-api">Evolution API</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>URL da API</Label>
                  <Input
                    placeholder="https://api.z-api.io/instances/..."
                    className="rounded-lg"
                    value={whatsappConfig.apiUrl}
                    onChange={(e) =>
                      setWhatsappConfig({ ...whatsappConfig, apiUrl: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Token / API Key</Label>
                  <Input
                    type="password"
                    placeholder="••••••••••••••••"
                    className="rounded-lg"
                    value={whatsappConfig.token}
                    onChange={(e) =>
                      setWhatsappConfig({ ...whatsappConfig, token: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Instância / Número</Label>
                  <Input
                    placeholder="Ex: 5511999999999"
                    className="rounded-lg"
                    value={whatsappConfig.instancia}
                    onChange={(e) =>
                      setWhatsappConfig({ ...whatsappConfig, instancia: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    readOnly
                    value={whatsappConfig.webhookUrl}
                    className="bg-muted text-muted-foreground cursor-default text-sm rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Configure este webhook no painel do seu provedor
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleTestarConexao}
                    disabled={isTesting}
                    className="flex-1"
                  >
                    {isTesting ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Testar Conexão
                      </>
                    )}
                  </Button>
                  <Button onClick={handleSalvarConfig} className="flex-1">
                    <Check className="h-4 w-4 mr-2" />
                    Salvar Configuração
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Horários de Envio */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="font-heading">Horários de Envio</CardTitle>
                <CardDescription>
                  Defina quando os disparos automáticos serão realizados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Respeitar horário comercial</p>
                    <p className="text-xs text-muted-foreground">
                      Disparos apenas dentro do horário configurado
                    </p>
                  </div>
                  <Switch
                    checked={horarioConfig.respeitarHorario}
                    onCheckedChange={(v) =>
                      setHorarioConfig({ ...horarioConfig, respeitarHorario: v })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Horário de início</Label>
                    <Input
                      type="time"
                      className="rounded-lg"
                      value={horarioConfig.inicio}
                      onChange={(e) =>
                        setHorarioConfig({ ...horarioConfig, inicio: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário de fim</Label>
                    <Input
                      type="time"
                      className="rounded-lg"
                      value={horarioConfig.fim}
                      onChange={(e) =>
                        setHorarioConfig({ ...horarioConfig, fim: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Dias da semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {diasSemanaOpts.map((dia) => (
                      <label
                        key={dia.value}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors",
                          horarioConfig.diasSemana.includes(dia.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                        )}
                      >
                        <Checkbox
                          className="hidden"
                          checked={horarioConfig.diasSemana.includes(dia.value)}
                          onCheckedChange={() => toggleDiaSemana(dia.value)}
                        />
                        {dia.label}
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() =>
                    toast({
                      title: "Horários salvos!",
                      description: "Configuração de horários atualizada.",
                    })
                  }
                  className="w-full"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salvar Horários
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* -- Estatísticas (sempre visível) -- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-primary/10 shrink-0">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">92%</div>
                <p className="text-sm text-muted-foreground">
                  Taxa de Recuperação Pré-Vencimento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-warning/10 shrink-0">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-3xl font-bold text-warning">45%</div>
                <p className="text-sm text-muted-foreground">
                  Taxa de Recuperação Pós-Vencimento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-destructive/10 shrink-0">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <div className="text-3xl font-bold text-destructive">12</div>
                <p className="text-sm text-muted-foreground">
                  Aguardando Negativação
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -- Dialog: Editar Mensagem -- */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Editar Mensagem —{" "}
              <span className="text-primary">{editingEtapa?.dia}</span>
            </DialogTitle>
            <DialogDescription>
              Use variáveis como {"{nome}"}, {"{valor}"}, {"{vencimento}"},{" "}
              {"{link_boleto}"}, {"{plano}"}, {"{telefone_contato}"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Textarea
              value={editingMensagem}
              onChange={(e) => setEditingMensagem(e.target.value)}
              rows={6}
              className="resize-none rounded-lg"
              placeholder="Digite a mensagem..."
            />
            <div className="flex flex-wrap gap-1">
              {[
                "{nome}",
                "{valor}",
                "{vencimento}",
                "{link_boleto}",
                "{plano}",
                "{telefone_contato}",
              ].map((v) => (
                <Badge
                  key={v}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-muted"
                  onClick={() => setEditingMensagem((prev) => prev + " " + v)}
                >
                  {v}
                </Badge>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEditedMessage}>Salvar Mensagem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Dialog: Configurar WhatsApp API (header button) -- */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-success" />
              Configurar WhatsApp API
            </DialogTitle>
            <DialogDescription>
              Configure rapidamente o provedor para envio de mensagens automáticas
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select
                value={whatsappConfig.provedor}
                onValueChange={(v) =>
                  setWhatsappConfig({ ...whatsappConfig, provedor: v })
                }
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp-business">WhatsApp Business API</SelectItem>
                  <SelectItem value="z-api">Z-API</SelectItem>
                  <SelectItem value="evolution-api">Evolution API</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Token / API Key</Label>
              <Input
                type="password"
                placeholder="Cole seu token aqui"
                className="rounded-lg"
                value={whatsappConfig.token}
                onChange={(e) =>
                  setWhatsappConfig({ ...whatsappConfig, token: e.target.value })
                }
              />
            </div>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm text-primary">
              <ChevronRight className="h-4 w-4 inline mr-1" />
              Acesse a aba "Configuração WhatsApp" para configurações avançadas de horários e instância.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                setConfigDialogOpen(false);
                toast({
                  title: "Configuração salva!",
                  description: "WhatsApp API configurada.",
                });
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReguaCobranca;

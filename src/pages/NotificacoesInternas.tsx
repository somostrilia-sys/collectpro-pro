import { Bell, AlertTriangle, Clock, FileWarning, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const notificacoes = [
  {
    id: 1,
    tipo: "inatividade",
    titulo: "Colaborador sem atividades registradas",
    descricao: "Carlos Mendes não registrou nenhuma atividade hoje.",
    data: "2026-03-09 09:15",
    lida: false,
    prioridade: "alta",
  },
  {
    id: 2,
    tipo: "acordo_vencimento",
    titulo: "Acordo próximo ao vencimento",
    descricao: "Acordo #AC-2024-089 de Maria Silva vence em 2 dias. Parcela 3/6 de R$ 450,00.",
    data: "2026-03-09 08:00",
    lida: false,
    prioridade: "media",
  },
  {
    id: 3,
    tipo: "negativacao",
    titulo: "Associado atingiu limite para negativação",
    descricao: "João Pereira possui 4 boletos vencidos (limite: 3). Elegível para negativação SPC/Serasa.",
    data: "2026-03-09 07:30",
    lida: false,
    prioridade: "alta",
  },
  {
    id: 4,
    tipo: "inatividade",
    titulo: "Colaborador sem atividades registradas",
    descricao: "Ana Souza não registrou nenhuma atividade ontem (08/03).",
    data: "2026-03-08 18:00",
    lida: true,
    prioridade: "alta",
  },
  {
    id: 5,
    tipo: "acordo_vencimento",
    titulo: "Acordo vencido - inadimplência",
    descricao: "Acordo #AC-2024-072 de Roberto Lima venceu há 3 dias. Sem pagamento registrado.",
    data: "2026-03-08 08:00",
    lida: true,
    prioridade: "alta",
  },
  {
    id: 6,
    tipo: "negativacao",
    titulo: "Associado próximo ao limite",
    descricao: "Fernanda Costa possui 2 de 3 boletos vencidos. Monitorar.",
    data: "2026-03-08 07:30",
    lida: true,
    prioridade: "media",
  },
  {
    id: 7,
    tipo: "inatividade",
    titulo: "Colaborador sem ligações hoje",
    descricao: "Pedro Alves não realizou nenhuma ligação até as 14h.",
    data: "2026-03-09 14:00",
    lida: false,
    prioridade: "media",
  },
  {
    id: 8,
    tipo: "acordo_vencimento",
    titulo: "5 acordos vencem esta semana",
    descricao: "Há 5 acordos com parcelas vencendo entre 09/03 e 15/03. Total: R$ 3.250,00.",
    data: "2026-03-09 06:00",
    lida: false,
    prioridade: "media",
  },
];

const prioridadeBadge = (p: string) => {
  if (p === "alta") return <Badge className="bg-destructive/10 text-destructive border-0">Alta</Badge>;
  if (p === "media") return <Badge className="bg-warning/10 text-warning border-0">Média</Badge>;
  return <Badge variant="secondary">Baixa</Badge>;
};

const tipoIcon = (t: string) => {
  if (t === "inatividade") return <Clock className="h-5 w-5 text-warning" />;
  if (t === "acordo_vencimento") return <FileWarning className="h-5 w-5 text-warning" />;
  return <AlertTriangle className="h-5 w-5 text-destructive" />;
};

export default function NotificacoesInternas() {
  const naoLidas = notificacoes.filter((n) => !n.lida);
  const lidas = notificacoes.filter((n) => n.lida);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Notificações Internas</h1>
          <p className="text-sm text-muted-foreground">Alertas automáticos para gestão da equipe</p>
        </div>
        <Badge className="bg-destructive/10 text-destructive border-0 text-base px-3 py-1">
          {naoLidas.length} não lidas
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-warning/10">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {notificacoes.filter((n) => n.tipo === "inatividade" && !n.lida).length}
              </p>
              <p className="text-sm text-muted-foreground">Inatividade de Colaboradores</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-warning/10">
              <FileWarning className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {notificacoes.filter((n) => n.tipo === "acordo_vencimento" && !n.lida).length}
              </p>
              <p className="text-sm text-muted-foreground">Acordos Próximos ao Vencimento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {notificacoes.filter((n) => n.tipo === "negativacao" && !n.lida).length}
              </p>
              <p className="text-sm text-muted-foreground">Limite de Negativação</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="nao-lidas">
        <TabsList>
          <TabsTrigger value="nao-lidas">Não Lidas ({naoLidas.length})</TabsTrigger>
          <TabsTrigger value="lidas">Lidas ({lidas.length})</TabsTrigger>
          <TabsTrigger value="todas">Todas ({notificacoes.length})</TabsTrigger>
        </TabsList>

        {["nao-lidas", "lidas", "todas"].map((tab) => {
          const items =
            tab === "nao-lidas" ? naoLidas : tab === "lidas" ? lidas : notificacoes;
          return (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
                  <Bell className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Nenhuma notificação encontrada.</p>
                </div>
              ) : items.map((n) => (
                <Card key={n.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow ${!n.lida ? "border-l-4 border-l-primary" : ""}`}>
                  <CardContent className="pt-4 pb-4 flex items-start gap-4">
                    <div className="rounded-xl p-2 bg-muted/50">
                      {tipoIcon(n.tipo)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{n.titulo}</h3>
                        {prioridadeBadge(n.prioridade)}
                        {!n.lida && (
                          <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{n.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.data}</p>
                    </div>
                    <div className="flex gap-1">
                      {!n.lida && (
                        <Button variant="ghost" size="sm">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

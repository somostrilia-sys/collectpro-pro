import { useState } from "react";
import { Settings, MessageSquare, Phone, Mail, AlertTriangle, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const etapasRegua = [
  {
    id: "d1",
    dia: "D+1",
    titulo: "Lembrete Amigável",
    descricao: "WhatsApp automático com link do boleto",
    canal: "WhatsApp",
    icon: MessageSquare,
    ativo: true,
  },
  {
    id: "d5",
    dia: "D+5",
    titulo: "Segunda Notificação",
    descricao: "SMS + WhatsApp com nova abordagem",
    canal: "SMS/WhatsApp",
    icon: MessageSquare,
    ativo: true,
  },
  {
    id: "d10",
    dia: "D+10",
    titulo: "Contato Telefônico",
    descricao: "Ligação manual do colaborador",
    canal: "Telefone",
    icon: Phone,
    ativo: true,
  },
  {
    id: "d15",
    dia: "D+15",
    titulo: "E-mail Formal",
    descricao: "Notificação formal por e-mail",
    canal: "E-mail",
    icon: Mail,
    ativo: true,
  },
  {
    id: "d20",
    dia: "D+20",
    titulo: "Última Tentativa",
    descricao: "Ligação + WhatsApp final",
    canal: "Telefone/WhatsApp",
    icon: Phone,
    ativo: true,
  },
  {
    id: "d30",
    dia: "D+30",
    titulo: "Negativação",
    descricao: "Inclusão no SPC/Serasa",
    canal: "Sistema",
    icon: AlertTriangle,
    ativo: false,
  },
];

const mockAssociadosRegua = [
  { id: "1", nome: "Maria Santos", etapaAtual: "D+5", diasAtraso: 5, valor: 320.0 },
  { id: "2", nome: "João Silva", etapaAtual: "D+15", diasAtraso: 15, valor: 450.0 },
  { id: "3", nome: "Ana Lima", etapaAtual: "D+30", diasAtraso: 32, valor: 890.0 },
  { id: "4", nome: "Carlos Souza", etapaAtual: "D+1", diasAtraso: 1, valor: 189.0 },
  { id: "5", nome: "Pedro Costa", etapaAtual: "D+10", diasAtraso: 10, valor: 275.0 },
];

const ReguaCobranca = () => {
  const [etapas, setEtapas] = useState(etapasRegua);

  const toggleEtapa = (id: string) => {
    setEtapas(etapas.map((e) => (e.id === id ? { ...e, ativo: !e.ativo } : e)));
  };

  const getEtapaColor = (dia: string) => {
    const num = parseInt(dia.replace("D+", ""));
    if (num <= 5) return "bg-success/10 border-success text-success";
    if (num <= 15) return "bg-warning/10 border-warning text-warning";
    return "bg-destructive/10 border-destructive text-destructive";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Régua de Cobrança</h1>
          <p className="text-muted-foreground">Configure a automação de cobrança por dias de atraso</p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Timeline Visual */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Cobrança</CardTitle>
          <CardDescription>
            Ative ou desative etapas da régua de cobrança
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Linha conectora */}
            <div className="absolute top-8 left-0 right-0 h-1 bg-border" />
            
            <div className="relative flex justify-between">
              {etapas.map((etapa, index) => (
                <div key={etapa.id} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center border-4 bg-card z-10 transition-all",
                      etapa.ativo ? getEtapaColor(etapa.dia) : "bg-muted border-muted-foreground/20 text-muted-foreground"
                    )}
                  >
                    <etapa.icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-bold",
                        etapa.ativo ? getEtapaColor(etapa.dia) : ""
                      )}
                    >
                      {etapa.dia}
                    </Badge>
                    <p className="text-sm font-medium mt-2">{etapa.titulo}</p>
                    <p className="text-xs text-muted-foreground max-w-[120px]">
                      {etapa.descricao}
                    </p>
                    <div className="mt-2">
                      <Switch
                        checked={etapa.ativo}
                        onCheckedChange={() => toggleEtapa(etapa.id)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status dos Associados na Régua */}
      <Card>
        <CardHeader>
          <CardTitle>Associados na Régua</CardTitle>
          <CardDescription>
            Acompanhe em qual etapa cada associado está
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAssociadosRegua.map((assoc) => (
              <div
                key={assoc.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2",
                      getEtapaColor(assoc.etapaAtual)
                    )}
                  >
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{assoc.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {assoc.diasAtraso} dias em atraso
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={getEtapaColor(assoc.etapaAtual)}>
                    {assoc.etapaAtual}
                  </Badge>
                  <span className="font-semibold text-destructive">
                    R$ {assoc.valor.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">78%</div>
                <p className="text-sm text-muted-foreground">Taxa de Recuperação D+1</p>
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
                <div className="text-2xl font-bold">45%</div>
                <p className="text-sm text-muted-foreground">Taxa de Recuperação D+15</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">12</div>
                <p className="text-sm text-muted-foreground">Aguardando Negativação</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReguaCobranca;
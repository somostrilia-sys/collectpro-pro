import { useState } from "react";
import {
  Shield,
  RefreshCw,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  MessageSquare,
  CreditCard,
  BarChart2,
  Bell,
  Users,
  Car,
  DollarSign,
  ClipboardList,
  Building2,
  Package,
  Phone,
  Handshake,
  UserMinus,
  TrendingUp,
  Scale,
  Clock,
  Database,
  Activity,
  Plug,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KPICard } from "@/components/ui/kpi-card";
import { useToast } from "@/hooks/use-toast";

// ─── Mock data ────────────────────────────────────────────────────────────────

const syncLogs = [];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyncItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
}

const statusColor = (status: string) => {
  switch (status) {
    case "Sucesso":
      return "default";
    case "Erro":
      return "destructive";
    case "Parcial":
      return "secondary";
    default:
      return "secondary";
  }
};

const statusIcon = (status: string) => {
  switch (status) {
    case "Sucesso":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "Erro":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "Parcial":
      return <AlertCircle className="h-4 w-4 text-warning" />;
    default:
      return null;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const Integracoes = () => {
  const { toast } = useToast();
  const [configOpen, setConfigOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // GIA config state (mock)
  const [giaUrl, setGiaUrl] = useState("https://gia.grupowalk.com.br/api");
  const [giaToken, setGiaToken] = useState("••••••••••••••••••••••••••••");
  const [syncInterval, setSyncInterval] = useState("30min");
  const [syncDirection, setSyncDirection] = useState("bidirectional");
  const [giaConnected] = useState(true);

  // Import toggles
  const [imports, setImports] = useState<SyncItem[]>([
    { id: "associados", label: "Associados", description: "Nome, CPF, email, telefone, status, plano", icon: Users, enabled: true },
    { id: "veiculos", label: "Veículos", description: "Placa, modelo, ano (vinculado ao associado)", icon: Car, enabled: true },
    { id: "boletos", label: "Boletos / Financeiro", description: "Valores, vencimentos, status de pagamento", icon: DollarSign, enabled: true },
    { id: "sinistros", label: "Sinistros", description: "Ocorrências vinculadas ao associado", icon: ClipboardList, enabled: false },
    { id: "cooperativas", label: "Cooperativas / Regionais", description: "Estrutura organizacional", icon: Building2, enabled: true },
    { id: "produtos", label: "Produtos / Planos", description: "Tipos de proteção disponíveis", icon: Package, enabled: true },
  ]);

  // Export toggles
  const [exports, setExports] = useState<SyncItem[]>([
    { id: "ligacoes", label: "Ligações realizadas", description: "Registro de contatos feitos", icon: Phone, enabled: true },
    { id: "acordos", label: "Acordos de cobrança", description: "Negociações fechadas", icon: Handshake, enabled: true },
    { id: "cancelamentos", label: "Cancelamentos", description: "Status de cancelamento", icon: UserMinus, enabled: true },
    { id: "acoes", label: "Ações de cobrança", description: "Histórico de ações tomadas", icon: TrendingUp, enabled: false },
    { id: "negativacoes", label: "Negativações", description: "Registros de SPC/Serasa", icon: Scale, enabled: true },
  ]);

  const toggleImport = (id: string) => {
    setImports((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const toggleExport = (id: string) => {
    setExports((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    await new Promise((r) => setTimeout(r, 1500));
    setTestingConnection(false);
    toast({
      title: "Conexão bem-sucedida",
      description: "GIA respondeu em 320ms. Credenciais válidas.",
    });
  };

  const handleSaveConfig = () => {
    setConfigOpen(false);
    toast({
      title: "Configurações salvas",
      description: "As configurações da integração GIA foram atualizadas.",
    });
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSyncing(false);
    toast({
      title: "Sincronização iniciada",
      description: "Sincronização com o GIA iniciada. Você será notificado ao concluir.",
    });
  };

  const enabledImports = imports.filter((i) => i.enabled).length;
  const enabledExports = exports.filter((e) => e.enabled).length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">Integrações</h1>
        <p className="text-sm text-muted-foreground">Gerencie conexões com sistemas externos</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Integrações"
          value="0"
          change={`${enabledImports + enabledExports} sincronizações habilitadas`}
          changeType="positive"
          icon={Plug}
          gradient="primary"
        />
        <KPICard
          title="Última Sincronização"
          value="—"
          change="Sem dados"
          changeType="positive"
          icon={Clock}
          gradient="success"
        />
        <KPICard
          title="Registros Sincronizados"
          value="0"
          change="Nas últimas 24h"
          changeType="positive"
          icon={Database}
          gradient="primary"
        />
        <KPICard
          title="Erros Pendentes"
          value="0"
          change="Nenhum erro"
          changeType="positive"
          icon={AlertCircle}
          gradient="danger"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="gia">GIA</TabsTrigger>
          <TabsTrigger value="log">Log de Sincronização</TabsTrigger>
        </TabsList>

        {/* ── TAB: Visão Geral ─────────────────────────────────────────────── */}
        <TabsContent value="visao-geral" className="space-y-6 mt-4">

          {/* GIA Card — destaque */}
          <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-blue-500/5">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="font-heading text-xl">GIA -- Gestão Integrada de Associações</CardTitle>
                      <Badge
                        className={
                          giaConnected
                            ? "bg-success/10 text-success border-success/30"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        }
                        variant="outline"
                      >
                        {giaConnected ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Desconectado</>
                        )}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      Sistema de gestão de associados, veículos, sinistros e financeiro — Grupo WALK
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                  <Button size="sm" onClick={handleSyncNow} disabled={syncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Sincronizando..." : "Sincronizar Agora"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <Activity className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-xs text-muted-foreground">Última sincronização</p>
                    <p className="font-medium text-sm">28/03/2026 às 21:45</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Intervalo</p>
                    <p className="font-medium text-sm">A cada 30 minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Direção</p>
                    <p className="font-medium text-sm">Bidirecional</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outras integrações futuras */}
          <div>
            <h2 className="font-heading text-lg font-semibold mb-3">Outras Integrações</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Mail, label: "Email (SMTP)", description: "Disparos de email automatizados para cobrança" },
                { icon: MessageSquare, label: "WhatsApp API", description: "Envio de mensagens de cobrança via WhatsApp" },
                { icon: CreditCard, label: "Gateway de Pagamento", description: "Geração de boletos e PIX integrados" },
                { icon: BarChart2, label: "Power BI", description: "Exportação de dados para dashboards analíticos" },
                { icon: Bell, label: "Notificações Push", description: "Alertas em tempo real para colaboradores" },
              ].map((item) => (
                <Card key={item.label} className="opacity-70 border-dashed">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <Badge variant="secondary" className="text-xs">Em breve</Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{item.label}</CardTitle>
                    <CardDescription className="text-xs">{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB: GIA ─────────────────────────────────────────────────────── */}
        <TabsContent value="gia" className="space-y-6 mt-4">

          {/* Importação: GIA → CollectPro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                GIA → CollectPro
              </CardTitle>
              <CardDescription>
                Dados importados do GIA para o CollectPro. Ative ou desative cada módulo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {imports.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.enabled ? (
                      <span className="text-xs text-success font-medium hidden sm:inline">Ativo</span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Inativo</span>
                    )}
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={() => toggleImport(item.id)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Exportação: CollectPro → GIA */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                CollectPro → GIA
              </CardTitle>
              <CardDescription>
                Dados exportados do CollectPro para o GIA. Ative ou desative cada módulo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {exports.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.enabled ? (
                      <span className="text-xs text-success font-medium hidden sm:inline">Ativo</span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Inativo</span>
                    )}
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={() => toggleExport(item.id)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Log ─────────────────────────────────────────────────────── */}
        <TabsContent value="log" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Log de Sincronização
              </CardTitle>
              <CardDescription>
                Histórico das últimas sincronizações com o GIA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.dataHora}</TableCell>
                      <TableCell>
                        <Badge
                          variant={log.tipo === "Importação" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {log.tipo === "Importação" ? (
                            <><Database className="h-3 w-3 mr-1" />{log.tipo}</>
                          ) : (
                            <><Activity className="h-3 w-3 mr-1" />{log.tipo}</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.modulo}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {log.registros.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {statusIcon(log.status)}
                          <span
                            className={`text-sm font-medium ${
                              log.status === "Sucesso"
                                ? "text-success"
                                : log.status === "Erro"
                                ? "text-destructive"
                                : "text-warning"
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {log.duracao}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Configurar GIA ──────────────────────────────────────────── */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Configurar Integração GIA
            </DialogTitle>
            <DialogDescription>
              Configure a conexão com o GIA — Gestão Integrada de Associações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="gia-url">URL do GIA</Label>
              <Input
                id="gia-url"
                type="url"
                value={giaUrl}
                onChange={(e) => setGiaUrl(e.target.value)}
                placeholder="https://gia.grupowalk.com.br/api"
              />
              <p className="text-xs text-muted-foreground">Endpoint base da API do GIA</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gia-token">API Key / Token</Label>
              <Input
                id="gia-token"
                type="password"
                value={giaToken}
                onChange={(e) => setGiaToken(e.target.value)}
                placeholder="Insira o token de autenticação"
              />
              <p className="text-xs text-muted-foreground">Token de acesso gerado no painel do GIA</p>
            </div>

            <div className="space-y-2">
              <Label>Intervalo de Sincronização</Label>
              <Select value={syncInterval} onValueChange={setSyncInterval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5min">A cada 5 minutos</SelectItem>
                  <SelectItem value="15min">A cada 15 minutos</SelectItem>
                  <SelectItem value="30min">A cada 30 minutos</SelectItem>
                  <SelectItem value="1h">A cada 1 hora</SelectItem>
                  <SelectItem value="6h">A cada 6 horas</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Direção da Sincronização</Label>
              <Select value={syncDirection} onValueChange={setSyncDirection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidirectional">Bidirecional</SelectItem>
                  <SelectItem value="import-only">Somente Importar (GIA → CollectPro)</SelectItem>
                  <SelectItem value="export-only">Somente Exportar (CollectPro → GIA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="w-full sm:w-auto"
            >
              {testingConnection ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Testando...</>
              ) : (
                <><Activity className="h-4 w-4 mr-2" /> Testar Conexão</>
              )}
            </Button>
            <Button onClick={handleSaveConfig} className="w-full sm:w-auto">
              Salvar Configurações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Integracoes;

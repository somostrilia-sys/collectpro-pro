import { useState } from "react";
import {
  Shield, Plug, Database, Activity, MessageSquare, Smartphone, Copy,
  QrCode, Plus, UserCog, Loader2, CheckCircle2, Settings, RefreshCw,
  FileSignature, Car, Search, Camera, Brain, CreditCard, Mail,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { KPICard } from "@/components/ui/kpi-card";
import { useToast } from "@/hooks/use-toast";
import {
  useWhatsAppInstances, useSaveInstance, useInstancesRealtime, useWebhookUrls,
} from "@/hooks/useWhatsApp";
import { InstanceCard } from "@/components/whatsapp/InstanceCard";
import { QRConnect } from "@/components/whatsapp/QRConnect";
import { MetaTemplatesManager } from "@/components/whatsapp/meta/MetaTemplatesManager";
import { MetaBusinessProfile } from "@/components/whatsapp/meta/MetaBusinessProfile";
import { MetaBlocksManager } from "@/components/whatsapp/meta/MetaBlocksManager";
import { MetaAnalyticsDashboard } from "@/components/whatsapp/meta/MetaAnalyticsDashboard";
import type { WhatsAppInstance } from "@/types/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Integracoes = () => {
  const { toast } = useToast();
  useInstancesRealtime();
  const { data: instances = [], isLoading } = useWhatsAppInstances();
  const saveInst = useSaveInstance();
  const webhooks = useWebhookUrls();

  const [qrInstance, setQrInstance] = useState<WhatsAppInstance | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColaboradorId, setNewColaboradorId] = useState<string>("");

  // Meta config edit
  const metaInst = instances.find((i) => i.tipo === "meta_oficial");
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaCfg, setMetaCfg] = useState({
    waba_id: "", phone_number_id: "", access_token: "", app_secret: "", verify_token: "",
  });

  const openMetaDialog = () => {
    if (metaInst?.meta_config) {
      setMetaCfg({
        waba_id: metaInst.meta_config.waba_id || "",
        phone_number_id: metaInst.meta_config.phone_number_id || "",
        access_token: metaInst.meta_config.access_token || "",
        app_secret: metaInst.meta_config.app_secret || "",
        verify_token: metaInst.meta_config.verify_token || "",
      });
    }
    setMetaOpen(true);
  };

  const saveMeta = async () => {
    if (!metaInst) return;
    await saveInst.mutateAsync({ id: metaInst.id, meta_config: metaCfg });
    toast({ title: "Meta configurado" });
    setMetaOpen(false);
  };

  // Colaboradores pra dropdown
  const { data: colaboradores = [] } = useQuery<{ id: string; full_name: string }[]>({
    queryKey: ["colaboradores-basic"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("id, full_name").order("full_name");
      return (data || []) as any;
    },
  });

  const central = instances.find((i) => i.tipo === "central");
  const colaboradoresInst = instances.filter((i) => i.tipo === "colaborador");

  const addColaboradorInstance = async () => {
    if (!newName || !newColaboradorId) {
      toast({ title: "Preencha nome e colaborador", variant: "destructive" });
      return;
    }
    await saveInst.mutateAsync({
      nome: newName,
      tipo: "colaborador",
      servidor_url: "https://trilhoassist.uazapi.com",
      colaborador_id: newColaboradorId,
      status: "disconnected",
      ativo: true,
    });
    setAddOpen(false);
    setNewName("");
    setNewColaboradorId("");
    toast({ title: "Instância criada", description: "Clique em Conectar pra gerar QR" });
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copiada" });
  };

  const colaboradorNome = (id: string | null) =>
    colaboradores.find((c) => c.id === id)?.full_name;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalConnected = instances.filter((i) => i.status === "connected").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">Integrações</h1>
        <p className="text-sm text-muted-foreground">Configure WhatsApp, GIA e outras integrações</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Instâncias WhatsApp"
          value={String(instances.length)}
          change={`${totalConnected} conectadas`}
          changeType="positive"
          icon={MessageSquare}
          gradient="success"
        />
        <KPICard
          title="Central uazapi"
          value={central?.status === "connected" ? "On" : "Off"}
          change={central?.telefone || "Não conectada"}
          changeType={central?.status === "connected" ? "positive" : "neutral"}
          icon={Smartphone}
          gradient="primary"
        />
        <KPICard
          title="Meta Oficial"
          value={metaInst?.meta_config?.phone_number_id ? "Config" : "Pend"}
          change={metaInst?.meta_config?.phone_number_id ? "Credenciais OK" : "Falta preencher"}
          changeType={metaInst?.meta_config?.phone_number_id ? "positive" : "neutral"}
          icon={Shield}
          gradient="primary"
        />
        <KPICard
          title="Colaboradores"
          value={String(colaboradoresInst.length)}
          change={`${colaboradoresInst.filter((i) => i.status === "connected").length} online`}
          changeType="positive"
          icon={UserCog}
          gradient="success"
        />
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList>
          <TabsTrigger value="whatsapp"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />WhatsApp</TabsTrigger>
          <TabsTrigger value="gia"><Database className="h-3.5 w-3.5 mr-1.5" />GIA</TabsTrigger>
          <TabsTrigger value="outras"><Plug className="h-3.5 w-3.5 mr-1.5" />Outras</TabsTrigger>
        </TabsList>

        {/* ═══════ WhatsApp ═══════ */}
        <TabsContent value="whatsapp" className="space-y-6 mt-4">
          <Tabs defaultValue="uazapi">
            <TabsList>
              <TabsTrigger value="uazapi">uazapi (multi-instância)</TabsTrigger>
              <TabsTrigger value="meta">Meta · Config</TabsTrigger>
              <TabsTrigger value="meta-templates">Meta · Templates</TabsTrigger>
              <TabsTrigger value="meta-profile">Meta · Perfil</TabsTrigger>
              <TabsTrigger value="meta-blocks">Meta · Bloqueios</TabsTrigger>
              <TabsTrigger value="meta-analytics">Meta · Analytics</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            </TabsList>

            {/* ─── uazapi ─── */}
            <TabsContent value="uazapi" className="space-y-5 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="h-4 w-4" /> Central
                  </CardTitle>
                  <CardDescription>
                    Número principal do sistema. Usada em disparos automáticos da régua.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {central ? (
                    <InstanceCard instance={central} onConnect={setQrInstance} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma instância central configurada.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCog className="h-4 w-4" /> Instâncias dos Colaboradores
                    </CardTitle>
                    <CardDescription>
                      Cada cobrador conecta o próprio zap pessoal. Usado pra conversa 1-a-1.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {colaboradoresInst.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhuma instância de colaborador ainda. Clique em "Adicionar" pra criar.
                    </p>
                  ) : (
                    colaboradoresInst.map((i) => (
                      <InstanceCard
                        key={i.id}
                        instance={i}
                        colaboradorNome={colaboradorNome(i.colaborador_id) || undefined}
                        onConnect={setQrInstance}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Meta ─── */}
            <TabsContent value="meta" className="space-y-5 mt-4">
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-blue-500/5">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          Meta Cloud API — Número Oficial
                          {metaInst?.meta_config?.phone_number_id ? (
                            <Badge className="bg-success/10 text-success border-success/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Configurado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-warning border-warning/30">
                              Pendente
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          API oficial Meta (WABA) — templates aprovados, campanhas, caixa central.
                          Webhook único compartilhado com outros sistemas Walk.
                        </CardDescription>
                      </div>
                    </div>
                    <Button size="sm" onClick={openMetaDialog}>
                      <Settings className="h-3.5 w-3.5 mr-1.5" /> Configurar
                    </Button>
                  </div>
                </CardHeader>
                {metaInst?.meta_config?.phone_number_id && (
                  <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <InfoLine label="WABA ID" value={metaInst.meta_config.waba_id || "—"} />
                    <InfoLine label="Phone Number ID" value={metaInst.meta_config.phone_number_id || "—"} />
                    <InfoLine label="Telefone" value={metaInst.telefone || "—"} />
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Instruções</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>No painel do Meta for Developers &gt; seu App &gt; WhatsApp &gt; Configuração:</p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
                    <li>Cole a <strong>URL do Webhook</strong> (aba Webhooks ao lado)</li>
                    <li>Defina um <strong>Verify Token</strong> qualquer (qualquer string secreta)</li>
                    <li>Assine eventos: <code className="text-xs bg-muted px-1 rounded">messages</code>, <code className="text-xs bg-muted px-1 rounded">message_status</code></li>
                    <li>Volte aqui e clique em <strong>Configurar</strong> pra salvar as credenciais</li>
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Meta · Templates ─── */}
            <TabsContent value="meta-templates" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSignature className="h-4 w-4" /> Templates Meta aprovados
                  </CardTitle>
                  <CardDescription>
                    Criar/listar/sincronizar templates com a Meta. Obrigatórios pra enviar fora da janela de 24h.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MetaTemplatesManager instanceId={metaInst?.id ?? null} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Meta · Perfil ─── */}
            <TabsContent value="meta-profile" className="space-y-4 mt-4">
              <MetaBusinessProfile instanceId={metaInst?.id ?? null} />
            </TabsContent>

            {/* ─── Meta · Bloqueios ─── */}
            <TabsContent value="meta-blocks" className="space-y-4 mt-4">
              <MetaBlocksManager instanceId={metaInst?.id ?? null} />
            </TabsContent>

            {/* ─── Meta · Analytics ─── */}
            <TabsContent value="meta-analytics" className="space-y-4 mt-4">
              <MetaAnalyticsDashboard instanceId={metaInst?.id ?? null} />
            </TabsContent>

            {/* ─── Webhooks ─── */}
            <TabsContent value="webhooks" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">URLs dos Webhooks</CardTitle>
                  <CardDescription>
                    Cole nas configurações do provedor (Meta ou uazapi).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <WebhookRow label="Meta Cloud API" url={webhooks.meta} onCopy={copyUrl} />
                  <WebhookRow label="uazapi (trilhoassist)" url={webhooks.uazapi} onCopy={copyUrl} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ═══════ GIA ═══════ */}
        <TabsContent value="gia" className="space-y-4 mt-4">
          <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-blue-500/5">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">GIA — Gestão Integrada</CardTitle>
                  <CardDescription>
                    Sync de associados, veículos, boletos, cooperativas.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Integração GIA mantida. Configuração via env vars no edge functions.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ Outras ═══════ */}
        <TabsContent value="outras" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Mail, label: "Email (SMTP)", desc: "Disparos de email" },
              { icon: CreditCard, label: "Gateway Pagamento", desc: "Boleto e PIX" },
              { icon: FileSignature, label: "Autentique", desc: "Assinatura digital" },
              { icon: Car, label: "FIPE", desc: "Tabela preços veículos" },
              { icon: Search, label: "Consulta Placa", desc: "Info por placa" },
              { icon: Camera, label: "IA Vistoria", desc: "Análise fotos" },
              { icon: Brain, label: "IA Cotação", desc: "Análise liberação" },
            ].map((item) => (
              <Card key={item.label} className="opacity-70 border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Badge variant="secondary" className="text-xs">Em breve</Badge>
                  </div>
                  <CardTitle className="text-sm mt-2">{item.label}</CardTitle>
                  <CardDescription className="text-xs">{item.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* QR Dialog */}
      <QRConnect
        instance={qrInstance}
        open={!!qrInstance}
        onOpenChange={(v) => { if (!v) setQrInstance(null); }}
      />

      {/* Add colaborador instance */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova instância de colaborador</DialogTitle>
            <DialogDescription>
              Crie uma instância uazapi pro zap pessoal de um colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome da instância</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: João - Cobrança"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Colaborador</Label>
              <Select value={newColaboradorId} onValueChange={setNewColaboradorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name || c.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={addColaboradorInstance} disabled={saveInst.isPending}>
              {saveInst.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meta config dialog */}
      <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Configurar Meta Cloud API
            </DialogTitle>
            <DialogDescription>
              Credenciais do WhatsApp Business API do Meta for Developers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>WABA ID</Label>
              <Input value={metaCfg.waba_id} onChange={(e) => setMetaCfg({ ...metaCfg, waba_id: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number ID</Label>
              <Input value={metaCfg.phone_number_id} onChange={(e) => setMetaCfg({ ...metaCfg, phone_number_id: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Access Token (System User)</Label>
              <Input type="password" value={metaCfg.access_token} onChange={(e) => setMetaCfg({ ...metaCfg, access_token: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>App Secret</Label>
              <Input type="password" value={metaCfg.app_secret} onChange={(e) => setMetaCfg({ ...metaCfg, app_secret: e.target.value })} />
              <p className="text-[10px] text-muted-foreground">Usado pra validar assinatura HMAC do webhook</p>
            </div>
            <div className="space-y-1.5">
              <Label>Verify Token</Label>
              <Input value={metaCfg.verify_token} onChange={(e) => setMetaCfg({ ...metaCfg, verify_token: e.target.value })} placeholder="qualquer-string-secreta" />
              <p className="text-[10px] text-muted-foreground">Cole o mesmo valor no Meta ao cadastrar o webhook</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetaOpen(false)}>Cancelar</Button>
            <Button onClick={saveMeta} disabled={saveInst.isPending}>
              {saveInst.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function WebhookRow({ label, url, onCopy }: { label: string; url: string; onCopy: (u: string) => void }) {
  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20">
      <Badge variant="outline" className="shrink-0">{label}</Badge>
      <code className="text-xs flex-1 truncate text-muted-foreground">{url}</code>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onCopy(url)}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-card border">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="font-mono text-xs truncate">{value}</p>
      </div>
    </div>
  );
}

export default Integracoes;

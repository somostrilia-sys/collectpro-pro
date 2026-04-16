import { useState } from "react";
import { Bell, AlertTriangle, Clock, FileWarning, CheckCircle, XCircle, Car, Plus, Loader2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useNotificacoesRetirada,
  useCriarNotificacaoRetirada,
  useAtualizarNotificacaoRetirada,
  type NotificacaoRetirada,
} from "@/hooks/useCollectData";

const statusBadge = (s: string) => {
  if (s === "pendente") return <Badge className="bg-warning/10 text-warning border-0">Pendente</Badge>;
  if (s === "em_andamento") return <Badge className="bg-primary/10 text-primary border-0">Em Andamento</Badge>;
  if (s === "resolvido") return <Badge className="bg-success/10 text-success border-0">Resolvido</Badge>;
  return <Badge variant="secondary">{s}</Badge>;
};

function formatDateTime(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function NotificacoesInternas() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: retiradas = [], isLoading } = useNotificacoesRetirada();
  const criarRetirada = useCriarNotificacaoRetirada();
  const atualizarRetirada = useAtualizarNotificacaoRetirada();

  const [dialogNova, setDialogNova] = useState(false);
  const [dialogDetalhe, setDialogDetalhe] = useState(false);
  const [selecionada, setSelecionada] = useState<NotificacaoRetirada | null>(null);

  const [novaPlaca, setNovaPlaca] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novasEtapas, setNovasEtapas] = useState("");

  const pendentes = retiradas.filter((r) => r.status === "pendente");
  const emAndamento = retiradas.filter((r) => r.status === "em_andamento");
  const resolvidas = retiradas.filter((r) => r.status === "resolvido");

  const handleCriar = () => {
    if (!novaPlaca.trim()) {
      toast({ title: "Placa é obrigatória", variant: "destructive" });
      return;
    }
    criarRetirada.mutate(
      { placa: novaPlaca.trim().toUpperCase(), descricao: novaDescricao, proximos_passos: novasEtapas, responsavel_id: user?.id },
      {
        onSuccess: () => {
          toast({ title: "Notificação criada!" });
          setDialogNova(false);
          setNovaPlaca("");
          setNovaDescricao("");
          setNovasEtapas("");
        },
        onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleMudarStatus = (id: string, status: string) => {
    atualizarRetirada.mutate(
      { id, status },
      {
        onSuccess: () => {
          toast({ title: `Status atualizado para ${status === "em_andamento" ? "Em Andamento" : "Resolvido"}` });
          setDialogDetalhe(false);
        },
      }
    );
  };

  const abrirDetalhe = (n: NotificacaoRetirada) => {
    setSelecionada(n);
    setDialogDetalhe(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Notificações e Retiradas</h1>
          <p className="text-sm text-muted-foreground">Gerencie retiradas de veículos e notificações da equipe</p>
        </div>
        <Button onClick={() => setDialogNova(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Retirada
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-warning/10">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendentes.length}</p>
              <p className="text-sm text-muted-foreground">Retiradas Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-primary/10">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{emAndamento.length}</p>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolvidas.length}</p>
              <p className="text-sm text-muted-foreground">Resolvidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="andamento">Em Andamento ({emAndamento.length})</TabsTrigger>
          <TabsTrigger value="resolvidas">Resolvidas ({resolvidas.length})</TabsTrigger>
          <TabsTrigger value="todas">Todas ({retiradas.length})</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando...
          </div>
        ) : (
          ["pendentes", "andamento", "resolvidas", "todas"].map((tab) => {
            const items =
              tab === "pendentes" ? pendentes
                : tab === "andamento" ? emAndamento
                : tab === "resolvidas" ? resolvidas
                : retiradas;
            return (
              <TabsContent key={tab} value={tab} className="space-y-3">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
                    <Bell className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Nenhuma notificação encontrada.</p>
                  </div>
                ) : items.map((n) => (
                  <Card key={n.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow ${n.status === "pendente" ? "border-l-4 border-l-warning" : n.status === "em_andamento" ? "border-l-4 border-l-primary" : ""}`}>
                    <CardContent className="pt-4 pb-4 flex items-start gap-4">
                      <div className="rounded-xl p-2 bg-muted/50">
                        <Car className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">Retirada — {n.placa || "Sem placa"}</h3>
                          {statusBadge(n.status)}
                        </div>
                        {n.associados?.nome && (
                          <p className="text-sm font-medium">{n.associados.nome}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{n.descricao || "Sem descrição"}</p>
                        {n.proximos_passos && (
                          <p className="text-xs text-muted-foreground mt-1">Próximos passos: {n.proximos_passos}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => abrirDetalhe(n)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {n.status === "pendente" && (
                          <Button variant="ghost" size="sm" onClick={() => handleMudarStatus(n.id, "em_andamento")}>
                            <CheckCircle className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {n.status === "em_andamento" && (
                          <Button variant="ghost" size="sm" onClick={() => handleMudarStatus(n.id, "resolvido")}>
                            <CheckCircle className="h-4 w-4 text-success" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            );
          })
        )}
      </Tabs>

      {/* Dialog: Nova Retirada */}
      <Dialog open={dialogNova} onOpenChange={setDialogNova}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Notificação de Retirada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Placa do Veículo *</Label>
              <Input placeholder="ABC-1D23" value={novaPlaca} onChange={(e) => setNovaPlaca(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea placeholder="Motivo da retirada, observações..." value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Próximos Passos</Label>
              <Textarea placeholder="O que precisa ser feito..." value={novasEtapas} onChange={(e) => setNovasEtapas(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNova(false)}>Cancelar</Button>
            <Button onClick={handleCriar} disabled={criarRetirada.isPending}>
              {criarRetirada.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Criar Notificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhe */}
      <Dialog open={dialogDetalhe} onOpenChange={setDialogDetalhe}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Retirada</DialogTitle>
          </DialogHeader>
          {selecionada && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Placa</p>
                  <p className="font-semibold">{selecionada.placa || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  {statusBadge(selecionada.status)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Associado</p>
                  <p className="font-medium">{selecionada.associados?.nome || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Responsável</p>
                  <p className="font-medium">{selecionada.profiles?.full_name || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Descrição</p>
                  <p>{selecionada.descricao || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Próximos Passos</p>
                  <p>{selecionada.proximos_passos || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Criado em</p>
                  <p>{formatDateTime(selecionada.created_at)}</p>
                </div>
                {selecionada.resolvido_em && (
                  <div>
                    <p className="text-muted-foreground text-xs">Resolvido em</p>
                    <p>{formatDateTime(selecionada.resolvido_em)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDetalhe(false)}>Fechar</Button>
            {selecionada?.status === "pendente" && (
              <Button onClick={() => handleMudarStatus(selecionada.id, "em_andamento")}>Iniciar Atendimento</Button>
            )}
            {selecionada?.status === "em_andamento" && (
              <Button className="bg-success hover:bg-success/90" onClick={() => handleMudarStatus(selecionada.id, "resolvido")}>Marcar como Resolvido</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

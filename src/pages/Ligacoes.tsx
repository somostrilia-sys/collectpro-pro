import { useState } from "react";
import { Plus, Search, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLigacoes, useRegistrarLigacao, type Ligacao } from "@/hooks/useCollectData";

function formatDuracao(seg: number) {
  if (!seg) return "0s";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const resultadoBadge = (r: string) => {
  if (r === "atendeu") return <Badge className="bg-success/10 text-success border-0 text-xs">Atendeu</Badge>;
  if (r === "sem_resposta") return <Badge className="bg-warning/10 text-warning border-0 text-xs">Sem Resposta</Badge>;
  if (r === "ocupado") return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Ocupado</Badge>;
  if (r === "caixa_postal") return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Caixa Postal</Badge>;
  if (r === "acordo") return <Badge className="bg-primary/10 text-primary border-0 text-xs">Acordo</Badge>;
  if (r === "recusa") return <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Recusa</Badge>;
  return <Badge variant="secondary" className="text-xs">{r}</Badge>;
};

const resultadoIcon = (r: string) => {
  if (r === "atendeu" || r === "acordo") return <PhoneIncoming className="h-4 w-4 text-success" />;
  if (r === "sem_resposta" || r === "caixa_postal") return <PhoneMissed className="h-4 w-4 text-warning" />;
  if (r === "recusa") return <PhoneMissed className="h-4 w-4 text-destructive" />;
  return <Phone className="h-4 w-4 text-muted-foreground" />;
};

export default function Ligacoes() {
  const { toast } = useToast();
  const { user, fullName } = useAuth();
  const hoje = new Date().toISOString().slice(0, 10);

  const [search, setSearch] = useState("");
  const [dataFilter, setDataFilter] = useState(hoje);
  const [dialogNova, setDialogNova] = useState(false);

  // Form
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoResultado, setNovoResultado] = useState("sem_resposta");
  const [novoDuracao, setNovoDuracao] = useState("");
  const [novoObs, setNovoObs] = useState("");

  const { data: ligacoes = [], isLoading } = useLigacoes({ data: dataFilter });
  const registrar = useRegistrarLigacao();

  const filtered = ligacoes.filter((l) => {
    const term = search.toLowerCase();
    return !term ||
      (l.associados?.nome || "").toLowerCase().includes(term) ||
      (l.telefone || "").includes(term) ||
      (l.observacao || "").toLowerCase().includes(term);
  });

  // KPIs do dia
  const totalDia = filtered.length;
  const atendidas = filtered.filter((l) => l.resultado === "atendeu" || l.resultado === "acordo").length;
  const semResposta = filtered.filter((l) => l.resultado === "sem_resposta" || l.resultado === "caixa_postal").length;
  const tempoTotal = filtered.reduce((s, l) => s + l.duracao_segundos, 0);

  const handleRegistrar = () => {
    if (!novoTelefone.trim()) {
      toast({ title: "Telefone é obrigatório", variant: "destructive" });
      return;
    }
    registrar.mutate(
      {
        colaborador_id: user?.id,
        telefone: novoTelefone.trim(),
        duracao_segundos: parseInt(novoDuracao) || 0,
        resultado: novoResultado,
        observacao: novoObs || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Ligação registrada!" });
          setDialogNova(false);
          setNovoTelefone("");
          setNovoResultado("sem_resposta");
          setNovoDuracao("");
          setNovoObs("");
        },
        onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Registro de Ligações</h1>
          <p className="text-sm text-muted-foreground">Histórico de chamadas realizadas diariamente pela equipe</p>
        </div>
        <Button onClick={() => setDialogNova(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Registrar Ligação
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-primary/10">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDia}</p>
              <p className="text-sm text-muted-foreground">Ligações Hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-success/10">
              <PhoneIncoming className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{atendidas}</p>
              <p className="text-sm text-muted-foreground">Atendidas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-warning/10">
              <PhoneMissed className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{semResposta}</p>
              <p className="text-sm text-muted-foreground">Sem Resposta</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatDuracao(tempoTotal)}</p>
              <p className="text-sm text-muted-foreground">Tempo Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, telefone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input type="date" className="w-[180px]" value={dataFilter} onChange={(e) => setDataFilter(e.target.value)} />
      </div>

      {/* Tabela */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Associado</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma ligação registrada{dataFilter === hoje ? " hoje" : " nesta data"}.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{resultadoIcon(l.resultado)}</TableCell>
                      <TableCell className="font-medium">{l.telefone || "—"}</TableCell>
                      <TableCell className="text-sm">{l.associados?.nome || "—"}</TableCell>
                      <TableCell className="text-sm">{l.profiles?.full_name || "—"}</TableCell>
                      <TableCell>{resultadoBadge(l.resultado)}</TableCell>
                      <TableCell className="text-sm">{formatDuracao(l.duracao_segundos)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(l.data_hora)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{l.observacao || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Nova Ligação */}
      <Dialog open={dialogNova} onOpenChange={setDialogNova}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Ligação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Telefone *</Label>
              <Input placeholder="(00) 00000-0000" value={novoTelefone} onChange={(e) => setNovoTelefone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Resultado</Label>
                <Select value={novoResultado} onValueChange={setNovoResultado}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atendeu">Atendeu</SelectItem>
                    <SelectItem value="sem_resposta">Sem Resposta</SelectItem>
                    <SelectItem value="ocupado">Ocupado</SelectItem>
                    <SelectItem value="caixa_postal">Caixa Postal</SelectItem>
                    <SelectItem value="acordo">Acordo</SelectItem>
                    <SelectItem value="recusa">Recusa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duração (segundos)</Label>
                <Input type="number" placeholder="0" value={novoDuracao} onChange={(e) => setNovoDuracao(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea placeholder="Detalhes da ligação..." value={novoObs} onChange={(e) => setNovoObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNova(false)}>Cancelar</Button>
            <Button onClick={handleRegistrar} disabled={registrar.isPending}>
              {registrar.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

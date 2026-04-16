import { useState } from "react";
import { Search, DollarSign, Plus, Loader2, Eye, Calendar, CreditCard, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useHistoricoPagamentos, useRegistrarPagamento, type HistoricoPagamento } from "@/hooks/useCollectData";
import { supabase } from "@/integrations/supabase/client";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const tipoBadge = (tipo: string) => {
  if (tipo === "boleto") return <Badge variant="outline" className="bg-primary/10 text-primary text-xs">Boleto</Badge>;
  if (tipo === "acordo") return <Badge variant="outline" className="bg-success/10 text-success text-xs">Acordo</Badge>;
  if (tipo === "unificado") return <Badge variant="outline" className="bg-warning/10 text-warning text-xs">Unificado</Badge>;
  return <Badge variant="outline" className="text-xs">{tipo}</Badge>;
};

export default function HistoricoPagamentos() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogNovo, setDialogNovo] = useState(false);
  const [dialogDetalhe, setDialogDetalhe] = useState(false);
  const [selecionado, setSelecionado] = useState<HistoricoPagamento | null>(null);

  // Form novo pagamento
  const [novoAssociadoCpf, setNovoAssociadoCpf] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoData, setNovoData] = useState(new Date().toISOString().slice(0, 10));
  const [novoForma, setNovoForma] = useState("pix");
  const [novoTipo, setNovoTipo] = useState("boleto");
  const [novoReferencia, setNovoReferencia] = useState("");
  const [novoObs, setNovoObs] = useState("");

  const { data: pagamentos = [], isLoading } = useHistoricoPagamentos();
  const registrar = useRegistrarPagamento();

  const filtered = pagamentos.filter((p) => {
    const term = search.toLowerCase();
    return !term ||
      (p.associados?.nome || "").toLowerCase().includes(term) ||
      (p.associados?.cpf || "").includes(term) ||
      (p.referencia || "").toLowerCase().includes(term);
  });

  const totalPago = filtered.reduce((s, p) => s + p.valor, 0);

  const handleRegistrar = async () => {
    if (!novoAssociadoCpf.trim() || !novoValor.trim()) {
      toast({ title: "CPF e valor são obrigatórios", variant: "destructive" });
      return;
    }

    // Buscar associado por CPF
    const { data: assoc } = await supabase
      .from("associados")
      .select("id")
      .eq("cpf", novoAssociadoCpf.trim())
      .limit(1)
      .single();

    if (!assoc) {
      toast({ title: "Associado não encontrado", description: "Verifique o CPF informado.", variant: "destructive" });
      return;
    }

    registrar.mutate(
      {
        associado_id: assoc.id,
        tipo: novoTipo,
        valor: parseFloat(novoValor),
        data_pagamento: novoData,
        forma_pagamento: novoForma,
        referencia: novoReferencia || undefined,
        observacao: novoObs || undefined,
        registrado_por: user?.id,
      },
      {
        onSuccess: () => {
          toast({ title: "Pagamento registrado!" });
          setDialogNovo(false);
          setNovoAssociadoCpf("");
          setNovoValor("");
          setNovoReferencia("");
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
          <h1 className="font-heading text-2xl font-bold">Histórico de Pagamentos</h1>
          <p className="text-sm text-muted-foreground">Registro completo de todos os pagamentos, incluindo unificados</p>
        </div>
        <Button onClick={() => setDialogNovo(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Registrar Pagamento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-success/10">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalPago)}</p>
              <p className="text-sm text-muted-foreground">Total Recebido</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-primary/10">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filtered.length}</p>
              <p className="text-sm text-muted-foreground">Total de Pagamentos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-warning/10">
              <CreditCard className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {filtered.length > 0 ? formatCurrency(totalPago / filtered.length) : "R$ 0"}
              </p>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CPF ou referência..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <TableHead>Associado</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.associados?.nome || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.associados?.cpf || "—"}</TableCell>
                      <TableCell>{tipoBadge(p.tipo)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(p.valor)}</TableCell>
                      <TableCell>{formatDate(p.data_pagamento)}</TableCell>
                      <TableCell className="text-sm">{p.forma_pagamento || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.referencia || "—"}</TableCell>
                      <TableCell className="text-sm">{p.profiles?.full_name || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelecionado(p); setDialogDetalhe(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Registrar Pagamento */}
      <Dialog open={dialogNovo} onOpenChange={setDialogNovo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>CPF do Associado *</Label>
              <Input placeholder="000.000.000-00" value={novoAssociadoCpf} onChange={(e) => setNovoAssociadoCpf(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor *</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data Pagamento</Label>
                <Input type="date" value={novoData} onChange={(e) => setNovoData(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={novoTipo} onValueChange={setNovoTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="acordo">Acordo</SelectItem>
                    <SelectItem value="unificado">Unificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Forma de Pagamento</Label>
                <Select value={novoForma} onValueChange={setNovoForma}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Referência</Label>
              <Input placeholder="Código da transação, ID do boleto..." value={novoReferencia} onChange={(e) => setNovoReferencia(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea placeholder="Observações..." value={novoObs} onChange={(e) => setNovoObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovo(false)}>Cancelar</Button>
            <Button onClick={handleRegistrar} disabled={registrar.isPending}>
              {registrar.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhe */}
      <Dialog open={dialogDetalhe} onOpenChange={setDialogDetalhe}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
          </DialogHeader>
          {selecionado && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Associado</p>
                  <p className="font-semibold">{selecionado.associados?.nome || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">CPF</p>
                  <p className="font-medium">{selecionado.associados?.cpf || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor</p>
                  <p className="font-bold text-lg">{formatCurrency(selecionado.valor)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  {tipoBadge(selecionado.tipo)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Forma de Pagamento</p>
                  <p>{selecionado.forma_pagamento || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Data Pagamento</p>
                  <p>{formatDate(selecionado.data_pagamento)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Referência</p>
                  <p>{selecionado.referencia || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Registrado por</p>
                  <p>{selecionado.profiles?.full_name || "—"}</p>
                </div>
                {selecionado.observacao && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Observação</p>
                    <p>{selecionado.observacao}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Registrado em</p>
                  <p>{formatDateTime(selecionado.created_at)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDetalhe(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

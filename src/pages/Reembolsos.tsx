import { useState } from "react";
import { RotateCcw, Search, Eye, FileText, Plus, Copy, Download, Send, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type TipoReembolso = "Integral" | "Parcial";
type StatusReembolso = "Pago" | "Aprovado" | "Aguardando" | "Recusado";

interface TimelineItem { data: string; evento: string; usuario: string; }
interface Reembolso {
  id: number; data: string; associado: string; cpf: string; cooperativa: string;
  valorOriginal: number; valorReembolso: number; tipo: TipoReembolso; motivo: string;
  status: StatusReembolso; atendente: string; pixOuBanco: "pix" | "banco";
  chavePix?: string; banco?: string; agencia?: string; conta?: string;
  timeline: TimelineItem[];
}

const mockData: Reembolso[] = [
  { id: 1, data: "2026-03-10", associado: "Ana Paula Souza", cpf: "123.456.789-00", cooperativa: "COOP-SP", valorOriginal: 850, valorReembolso: 850, tipo: "Integral", motivo: "Cobrança indevida", status: "Pago", atendente: "Carlos Mendes", pixOuBanco: "pix", chavePix: "ana.paula@email.com", timeline: [{ data: "2026-03-08", evento: "Solicitação criada", usuario: "Carlos Mendes" }, { data: "2026-03-09", evento: "Aprovado", usuario: "Gerente" }, { data: "2026-03-10", evento: "Pago", usuario: "Financeiro" }] },
  { id: 2, data: "2026-03-12", associado: "Roberto Lima", cpf: "234.567.890-11", cooperativa: "COOP-RJ", valorOriginal: 1200, valorReembolso: 600, tipo: "Parcial", motivo: "Serviço não prestado", status: "Aprovado", atendente: "Mariana Silva", pixOuBanco: "banco", banco: "Bradesco", agencia: "1234", conta: "56789-0", timeline: [{ data: "2026-03-11", evento: "Solicitação criada", usuario: "Mariana Silva" }, { data: "2026-03-12", evento: "Aprovado", usuario: "Gerente" }] },
  { id: 3, data: "2026-03-15", associado: "Fernanda Costa", cpf: "345.678.901-22", cooperativa: "COOP-MG", valorOriginal: 500, valorReembolso: 500, tipo: "Integral", motivo: "Desistência dentro do prazo", status: "Aguardando", atendente: "João Paulo", pixOuBanco: "pix", chavePix: "11987654321", timeline: [{ data: "2026-03-15", evento: "Solicitação criada", usuario: "João Paulo" }] },
  { id: 4, data: "2026-03-18", associado: "Marcos Oliveira", cpf: "456.789.012-33", cooperativa: "COOP-SP", valorOriginal: 750, valorReembolso: 250, tipo: "Parcial", motivo: "Produto com defeito", status: "Aguardando", atendente: "Carlos Mendes", pixOuBanco: "banco", banco: "Itaú", agencia: "5678", conta: "12345-6", timeline: [{ data: "2026-03-18", evento: "Solicitação criada", usuario: "Carlos Mendes" }] },
  { id: 5, data: "2026-03-20", associado: "Lucia Ferreira", cpf: "567.890.123-44", cooperativa: "COOP-BA", valorOriginal: 320, valorReembolso: 320, tipo: "Integral", motivo: "Erro administrativo", status: "Pago", atendente: "Mariana Silva", pixOuBanco: "pix", chavePix: "lucia@cpf", timeline: [{ data: "2026-03-18", evento: "Solicitação criada", usuario: "Mariana Silva" }, { data: "2026-03-19", evento: "Aprovado", usuario: "Gerente" }, { data: "2026-03-20", evento: "Pago", usuario: "Financeiro" }] },
  { id: 6, data: "2026-03-22", associado: "Paulo Nascimento", cpf: "678.901.234-55", cooperativa: "COOP-RS", valorOriginal: 980, valorReembolso: 490, tipo: "Parcial", motivo: "Cancelamento parcial de plano", status: "Pago", atendente: "João Paulo", pixOuBanco: "banco", banco: "Caixa", agencia: "0007", conta: "98765-4", timeline: [{ data: "2026-03-20", evento: "Solicitação criada", usuario: "João Paulo" }, { data: "2026-03-21", evento: "Aprovado", usuario: "Gerente" }, { data: "2026-03-22", evento: "Pago", usuario: "Financeiro" }] },
  { id: 7, data: "2026-03-25", associado: "Beatriz Santos", cpf: "789.012.345-66", cooperativa: "COOP-SP", valorOriginal: 420, valorReembolso: 420, tipo: "Integral", motivo: "Duplicidade de pagamento", status: "Recusado", atendente: "Carlos Mendes", pixOuBanco: "pix", chavePix: "beatriz@email.com", timeline: [{ data: "2026-03-24", evento: "Solicitação criada", usuario: "Carlos Mendes" }, { data: "2026-03-25", evento: "Recusado — documentação insuficiente", usuario: "Gerente" }] },
];

const motivos = ["Cobrança indevida", "Serviço não prestado", "Produto com defeito", "Duplicidade de pagamento", "Desistência dentro do prazo", "Cancelamento parcial de plano", "Erro administrativo"];
const cooperativas = ["COOP-SP", "COOP-RJ", "COOP-MG", "COOP-BA", "COOP-RS"];
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().split("T")[0];

function StatusBadge({ s }: { s: StatusReembolso }) {
  const map: Record<StatusReembolso, string> = {
    Pago: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    Aprovado: "bg-green-100 text-green-700 hover:bg-green-100",
    Aguardando: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
    Recusado: "bg-red-100 text-red-700 hover:bg-red-100",
  };
  return <Badge className={map[s]}>{s}</Badge>;
}

function TipoBadge({ t }: { t: TipoReembolso }) {
  return (
    <Badge className={t === "Integral" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : "bg-orange-100 text-orange-700 hover:bg-orange-100"}>
      {t}
    </Badge>
  );
}

export default function Reembolsos() {
  const { toast } = useToast();
  const [dados, setDados] = useState<Reembolso[]>(mockData);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCoop, setFiltroCoop] = useState("todas");
  const [dlgNovo, setDlgNovo] = useState(false);
  const [dlgDetalhe, setDlgDetalhe] = useState<Reembolso | null>(null);
  const [dlgTermo, setDlgTermo] = useState<Reembolso | null>(null);
  const [fAssociado, setFAssociado] = useState("");
  const [fCpf, setFCpf] = useState("");
  const [fCoop, setFCoop] = useState("");
  const [fTipo, setFTipo] = useState<TipoReembolso>("Integral");
  const [fValorOrig, setFValorOrig] = useState("");
  const [fValorReemb, setFValorReemb] = useState("");
  const [fMotivo, setFMotivo] = useState("");
  const [fAtendente, setFAtendente] = useState("");
  const [fPixBanco, setFPixBanco] = useState<"pix" | "banco">("pix");
  const [fChavePix, setFChavePix] = useState("");
  const [fBanco, setFBanco] = useState("");
  const [fAgencia, setFAgencia] = useState("");
  const [fConta, setFConta] = useState("");

  const filtrados = dados.filter((r) => {
    const q = busca.toLowerCase();
    const matchQ = !q || r.associado.toLowerCase().includes(q) || r.cpf.includes(q);
    const matchS = filtroStatus === "todos" || r.status === filtroStatus;
    const matchT = filtroTipo === "todos" || r.tipo === filtroTipo;
    const matchC = filtroCoop === "todas" || r.cooperativa === filtroCoop;
    return matchQ && matchS && matchT && matchC;
  });

  const resetForm = () => {
    setFAssociado(""); setFCpf(""); setFCoop(""); setFValorOrig(""); setFValorReemb("");
    setFMotivo(""); setFAtendente(""); setFChavePix(""); setFBanco(""); setFAgencia(""); setFConta("");
  };

  const handleSolicitar = () => {
    if (!fAssociado || !fCpf || !fMotivo || !fValorOrig || !fValorReemb || !fAtendente) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const novo: Reembolso = {
      id: Date.now(), data: today(), associado: fAssociado, cpf: fCpf,
      cooperativa: fCoop || "COOP-SP", valorOriginal: parseFloat(fValorOrig),
      valorReembolso: parseFloat(fValorReemb), tipo: fTipo, motivo: fMotivo,
      status: "Aguardando", atendente: fAtendente, pixOuBanco: fPixBanco,
      chavePix: fPixBanco === "pix" ? fChavePix : undefined,
      banco: fPixBanco === "banco" ? fBanco : undefined,
      agencia: fPixBanco === "banco" ? fAgencia : undefined,
      conta: fPixBanco === "banco" ? fConta : undefined,
      timeline: [{ data: today(), evento: "Solicitação criada", usuario: fAtendente }],
    };
    setDados((p) => [novo, ...p]);
    setDlgNovo(false);
    resetForm();
    toast({ title: "Reembolso solicitado com sucesso!" });
  };

  const mutate = (id: number, status: StatusReembolso, evento: string, usuario: string) => {
    setDados((p) =>
      p.map((x) =>
        x.id === id ? { ...x, status, timeline: [...x.timeline, { data: today(), evento, usuario }] } : x
      )
    );
  };

  const handleAprovar = (r: Reembolso) => { mutate(r.id, "Aprovado", "Aprovado", "Gerente"); setDlgDetalhe(null); toast({ title: "Reembolso aprovado!" }); };
  const handleRecusar = (r: Reembolso) => { mutate(r.id, "Recusado", "Recusado", "Gerente"); setDlgDetalhe(null); toast({ title: "Reembolso recusado.", variant: "destructive" }); };
  const handlePago = (r: Reembolso) => { mutate(r.id, "Pago", "Pago", "Financeiro"); setDlgDetalhe(null); toast({ title: "Reembolso marcado como pago!" }); };

  const gerarTermo = (r: Reembolso) =>
    `TERMO DE REEMBOLSO\n` +
    `\nData: ${r.data}` +
    `\nProtocolo: #${r.id}` +
    `\n\nASSOCIADO: ${r.associado}` +
    `\nCPF: ${r.cpf}` +
    `\nCOOPERATIVA: ${r.cooperativa}` +
    `\n\nDADOS DO REEMBOLSO:` +
    `\nValor Original: ${fmt(r.valorOriginal)}` +
    `\nValor do Reembolso: ${fmt(r.valorReembolso)} (${r.tipo})` +
    `\nMotivo: ${r.motivo}` +
    `\n\nDADOS PARA PAGAMENTO:` +
    (r.pixOuBanco === "pix"
      ? `\nChave PIX: ${r.chavePix}`
      : `\nBanco: ${r.banco} | Agência: ${r.agencia} | Conta: ${r.conta}`) +
    `\n\nAtendente Responsável: ${r.atendente}` +
    `\nStatus: ${r.status}` +
    `\n\nDeclaramos que o reembolso acima descrito foi devidamente solicitado, analisado` +
    `\ne aprovado conforme política interna da cooperativa.` +
    `\n\n\n_______________________________` +
    `\nAssinatura do Responsável`;

  const toastAcao = (msg: string) => toast({ title: msg });
  const aguardando = dados.filter((r) => r.status === "Aguardando").length;
  const total = dados.reduce((s, r) => s + r.valorReembolso, 0);
  const ticket = dados.length ? total / dados.length : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <RotateCcw className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Reembolsos</h1>
            <p className="text-sm text-muted-foreground">Gestão de reembolsos e estornos para associados</p>
          </div>
        </div>
        <Button onClick={() => setDlgNovo(true)}><Plus className="mr-2 h-4 w-4" />Novo Reembolso</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Reembolsos no Mês</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">8</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Reembolsado</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">R$ 3.420</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Aprovação</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-yellow-600">{aguardando}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-purple-600">{fmt(ticket)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou CPF..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Aguardando">Aguardando</SelectItem>
                <SelectItem value="Recusado">Recusado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="Integral">Integral</SelectItem>
                <SelectItem value="Parcial">Parcial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroCoop} onValueChange={setFiltroCoop}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Cooperativa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {cooperativas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead><TableHead>Associado</TableHead><TableHead>CPF</TableHead>
                <TableHead>Cooperativa</TableHead><TableHead>Valor Original</TableHead>
                <TableHead>Valor Reembolso</TableHead><TableHead>Tipo</TableHead>
                <TableHead>Motivo</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{r.data}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{r.associado}</TableCell>
                  <TableCell className="text-muted-foreground">{r.cpf}</TableCell>
                  <TableCell>{r.cooperativa}</TableCell>
                  <TableCell>{fmt(r.valorOriginal)}</TableCell>
                  <TableCell className="font-semibold">{fmt(r.valorReembolso)}</TableCell>
                  <TableCell><TipoBadge t={r.tipo} /></TableCell>
                  <TableCell className="max-w-[130px] truncate" title={r.motivo}>{r.motivo}</TableCell>
                  <TableCell><StatusBadge s={r.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" title="Ver detalhes" onClick={() => setDlgDetalhe(r)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Gerar Termo" onClick={() => setDlgTermo(r)}><FileText className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtrados.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhum reembolso encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Novo Reembolso */}
      <Dialog open={dlgNovo} onOpenChange={setDlgNovo}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Reembolso</DialogTitle>
            <DialogDescription>Preencha os dados para solicitar um reembolso ou estorno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Associado *</Label><Input placeholder="Nome do associado" value={fAssociado} onChange={(e) => setFAssociado(e.target.value)} /></div>
              <div className="space-y-1"><Label>CPF *</Label><Input placeholder="000.000.000-00" value={fCpf} onChange={(e) => setFCpf(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cooperativa</Label>
                <Select value={fCoop} onValueChange={setFCoop}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{cooperativas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={fTipo} onValueChange={(v) => setFTipo(v as TipoReembolso)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Integral">Integral</SelectItem><SelectItem value="Parcial">Parcial</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Valor Original (R$) *</Label><Input type="number" placeholder="0,00" value={fValorOrig} onChange={(e) => setFValorOrig(e.target.value)} /></div>
              <div className="space-y-1"><Label>Valor Reembolso (R$) *</Label><Input type="number" placeholder="0,00" value={fValorReemb} onChange={(e) => setFValorReemb(e.target.value)} /></div>
            </div>
            <div className="space-y-1">
              <Label>Motivo *</Label>
              <Select value={fMotivo} onValueChange={setFMotivo}>
                <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
                <SelectContent>{motivos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Atendente *</Label><Input placeholder="Nome do atendente" value={fAtendente} onChange={(e) => setFAtendente(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <div className="flex gap-2">
                <Button type="button" variant={fPixBanco === "pix" ? "default" : "outline"} size="sm" onClick={() => setFPixBanco("pix")}>PIX</Button>
                <Button type="button" variant={fPixBanco === "banco" ? "default" : "outline"} size="sm" onClick={() => setFPixBanco("banco")}>Dados Bancários</Button>
              </div>
              {fPixBanco === "pix" ? (
                <div className="space-y-1"><Label>Chave PIX</Label><Input placeholder="CPF, email, telefone ou chave aleatória" value={fChavePix} onChange={(e) => setFChavePix(e.target.value)} /></div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label>Banco</Label><Input placeholder="Nome do banco" value={fBanco} onChange={(e) => setFBanco(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Agência</Label><Input placeholder="0000" value={fAgencia} onChange={(e) => setFAgencia(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Conta</Label><Input placeholder="00000-0" value={fConta} onChange={(e) => setFConta(e.target.value)} /></div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDlgNovo(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSolicitar}>Solicitar Reembolso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={!!dlgDetalhe} onOpenChange={() => setDlgDetalhe(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {dlgDetalhe && (<>
            <DialogHeader>
              <DialogTitle>Reembolso #{dlgDetalhe.id}</DialogTitle>
              <DialogDescription>{dlgDetalhe.associado} — {dlgDetalhe.cpf}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-xs">Data</p><p className="font-medium">{dlgDetalhe.data}</p></div>
                <div><p className="text-muted-foreground text-xs">Cooperativa</p><p className="font-medium">{dlgDetalhe.cooperativa}</p></div>
                <div><p className="text-muted-foreground text-xs">Valor Original</p><p className="font-medium">{fmt(dlgDetalhe.valorOriginal)}</p></div>
                <div><p className="text-muted-foreground text-xs">Valor Reembolso</p><p className="font-semibold text-green-700">{fmt(dlgDetalhe.valorReembolso)}</p></div>
                <div><p className="text-muted-foreground text-xs">Tipo</p><div className="mt-0.5"><TipoBadge t={dlgDetalhe.tipo} /></div></div>
                <div><p className="text-muted-foreground text-xs">Status</p><div className="mt-0.5"><StatusBadge s={dlgDetalhe.status} /></div></div>
                <div className="col-span-2"><p className="text-muted-foreground text-xs">Motivo</p><p className="font-medium">{dlgDetalhe.motivo}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground text-xs">Atendente</p><p className="font-medium">{dlgDetalhe.atendente}</p></div>
              </div>
              <div className="border rounded-md p-3 space-y-1">
                <p className="font-semibold text-muted-foreground uppercase text-xs mb-2">Dados Bancários</p>
                {dlgDetalhe.pixOuBanco === "pix" ? (
                  <p>Chave PIX: <span className="font-medium">{dlgDetalhe.chavePix}</span></p>
                ) : (
                  <>
                    <p>Banco: <span className="font-medium">{dlgDetalhe.banco}</span></p>
                    <p>Agência: <span className="font-medium">{dlgDetalhe.agencia}</span> — Conta: <span className="font-medium">{dlgDetalhe.conta}</span></p>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-muted-foreground uppercase text-xs">Timeline</p>
                {dlgDetalhe.timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium">{t.evento}</p>
                      <p className="text-xs text-muted-foreground">{t.data} — {t.usuario}</p>
                    </div>
                  </div>
                ))}
              </div>
              {dlgDetalhe.status === "Aguardando" && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => { setReembolsos(prev => prev.map(r => r.id === dlgDetalhe.id ? { ...r, status: "Aprovado" as StatusReembolso, timeline: [...r.timeline, { data: today(), evento: "Aprovado", usuario: "Rayanne Donato" }] } : r)); setDlgDetalhe(null); toast({ title: "Reembolso aprovado!" }); }}>Aprovar</Button>
                  <Button variant="destructive" className="flex-1" onClick={() => { setReembolsos(prev => prev.map(r => r.id === dlgDetalhe.id ? { ...r, status: "Recusado" as StatusReembolso, timeline: [...r.timeline, { data: today(), evento: "Recusado", usuario: "Rayanne Donato" }] } : r)); setDlgDetalhe(null); toast({ title: "Reembolso recusado." }); }}>Recusar</Button>
                </div>
              )}
              {dlgDetalhe.status === "Aprovado" && (
                <Button onClick={() => { setReembolsos(prev => prev.map(r => r.id === dlgDetalhe.id ? { ...r, status: "Pago" as StatusReembolso, timeline: [...r.timeline, { data: today(), evento: "Pago", usuario: "Financeiro" }] } : r)); setDlgDetalhe(null); toast({ title: "Reembolso marcado como pago!" }); }}>Marcar como Pago</Button>
              )}
            </div>
          </>)}
        </DialogContent>
      </Dialog>

      {/* Dialog Gerar Termo */}
      <Dialog open={!!dlgTermo} onOpenChange={(v) => !v && setDlgTermo(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {dlgTermo && (
            <>
              <DialogHeader>
                <DialogTitle>Termo de Reembolso #{dlgTermo.id}</DialogTitle>
                <DialogDescription>Preview do termo — envie por Autentique, Email ou WhatsApp</DialogDescription>
              </DialogHeader>
              <div className="border rounded-lg p-4 bg-muted/20 font-mono text-sm whitespace-pre-wrap">
{`TERMO DE REEMBOLSO Nº ${dlgTermo.id}
CollectPro - Proteção Veicular

Data: ${dlgTermo.data}
Associado: ${dlgTermo.associado}
CPF: ${dlgTermo.cpf}
Cooperativa: ${dlgTermo.cooperativa}

DETALHES DO REEMBOLSO:
Valor Original: ${fmt(dlgTermo.valorOriginal)}
Valor do Reembolso: ${fmt(dlgTermo.valorReembolso)}
Tipo: ${dlgTermo.tipo}
Motivo: ${dlgTermo.motivo}

DADOS PARA PAGAMENTO:
${dlgTermo.pixOuBanco === "pix" ? `Chave PIX: ${dlgTermo.chavePix}` : `Banco: ${dlgTermo.banco}\nAgência: ${dlgTermo.agencia}\nConta: ${dlgTermo.conta}`}

Declaro que o valor acima será reembolsado conforme acordado.

Responsável: ${dlgTermo.atendente}

_________________________
Assinatura`}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`Termo de Reembolso #${dlgTermo.id}`); toast({ title: "Termo copiado!" }); }}><Copy className="h-4 w-4 mr-1.5" />Copiar</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "PDF gerado!" })}><Download className="h-4 w-4 mr-1.5" />Baixar PDF</Button>
                <Button size="sm" onClick={() => toast({ title: "Enviado para Autentique!", description: `Link: https://app.autentique.com.br/d/MOCK-${dlgTermo.id}` })}><Send className="h-4 w-4 mr-1.5" />Enviar Autentique</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Email enviado!", description: `Termo enviado para ${dlgTermo.associado}` })}><Mail className="h-4 w-4 mr-1.5" />Email</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "WhatsApp!", description: `Mensagem copiada para envio` })}><MessageCircle className="h-4 w-4 mr-1.5" />WhatsApp</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


import { useState } from "react";
import { Shield, Users, Eye, Edit, Lock, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type NivelAcesso = "total" | "proprio" | "visualizar" | "nenhum";
type Perfil = "Gestora" | "Colaborador" | "Admin";

interface Permissoes {
  dashboard: NivelAcesso;
  associados: NivelAcesso;
  boletos: NivelAcesso;
  cooperativas: NivelAcesso;
  colaboradores: NivelAcesso;
  ligacoes: NivelAcesso;
  acoes: NivelAcesso;
  regua: NivelAcesso;
  templates: NivelAcesso;
  acordos: NivelAcesso;
  negativacoes: NivelAcesso;
  cancelamentos: NivelAcesso;
  metricas: NivelAcesso;
  tickets: NivelAcesso;
  notificacoes: NivelAcesso;
  integracoes: NivelAcesso;
  auditoria: NivelAcesso;
  exportacao: NivelAcesso;
  acesso: NivelAcesso;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  cooperativa: string;
  status: "Ativo" | "Inativo";
  ultimo: string;
  permissoes: Permissoes;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULOS: { key: keyof Permissoes; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "associados", label: "Associados" },
  { key: "boletos", label: "Boletos" },
  { key: "cooperativas", label: "Cooperativas" },
  { key: "colaboradores", label: "Colaboradores" },
  { key: "ligacoes", label: "Ligações" },
  { key: "acoes", label: "Ações de Cobrança" },
  { key: "regua", label: "Régua de Cobrança" },
  { key: "templates", label: "Templates" },
  { key: "acordos", label: "Acordos" },
  { key: "negativacoes", label: "Negativações" },
  { key: "cancelamentos", label: "Cancelamentos" },
  { key: "metricas", label: "Métricas" },
  { key: "tickets", label: "Tickets" },
  { key: "notificacoes", label: "Notificações" },
  { key: "integracoes", label: "Integrações" },
  { key: "auditoria", label: "Log Auditoria" },
  { key: "exportacao", label: "Exportação" },
  { key: "acesso", label: "Controle de Acesso" },
];

const COOPERATIVAS = [
  "Todas", "Central SP", "Central RJ", "Minas Proteção",
  "Sul Proteção", "Nordeste", "Centro-Oeste", "Norte", "Litoral",
];

const NIVEIS: { value: NivelAcesso; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "proprio", label: "Próprio" },
  { value: "visualizar", label: "Visualizar" },
  { value: "nenhum", label: "Nenhum" },
];

// ─── Default Permissions per Profile ─────────────────────────────────────────

const permissoesGestora: Permissoes = {
  dashboard: "total", associados: "total", boletos: "total", cooperativas: "total",
  colaboradores: "total", ligacoes: "total", acoes: "total", regua: "total",
  templates: "total", acordos: "total", negativacoes: "total", cancelamentos: "total",
  metricas: "total", tickets: "total", notificacoes: "total", integracoes: "visualizar",
  auditoria: "total", exportacao: "total", acesso: "visualizar",
};

const permissoesColaborador: Permissoes = {
  dashboard: "proprio", associados: "visualizar", boletos: "visualizar", cooperativas: "nenhum",
  colaboradores: "nenhum", ligacoes: "proprio", acoes: "proprio", regua: "visualizar",
  templates: "visualizar", acordos: "proprio", negativacoes: "visualizar", cancelamentos: "proprio",
  metricas: "proprio", tickets: "proprio", notificacoes: "proprio", integracoes: "nenhum",
  auditoria: "nenhum", exportacao: "nenhum", acesso: "nenhum",
};

const permissoesAdmin: Permissoes = {
  dashboard: "total", associados: "total", boletos: "total", cooperativas: "total",
  colaboradores: "total", ligacoes: "total", acoes: "total", regua: "total",
  templates: "total", acordos: "total", negativacoes: "total", cancelamentos: "total",
  metricas: "total", tickets: "total", notificacoes: "total", integracoes: "total",
  auditoria: "total", exportacao: "total", acesso: "total",
};

const getDefaultPermissoes = (perfil: Perfil): Permissoes => {
  if (perfil === "Gestora") return { ...permissoesGestora };
  if (perfil === "Admin") return { ...permissoesAdmin };
  return { ...permissoesColaborador };
};

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const usuariosMock: Usuario[] = [
  {
    id: "1", nome: "Rayanne Donato", email: "rayannedonato@holdingwalk.com.br",
    perfil: "Gestora", cooperativa: "Todas", status: "Ativo", ultimo: "2026-03-28 22:30",
    permissoes: { ...permissoesGestora },
  },
  {
    id: "2", nome: "Laleska Gelinske", email: "laleskagelinske@gmail.com",
    perfil: "Colaborador", cooperativa: "Central SP", status: "Ativo", ultimo: "2026-03-28 21:50",
    permissoes: { ...permissoesColaborador },
  },
  {
    id: "3", nome: "Carla Mendes", email: "carla@collectpro.com",
    perfil: "Colaborador", cooperativa: "Central RJ", status: "Ativo", ultimo: "2026-03-28 18:00",
    permissoes: { ...permissoesColaborador },
  },
  {
    id: "4", nome: "Fernanda Lima", email: "fernanda@collectpro.com",
    perfil: "Colaborador", cooperativa: "Minas Proteção", status: "Ativo", ultimo: "2026-03-27 16:45",
    permissoes: { ...permissoesColaborador },
  },
  {
    id: "5", nome: "Admin Sistema", email: "admin@collectpro.com",
    perfil: "Admin", cooperativa: "Todas", status: "Ativo", ultimo: "2026-03-28 09:00",
    permissoes: { ...permissoesAdmin },
  },
];

// ─── Perfis definition ────────────────────────────────────────────────────────

const PERFIS_DEF = [
  {
    nome: "Gestora" as Perfil,
    descricao: "Acesso total ao sistema. Visualiza métricas de todos os colaboradores, gerencia equipe e configurações.",
    cor: "bg-primary text-primary-foreground",
    permissoes: permissoesGestora,
  },
  {
    nome: "Colaborador" as Perfil,
    descricao: "Acesso restrito. Apenas suas próprias métricas, ligações e ações de cobrança.",
    cor: "bg-accent text-accent-foreground",
    permissoes: permissoesColaborador,
  },
  {
    nome: "Admin" as Perfil,
    descricao: "Configurações técnicas do sistema. Gerencia perfis, integrações e parâmetros.",
    cor: "bg-muted text-foreground",
    permissoes: permissoesAdmin,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const permBadge = (p: NivelAcesso) => {
  if (p === "total") return <Badge className="bg-success/10 text-success text-xs">Total</Badge>;
  if (p === "proprio") return <Badge className="bg-primary text-primary-foreground text-xs">Próprio</Badge>;
  if (p === "visualizar") return <Badge variant="secondary" className="text-xs">Visualizar</Badge>;
  return <Badge variant="outline" className="text-muted-foreground text-xs">Nenhum</Badge>;
};

const gerarSenha = (): string => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// ─── PermissoesSection ────────────────────────────────────────────────────────

interface PermissoesSectionProps {
  permissoes: Permissoes;
  onChange: (key: keyof Permissoes, value: NivelAcesso) => void;
  readOnly?: boolean;
}

function PermissoesSection({ permissoes, onChange, readOnly }: PermissoesSectionProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Permissões por Módulo</Label>
      <div className="border rounded-md overflow-hidden">
        <div className="grid grid-cols-2 gap-0 bg-muted px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Módulo</span>
          <span className="text-xs font-medium text-muted-foreground">Nível de Acesso</span>
        </div>
        <Separator />
        <div className="divide-y">
          {MODULOS.map((mod) => (
            <div key={mod.key} className="grid grid-cols-2 gap-2 items-center px-3 py-1.5">
              <span className="text-sm">{mod.label}</span>
              {readOnly ? (
                permBadge(permissoes[mod.key])
              ) : (
                <Select
                  value={permissoes[mod.key]}
                  onValueChange={(v) => onChange(mod.key, v as NivelAcesso)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEIS.map((n) => (
                      <SelectItem key={n.value} value={n.value} className="text-xs">
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ControleAcesso() {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosMock);

  // Dialog visibility
  const [dialogAdicionar, setDialogAdicionar] = useState(false);
  const [dialogEditar, setDialogEditar] = useState(false);
  const [dialogVisualizar, setDialogVisualizar] = useState(false);
  const [dialogBloquear, setDialogBloquear] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);

  // Add form
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoPerfil, setNovoPerfil] = useState<Perfil>("Colaborador");
  const [novaCooperativa, setNovaCooperativa] = useState("Todas");
  const [novoStatus, setNovoStatus] = useState<"Ativo" | "Inativo">("Ativo");
  const [novasPermissoes, setNovasPermissoes] = useState<Permissoes>({ ...permissoesColaborador });

  // Edit form
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPerfil, setEditPerfil] = useState<Perfil>("Colaborador");
  const [editCooperativa, setEditCooperativa] = useState("Todas");
  const [editStatus, setEditStatus] = useState<"Ativo" | "Inativo">("Ativo");
  const [editPermissoes, setEditPermissoes] = useState<Permissoes>({ ...permissoesColaborador });

  // Derived
  const contagem = (perfil: Perfil) => usuarios.filter((u) => u.perfil === perfil).length;

  // ── Add ────────────────────────────────────────────────────────────────────

  const abrirAdicionar = () => {
    setNovoNome("");
    setNovoEmail("");
    setNovaSenha("");
    setNovoPerfil("Colaborador");
    setNovaCooperativa("Todas");
    setNovoStatus("Ativo");
    setNovasPermissoes({ ...permissoesColaborador });
    setDialogAdicionar(true);
  };

  const handleNovoPerfil = (p: Perfil) => {
    setNovoPerfil(p);
    setNovasPermissoes(getDefaultPermissoes(p));
  };

  const criarUsuario = () => {
    if (!novoNome.trim() || !novoEmail.trim()) {
      toast({ title: "Campos obrigatórios", description: "Nome e e-mail são obrigatórios.", variant: "destructive" });
      return;
    }
    const novo: Usuario = {
      id: Date.now().toString(),
      nome: novoNome.trim(),
      email: novoEmail.trim(),
      perfil: novoPerfil,
      cooperativa: novaCooperativa,
      status: novoStatus,
      ultimo: "—",
      permissoes: { ...novasPermissoes },
    };
    setUsuarios((prev) => [...prev, novo]);
    setDialogAdicionar(false);
    toast({ title: "Usuário criado!", description: `${novo.nome} foi adicionado ao sistema.` });
  };

  // ── Edit ───────────────────────────────────────────────────────────────────

  const abrirEditar = (u: Usuario) => {
    setUsuarioSelecionado(u);
    setEditNome(u.nome);
    setEditEmail(u.email);
    setEditPerfil(u.perfil);
    setEditCooperativa(u.cooperativa);
    setEditStatus(u.status);
    setEditPermissoes({ ...u.permissoes });
    setDialogEditar(true);
  };

  const handleEditPerfil = (p: Perfil) => {
    setEditPerfil(p);
    setEditPermissoes(getDefaultPermissoes(p));
  };

  const salvarEdicao = () => {
    if (!editNome.trim() || !editEmail.trim()) {
      toast({ title: "Campos obrigatórios", description: "Nome e e-mail são obrigatórios.", variant: "destructive" });
      return;
    }
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuarioSelecionado?.id
          ? {
              ...u,
              nome: editNome.trim(),
              email: editEmail.trim(),
              perfil: editPerfil,
              cooperativa: editCooperativa,
              status: editStatus,
              permissoes: { ...editPermissoes },
            }
          : u
      )
    );
    setDialogEditar(false);
    toast({ title: "Usuário atualizado!", description: `${editNome} foi atualizado com sucesso.` });
  };

  // ── View ───────────────────────────────────────────────────────────────────

  const abrirVisualizar = (u: Usuario) => {
    setUsuarioSelecionado(u);
    setDialogVisualizar(true);
  };

  // ── Lock ───────────────────────────────────────────────────────────────────

  const abrirBloquear = (u: Usuario) => {
    setUsuarioSelecionado(u);
    setDialogBloquear(true);
  };

  const confirmarBloquear = () => {
    if (!usuarioSelecionado) return;
    const novoStatusVal: "Ativo" | "Inativo" = usuarioSelecionado.status === "Ativo" ? "Inativo" : "Ativo";
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioSelecionado.id ? { ...u, status: novoStatusVal } : u))
    );
    setDialogBloquear(false);
    toast({
      title: novoStatusVal === "Inativo" ? "Usuário bloqueado" : "Usuário reativado",
      description: `${usuarioSelecionado.nome} foi ${novoStatusVal === "Inativo" ? "desativado" : "reativado"}.`,
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">Controle de Acesso</h1>
        <p className="text-sm text-muted-foreground">Gerencie perfis e permissões dos usuários do sistema</p>
      </div>

      {/* Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PERFIS_DEF.map((p) => (
          <Card key={p.nome} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-xl p-2.5 bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg">{p.nome}</h3>
                  <p className="text-xs text-muted-foreground">{contagem(p.nome)} usuário(s)</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{p.descricao}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="permissoes">Matriz de Permissões</TabsTrigger>
        </TabsList>

        {/* Tab: Usuários */}
        <TabsContent value="usuarios">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários do Sistema
                </CardTitle>
                <Button size="sm" onClick={abrirAdicionar}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Cooperativa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.perfil === "Gestora" ? "default" : u.perfil === "Admin" ? "outline" : "secondary"}>
                          {u.perfil}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{u.cooperativa}</TableCell>
                      <TableCell>
                        <Badge className={u.status === "Ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.ultimo}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" title="Visualizar" onClick={() => abrirVisualizar(u)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Editar" onClick={() => abrirEditar(u)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={u.status === "Ativo" ? "Bloquear" : "Reativar"}
                            onClick={() => abrirBloquear(u)}
                            className={u.status === "Inativo" ? "text-success" : "text-destructive hover:text-destructive"}
                          >
                            {u.status === "Ativo" ? <Lock className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Matriz de Permissões */}
        <TabsContent value="permissoes">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Matriz de Permissões por Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      {PERFIS_DEF.map((p) => (
                        <TableHead key={p.nome} className="text-center">{p.nome}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULOS.map((mod) => (
                      <TableRow key={mod.key}>
                        <TableCell className="font-medium">{mod.label}</TableCell>
                        {PERFIS_DEF.map((p) => (
                          <TableCell key={p.nome} className="text-center">
                            {permBadge(p.permissoes[mod.key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Adicionar Usuário ──────────────────────────────────────── */}
      <Dialog open={dialogAdicionar} onOpenChange={setDialogAdicionar}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Adicionar Usuário</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4 py-2">
              {/* Nome + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Nome completo"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <Label>Senha Inicial</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Senha inicial"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setNovaSenha(gerarSenha())}
                    className="shrink-0"
                  >
                    Gerar Senha
                  </Button>
                </div>
              </div>

              {/* Perfil + Cooperativa + Status */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Perfil</Label>
                  <Select value={novoPerfil} onValueChange={(v) => handleNovoPerfil(v as Perfil)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gestora">Gestora</SelectItem>
                      <SelectItem value="Colaborador">Colaborador</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cooperativa</Label>
                  <Select value={novaCooperativa} onValueChange={setNovaCooperativa}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COOPERATIVAS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={novoStatus} onValueChange={(v) => setNovoStatus(v as "Ativo" | "Inativo")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Permissões */}
              <PermissoesSection
                permissoes={novasPermissoes}
                onChange={(key, value) =>
                  setNovasPermissoes((prev) => ({ ...prev, [key]: value }))
                }
              />
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAdicionar(false)}>Cancelar</Button>
            <Button onClick={criarUsuario}>Criar Usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar Usuário ─────────────────────────────────────────── */}
      <Dialog open={dialogEditar} onOpenChange={setDialogEditar}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar Usuário</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4 py-2">
              {/* Nome + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Nome completo"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Perfil + Cooperativa + Status */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Perfil</Label>
                  <Select value={editPerfil} onValueChange={(v) => handleEditPerfil(v as Perfil)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gestora">Gestora</SelectItem>
                      <SelectItem value="Colaborador">Colaborador</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cooperativa</Label>
                  <Select value={editCooperativa} onValueChange={setEditCooperativa}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COOPERATIVAS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as "Ativo" | "Inativo")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Permissões */}
              <PermissoesSection
                permissoes={editPermissoes}
                onChange={(key, value) =>
                  setEditPermissoes((prev) => ({ ...prev, [key]: value }))
                }
              />
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditar(false)}>Cancelar</Button>
            <Button onClick={salvarEdicao}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Visualizar Usuário ────────────────────────────────────── */}
      <Dialog open={dialogVisualizar} onOpenChange={setDialogVisualizar}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          {usuarioSelecionado && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4 py-2">
                {/* Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Nome</p>
                    <p className="font-medium">{usuarioSelecionado.nome}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">E-mail</p>
                    <p className="font-medium">{usuarioSelecionado.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Perfil</p>
                    <Badge variant={usuarioSelecionado.perfil === "Gestora" ? "default" : usuarioSelecionado.perfil === "Admin" ? "outline" : "secondary"}>
                      {usuarioSelecionado.perfil}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Cooperativa</p>
                    <p className="font-medium">{usuarioSelecionado.cooperativa}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Status</p>
                    <Badge className={usuarioSelecionado.status === "Ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                      {usuarioSelecionado.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Último Acesso</p>
                    <p className="font-medium">{usuarioSelecionado.ultimo}</p>
                  </div>
                </div>

                <Separator />

                {/* Permissões (read-only) */}
                <PermissoesSection
                  permissoes={usuarioSelecionado.permissoes}
                  onChange={() => {}}
                  readOnly
                />
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogVisualizar(false)}>Fechar</Button>
            <Button onClick={() => { setDialogVisualizar(false); abrirEditar(usuarioSelecionado!); }}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Bloquear/Reativar ─────────────────────────────────────── */}
      <Dialog open={dialogBloquear} onOpenChange={setDialogBloquear}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {usuarioSelecionado?.status === "Ativo" ? "Bloquear Usuário" : "Reativar Usuário"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            {usuarioSelecionado?.status === "Ativo" ? (
              <>
                Tem certeza que deseja <strong>bloquear</strong> o usuário{" "}
                <strong>{usuarioSelecionado?.nome}</strong>?<br />
                Ele perderá acesso ao sistema imediatamente.
              </>
            ) : (
              <>
                Deseja <strong>reativar</strong> o usuário{" "}
                <strong>{usuarioSelecionado?.nome}</strong>?<br />
                Ele voltará a ter acesso ao sistema.
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogBloquear(false)}>Cancelar</Button>
            <Button
              variant={usuarioSelecionado?.status === "Ativo" ? "destructive" : "default"}
              onClick={confirmarBloquear}
            >
              {usuarioSelecionado?.status === "Ativo" ? "Bloquear" : "Reativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

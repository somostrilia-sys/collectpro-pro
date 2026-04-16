import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Eye, Edit, Lock, Plus, RefreshCw, Loader2 } from "lucide-react";
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
import {
  type NivelAcesso,
  type Perfil,
  type Permissoes,
  MODULOS,
  NIVEIS,
  permissoesGestora,
  permissoesColaborador,
  permissoesAdmin,
  getDefaultPermissoes,
  mapRoleToPerfil,
  mapPerfilToRole,
} from "@/types/permissions";

// ─── Local Types ──────────────────────────────────────────────────────────────

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

// ─── Local Constants ──────────────────────────────────────────────────────────

const COOPERATIVAS = [
  "Todas", "Central SP", "Central RJ", "Minas Proteção",
  "Sul Proteção", "Nordeste", "Centro-Oeste", "Norte", "Litoral",
];

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
  const queryClient = useQueryClient();

  // ── Fetch profiles from Supabase (admin bypass RLS) ────────────────────────
  const { data: usuarios = [], isLoading, isError } = useQuery<Usuario[]>({
    queryKey: ["profiles-acesso"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "list_users" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao listar usuários");

      const profiles = data.profiles || [];
      const emailMap = data.emailMap || {};

      return profiles.map((p: any) => {
        const isBloqueado = p.role === "bloqueado";
        const perfil = isBloqueado ? "Colaborador" as Perfil : mapRoleToPerfil(p.role);
        const authInfo = emailMap[p.id];
        const lastAccess = authInfo?.lastSignIn
          ? new Date(authInfo.lastSignIn).toLocaleString("pt-BR")
          : p.created_at ? new Date(p.created_at).toLocaleString("pt-BR") : "—";
        return {
          id: p.id,
          nome: p.full_name || "Sem nome",
          email: authInfo?.email || "",
          perfil,
          cooperativa: "Todas",
          status: (isBloqueado ? "Inativo" : "Ativo") as "Ativo" | "Inativo",
          ultimo: lastAccess,
          permissoes: p.permissions ? (p.permissions as Permissoes) : getDefaultPermissoes(perfil),
        };
      });
    },
    staleTime: 30_000,
  });

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

  const criarUsuarioMutation = useMutation({
    mutationFn: async () => {
      if (!novoNome.trim() || !novoEmail.trim()) {
        throw new Error("Nome e e-mail são obrigatórios.");
      }
      if (!novaSenha.trim() || novaSenha.trim().length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres.");
      }
      const { data, error: fnError } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "create_user",
          email: novoEmail.trim(),
          password: novaSenha.trim(),
          full_name: novoNome.trim(),
          role: mapPerfilToRole(novoPerfil),
          permissions: novasPermissoes,
        },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Erro ao criar usuário.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles-acesso"] });
      setDialogAdicionar(false);
      toast({ title: "Usuário criado!", description: `${novoNome} foi adicionado ao sistema.` });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao criar usuário", description: err.message || "Tente novamente.", variant: "destructive" });
    },
  });

  const criarUsuario = () => {
    if (!novoNome.trim() || !novoEmail.trim()) {
      toast({ title: "Campos obrigatórios", description: "Nome e e-mail são obrigatórios.", variant: "destructive" });
      return;
    }
    criarUsuarioMutation.mutate();
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

  const salvarEdicaoMutation = useMutation({
    mutationFn: async () => {
      if (!usuarioSelecionado) throw new Error("Nenhum usuário selecionado.");
      if (!editNome.trim()) throw new Error("Nome é obrigatório.");
      const { data, error: fnError } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "update_profile",
          user_id: usuarioSelecionado.id,
          full_name: editNome.trim(),
          role: mapPerfilToRole(editPerfil),
          permissions: editPermissoes,
        },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Erro ao atualizar.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles-acesso"] });
      setDialogEditar(false);
      toast({ title: "Usuário atualizado!", description: `${editNome} foi atualizado com sucesso.` });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao atualizar", description: err.message || "Tente novamente.", variant: "destructive" });
    },
  });

  const salvarEdicao = () => {
    if (!editNome.trim() || !editEmail.trim()) {
      toast({ title: "Campos obrigatórios", description: "Nome e e-mail são obrigatórios.", variant: "destructive" });
      return;
    }
    salvarEdicaoMutation.mutate();
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

  const bloquearMutation = useMutation({
    mutationFn: async () => {
      if (!usuarioSelecionado) throw new Error("Nenhum usuário selecionado.");
      // We use the role field to indicate blocked status by setting a special role,
      // or we can update a field. Since the profiles table doesn't have a status column,
      // we set role to null/empty to effectively block. For a cleaner approach,
      // we keep the role but the UI can track status based on role presence.
      // For now, we'll use a convention: role "bloqueado" means inactive.
      const isAtivo = usuarioSelecionado.status === "Ativo";
      const { data, error: fnError } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "block_user",
          user_id: usuarioSelecionado.id,
          block: isAtivo,
        },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Erro ao alterar status.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles-acesso"] });
      const novoStatusVal = usuarioSelecionado?.status === "Ativo" ? "Inativo" : "Ativo";
      setDialogBloquear(false);
      toast({
        title: novoStatusVal === "Inativo" ? "Usuário bloqueado" : "Usuário reativado",
        description: `${usuarioSelecionado?.nome} foi ${novoStatusVal === "Inativo" ? "desativado" : "reativado"}.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message || "Tente novamente.", variant: "destructive" });
    },
  });

  const confirmarBloquear = () => {
    bloquearMutation.mutate();
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
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Carregando usuários...</span>
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center py-12 text-destructive">
                  Erro ao carregar usuários. Tente novamente.
                </div>
              ) : (
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
              )}
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
            <Button onClick={criarUsuario} disabled={criarUsuarioMutation.isPending}>
              {criarUsuarioMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Criar Usuário
            </Button>
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
            <Button onClick={salvarEdicao} disabled={salvarEdicaoMutation.isPending}>
              {salvarEdicaoMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar Alterações
            </Button>
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

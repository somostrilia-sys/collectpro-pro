import { Shield, Users, Settings, Eye, Edit, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const perfis = [
  {
    nome: "Gestora",
    descricao: "Acesso total ao sistema. Visualiza métricas de todos os colaboradores, gerencia equipe e configurações.",
    cor: "bg-primary text-primary-foreground",
    usuarios: 2,
    permissoes: {
      dashboard: "total", associados: "total", boletos: "total", colaboradores: "total",
      ligacoes: "total", acoes: "total", regua: "total", templates: "total",
      acordos: "total", negativacoes: "total", metricas: "total", tickets: "total",
      notificacoes: "total", auditoria: "total", exportacao: "total", acesso: "visualizar",
    },
  },
  {
    nome: "Colaborador",
    descricao: "Acesso restrito. Apenas suas próprias métricas, ligações e ações de cobrança.",
    cor: "bg-accent text-accent-foreground",
    usuarios: 8,
    permissoes: {
      dashboard: "proprio", associados: "visualizar", boletos: "visualizar", colaboradores: "nenhum",
      ligacoes: "proprio", acoes: "proprio", regua: "visualizar", templates: "visualizar",
      acordos: "proprio", negativacoes: "visualizar", metricas: "proprio", tickets: "proprio",
      notificacoes: "proprio", auditoria: "nenhum", exportacao: "nenhum", acesso: "nenhum",
    },
  },
  {
    nome: "Admin",
    descricao: "Configurações técnicas do sistema. Gerencia perfis, integrações e parâmetros.",
    cor: "bg-muted text-foreground",
    usuarios: 1,
    permissoes: {
      dashboard: "total", associados: "total", boletos: "total", colaboradores: "total",
      ligacoes: "total", acoes: "total", regua: "total", templates: "total",
      acordos: "total", negativacoes: "total", metricas: "total", tickets: "total",
      notificacoes: "total", auditoria: "total", exportacao: "total", acesso: "total",
    },
  },
];

const usuariosSistema = [
  { nome: "Maria Gestora", email: "maria@collectpro.com", perfil: "Gestora", status: "Ativo", ultimo: "2026-03-09 14:32" },
  { nome: "Carlos Mendes", email: "carlos@collectpro.com", perfil: "Colaborador", status: "Ativo", ultimo: "2026-03-09 13:15" },
  { nome: "Ana Souza", email: "ana@collectpro.com", perfil: "Colaborador", status: "Ativo", ultimo: "2026-03-09 10:00" },
  { nome: "Pedro Alves", email: "pedro@collectpro.com", perfil: "Colaborador", status: "Ativo", ultimo: "2026-03-08 16:45" },
  { nome: "Juliana Lima", email: "juliana@collectpro.com", perfil: "Colaborador", status: "Ativo", ultimo: "2026-03-08 14:20" },
  { nome: "Ricardo Santos", email: "ricardo@collectpro.com", perfil: "Colaborador", status: "Inativo", ultimo: "2026-02-28 17:00" },
  { nome: "Admin Sistema", email: "admin@collectpro.com", perfil: "Admin", status: "Ativo", ultimo: "2026-03-09 09:00" },
];

const modulos = ["dashboard", "associados", "boletos", "colaboradores", "ligacoes", "acoes", "regua", "templates", "acordos", "negativacoes", "metricas", "tickets", "notificacoes", "auditoria", "exportacao", "acesso"];

const nomeModulo: Record<string, string> = {
  dashboard: "Dashboard", associados: "Associados", boletos: "Boletos", colaboradores: "Colaboradores",
  ligacoes: "Ligações", acoes: "Ações de Cobrança", regua: "Régua de Cobrança", templates: "Templates",
  acordos: "Acordos", negativacoes: "Negativações", metricas: "Métricas", tickets: "Tickets",
  notificacoes: "Notificações", auditoria: "Log Auditoria", exportacao: "Exportação", acesso: "Controle de Acesso",
};

const permBadge = (p: string) => {
  if (p === "total") return <Badge className="bg-emerald-500 text-white">Total</Badge>;
  if (p === "proprio") return <Badge className="bg-primary text-primary-foreground">Próprio</Badge>;
  if (p === "visualizar") return <Badge variant="secondary">Visualizar</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Nenhum</Badge>;
};

export default function ControleAcesso() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Controle de Acesso</h1>
        <p className="text-muted-foreground">Gerencie perfis e permissões dos usuários do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {perfis.map((p) => (
          <Card key={p.nome}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-10 w-10 rounded-full ${p.cor} flex items-center justify-center`}>
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{p.nome}</h3>
                  <p className="text-xs text-muted-foreground">{p.usuarios} usuário(s)</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{p.descricao}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="permissoes">Matriz de Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários do Sistema
                </CardTitle>
                <Button size="sm">Adicionar Usuário</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosSistema.map((u) => (
                    <TableRow key={u.email}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.perfil === "Gestora" ? "default" : u.perfil === "Admin" ? "outline" : "secondary"}>
                          {u.perfil}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={u.status === "Ativo" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}>
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.ultimo}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm"><Lock className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                      {perfis.map((p) => (
                        <TableHead key={p.nome} className="text-center">{p.nome}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modulos.map((m) => (
                      <TableRow key={m}>
                        <TableCell className="font-medium">{nomeModulo[m]}</TableCell>
                        {perfis.map((p) => (
                          <TableCell key={p.nome} className="text-center">
                            {permBadge(p.permissoes[m as keyof typeof p.permissoes])}
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
    </div>
  );
}

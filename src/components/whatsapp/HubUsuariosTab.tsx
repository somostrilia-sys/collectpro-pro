// HubUsuariosTab — Visão cross-sistema dos 30 users do Hub WhatsApp.
// Agrupa por setor (cobranca/evento/track/gestao/cs/diretoria).
// Lê profiles do CollectPro e mapeia roles pro contexto do Hub.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Shield, Users, Phone, Mail, TrendingUp } from "lucide-react";

const SETOR_META = {
  cobranca: { label: "Cobrança",     icon: "💰", color: "bg-blue-500/10 text-blue-700 border-blue-200"        },
  evento:   { label: "Eventos",      icon: "🚨", color: "bg-rose-500/10 text-rose-700 border-rose-200"        },
  track:    { label: "Rastreamento", icon: "📍", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  gestao:   { label: "Gestão",       icon: "📋", color: "bg-violet-500/10 text-violet-700 border-violet-200"   },
  cs:       { label: "Sucesso Cliente", icon: "⭐", color: "bg-amber-500/10 text-amber-700 border-amber-200"    },
  cross:    { label: "Diretoria",    icon: "🏛️", color: "bg-slate-500/10 text-slate-700 border-slate-200"     },
} as const;

const ROLE_LABEL: Record<string, string> = {
  ceo: "CEO Geral",
  diretor: "Diretor",
  admin: "Admin",
  cs: "Sucesso Cliente",
  supervisor: "Supervisor",
  gestora: "Gestora",
  atendente: "Atendente",
  colaborador: "Colaborador",
};

interface HubUser {
  id: string;
  email: string | null;
  full_name: string;
  role: string;
  setor: string;
  last_sign_in_at: string | null;
  created_at: string;
}

function useHubUsers() {
  return useQuery<HubUser[]>({
    queryKey: ["hub-users-collectpro"],
    queryFn: async () => {
      // Join profiles + auth.users via RPC ou edge. Aqui apenas profiles local.
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, role, permissions, created_at")
        .order("full_name", { ascending: true });
      if (error) throw error;

      // Buscar emails via RPC ou listar auth users (precisa service_role)
      // Por enquanto usa permissions.setor ou deriva do role
      return (data || []).map((p: any) => {
        const setor = p.permissions?.setor
          ?? deriveSetorFromRole(p.role)
          ?? "cobranca";
        return {
          id: p.id,
          email: p.permissions?.email ?? null, // Se gravado nas permissions
          full_name: p.full_name ?? "(sem nome)",
          role: p.role ?? "colaborador",
          setor,
          last_sign_in_at: null,
          created_at: p.created_at,
        } as HubUser;
      });
    },
    staleTime: 30_000,
  });
}

function deriveSetorFromRole(role: string | null): string {
  if (!role) return "cobranca";
  if (["ceo", "diretor", "admin"].includes(role)) return "cross";
  if (role === "cs") return "cs";
  return "cobranca";
}

export function HubUsuariosTab() {
  const { data: users = [], isLoading } = useHubUsers();
  const [q, setQ] = useState("");
  const [setorFilter, setSetorFilter] = useState<string>("todos");

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return users.filter((u) => {
      if (setorFilter !== "todos" && u.setor !== setorFilter) return false;
      if (!qn) return true;
      return u.full_name.toLowerCase().includes(qn)
        || (u.email ?? "").toLowerCase().includes(qn);
    });
  }, [users, q, setorFilter]);

  const countsBySetor = useMemo(() => {
    const c: Record<string, number> = {};
    for (const u of users) c[u.setor] = (c[u.setor] ?? 0) + 1;
    return c;
  }, [users]);

  return (
    <div className="space-y-4">
      {/* Cards resumo por setor */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(SETOR_META) as Array<keyof typeof SETOR_META>).map((s) => {
          const meta = SETOR_META[s];
          const n = countsBySetor[s] ?? 0;
          const active = setorFilter === s;
          return (
            <Card
              key={s}
              className={`cursor-pointer transition-all ${active ? "ring-2 ring-primary" : "hover:shadow-md"}`}
              onClick={() => setSetorFilter(active ? "todos" : s)}
            >
              <CardContent className="p-3 flex items-center gap-2">
                <span className="text-2xl">{meta.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{meta.label}</p>
                  <p className="text-xl font-bold">{n}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Header + busca */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Usuários do Hub WhatsApp
                <Badge variant="outline" className="ml-1">{filtered.length}</Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Atendentes e gestão operando os 4 setores via Hub Central Meta.
                {setorFilter !== "todos" && (
                  <span className="ml-1 font-medium">
                    · filtro: {SETOR_META[setorFilter as keyof typeof SETOR_META]?.label}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar nome ou email"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8 h-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Último login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum usuário</TableCell></TableRow>
              )}
              {filtered.map((u) => {
                const meta = SETOR_META[u.setor as keyof typeof SETOR_META] ?? SETOR_META.cobranca;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{u.full_name}</div>
                      {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{ROLE_LABEL[u.role] ?? u.role}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("pt-BR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/20">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-3 w-3 mt-0.5" />
            <span>
              Esta aba mostra usuários do CollectPro. Para gestão cross-sistema (Trackit, GIA, CRM Eventos) use o painel admin de cada sistema.
              Login master <span className="font-mono">somostrilia@gmail.com</span> e <span className="font-mono">diretoria@objetivoauto.com.br</span> funcionam nos 4.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

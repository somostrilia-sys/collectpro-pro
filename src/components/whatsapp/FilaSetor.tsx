// FilaSetor — Lista de atendimentos pendentes do setor (estilo WhatsApp Web)
// Reutilizável: CollectPro (cobranca), GIA (gestao), Trackit (track), CRM Eventos (evento)
// Usa hook useHubAtendimentos local de cada sistema (SETOR fixo por sistema).

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Inbox, Bot, User, CheckCircle2, Clock, ArrowRightLeft,
  AlertTriangle, MoreVertical, MessageSquare, UserCheck,
} from "lucide-react";
import {
  useAtendimentos, useAssumir, useTransferir, useFilas,
  type Atendimento,
} from "@/hooks/useHubAtendimentos";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  onSelect?: (atend: Atendimento) => void;
  selectedId?: string | null;
  /** Override de setor (admin/supervisor vê outros setores). "*" = todos. */
  setorOverride?: "cobranca" | "evento" | "track" | "gestao" | "*";
}

const SETORES = [
  { slug: "cobranca", nome: "Cobrança" },
  { slug: "evento",   nome: "Eventos"  },
  { slug: "track",    nome: "Track"    },
  { slug: "gestao",   nome: "Gestão"   },
  { slug: "geral",    nome: "Geral"    },
];

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  aberto:              { label: "Nova",          color: "bg-emerald-500/10 text-emerald-700 border-emerald-200",   icon: Inbox },
  em_ia:               { label: "IA",            color: "bg-violet-500/10 text-violet-700 border-violet-200",     icon: Bot },
  em_humano:           { label: "Humano",        color: "bg-blue-500/10 text-blue-700 border-blue-200",           icon: User },
  aguardando_cliente:  { label: "Aguardando",    color: "bg-amber-500/10 text-amber-700 border-amber-200",        icon: Clock },
  resolvido:           { label: "Resolvido",     color: "bg-slate-500/10 text-slate-700 border-slate-200",        icon: CheckCircle2 },
  transferido:         { label: "Transferido",   color: "bg-indigo-500/10 text-indigo-700 border-indigo-200",     icon: ArrowRightLeft },
  arquivado:           { label: "Arquivado",     color: "bg-slate-300/10 text-slate-500",                         icon: CheckCircle2 },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META.aberto;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1 py-0", meta.color)}>
      <Icon className="h-2.5 w-2.5" /> {meta.label}
    </Badge>
  );
}

function formatTel(t: string) {
  const d = String(t).replace(/\D/g, "");
  if (d.length >= 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, -4)}-${d.slice(-4)}`;
  return t;
}

function formatAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function FilaSetor({ onSelect, selectedId, setorOverride }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"todos" | "minhas" | "novos" | "ia" | "humano" | "aguardando">("todos");
  const [q, setQ] = useState("");

  const statusMap: Record<string, string[] | undefined> = {
    todos: undefined,
    minhas: ["em_humano"],
    novos: ["aberto"],
    ia: ["em_ia"],
    humano: ["em_humano"],
    aguardando: ["aguardando_cliente"],
  };

  const { data: atendimentos = [], isLoading } = useAtendimentos(statusMap[filter], setorOverride);
  const { data: filas = [] } = useFilas();
  const assumir = useAssumir();
  const transferir = useTransferir();

  const filtered = useMemo(() => {
    let list = atendimentos;
    if (filter === "minhas") {
      list = list.filter((a) => a.sistema_origem && a.atendente_nome);
    }
    if (q.trim()) {
      const term = q.toLowerCase().trim();
      list = list.filter((a) =>
        a.telefone.includes(term.replace(/\D/g, "")) ||
        (a.atendente_nome || "").toLowerCase().includes(term) ||
        (a.protocolo || "").toLowerCase().includes(term),
      );
    }
    return list;
  }, [atendimentos, filter, q]);

  const handleAssumir = async (a: Atendimento) => {
    try {
      await assumir.mutateAsync({
        atendimento_id: a.id,
        atendente_nome: user?.user_metadata?.full_name || user?.email || "Atendente",
        atendente_id: user?.id,
      });
      toast({ title: "Atendimento assumido", description: `Protocolo ${a.protocolo}` });
      if (onSelect) onSelect(a);
    } catch (e: any) {
      toast({ title: "Falha ao assumir", description: e.message, variant: "destructive" });
    }
  };

  const handleTransferir = async (a: Atendimento, para: string) => {
    try {
      await transferir.mutateAsync({
        atendimento_id: a.id,
        para_setor: para,
        motivo: `Transferido por ${user?.email || "sistema"}`,
      });
      toast({ title: "Transferido", description: `Enviado pra setor "${para}"` });
    } catch (e: any) {
      toast({ title: "Falha ao transferir", description: e.message, variant: "destructive" });
    }
  };

  // Contadores do meu setor pros chips de filtro
  const meuSetor = filas[0];  // hook filtra por setor específico, vem 1 linha ou todas
  const counts = useMemo(() => {
    return {
      novos:      atendimentos.filter((a) => a.status === "aberto").length,
      ia:         atendimentos.filter((a) => a.status === "em_ia").length,
      humano:     atendimentos.filter((a) => a.status === "em_humano").length,
      aguardando: atendimentos.filter((a) => a.status === "aguardando_cliente").length,
    };
  }, [atendimentos]);

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header */}
      <div className="p-3 border-b bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Fila de atendimento</p>
            <p className="text-[10px] text-muted-foreground">
              {atendimentos.length} conversa{atendimentos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar protocolo, telefone, atendente..."
            className="pl-8 h-8 text-xs bg-muted/20 border-0"
          />
        </div>
      </div>

      {/* Chips de filtro */}
      <div className="flex gap-1 px-2 py-1.5 border-b overflow-x-auto">
        {[
          { key: "todos",       label: "Todos" },
          { key: "novos",       label: `Novos (${counts.novos})` },
          { key: "ia",          label: `IA (${counts.ia})` },
          { key: "humano",      label: `Humano (${counts.humano})` },
          { key: "aguardando",  label: `Aguard. (${counts.aguardando})` },
          { key: "minhas",      label: "Minhas" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={cn(
              "text-[10px] font-medium px-2 py-1 rounded-full border transition-colors whitespace-nowrap shrink-0",
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/20 text-muted-foreground border-transparent hover:bg-muted/40",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <Inbox className="h-8 w-8 opacity-40" />
            <p className="text-xs">Fila vazia</p>
          </div>
        ) : (
          filtered.map((a) => {
            const sel = a.id === selectedId;
            return (
              <div
                key={a.id}
                onClick={() => onSelect?.(a)}
                className={cn(
                  "border-b border-border/40 cursor-pointer transition-colors hover:bg-accent/30",
                  sel && "bg-accent",
                )}
              >
                <div className="flex items-start gap-2 px-3 py-2.5">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {String(a.telefone).slice(-4)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold truncate">{formatTel(a.telefone)}</p>
                      <span className="text-[9px] text-muted-foreground shrink-0">{formatAgo(a.ultima_msg_em)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <StatusBadge status={a.status} />
                      {a.protocolo && (
                        <span className="text-[9px] text-muted-foreground font-mono">#{a.protocolo.slice(-6)}</span>
                      )}
                      {a.atendente_nome && (
                        <span className="text-[9px] text-muted-foreground truncate">{a.atendente_nome}</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {a.status !== "em_humano" && a.status !== "resolvido" && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAssumir(a); }}>
                          <UserCheck className="h-3.5 w-3.5 mr-2" /> Assumir
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] text-muted-foreground">
                        Transferir pra setor
                      </DropdownMenuLabel>
                      {SETORES.filter((s) => s.slug !== a.setor).map((s) => (
                        <DropdownMenuItem
                          key={s.slug}
                          onClick={(e) => { e.stopPropagation(); handleTransferir(a, s.slug); }}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> {s.nome}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Botão "Assumir" grande quando é aberto ou em_ia */}
                {(a.status === "aberto" || a.status === "em_ia") && (
                  <div className="px-3 pb-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full h-7 text-[10px]"
                      onClick={(e) => { e.stopPropagation(); handleAssumir(a); }}
                    >
                      <UserCheck className="h-3 w-3 mr-1.5" />
                      Assumir atendimento
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

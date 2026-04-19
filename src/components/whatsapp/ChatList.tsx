import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, Users, Pin, VolumeX } from "lucide-react";
import { ContactAvatar } from "./ContactAvatar";
import type { WhatsAppConversation } from "@/types/whatsapp";
import { cn } from "@/lib/utils";

interface Props {
  conversations: WhatsAppConversation[];
  selectedPhone: string | null;
  onSelect: (conv: WhatsAppConversation) => void;
  loading?: boolean;
  filter?: "all" | "unread" | "groups" | "contacts";
  onFilterChange?: (filter: "all" | "unread" | "groups" | "contacts") => void;
}

function formatTel(t: string): string {
  const d = String(t || "").replace(/\D/g, "");
  if (d.length >= 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, -4)}-${d.slice(-4)}`;
  return t;
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const yest = new Date(); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ChatList({
  conversations, selectedPhone, onSelect, loading, filter = "all", onFilterChange,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = conversations;
    if (filter === "unread") list = list.filter((c) => c.nao_lidas > 0);
    else if (filter === "groups") list = list.filter((c) => c.is_group);
    else if (filter === "contacts") list = list.filter((c) => !c.is_group);
    if (term) {
      list = list.filter((c) =>
        (c.chat_nome || c.associado_nome || "").toLowerCase().includes(term) ||
        c.telefone.includes(term.replace(/\D/g, "")),
      );
    }
    return list;
  }, [conversations, q, filter]);

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Busca */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar conversa..."
            className="pl-9 h-9 bg-muted/30 border-0"
          />
        </div>
      </div>

      {/* Filtros */}
      {onFilterChange && (
        <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
          {([
            { key: "all", label: "Todas" },
            { key: "unread", label: "Não lidas" },
            { key: "groups", label: "Grupos" },
            { key: "contacts", label: "Contatos" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <MessageSquare className="h-10 w-10 opacity-40" />
            <p className="text-sm">Nenhuma conversa</p>
          </div>
        ) : (
          filtered.map((c) => {
            const selected = c.telefone === selectedPhone;
            const displayName = c.chat_nome || c.associado_nome || formatTel(c.telefone);
            return (
              <button
                key={c.telefone}
                onClick={() => onSelect(c)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/50 border-b border-border/50 text-left transition-colors",
                  selected && "bg-accent",
                )}
              >
                <ContactAvatar
                  name={displayName}
                  url={c.chat_avatar_url}
                  isGroup={c.is_group}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      {c.is_group && <Users className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      <p className="font-medium text-sm truncate">{displayName}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.is_muted && <VolumeX className="h-3 w-3 text-muted-foreground/70" />}
                      {c.is_pinned && <Pin className="h-3 w-3 text-muted-foreground/70" />}
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(c.ultima_mensagem_em)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      {c.ultima_direction === "out" && (
                        <span className="text-muted-foreground/70">Você: </span>
                      )}
                      {c.is_group && c.ultima_direction === "in" && c.ultima_sender_name && (
                        <span className="text-muted-foreground/80">{c.ultima_sender_name}: </span>
                      )}
                      {c.ultima_mensagem || "(mídia)"}
                    </p>
                    {c.nao_lidas > 0 && (
                      <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-success text-success-foreground shrink-0">
                        {c.nao_lidas}
                      </Badge>
                    )}
                  </div>
                  {c.labels && c.labels.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {c.labels.slice(0, 3).map((l) => (
                        <span
                          key={l.id}
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: (l.cor || "#3b82f6") + "20",
                            color: l.cor || "#3b82f6",
                          }}
                        >
                          {l.nome}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

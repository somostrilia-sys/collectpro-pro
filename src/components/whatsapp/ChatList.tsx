import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";
import type { WhatsAppConversation } from "@/types/whatsapp";
import { cn } from "@/lib/utils";

interface Props {
  conversations: WhatsAppConversation[];
  selectedPhone: string | null;
  onSelect: (conv: WhatsAppConversation) => void;
  loading?: boolean;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "??";
}

function formatTel(t: string): string {
  const d = String(t || "").replace(/\D/g, "");
  if (d.length >= 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, -4)}-${d.slice(-4)}`;
  return t;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const yest = new Date(); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ChatList({ conversations, selectedPhone, onSelect, loading }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) =>
      (c.associado_nome || "").toLowerCase().includes(term) ||
      c.telefone.includes(term.replace(/\D/g, "")),
    );
  }, [conversations, q]);

  return (
    <div className="flex flex-col h-full border-r bg-background">
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

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <MessageSquare className="h-10 w-10 opacity-40" />
            <p className="text-sm">Nenhuma conversa ainda</p>
          </div>
        ) : (
          filtered.map((c) => {
            const selected = c.telefone === selectedPhone;
            const name = c.associado_nome || formatTel(c.telefone);
            return (
              <button
                key={c.telefone}
                onClick={() => onSelect(c)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/50 border-b border-border/50 text-left transition-colors",
                  selected && "bg-accent",
                )}
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(c.ultima_mensagem_em)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      {c.ultima_direction === "out" && <span className="text-muted-foreground/70">Você: </span>}
                      {c.ultima_mensagem || "(mídia)"}
                    </p>
                    {c.nao_lidas > 0 && (
                      <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-success text-success-foreground shrink-0">
                        {c.nao_lidas}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

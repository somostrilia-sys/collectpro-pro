import type { WhatsAppReaction } from "@/types/whatsapp";
import { cn } from "@/lib/utils";

interface Props {
  reactions: WhatsAppReaction[];
  className?: string;
}

export function ReactionsBar({ reactions, className }: Props) {
  if (!reactions || reactions.length === 0) return null;

  // Agrupa emojis iguais
  const grouped = new Map<string, number>();
  for (const r of reactions) {
    if (!r.emoji) continue;
    grouped.set(r.emoji, (grouped.get(r.emoji) ?? 0) + 1);
  }

  if (grouped.size === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1 -mt-1 ml-1", className)}>
      {Array.from(grouped.entries()).map(([emoji, count]) => (
        <span
          key={emoji}
          className="inline-flex items-center gap-0.5 bg-white dark:bg-card rounded-full px-1.5 py-0.5 text-xs shadow-sm border border-border/40"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-[10px] text-muted-foreground">{count}</span>}
        </span>
      ))}
    </div>
  );
}

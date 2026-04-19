import { ContactAvatar } from "./ContactAvatar";
import { cn } from "@/lib/utils";

interface Props {
  name: string | null | undefined;
  avatarUrl?: string | null;
  showAvatar?: boolean;
  className?: string;
}

// Cores fixas por sender (consistência visual estilo WhatsApp)
const SENDER_COLORS = [
  "text-rose-600 dark:text-rose-400",
  "text-sky-600 dark:text-sky-400",
  "text-amber-600 dark:text-amber-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-violet-600 dark:text-violet-400",
  "text-fuchsia-600 dark:text-fuchsia-400",
  "text-orange-600 dark:text-orange-400",
  "text-teal-600 dark:text-teal-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-cyan-600 dark:text-cyan-400",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

export function GroupSenderHeader({ name, avatarUrl, showAvatar = true, className }: Props) {
  const displayName = name || "Desconhecido";
  const color = colorFromName(displayName);
  return (
    <div className={cn("flex items-center gap-1.5 mb-0.5", className)}>
      {showAvatar && (
        <ContactAvatar name={displayName} url={avatarUrl} size="sm" className="h-5 w-5" />
      )}
      <span className={cn("text-xs font-semibold", color)}>{displayName}</span>
    </div>
  );
}

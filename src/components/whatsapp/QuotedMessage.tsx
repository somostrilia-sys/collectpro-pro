import { cn } from "@/lib/utils";

interface Props {
  senderName?: string | null;
  body?: string | null;
  className?: string;
  onClick?: () => void;
}

export function QuotedMessage({ senderName, body, className, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md bg-black/5 dark:bg-white/5 border-l-4 border-primary px-2 py-1.5 mb-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
        className,
      )}
    >
      {senderName && (
        <p className="text-[11px] font-semibold text-primary truncate">{senderName}</p>
      )}
      <p className="text-xs text-muted-foreground line-clamp-2 break-words">
        {body || "[mídia]"}
      </p>
    </button>
  );
}

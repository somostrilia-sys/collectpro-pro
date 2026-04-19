import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  name: string | null | undefined;
  className?: string;
}

export function AttendantBadge({ name, className }: Props) {
  if (!name) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/80 mb-0.5",
        className,
      )}
    >
      <User className="h-2.5 w-2.5 opacity-70" />
      {name}
    </span>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  name?: string | null;
  url?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  isGroup?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-xl",
};

export function ContactAvatar({ name, url, size = "md", isGroup, className }: Props) {
  const initials = (name || "").split(" ").filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";

  return (
    <Avatar className={cn(sizeClasses[size], "shrink-0", className)}>
      {url && <AvatarImage src={url} alt={name || ""} />}
      <AvatarFallback
        className={cn(
          "font-semibold",
          isGroup
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "bg-primary/10 text-primary",
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

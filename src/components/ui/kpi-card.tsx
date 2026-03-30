import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  gradient?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

const gradientStyles = {
  primary: { bg: "bg-primary/10", text: "text-primary", icon: "text-primary" },
  success: { bg: "bg-success/10", text: "text-success", icon: "text-success" },
  warning: { bg: "bg-warning/10", text: "text-warning", icon: "text-warning" },
  danger: { bg: "bg-destructive/10", text: "text-destructive", icon: "text-destructive" },
};

export function KPICard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  gradient = "primary",
  className,
}: KPICardProps) {
  const style = gradientStyles[gradient];

  return (
    <Card className={cn("border-0 shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {change && (
              <p className={cn("text-xs font-medium", {
                "text-success": changeType === "positive",
                "text-destructive": changeType === "negative",
                "text-muted-foreground": changeType === "neutral",
              })}>
                {change}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn("rounded-xl p-2.5", style.bg)}>
              <Icon className={cn("h-5 w-5", style.icon)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

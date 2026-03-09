import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function KPICard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  gradient = "primary",
  className,
}: KPICardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div
        className={cn(
          "absolute inset-0 opacity-10",
          {
            "bg-gradient-to-br from-collectpro-blue-dark to-collectpro-blue-accent": gradient === "primary",
            "bg-gradient-to-br from-success to-success/80": gradient === "success",
            "bg-gradient-to-br from-warning to-warning/80": gradient === "warning",
            "bg-gradient-to-br from-destructive to-destructive/80": gradient === "danger",
          }
        )}
      />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className={cn(
            "h-4 w-4",
            {
              "text-collectpro-blue-accent": gradient === "primary",
              "text-success": gradient === "success",
              "text-warning": gradient === "warning",
              "text-destructive": gradient === "danger",
            }
          )} />
        )}
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {change && (
          <p
            className={cn(
              "text-xs font-medium",
              {
                "text-success": changeType === "positive",
                "text-destructive": changeType === "negative",
                "text-muted-foreground": changeType === "neutral",
              }
            )}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
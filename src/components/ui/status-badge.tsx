import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  className?: string;
}

export function StatusBadge({ status, variant = "default", className }: StatusBadgeProps) {
  const getVariantByStatus = (status: string) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes("pago") || statusLower.includes("ativo") || statusLower.includes("positivo")) {
      return "success";
    }
    
    if (statusLower.includes("vencido") || statusLower.includes("inadimplente") || statusLower.includes("negativo")) {
      return "destructive";
    }
    
    if (statusLower.includes("pendente") || statusLower.includes("aguardando")) {
      return "warning";
    }
    
    return variant;
  };

  const finalVariant = getVariantByStatus(status);

  return (
    <Badge
      variant={finalVariant as any}
      className={cn(
        "text-xs font-medium",
        {
          "bg-success/10 text-success hover:bg-success/20": finalVariant === "success",
          "bg-warning/10 text-warning hover:bg-warning/20": finalVariant === "warning",
        },
        className
      )}
    >
      {status}
    </Badge>
  );
}
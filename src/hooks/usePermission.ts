import { useAuth } from "@/contexts/AuthContext";
import type { NivelAcesso, Permissoes } from "@/types/permissions";

export function usePermission(module: keyof Permissoes): NivelAcesso {
  const { permissions } = useAuth();
  if (!permissions) return "nenhum";
  return permissions[module];
}

export function useCanAccess(module: keyof Permissoes): boolean {
  const nivel = usePermission(module);
  return nivel !== "nenhum";
}

export function useCanEdit(module: keyof Permissoes): boolean {
  const nivel = usePermission(module);
  return nivel === "total" || nivel === "proprio";
}

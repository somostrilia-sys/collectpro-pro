import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Shield } from 'lucide-react';
import { MODULE_ROUTE_MAP } from '@/types/permissions';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, permissions, isBlocked, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isBlocked) {
    signOut();
    return <Navigate to="/login" replace />;
  }

  const module = MODULE_ROUTE_MAP[location.pathname];
  if (module && permissions && permissions[module] === "nenhum") {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar este módulo.</p>
        <Link to="/" className="text-primary hover:underline">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

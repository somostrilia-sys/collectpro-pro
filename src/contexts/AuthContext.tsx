import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Perfil, Permissoes } from '@/types/permissions';
import { getDefaultPermissoes, mapRoleToPerfil } from '@/types/permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  role: Perfil | null;
  permissions: Permissoes | null;
  isBlocked: boolean;
  fullName: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  role: null,
  permissions: null,
  isBlocked: false,
  fullName: null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Perfil | null>(null);
  const [permissions, setPermissions] = useState<Permissoes | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.functions.invoke("manage-users", {
        body: { action: "get_profile", user_id: userId },
      });
      const profile = data?.profile;

      if (profile) {
        setFullName(profile.full_name || null);

        if (profile.role === "bloqueado") {
          setIsBlocked(true);
          setRole(null);
          setPermissions(null);
          return;
        }

        setIsBlocked(false);
        const perfil = mapRoleToPerfil(profile.role);
        setRole(perfil);

        if (profile.permissions) {
          setPermissions(profile.permissions as Permissoes);
        } else {
          setPermissions(getDefaultPermissoes(perfil));
        }
      } else {
        // No profile found, set defaults
        setRole("Colaborador");
        setPermissions(getDefaultPermissoes("Colaborador"));
        setFullName(null);
        setIsBlocked(false);
      }
    } catch {
      // On error, set safe defaults
      setRole("Colaborador");
      setPermissions(getDefaultPermissoes("Colaborador"));
      setFullName(null);
      setIsBlocked(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleSession = async (newSession: Session | null) => {
      if (!mounted) return;

      setSession(newSession);
      const newUser = newSession?.user ?? null;
      setUser(newUser);

      if (newUser) {
        await fetchProfile(newUser.id);
      } else {
        setRole(null);
        setPermissions(null);
        setIsBlocked(false);
        setFullName(null);
      }

      if (mounted) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, role, permissions, isBlocked, fullName }}>
      {children}
    </AuthContext.Provider>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function Login() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast({ title: 'Erro', description: 'Informe o e-mail.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      toast({ title: 'E-mail enviado!', description: 'Verifique sua caixa de entrada para redefinir a senha.' });
      setShowResetPassword(false);
      setResetEmail('');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Ocorreu um erro.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) throw error;

      // Check if user is blocked
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authUser.id)
          .single();
        if (profile?.role === "bloqueado") {
          await supabase.auth.signOut();
          throw new Error("Sua conta está bloqueada. Contate o administrador.");
        }
      }

      navigate('/');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Credenciais inválidas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: signupName },
        },
      });
      if (error) throw error;
      toast({ title: 'Conta criada!', description: 'Verifique seu e-mail para confirmar o cadastro.' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Ocorreu um erro. Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Designer image fullscreen */}
      <div
        className="hidden md:flex md:w-1/2 relative"
        style={{
          backgroundImage: "url('/login-bg.png'), url('/login-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Overlay sutil para garantir legibilidade */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Right Panel - Form */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-12"
        style={{ backgroundColor: '#0d1117' }}
      >
        <div className="w-full max-w-md">
          {/* Logo + subtítulo */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/logo-collectpro.png"
              alt="CollectPro"
              className="w-full object-contain"
            />
          </div>

          {/* Card do formulário */}
          <div
            className="rounded-2xl p-8"
            style={{ backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Tabs defaultValue="login" className="w-full">
              <TabsList
                className="grid w-full grid-cols-2 h-10 mb-6 rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                <TabsTrigger
                  value="login"
                  className="text-sm font-medium rounded-md text-white/50 data-[state=active]:text-white data-[state=active]:shadow-none"
                  style={{ ['--tw-data-active-bg' as any]: '#2e5ac1' }}
                >
                  Entrar
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="text-sm font-medium rounded-md text-white/50 data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  Criar Conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-white/60">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-9 h-11 text-sm text-white placeholder:text-white/20 border-0 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-white/60">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        type="password"
                        placeholder="Sua senha"
                        className="pl-9 h-11 text-sm text-white placeholder:text-white/20 border-0 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-white rounded-lg mt-2 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#2e5ac1' }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Entrar</>}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setShowResetPassword(true); setResetEmail(loginEmail); }}
                    className="w-full text-center text-xs text-white/40 hover:text-white/70 mt-3 transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-white/60">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        type="text"
                        placeholder="Seu nome"
                        className="pl-9 h-11 text-sm text-white placeholder:text-white/20 border-0 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-white/60">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-9 h-11 text-sm text-white placeholder:text-white/20 border-0 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-white/60">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        className="pl-9 h-11 text-sm text-white placeholder:text-white/20 border-0 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-white rounded-lg mt-2 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#2e5ac1' }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Criar Conta</>}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-center text-white/20 text-xs mt-6">© {new Date().getFullYear()} CollectPro</p>
        </div>
      </div>

      {/* Modal Recuperação de Senha */}
      {showResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-2xl p-8 w-full max-w-sm mx-4" style={{ backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-lg font-semibold text-white mb-2">Recuperar Senha</h2>
            <p className="text-sm text-white/50 mb-4">Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-9 h-11 text-sm text-white placeholder:text-white/20 border-0 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 font-semibold text-white rounded-lg"
                style={{ backgroundColor: '#2e5ac1' }}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar Link'}
              </Button>
              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Voltar ao login
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

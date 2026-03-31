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
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) throw error;
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
      {/* Left Panel - Designer image */}
      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12" style={{ backgroundColor: '#0f1623' }}>
        <div className="w-full max-w-md space-y-8">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <img src="/logo-collectpro.png" alt="CollectPro" className="h-24 object-contain" />
            <p className="text-sm text-white/50">Acesse sua conta para continuar</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
              <TabsTrigger value="login" className="text-sm font-medium text-white data-[state=active]:bg-[#2e5ac1] data-[state=active]:text-white">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm font-medium text-white/60 data-[state=active]:bg-[#2e5ac1] data-[state=active]:text-white">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-white/80">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input id="login-email" type="email" placeholder="seu@email.com" className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#2e5ac1]" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium text-white/80">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input id="login-password" type="password" placeholder="Sua senha" className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#2e5ac1]" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required minLength={6} />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-medium text-white" style={{ backgroundColor: '#2e5ac1' }} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium text-white/80">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input id="signup-name" type="text" placeholder="Seu nome" className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#2e5ac1]" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-white/80">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input id="signup-email" type="email" placeholder="seu@email.com" className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#2e5ac1]" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-white/80">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#2e5ac1]" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-medium text-white" style={{ backgroundColor: '#2e5ac1' }} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

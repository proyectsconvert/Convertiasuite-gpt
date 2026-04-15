import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AuthPage() {
  const { authTab, setAuthTab, setView } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'var(--gradient-primary)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-background blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-background blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-background/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary-foreground">convert-IA</span>
          </div>
          <h2 className="text-4xl font-extrabold text-primary-foreground leading-tight mb-6">
            Tu plataforma de IA empresarial todo en uno
          </h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed mb-10">
            Chat, documentos, presentaciones, análisis y más. Todo potenciado por los mejores modelos de inteligencia artificial.
          </p>
          <div className="space-y-4">
            {['Múltiples modelos de IA', 'Seguridad empresarial', 'Integración completa'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                </div>
                <span className="text-primary-foreground/90 text-sm font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <button onClick={() => setView('landing')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </button>

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">convert-IA</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {authTab === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {authTab === 'login' ? 'Ingresa tus credenciales para continuar' : 'Comienza a usar convert-IA en segundos'}
          </p>

          {/* OAuth */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { name: 'Google', icon: 'G' },
              { name: 'GitHub', icon: '⌘' },
              { name: 'Microsoft', icon: 'M' },
            ].map((p) => (
              <Button key={p.name} variant="outline" className="h-11 text-sm font-medium" onClick={() => setView('dashboard')}>
                <span className="font-bold mr-1.5">{p.icon}</span> {p.name}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase">o continúa con email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {authTab === 'register' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-11" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" placeholder="correo@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type={showPassword ? 'text' : 'password'} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authTab === 'login' && (
              <div className="text-right">
                <button type="button" className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</button>
              </div>
            )}
            <Button type="submit" className="w-full h-11 btn-primary-gradient text-base">
              {authTab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {authTab === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button onClick={() => setAuthTab(authTab === 'login' ? 'register' : 'login')} className="text-primary font-medium hover:underline">
              {authTab === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

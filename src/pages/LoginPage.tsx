import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Banknote,
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, signUp } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const resetMessages = () => {
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const handleTabChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetMessages();
    setPassword('');
    setConfirmPassword('');
  };

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!name.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      setErrorMessage('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    const result = await signUp(name.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    } else if (result.requiresConfirmation) {
      setInfoMessage('¡Registro exitoso! Te hemos enviado un correo de confirmación. Revisa tu bandeja de entrada para continuar.');
      setMode('login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F4F4F5] flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] border border-[#1F1F1F] flex items-center justify-center text-[#22C55E] mx-auto shadow-lg">
            <Banknote className="w-8 h-8 text-[#22C55E]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase">GESTOR DE PRÉSTAMOS</h1>
          <p className="text-xs text-zinc-500 font-medium">Autenticación con Supabase Cloud</p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#161616] border border-[#1F1F1F] rounded-xl text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => handleTabChange('login')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[#22C55E] text-black shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('register')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-[#22C55E] text-black shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Alert Error Box */}
        {errorMessage && (
          <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Alert Info Box */}
        {infoMessage && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMessage}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#22C55E] hover:bg-green-400 text-black font-bold text-xs rounded transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Iniciando Sesión...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Nombre Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Contraseña (Mínimo 6 caracteres)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#22C55E] hover:bg-green-400 text-black font-bold text-xs rounded transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando usuario...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Cuenta</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="p-3 bg-[#161616] rounded-lg border border-[#1F1F1F] text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span>Protegido con Supabase Auth</span>
        </div>
      </div>
    </div>
  );
};


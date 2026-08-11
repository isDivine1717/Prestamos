import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Banknote, ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useApp();

  const [email, setEmail] = useState('admin@prestamos.mx');
  const [password, setPassword] = useState('admin123');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F4F4F5] flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] border border-[#1F1F1F] flex items-center justify-center text-[#22C55E] mx-auto shadow-lg">
            <Banknote className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase">GESTOR DE PRÉSTAMOS</h1>
          <p className="text-xs text-zinc-500 font-medium">Acceso Privado para Administrador</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#22C55E] hover:bg-green-400 text-black font-bold text-xs rounded transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2 uppercase tracking-wider"
          >
            <span>Iniciar Sesión</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="p-3 bg-[#161616] rounded-lg border border-[#1F1F1F] text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span>Sistema protegido con encriptación local</span>
        </div>
      </div>
    </div>
  );
};

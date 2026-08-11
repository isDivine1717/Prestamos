import React from 'react';
import { useApp, AppTab } from '../context/AppContext';
import { Home, Users, Banknote, BarChart3, Settings, LogOut, ShieldCheck, Plus } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, adminUser, logout, setIsNewLoanModalOpen, setIsNewClientModalOpen } = useApp();

  const navItems: { id: AppTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'inicio', label: 'Inicio', icon: <Home className="w-5 h-5" /> },
    { id: 'cobranza', label: 'Cobranza', icon: <Banknote className="w-5 h-5" /> },
    { id: 'clientes', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
    { id: 'reportes', label: 'Reportes', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'configuracion', label: 'Configuración', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0D0D0D] border-r border-[#1F1F1F] text-[#F4F4F5] h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#1F1F1F] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#1F1F1F] flex items-center justify-center text-[#22C55E] font-black shadow-lg">
            <Banknote className="w-5 h-5 text-[#22C55E]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Gestor<span className="text-[#22C55E]">Préstamos</span></h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Sistema de Cobranza</p>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="p-4 space-y-2">
        <button
          onClick={() => setIsNewLoanModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F97316] hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-lg text-xs tracking-wider uppercase transition-all shadow-lg shadow-orange-900/20 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Nuevo Préstamo</span>
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 space-y-1 py-2 overflow-y-auto">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#1A1A1A] text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full transition-colors ${isActive ? 'bg-[#22C55E]' : 'bg-transparent border border-zinc-600'}`}></span>
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer User Block */}
      <div className="p-6 border-t border-[#1F1F1F]">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {adminUser.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{adminUser.name}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Sesión Activa</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-2 px-4 bg-zinc-900 border border border-zinc-800 hover:border-zinc-700 rounded-md text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

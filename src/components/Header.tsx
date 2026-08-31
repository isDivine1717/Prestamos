import React from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, UserPlus, Calendar, Shield } from 'lucide-react';
import { getTodayFormatted, formatDateLocale } from '../utils/dates';

export const Header: React.FC = () => {
  const {
    activeTab,
    searchQuery,
    setSearchQuery,
    setIsNewLoanModalOpen,
    setIsLoanTypeSelectModalOpen,
    setIsNewClientModalOpen,
    adminUser,
    loans
  } = useApp();

  const todayStr = getTodayFormatted();
  const formattedToday = formatDateLocale(todayStr, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const titles: Record<string, { title: string; subtitle: string }> = {
    inicio: { title: 'Resumen del Día', subtitle: formattedToday },
    cobranza: { title: 'Panel de Cobranza', subtitle: formattedToday },
    clientes: { title: 'Directorio de Clientes', subtitle: 'Expedientes y Calificación' },
    reportes: { title: 'Rendimiento Financiero', subtitle: 'Capital, Ganancias y Retorno' },
    configuracion: { title: 'Configuración de Sistema', subtitle: 'Parámetros Globales' },
  };

  const currentInfo = titles[activeTab] || { title: 'Gestor de Préstamos', subtitle: formattedToday };

  const overdueCount = loans.filter(l => l.status === 'overdue').length;

  return (
    <header className="h-20 border-b border-[#1F1F1F] flex items-center justify-between px-4 md:px-10 bg-[#0A0A0A] sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center justify-between w-full gap-4">
        {/* Left Title & Date */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
            <span>{currentInfo.title}</span>
            {overdueCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded uppercase tracking-tighter">
                {overdueCount} Atrasos
              </span>
            )}
          </h2>
          <p className="text-sm font-semibold text-zinc-200 capitalize mt-0.5">{currentInfo.subtitle}</p>
        </div>

        {/* Right Search & Action Buttons */}
        <div className="flex items-center space-x-3 flex-wrap">
          {/* Search bar */}
          <div className="relative hidden lg:block w-56">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full bg-[#111111] border border-[#1F1F1F] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#22C55E]"
            />
          </div>

          <button
            onClick={() => setIsLoanTypeSelectModalOpen(true)}
            className="px-4 py-2 bg-[#F97316] text-white text-xs font-bold rounded shadow-lg shadow-orange-900/20 hover:bg-orange-600 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ AGREGAR PRÉSTAMO</span>
          </button>

          <button
            onClick={() => setIsNewClientModalOpen(true)}
            className="px-4 py-2 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>NUEVO CLIENTE</span>
          </button>
        </div>
      </div>
    </header>
  );
};

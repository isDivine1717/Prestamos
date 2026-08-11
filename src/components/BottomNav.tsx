import React from 'react';
import { useApp, AppTab } from '../context/AppContext';
import { Home, Users, Banknote, BarChart3, Settings } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const items: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'inicio', label: 'Inicio', icon: <Home className="w-5 h-5" /> },
    { id: 'cobranza', label: 'Cobranza', icon: <Banknote className="w-5 h-5" /> },
    { id: 'clientes', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
    { id: 'reportes', label: 'Reportes', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'configuracion', label: 'Ajustes', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-md border-t border-[#1F1F1F] px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {items.map(item => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              isActive ? 'text-[#22C55E] font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-[#1A1A1A] text-[#22C55E]' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

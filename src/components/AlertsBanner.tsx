import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertCircle, Clock, ChevronRight } from 'lucide-react';

export const AlertsBanner: React.FC = () => {
  const { loans, setActiveTab, setFilterStatus } = useApp();

  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const gracePeriodLoans = loans.filter(l => {
    if (l.status !== 'active') return false;
    const paidCount = l.schedule.filter(s => s.status === 'paid' || s.status === 'surplus').length;
    return paidCount >= 60 && l.balancePending > 0;
  });

  if (overdueLoans.length === 0 && gracePeriodLoans.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-2">
      {overdueLoans.length > 0 && (
        <div className="bg-[#111111] border border-red-900/60 rounded-xl p-3.5 px-4 flex items-center justify-between gap-3 text-red-400">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-950/60 rounded-lg text-red-500 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                {overdueLoans.length} {overdueLoans.length === 1 ? 'PRÉSTAMO' : 'PRÉSTAMOS'} EN ATRASO
              </p>
              <p className="text-[11px] text-zinc-500">
                Se requiere gestión de cobranza prioritaria para regularizar saldos.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('cobranza');
            }}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded transition-colors shrink-0 cursor-pointer"
          >
            <span>Ver Cobranza</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {gracePeriodLoans.length > 0 && (
        <div className="bg-[#111111] border border-orange-900/60 rounded-xl p-3.5 px-4 flex items-center justify-between gap-3 text-[#F97316]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-950/60 rounded-lg text-[#F97316] shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                {gracePeriodLoans.length} {gracePeriodLoans.length === 1 ? 'PRÉSTAMO EN' : 'PRÉSTAMOS EN'} DÍAS DE GRACIA (DÍAS 61-65)
              </p>
              <p className="text-[11px] text-zinc-500">
                El cliente puede completar su saldo pendiente antes de la fecha límite final.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('cobranza');
            }}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#F97316] hover:bg-orange-600 text-white rounded transition-colors shrink-0 cursor-pointer"
          >
            <span>Revisar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

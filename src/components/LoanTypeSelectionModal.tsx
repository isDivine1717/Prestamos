import React from 'react';
import { X, Calendar, CheckCircle2, Plus, History, ArrowRight } from 'lucide-react';

interface LoanTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewLoan: () => void;
  onSelectPaidLoan: () => void;
  clientName?: string;
}

export const LoanTypeSelectionModal: React.FC<LoanTypeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectNewLoan,
  onSelectPaidLoan,
  clientName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="loan-type-selection-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="loan-type-selection-modal-content"
        className="w-full max-w-lg bg-[#0E0E0E] border border-[#1F1F1F] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#1F1F1F]">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight uppercase">
              Agregar Préstamo
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {clientName ? `Para: ${clientName}` : 'Selecciona el tipo de préstamo que deseas registrar'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1A1A1A] transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Grid */}
        <div className="p-6 space-y-4">
          {/* Option 1: Crear nuevo préstamo */}
          <button
            type="button"
            onClick={onSelectNewLoan}
            className="w-full text-left p-5 bg-[#141414] hover:bg-[#191919] border border-[#1F1F1F] hover:border-[#22C55E]/60 rounded-xl transition-all group cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] shrink-0 group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-[#22C55E] transition-colors">
                    Crear nuevo préstamo
                  </h3>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-[#22C55E] group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Crear un préstamo nuevo y comenzar su calendario de pagos.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#1A1A1A] text-zinc-300 text-[10px] font-semibold flex items-center gap-1 border border-[#242424]">
                    <Calendar className="w-3 h-3 text-[#22C55E]" />
                    Cobranza activa
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#1A1A1A] text-zinc-300 text-[10px] font-semibold border border-[#242424]">
                    Genera calendario
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Option 2: Agregar préstamo pagado */}
          <button
            type="button"
            onClick={onSelectPaidLoan}
            className="w-full text-left p-5 bg-[#141414] hover:bg-[#191919] border border-[#1F1F1F] hover:border-sky-500/60 rounded-xl transition-all group cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">
                    Agregar préstamo pagado
                  </h3>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Registrar un préstamo anterior que ya fue liquidado.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#1A1A1A] text-zinc-300 text-[10px] font-semibold flex items-center gap-1 border border-[#242424]">
                    <History className="w-3 h-3 text-sky-400" />
                    Histórico libreta
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-950/40 text-sky-300 text-[10px] font-semibold border border-sky-800/40">
                    Sin deuda pendiente
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1F1F1F] bg-[#0A0A0A] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

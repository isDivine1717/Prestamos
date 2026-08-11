import React, { useState } from 'react';
import { Client, Loan } from '../types';
import { useApp } from '../context/AppContext';
import { generateLoanStatementPDF } from '../utils/pdfStatementGenerator';
import { formatCurrency } from '../utils/finance';
import { formatDateLocale } from '../utils/dates';
import { X, FileText, Download, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface StatementModalProps {
  isOpen: boolean;
  client: Client | null;
  loan: Loan | null;
  onClose: () => void;
}

export const StatementModal: React.FC<StatementModalProps> = ({
  isOpen,
  client,
  loan,
  onClose,
}) => {
  const { transactions, showToast } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !client || !loan) return null;

  const clientFullName = `${client.firstName} ${client.lastName}`.trim();
  const paidDaysCount = loan.schedule.filter(s => s.status === 'paid' || s.status === 'surplus').length;
  const overdueDaysCount = loan.schedule.filter(s => s.status === 'overdue').length;

  const handleGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const filename = generateLoanStatementPDF(client, loan, transactions);
      showToast(`Estado de cuenta descargado: ${filename}`, 'success');
      onClose();
    } catch (error) {
      console.error('Error al generar PDF:', error);
      showToast('Ocurrió un error al generar el archivo PDF.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-hidden">
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#1F1F1F] flex items-center justify-between bg-[#161616] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1A1A1A] rounded-xl text-[#22C55E] border border-[#1F1F1F]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Documento Oficial</span>
              <h3 className="text-base font-bold text-white tracking-tight">ESTADO DE CUENTA EN PDF</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 text-zinc-400 hover:text-white bg-[#1A1A1A] border border-[#1F1F1F] rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <p className="text-xs text-zinc-400">
            Vista previa de la información que se incluirá en el documento PDF formal listo para descargar o imprimir:
          </p>

          {/* Client summary box */}
          <div className="bg-[#161616] border border-[#1F1F1F] p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Titular del Expediente</span>
            <p className="text-sm font-bold text-white">{clientFullName}</p>
            <p className="text-xs text-zinc-400">Teléfono: <span className="text-zinc-200 font-mono">{client.phone || 'No registrado'}</span></p>
            {client.address && <p className="text-xs text-zinc-400 truncate">Dirección: <span className="text-zinc-200">{client.address}</span></p>}
          </div>

          {/* Loan details box */}
          <div className="bg-[#161616] border border-[#1F1F1F] p-3.5 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Préstamo {loan.id}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  loan.status === 'liquidated'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-900/40'
                    : loan.status === 'overdue'
                    ? 'bg-red-500/10 text-red-500 border border-red-900/40'
                    : 'bg-green-500/10 text-[#22C55E] border border-green-900/40'
                }`}
              >
                {loan.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#1F1F1F] pt-2">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Fecha inicio:</span>
                <span className="font-bold text-zinc-200">{formatDateLocale(loan.startDate)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Pago diario:</span>
                <span className="font-bold text-[#22C55E]">{formatCurrency(loan.dailyPayment)}</span>
              </div>
            </div>
          </div>

          {/* Financial summary metrics grid */}
          <div className="bg-[#161616] border border-[#1F1F1F] p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center text-zinc-400">
              <span>Capital prestado:</span>
              <span className="font-bold text-zinc-200">{formatCurrency(loan.capital)}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Ganancia pactada:</span>
              <span className="font-bold text-[#22C55E]">{formatCurrency(loan.totalProfit)}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Total pactado:</span>
              <span className="font-bold text-zinc-100">{formatCurrency(loan.totalToPay)}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Total pagado a la fecha:</span>
              <span className="font-bold text-[#22C55E]">{formatCurrency(loan.totalPaid)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#1F1F1F] text-sm font-bold">
              <span className="text-zinc-300">Saldo pendiente:</span>
              <span className={loan.balancePending > 0 ? 'text-red-400' : 'text-[#22C55E]'}>
                {formatCurrency(loan.balancePending)}
              </span>
            </div>
          </div>

          {overdueDaysCount > 0 && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-xs text-red-400 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>El préstamo cuenta con {overdueDaysCount} cuotas con atraso registradas.</span>
            </div>
          )}

          <div className="p-3 bg-[#161616] rounded-xl border border-[#1F1F1F] flex items-center gap-2.5 text-xs text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
            <span>Formato oficial tamaño Carta con tabla paginada e historial completo.</span>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-4 bg-[#161616] border-t border-[#1F1F1F] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2.5 bg-[#161616] hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded transition-colors cursor-pointer border border-[#1F1F1F] uppercase tracking-wider disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-[#22C55E] hover:bg-green-400 text-black text-xs font-bold rounded transition-colors flex items-center gap-2 cursor-pointer uppercase tracking-wider shadow-lg shadow-green-950/40 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Generar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

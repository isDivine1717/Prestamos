import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Loan, PaymentMethod } from '../types';
import { formatCurrency, calculatePaymentBreakdown, calculateLoanLateFee } from '../utils/finance';
import { getTodayFormatted } from '../utils/dates';
import { X, Check, AlertTriangle, Loader2, Clock } from 'lucide-react';

interface Props {
  loan: Loan | null;
  onClose: () => void;
}

export const RegisterPaymentModal: React.FC<Props> = ({ loan, onClose }) => {
  const { registerPayment } = useApp();

  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const lateFeeInfo = loan ? calculateLoanLateFee(loan) : {
    isLateFeeApplicable: false,
    overdueDays: 0,
    percentage: 0,
    dailyLateFee: 0,
    totalLateFee: 0,
    rateDescription: 'Sin recargo'
  };

  const totalExpectedWithLateFee = loan
    ? (loan.schedule.find(s => s.date === getTodayFormatted())?.expectedAmount ?? loan.dailyPayment) + lateFeeInfo.totalLateFee
    : 0;

  useEffect(() => {
    if (loan) {
      const today = getTodayFormatted();
      const todayEntry = loan.schedule.find(s => s.date === today);
      const expected = todayEntry ? todayEntry.expectedAmount : loan.dailyPayment;
      const currentLateFee = calculateLoanLateFee(loan);
      
      // Default to cuota de hoy + recargo si existe atraso
      const defaultAmount = currentLateFee.isLateFeeApplicable && currentLateFee.totalLateFee > 0
        ? expected + currentLateFee.totalLateFee
        : expected;

      setAmountReceived(String(defaultAmount));
      setPaymentMethod('cash');
      setNote('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [loan]);

  if (!loan) return null;

  const numericAmount = parseFloat(amountReceived) || 0;
  const todayStr = getTodayFormatted();
  const todaySchedule = loan.schedule.find(s => s.date === todayStr);
  const expectedAmount = todaySchedule ? todaySchedule.expectedAmount : loan.dailyPayment;

  // Portion of received amount dedicated to late fee
  const lateFeePortion = lateFeeInfo.isLateFeeApplicable && lateFeeInfo.totalLateFee > 0
    ? Math.min(numericAmount, lateFeeInfo.totalLateFee)
    : 0;

  const difference = numericAmount - (expectedAmount + lateFeeInfo.totalLateFee);
  const breakdown = calculatePaymentBreakdown(numericAmount, loan.capital, loan.totalToPay, lateFeePortion);
  const overdueDaysCount = loan.schedule.filter(s => s.status === 'overdue').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Por favor ingrese un monto válido mayor a $0.');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const success = registerPayment({
        loanId: loan.id,
        amountReceived: numericAmount,
        paymentMethod,
        note: note.trim() || undefined,
        lateFeePortion: breakdown.lateFeePortion,
      });

      if (success) {
        onClose();
      } else {
        setErrorMessage('Ocurrió un error al registrar el pago. Inténtalo de nuevo.');
      }
    } catch (error) {
      setErrorMessage('Error al procesar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-hidden">
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Sticky Header */}
        <div className="p-4 sm:p-5 border-b border-[#1F1F1F] flex items-center justify-between bg-[#161616] shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cobranza Diaria</span>
            <h3 className="text-base font-bold text-white tracking-tight">REGISTRAR PAGO</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-zinc-400 hover:text-white bg-[#1A1A1A] border border-[#1F1F1F] rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="payment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-400 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Client & Loan Info Card */}
          <div className="bg-[#161616] p-3.5 sm:p-4 rounded-xl border border-[#1F1F1F] space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{loan.clientName}</h4>
                <p className="text-xs text-zinc-500 truncate">
                  ID Préstamo: <span className="font-mono text-zinc-300">{loan.id}</span>
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  loan.status === 'overdue' || lateFeeInfo.isLateFeeApplicable
                    ? 'bg-red-500/10 text-red-500 border border-red-900/40'
                    : 'bg-green-500/10 text-[#22C55E] border border-green-900/40'
                }`}
              >
                {loan.status === 'overdue' || lateFeeInfo.isLateFeeApplicable ? 'CON ATRASO' : 'ACTIVO'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1F1F1F] text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Cuota diaria base:</span>
                <span className="font-bold text-[#22C55E] text-xs">{formatCurrency(expectedAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Saldo total restante:</span>
                <span className="font-bold text-zinc-200 text-xs">{formatCurrency(loan.balancePending)}</span>
              </div>
            </div>

            {lateFeeInfo.isLateFeeApplicable && lateFeeInfo.totalLateFee > 0 && (
              <div className="mt-2 p-2.5 bg-orange-950/30 rounded-lg border border-orange-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-orange-400 font-bold">
                  <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Días de retraso: {lateFeeInfo.overdueDays} día(s)</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-300 pt-1">
                  <span>Recargo por retraso ({lateFeeInfo.rateDescription}):</span>
                  <span className="font-bold text-orange-400">+{formatCurrency(lateFeeInfo.totalLateFee)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-white pt-1 border-t border-orange-900/30">
                  <span>Total sugerido (Cuota + Recargo):</span>
                  <span className="text-[#22C55E]">{formatCurrency(totalExpectedWithLateFee)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Amount Received */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
              Monto Recibido ($ MXN) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full bg-[#161616] border border-[#1F1F1F] focus:border-[#22C55E] rounded-xl pl-9 pr-4 py-2.5 text-xl font-bold text-white focus:outline-none transition-colors"
                placeholder="0.00"
              />
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmountReceived(String(expectedAmount))}
                className="px-2.5 py-1 bg-[#161616] hover:bg-zinc-800 text-zinc-300 border border-[#1F1F1F] text-xs rounded font-bold transition-colors cursor-pointer"
              >
                Cuota Base ({formatCurrency(expectedAmount)})
              </button>
              {lateFeeInfo.isLateFeeApplicable && lateFeeInfo.totalLateFee > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountReceived(String(totalExpectedWithLateFee))}
                  className="px-2.5 py-1 bg-orange-950/40 hover:bg-orange-900/60 text-orange-300 text-xs rounded border border-orange-900/60 font-bold transition-colors cursor-pointer"
                >
                  Cuota + Recargo ({formatCurrency(totalExpectedWithLateFee)})
                </button>
              )}
            </div>
          </div>

          {/* Live Breakdown Preview */}
          <div className="p-3 bg-[#161616] rounded-xl border border-[#1F1F1F] text-xs space-y-1.5">
            <div className="flex justify-between items-center text-zinc-400">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Diferencia con cuota del día:</span>
              <span
                className={`font-bold ${
                  difference > 0 ? 'text-[#22C55E]' : difference < 0 ? 'text-[#F97316]' : 'text-zinc-300'
                }`}
              >
                {difference > 0
                  ? `+$${difference.toFixed(2)} Excedente`
                  : difference < 0
                  ? `-$${Math.abs(difference).toFixed(2)} Parcial`
                  : '$0.00 Exacto'}
              </span>
            </div>
            {breakdown.lateFeePortion > 0 && (
              <div className="flex justify-between items-center text-zinc-400 border-t border-[#1F1F1F] pt-1.5 text-orange-400">
                <span className="text-[10px] uppercase font-bold">Cobro de Recargo por mora:</span>
                <span className="font-bold">{formatCurrency(breakdown.lateFeePortion)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-zinc-400 border-t border-[#1F1F1F] pt-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Abono a Capital:</span>
              <span className="font-bold text-zinc-200">{formatCurrency(breakdown.capitalPortion)}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Abono a Ganancia/Interés:</span>
              <span className="font-bold text-[#22C55E]">{formatCurrency(breakdown.profitPortion)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Método de Pago
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'Efectivo', icon: '💵' },
                { id: 'transfer', label: 'Transferencia', icon: '📲' },
                { id: 'deposit', label: 'Depósito', icon: '🏦' },
                { id: 'other', label: 'Otro', icon: '💳' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPaymentMethod(item.id as PaymentMethod)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded border text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === item.id
                      ? 'bg-white text-black font-bold shadow-sm border-white'
                      : 'bg-[#161616] border-[#1F1F1F] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-base mb-0.5">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
              Nota u Observación (Opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Pagó en efectivo por la mañana..."
              className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#22C55E]"
            />
          </div>
        </form>

        {/* Sticky Action Buttons Footer */}
        <div className="p-4 bg-[#161616] border-t border-[#1F1F1F] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-[#161616] hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded transition-colors cursor-pointer uppercase tracking-wider border border-[#1F1F1F] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="payment-form"
            disabled={isSubmitting || numericAmount <= 0}
            className="px-5 py-2.5 bg-[#22C55E] hover:bg-green-400 text-black text-xs font-bold rounded transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider shadow-lg shadow-green-950/40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando pago...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirmar Pago</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

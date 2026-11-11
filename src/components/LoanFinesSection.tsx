import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Loan, LoanFine, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/finance';
import { formatDateLocale, getTodayFormatted } from '../utils/dates';
import { ConfirmDialog } from './ConfirmDialog';
import { AlertTriangle, Check, Plus, X } from 'lucide-react';

interface Props {
  loan: Loan;
}

const STATUS_LABEL: Record<LoanFine['status'], string> = {
  registered: 'REGISTRADA',
  collected: 'COBRADA',
  cancelled: 'CANCELADA',
};

export const LoanFinesSection: React.FC<Props> = ({ loan }) => {
  const { fines, addLoanFine, collectLoanFine, cancelLoanFine } = useApp();

  const loanFines = fines
    .filter(f => f.loanId === loan.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const registeredTotal = loanFines
    .filter(f => f.status === 'registered')
    .reduce((sum, f) => sum + f.amount, 0);
  const collectedTotal = loanFines
    .filter(f => f.status === 'collected')
    .reduce((sum, f) => sum + f.amount, 0);
  const registeredCount = loanFines.filter(f => f.status === 'registered').length;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayFormatted());
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fineToCollect, setFineToCollect] = useState<LoanFine | null>(null);
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>('cash');
  const [isCollecting, setIsCollecting] = useState(false);

  const [fineToCancel, setFineToCancel] = useState<LoanFine | null>(null);

  const handleAddFine = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a $0.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Indica el motivo de la multa.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addLoanFine({
        loanId: loan.id,
        amount: numericAmount,
        date: date || getTodayFormatted(),
        reason: reason.trim(),
        note: note.trim() || undefined,
      });
      setAmount('');
      setReason('');
      setNote('');
      setDate(getTodayFormatted());
      setIsFormOpen(false);
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'No se pudo registrar la multa.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCollect = async () => {
    if (!fineToCollect) return;
    setIsCollecting(true);
    const ok = await collectLoanFine(fineToCollect.id, collectMethod);
    setIsCollecting(false);
    if (ok) setFineToCollect(null);
  };

  return (
    <div className="pt-4 border-t border-zinc-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Multas del préstamo</span>
        </h4>
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-900/60 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isFormOpen ? 'Cerrar formulario' : 'Registrar multa'}</span>
        </button>
      </div>

      {/* Totales de multas */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-3">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Registrado</span>
          <span className="text-sm font-mono font-bold text-zinc-200">{formatCurrency(registeredTotal + collectedTotal)}</span>
          <span className="text-[10px] text-zinc-500 block">{loanFines.length} multa(s) en total</span>
        </div>
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-3">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Cobrado (ganancia)</span>
          <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(collectedTotal)}</span>
          <span className="text-[10px] text-zinc-500 block">Ya cuenta como ganancia</span>
        </div>
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-3">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Pendiente</span>
          <span className="text-sm font-mono font-bold text-amber-400">{formatCurrency(registeredTotal)}</span>
          <span className="text-[10px] text-zinc-500 block">{registeredCount} por cobrar</span>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500">
        Una multa registrada aún no es ganancia: solo las multas cobradas suman a las
        ganancias totales. Al cobrarla se registra su pago y no se vuelve a contar.
      </p>

      {/* Formulario de registro manual */}
      {isFormOpen && (
        <form onSubmit={handleAddFine} className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 space-y-3">
          {errorMessage && (
            <div className="p-2.5 bg-red-950/40 border border-red-900/60 rounded-lg text-xs text-red-400 font-medium">
              {errorMessage}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Monto de la multa ($ MXN) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
              Motivo *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej. No pagó la cuota del 12 de noviembre"
              className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Detalle adicional..."
              className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-[#161616] hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg cursor-pointer border border-[#1F1F1F]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar multa'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de multas */}
      {loanFines.length === 0 ? (
        <div className="p-4 text-center text-zinc-500 text-xs bg-zinc-950 rounded-xl border border-zinc-800">
          Este préstamo no tiene multas registradas.
        </div>
      ) : (
        <div className="space-y-2">
          {loanFines.map(fine => (
            <div
              key={fine.id}
              className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-bold text-white">
                    {formatCurrency(fine.amount)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      fine.status === 'collected'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800/50'
                        : fine.status === 'cancelled'
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          : 'bg-amber-950 text-amber-300 border-amber-800/50'
                    }`}
                  >
                    {STATUS_LABEL[fine.status]}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{fine.reason}</p>
                <p className="text-[11px] text-zinc-500">
                  Registrada: {formatDateLocale(fine.date)}
                  {fine.status === 'collected' && fine.collectedDate && (
                    <> · Cobrada: {formatDateLocale(fine.collectedDate)}</>
                  )}
                  {fine.note && <> · {fine.note}</>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {fine.status === 'registered' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFineToCollect(fine)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Cobrar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFineToCancel(fine)}
                      className="px-3 py-1.5 bg-[#161616] hover:bg-zinc-800 text-zinc-400 text-xs font-bold rounded-lg border border-[#1F1F1F] flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmación de cobro (con método de pago) */}
      {fineToCollect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">¿Cobrar esta multa?</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Se registrará el cobro de {formatCurrency(fineToCollect.amount)} por
              “{fineToCollect.reason}”. La multa pasará a contar como ganancia por
              multas y no se volverá a contar. Este cobro no abona al saldo del préstamo.
            </p>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Método de pago
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    { id: 'cash', label: 'Efectivo' },
                    { id: 'transfer', label: 'Transfer.' },
                    { id: 'deposit', label: 'Depósito' },
                    { id: 'other', label: 'Otro' },
                  ] as const
                ).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCollectMethod(item.id)}
                    className={`p-2 rounded-lg border text-xs font-bold cursor-pointer ${
                      collectMethod === item.id
                        ? 'bg-white text-black border-white'
                        : 'bg-[#161616] border-[#1F1F1F] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFineToCollect(null)}
                disabled={isCollecting}
                className="px-4 py-2 bg-[#161616] hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg cursor-pointer border border-[#1F1F1F] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCollect}
                disabled={isCollecting}
                className="px-4 py-2 bg-[#22C55E] hover:bg-green-400 text-black text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                {isCollecting ? 'Cobrando...' : 'Confirmar cobro'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!fineToCancel}
        title="¿Cancelar esta multa?"
        message={
          fineToCancel
            ? `La multa de ${formatCurrency(fineToCancel.amount)} por “${fineToCancel.reason}” quedará cancelada y nunca contará como ganancia.`
            : ''
        }
        confirmText="Cancelar multa"
        cancelText="Volver"
        isDanger={true}
        onConfirm={async () => {
          if (!fineToCancel) return;
          await cancelLoanFine(fineToCancel.id);
          setFineToCancel(null);
        }}
        onCancel={() => setFineToCancel(null)}
      />
    </div>
  );
};

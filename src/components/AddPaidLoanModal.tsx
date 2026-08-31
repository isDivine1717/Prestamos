import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/finance';
import {
  X,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Loader2,
  User,
  History
} from 'lucide-react';

interface AddPaidLoanModalProps {
  isOpen: boolean;
  preselectedClientId?: string | null;
  onClose: () => void;
}

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export const AddPaidLoanModal: React.FC<AddPaidLoanModalProps> = ({
  isOpen,
  preselectedClientId,
  onClose,
}) => {
  const { clients, createHistoricalPaidLoan } = useApp();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  // Build year list: from currentYear + 1 down to 2018
  const years: number[] = [];
  for (let y = currentYear + 1; y >= 2018; y--) {
    years.push(y);
  }

  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || '');
  const [startMonth, setStartMonth] = useState<number>(currentMonth);
  const [startYear, setStartYear] = useState<number>(currentYear);
  const [endMonth, setEndMonth] = useState<number>(currentMonth);
  const [endYear, setEndYear] = useState<number>(currentYear);
  const [capitalInput, setCapitalInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedClientId(preselectedClientId || (clients[0]?.id ?? ''));
      setStartMonth(currentMonth);
      setStartYear(currentYear);
      setEndMonth(currentMonth);
      setEndYear(currentYear);
      setCapitalInput('');
      setNotes('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen, preselectedClientId, clients, currentMonth, currentYear]);

  if (!isOpen) return null;

  const client = clients.find(c => c.id === selectedClientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedClientId) {
      setErrorMessage('Debes seleccionar un cliente.');
      return;
    }

    const capital = Number(capitalInput);
    if (isNaN(capital) || capital <= 0) {
      setErrorMessage('El monto del préstamo debe ser una cantidad válida mayor a $0.');
      return;
    }

    // Validate dates: end date must not be before start date
    if (endYear < startYear || (endYear === startYear && endMonth < startMonth)) {
      setErrorMessage('La fecha de finalización no puede ser anterior a la fecha inicial.');
      return;
    }

    // Format start & end date strings YYYY-MM-DD
    const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
    // For end date, get the last day of that month or 01
    const lastDayOfMonth = new Date(endYear, endMonth, 0).getDate();
    const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    setIsSubmitting(true);
    try {
      await createHistoricalPaidLoan({
        clientId: selectedClientId,
        startDate: startDateStr,
        endDate: endDateStr,
        capital,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      console.error('Error al guardar préstamo pagado:', err);
      setErrorMessage(
        err?.message || 'Error al guardar el préstamo histórico en Supabase. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="add-paid-loan-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="add-paid-loan-modal-content"
        className="w-full max-w-lg bg-[#0E0E0E] border border-[#1F1F1F] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#1F1F1F] bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight uppercase">
                Agregar Préstamo Pagado
              </h2>
              <p className="text-xs text-zinc-400">
                Registro de crédito histórico liquidado (libreta)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1A1A1A] transition-colors cursor-pointer disabled:opacity-50"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-red-950/50 border border-red-900/70 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
              Cliente *
            </label>

            {preselectedClientId && client ? (
              <div className="p-3 bg-[#161616] border border-[#1F1F1F] rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#22C55E]/15 text-[#22C55E] flex items-center justify-center font-bold text-xs">
                  {client.firstName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {client.firstName} {client.lastName}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    {client.phone} {client.address ? `• ${client.address}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                className="w-full bg-[#161616] border border-[#1F1F1F] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
              >
                <option value="">-- Seleccionar Cliente --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Capital Amount Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
              Monto del Préstamo ($ MXN) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-base pointer-events-none">
                $
              </span>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={capitalInput}
                onChange={(e) => setCapitalInput(e.target.value)}
                placeholder="Ej. 10000"
                className="w-full bg-[#161616] border border-[#1F1F1F] focus:border-[#22C55E] rounded-xl pl-8 pr-4 py-2.5 text-lg font-bold text-white focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Monto total que se prestó y ya fue completamente liquidado.
            </p>
          </div>

          {/* Date Selectors (Month and Year) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Fecha inicial */}
            <div className="p-4 bg-[#141414] border border-[#1F1F1F] rounded-xl space-y-2.5">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Calendar className="w-3.5 h-3.5 text-[#22C55E]" />
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Fecha Inicial *
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] uppercase font-semibold text-zinc-500 mb-1">
                    Mes
                  </label>
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(Number(e.target.value))}
                    className="w-full bg-[#1A1A1A] border border-[#242424] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-semibold text-zinc-500 mb-1">
                    Año
                  </label>
                  <select
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    className="w-full bg-[#1A1A1A] border border-[#242424] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Fecha de finalización */}
            <div className="p-4 bg-[#141414] border border-[#1F1F1F] rounded-xl space-y-2.5">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Fecha de Finalización *
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] uppercase font-semibold text-zinc-500 mb-1">
                    Mes
                  </label>
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(Number(e.target.value))}
                    className="w-full bg-[#1A1A1A] border border-[#242424] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-semibold text-zinc-500 mb-1">
                    Año
                  </label>
                  <select
                    value={endYear}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                    className="w-full bg-[#1A1A1A] border border-[#242424] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
              Notas / Observaciones (Opcional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Préstamo de marzo de 2025, pagado en mayo según libreta de control."
              className="w-full bg-[#161616] border border-[#1F1F1F] focus:border-[#22C55E] rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Estado Automático Box */}
          <div className="p-3.5 bg-sky-950/20 border border-sky-900/40 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sky-300">ESTADO:</span>
                <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 text-[10px] font-bold uppercase tracking-wider border border-sky-800/60">
                  PAGADO / LIQUIDADO
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Este préstamo se registrará exclusivamente como histórico liquidado. No generará calendario, no creará cobros pendientes ni modificará la deuda actual del cliente.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl transition-colors cursor-pointer uppercase tracking-wider disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-sky-950/50 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Guardar préstamo pagado</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProfitType } from '../types';
import { formatCurrency, calculateProfit, calculateDailyPayment, generateLoanSchedule } from '../utils/finance';
import { getTodayFormatted } from '../utils/dates';
import { X, Check, Calculator, UserPlus, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedClientId?: string | null;
}

export const NewLoanModal: React.FC<Props> = ({ isOpen, onClose, preselectedClientId }) => {
  const { clients, createLoan, settings, setIsNewClientModalOpen } = useApp();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [capitalInput, setCapitalInput] = useState<string>('10000');
  const [profitType, setProfitType] = useState<ProfitType>('fixed');
  const [profitInput, setProfitInput] = useState<string>('2000');
  const [normalDays, setNormalDays] = useState<number>(settings.defaultNormalDays || 60);
  const [graceDays, setGraceDays] = useState<number>(settings.defaultGraceDays || 5);
  const [step, setStep] = useState<number>(1); // 1: Config, 2: Calendar & Confirm
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (preselectedClientId) {
      setSelectedClientId(preselectedClientId);
    } else if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [preselectedClientId, clients]);

  if (!isOpen) return null;

  const capital = parseFloat(capitalInput) || 0;
  const profitValue = parseFloat(profitInput) || 0;
  const totalProfit = calculateProfit(capital, profitType, profitValue);
  const totalToPay = capital + totalProfit;
  const dailyPayment = calculateDailyPayment(totalToPay, normalDays);

  const schedulePreview = generateLoanSchedule(getTodayFormatted(), totalToPay, normalDays, graceDays);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedClientId) {
      setErrorMessage('Por favor seleccione un cliente.');
      return;
    }

    if (isNaN(capital) || capital <= 0) {
      setErrorMessage('El capital debe ser mayor a $0.');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      createLoan({
        clientId: selectedClientId,
        capital,
        profitType,
        profitValue,
        totalProfit,
        normalDays,
        graceDays
      });

      onClose();
    } catch (err) {
      setErrorMessage('Ocurrió un error al crear el préstamo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-hidden">
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl w-full max-w-xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1F1F1F] flex items-center justify-between bg-[#161616] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#1A1A1A] rounded-xl text-[#22C55E] border border-[#1F1F1F]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nuevo Crédito</span>
              <h3 className="text-base font-bold text-white tracking-tight">CREAR PRÉSTAMO PERSONAL</h3>
            </div>
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

        {/* Scrollable Body */}
        <form id="new-loan-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-400 font-medium">
              {errorMessage}
            </div>
          )}

          {step === 1 ? (
            <>
              {/* Client Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Cliente Solicitante *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewClientModalOpen(true);
                    }}
                    className="text-xs text-[#22C55E] hover:underline flex items-center gap-1 font-bold uppercase tracking-wider"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Crear cliente</span>
                  </button>
                </div>

                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  required
                  className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Capital Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                  Capital Prestado ($ MXN) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">$</span>
                  <input
                    type="number"
                    step="100"
                    min="100"
                    required
                    value={capitalInput}
                    onChange={(e) => setCapitalInput(e.target.value)}
                    className="w-full bg-[#161616] border border-[#1F1F1F] focus:border-[#22C55E] rounded-xl pl-9 pr-4 py-2.5 text-xl font-bold text-white focus:outline-none transition-colors"
                    placeholder="10000"
                  />
                </div>
              </div>

              {/* Profit / Interest Selection */}
              <div className="p-4 bg-[#161616] rounded-xl border border-[#1F1F1F] space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Ganancia / Interés
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProfitType('fixed');
                      setProfitInput('2000');
                    }}
                    className={`py-2 px-3 rounded border text-xs font-bold transition-all cursor-pointer ${
                      profitType === 'fixed'
                        ? 'bg-white text-black border-white'
                        : 'bg-[#111111] border-[#1F1F1F] text-zinc-400'
                    }`}
                  >
                    Ganancia Fija ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfitType('percentage');
                      setProfitInput('20');
                    }}
                    className={`py-2 px-3 rounded border text-xs font-bold transition-all cursor-pointer ${
                      profitType === 'percentage'
                        ? 'bg-white text-black border-white'
                        : 'bg-[#111111] border-[#1F1F1F] text-zinc-400'
                    }`}
                  >
                    Interés Porcentual (%)
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">
                    {profitType === 'fixed' ? '$' : '%'}
                  </span>
                  <input
                    type="number"
                    step={profitType === 'fixed' ? '50' : '1'}
                    min="1"
                    required
                    value={profitInput}
                    onChange={(e) => setProfitInput(e.target.value)}
                    className="w-full bg-[#111111] border border-[#1F1F1F] rounded-lg pl-8 pr-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#22C55E]"
                  />
                </div>
              </div>

              {/* Calculated Summary Card */}
              <div className="p-4 bg-[#161616] border border-[#1F1F1F] rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Capital original:</span>
                  <span className="font-bold text-zinc-200">{formatCurrency(capital)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Ganancia ({profitType === 'fixed' ? 'Fija' : `${profitValue}%`}):</span>
                  <span className="font-bold text-[#22C55E]">+{formatCurrency(totalProfit)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-[#1F1F1F]">
                  <span className="text-zinc-400 uppercase tracking-widest text-[10px]">Total a Pagar:</span>
                  <span className="text-lg text-[#22C55E]">{formatCurrency(totalToPay)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Duración:</span>
                  <span className="text-zinc-300 font-medium">{normalDays} días normales + {graceDays} días de gracia</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 text-[#22C55E] font-bold">
                  <span className="text-[10px] uppercase tracking-widest">Cuota Diaria Estimada:</span>
                  <span className="text-sm text-[#22C55E]">{formatCurrency(dailyPayment)} / día</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Schedule Preview & Final Confirmation */}
              <div className="space-y-4">
                <div className="bg-[#161616] p-4 rounded-xl border border-[#1F1F1F] text-xs space-y-1">
                  <h4 className="font-bold text-sm text-white">{selectedClient?.firstName} {selectedClient?.lastName}</h4>
                  <p className="text-zinc-400">Préstamo por <span className="text-[#22C55E] font-bold">{formatCurrency(totalToPay)}</span> ({formatCurrency(dailyPayment)} / día)</p>
                  <p className="text-zinc-500 text-[10px]">Cobranza diaria consecutiva.</p>
                </div>

                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Vista Previa del Calendario</h5>
                  <div className="max-h-48 overflow-y-auto bg-[#161616] rounded-xl p-2 border border-[#1F1F1F] divide-y divide-[#1F1F1F] text-xs">
                    {schedulePreview.slice(0, 5).map(day => (
                      <div key={day.dayNumber} className="py-1.5 px-2 flex justify-between items-center text-zinc-300">
                        <span>Día {day.dayNumber} ({day.date})</span>
                        <span className="text-[#22C55E] font-bold">{formatCurrency(day.expectedAmount)}</span>
                      </div>
                    ))}
                    <div className="py-1 text-center text-zinc-500 text-[10px]">... Días 6 al 59 ...</div>
                    {schedulePreview.slice(55, 60).map(day => (
                      <div key={day.dayNumber} className="py-1.5 px-2 flex justify-between items-center text-zinc-300">
                        <span>Día {day.dayNumber} ({day.date})</span>
                        <span className="text-[#22C55E] font-bold">{formatCurrency(day.expectedAmount)}</span>
                      </div>
                    ))}
                    <div className="py-1 text-center text-[#F97316] font-bold text-[10px] bg-orange-950/30 my-1 rounded border border-orange-900/40 uppercase tracking-widest">
                      PERÍODO DE GRACIA (DÍAS 61 - 65)
                    </div>
                    {schedulePreview.slice(60, 65).map(day => (
                      <div key={day.dayNumber} className="py-1.5 px-2 flex justify-between items-center text-[#F97316]">
                        <span>Día {day.dayNumber} ({day.date})</span>
                        <span>Día de Gracia</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </form>

        {/* Sticky Footer */}
        <div className="p-4 bg-[#161616] border-t border-[#1F1F1F] flex items-center justify-between shrink-0">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-[#161616] hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded transition-colors cursor-pointer uppercase tracking-wider border border-[#1F1F1F] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedClientId || capital <= 0}
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-[#22C55E] hover:bg-green-400 text-black text-xs font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 uppercase tracking-wider shadow-lg shadow-green-950/40"
              >
                <span>Ver Calendario</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-[#161616] hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded transition-colors cursor-pointer border border-[#1F1F1F] uppercase tracking-wider disabled:opacity-50"
              >
                ← Volver
              </button>
              <button
                type="submit"
                form="new-loan-form"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#22C55E] hover:bg-green-400 text-black text-xs font-bold rounded transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider shadow-lg shadow-green-950/40"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creando préstamo...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>CREAR PRÉSTAMO</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

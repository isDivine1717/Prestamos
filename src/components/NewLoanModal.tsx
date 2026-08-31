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
  const [profitType, setProfitType] = useState<ProfitType>('percentage');
  const [profitInput, setProfitInput] = useState<string>('20');
  const [normalDays, setNormalDays] = useState<number>(settings.defaultNormalDays ?? 65);
  const [graceDays, setGraceDays] = useState<number>(settings.defaultGraceDays ?? 0);
  const [lateFeeEnabled, setLateFeeEnabled] = useState<boolean>(settings.lateFeeEnabled ?? false);
  const [lateFeeType, setLateFeeType] = useState<'percentage' | 'fixed'>(settings.lateFeeType ?? 'percentage');
  const [lateFeeValue, setLateFeeValue] = useState<number>(settings.lateFeeValue ?? settings.lateFeePercentage ?? 0);
  const [step, setStep] = useState<number>(1); // 1: Config, 2: Calendar & Confirm
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setNormalDays(settings.defaultNormalDays ?? 65);
      setGraceDays(settings.defaultGraceDays ?? 0);
      setLateFeeEnabled(settings.lateFeeEnabled ?? false);
      setLateFeeType(settings.lateFeeType ?? 'percentage');
      setLateFeeValue(settings.lateFeeValue ?? settings.lateFeePercentage ?? (settings.lateFeeAmount ?? 0));
      setCapitalInput('10000');
      setProfitType('percentage');
      setProfitInput('20');
      setStep(1);
      setErrorMessage('');
      setIsSubmitting(false);

      if (preselectedClientId) {
        setSelectedClientId(preselectedClientId);
      } else if (clients.length > 0) {
        setSelectedClientId(clients[0].id);
      }
    }
  }, [isOpen, settings, preselectedClientId, clients]);

  if (!isOpen) return null;

  const capital = parseFloat(capitalInput) || 0;
  const profitValue = parseFloat(profitInput) || 0;
  const totalProfit = calculateProfit(capital, profitType, profitValue);
  const totalToPay = capital + totalProfit;
  const dailyPayment = calculateDailyPayment(totalToPay, normalDays > 0 ? normalDays : 65);

  const schedulePreview = generateLoanSchedule(
    getTodayFormatted(),
    totalToPay,
    normalDays > 0 ? normalDays : 65,
    graceDays >= 0 ? graceDays : 0
  );

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

    if (isNaN(normalDays) || normalDays < 1) {
      setErrorMessage('Los días normales deben ser al menos 1 día.');
      return;
    }

    if (isNaN(graceDays) || graceDays < 0) {
      setErrorMessage('Los días de gracia no pueden ser negativos.');
      return;
    }

    if (isNaN(lateFeeValue) || lateFeeValue < 0) {
      setErrorMessage('El valor de recargo no puede ser negativo.');
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
        normalDays: Number(normalDays),
        graceDays: Number(graceDays),
        lateFeeEnabled,
        lateFeeType,
        lateFeeValue: Number(lateFeeValue),
        lateFeePercentage: lateFeeType === 'percentage' ? Number(lateFeeValue) : 0,
        lateFeeAmount: lateFeeType === 'fixed' ? Number(lateFeeValue) : 0,
      });

      onClose();
    } catch (err) {
      setErrorMessage('Ocurrió un error al crear el préstamo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const normalScheduleDays = schedulePreview.filter(d => !d.isGracePeriod);
  const graceScheduleDays = schedulePreview.filter(d => d.isGracePeriod);

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

              {/* Term & Grace Days Configuration */}
              <div className="p-4 bg-[#161616] rounded-xl border border-[#1F1F1F] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                      Días Normales de Cobro *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      required
                      value={normalDays}
                      onChange={(e) => setNormalDays(Number(e.target.value))}
                      className="w-full bg-[#111111] border border-[#1F1F1F] rounded-lg px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#22C55E]"
                    />
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {[65, 30, 60, 90].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setNormalDays(d)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer border ${
                            normalDays === d
                              ? 'bg-white text-black border-white'
                              : 'bg-[#161616] border-[#1F1F1F] text-zinc-400 hover:text-white'
                          }`}
                        >
                          {d} días {d === (settings.defaultNormalDays ?? 65) ? '(Predet.)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                      Días de Gracia
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      required
                      value={graceDays}
                      onChange={(e) => setGraceDays(Number(e.target.value))}
                      className="w-full bg-[#111111] border border-[#1F1F1F] rounded-lg px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#22C55E]"
                    />
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {[0, 1, 3, 5, 10].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGraceDays(g)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer border ${
                            graceDays === g
                              ? 'bg-white text-black border-white'
                              : 'bg-[#161616] border-[#1F1F1F] text-zinc-400 hover:text-white'
                          }`}
                        >
                          {g} {g === 1 ? 'día' : 'días'} {g === (settings.defaultGraceDays ?? 0) ? '(Predet.)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Late Fee Configuration */}
              <div className="p-4 bg-[#161616] rounded-xl border border-[#1F1F1F] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lateFeeEnabled}
                      onChange={(e) => setLateFeeEnabled(e.target.checked)}
                      className="w-4 h-4 accent-[#22C55E] rounded"
                    />
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                      Cobro por días de retraso
                    </span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {lateFeeEnabled ? 'Activo' : 'Desactivado'}
                  </span>
                </div>

                {lateFeeEnabled && (
                  <div className="pl-6 pt-1 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                        Tipo de Recargo
                      </label>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setLateFeeType('percentage')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                            lateFeeType === 'percentage'
                              ? 'bg-[#22C55E]/15 border-[#22C55E] text-[#22C55E]'
                              : 'bg-[#111111] border-[#1F1F1F] text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Porcentaje (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLateFeeType('fixed')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                            lateFeeType === 'fixed'
                              ? 'bg-[#22C55E]/15 border-[#22C55E] text-[#22C55E]'
                              : 'bg-[#111111] border-[#1F1F1F] text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Cantidad fija ($)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                        {lateFeeType === 'percentage'
                          ? 'Porcentaje de recargo por día de mora (%)'
                          : 'Monto fijo de recargo por día de mora ($)'}
                      </label>
                      <div className="relative w-48">
                        {lateFeeType === 'fixed' && (
                          <span className="absolute left-3 top-2 text-xs font-bold text-zinc-500 pointer-events-none">$</span>
                        )}
                        <input
                          type="number"
                          min="0"
                          max={lateFeeType === 'percentage' ? 100 : undefined}
                          step="any"
                          value={lateFeeValue}
                          onChange={(e) => setLateFeeValue(Number(e.target.value))}
                          className={`w-full bg-[#111111] border border-[#1F1F1F] rounded-lg ${
                            lateFeeType === 'fixed' ? 'pl-7 pr-3.5' : 'pl-3.5 pr-8'
                          } py-2 text-xs font-bold text-white focus:outline-none focus:border-[#22C55E]`}
                          placeholder={lateFeeType === 'percentage' ? '5' : '50'}
                        />
                        {lateFeeType === 'percentage' && (
                          <span className="absolute right-3 top-2 text-xs font-bold text-zinc-500 pointer-events-none">%</span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {lateFeeType === 'percentage'
                          ? `Se aplicará ${lateFeeValue}% sobre la cuota diaria (${formatCurrency(dailyPayment * (lateFeeValue / 100))} / día) por cada día de mora.`
                          : `Se aplicará un recargo fijo de ${formatCurrency(lateFeeValue)} / día por cada día de mora.`}
                      </p>
                    </div>
                  </div>
                )}
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
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Plazo y Duración:</span>
                  <span className="text-zinc-300 font-medium">
                    {normalDays} días de pago{graceDays > 0 ? ` + ${graceDays} de gracia (${normalDays + graceDays} días totales)` : ' (sin días de gracia)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 text-[#22C55E] font-bold">
                  <span className="text-[10px] uppercase tracking-widest">Cuota Diaria Estimada:</span>
                  <span className="text-sm text-[#22C55E]">{formatCurrency(dailyPayment)} / día</span>
                </div>
                {lateFeeEnabled && (
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-[#1F1F1F] text-orange-400">
                    <span className="text-[10px] uppercase tracking-widest">Recargo por atraso:</span>
                    <span className="font-bold">
                      {lateFeeType === 'percentage'
                        ? `${lateFeeValue}% / día (${formatCurrency(dailyPayment * (lateFeeValue / 100))})`
                        : `${formatCurrency(lateFeeValue)} fijo / día`}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Schedule Preview & Final Confirmation */}
              <div className="space-y-4">
                <div className="bg-[#161616] p-4 rounded-xl border border-[#1F1F1F] text-xs space-y-1">
                  <h4 className="font-bold text-sm text-white">{selectedClient?.firstName} {selectedClient?.lastName}</h4>
                  <p className="text-zinc-400">
                    Préstamo por <span className="text-[#22C55E] font-bold">{formatCurrency(totalToPay)}</span> ({formatCurrency(dailyPayment)} / día por {normalDays} días{graceDays > 0 ? ` + ${graceDays} de gracia` : ''})
                  </p>
                  <p className="text-zinc-500 text-[10px]">Cobranza diaria consecutiva.</p>
                </div>

                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Vista Previa del Calendario ({schedulePreview.length} Días)
                  </h5>
                  <div className="max-h-56 overflow-y-auto bg-[#161616] rounded-xl p-2 border border-[#1F1F1F] divide-y divide-[#1F1F1F] text-xs">
                    {normalScheduleDays.length <= 8 ? (
                      normalScheduleDays.map(day => (
                        <div key={day.dayNumber} className="py-1.5 px-2 flex justify-between items-center text-zinc-300">
                          <span>Día {day.dayNumber} ({day.date})</span>
                          <span className="text-[#22C55E] font-bold">{formatCurrency(day.expectedAmount)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        {normalScheduleDays.slice(0, 4).map(day => (
                          <div key={day.dayNumber} className="py-1.5 px-2 flex justify-between items-center text-zinc-300">
                            <span>Día {day.dayNumber} ({day.date})</span>
                            <span className="text-[#22C55E] font-bold">{formatCurrency(day.expectedAmount)}</span>
                          </div>
                        ))}
                        <div className="py-1.5 text-center text-zinc-500 text-[10px]">
                          ... Días 5 al {normalScheduleDays.length - 2} ({formatCurrency(dailyPayment)} / día) ...
                        </div>
                        {normalScheduleDays.slice(-2).map(day => (
                          <div key={day.dayNumber} className="py-1.5 px-2 flex justify-between items-center text-zinc-300">
                            <span>Día {day.dayNumber} ({day.date})</span>
                            <span className="text-[#22C55E] font-bold">{formatCurrency(day.expectedAmount)}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {graceScheduleDays.length > 0 && (
                      <>
                        <div className="py-1 text-center text-[#F97316] font-bold text-[10px] bg-orange-950/30 my-1 rounded border border-orange-900/40 uppercase tracking-widest">
                          PERÍODO DE GRACIA (DÍAS {normalDays + 1} AL {normalDays + graceDays})
                        </div>
                        {graceScheduleDays.map(day => (
                          <div key={day.dayNumber} className="py-1.5 px-2 flex justify-between items-center text-[#F97316]">
                            <span>Día {day.dayNumber} ({day.date})</span>
                            <span>Día de Gracia ($0 cuota)</span>
                          </div>
                        ))}
                      </>
                    )}
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

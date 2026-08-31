import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Save, Download, Upload, RotateCcw, ShieldCheck, DollarSign, Loader2 } from 'lucide-react';

export const ConfiguracionPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportBackupJSON,
    importBackupJSON,
    resetDataToDemo,
    adminUser,
    logout
  } = useApp();

  const [normalDays, setNormalDays] = useState<number>(settings.defaultNormalDays ?? 65);
  const [graceDays, setGraceDays] = useState<number>(settings.defaultGraceDays ?? 0);
  const [chargeSundays, setChargeSundays] = useState<boolean>(settings.chargeSundays ?? true);
  const [lateFeeEnabled, setLateFeeEnabled] = useState<boolean>(settings.lateFeeEnabled ?? false);
  const [lateFeeType, setLateFeeType] = useState<'percentage' | 'fixed'>(settings.lateFeeType ?? 'percentage');
  const [lateFeeValue, setLateFeeValue] = useState<number>(settings.lateFeeValue ?? settings.lateFeePercentage ?? 0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    setNormalDays(settings.defaultNormalDays ?? 65);
    setGraceDays(settings.defaultGraceDays ?? 0);
    setChargeSundays(settings.chargeSundays ?? true);
    setLateFeeEnabled(settings.lateFeeEnabled ?? false);
    setLateFeeType(settings.lateFeeType ?? 'percentage');
    setLateFeeValue(settings.lateFeeValue ?? settings.lateFeePercentage ?? (settings.lateFeeAmount ?? 0));
  }, [settings]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(normalDays) || normalDays < 1) {
      return;
    }
    if (isNaN(graceDays) || graceDays < 0) {
      return;
    }
    if (isNaN(lateFeeValue) || lateFeeValue < 0) {
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        defaultNormalDays: Number(normalDays),
        defaultGraceDays: Number(graceDays),
        chargeSundays: Boolean(chargeSundays),
        lateFeeEnabled: Boolean(lateFeeEnabled),
        lateFeeType,
        lateFeeValue: Number(lateFeeValue),
        lateFeePercentage: lateFeeType === 'percentage' ? Number(lateFeeValue) : 0,
        lateFeeAmount: lateFeeType === 'fixed' ? Number(lateFeeValue) : 0,
      });
    } catch {
      // Toast notification is handled in AppContext
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          importBackupJSON(content);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-4 md:p-10 space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="bg-[#111111] border border-[#1F1F1F] p-6 rounded-2xl shadow-xl flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
            <Settings className="w-5 h-5 text-[#22C55E]" />
            <span>CONFIGURACIÓN DEL SISTEMA</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Ajuste de parámetros financieros, días de cobro y respaldos de seguridad</p>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 space-y-6 shadow-2xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-[#1F1F1F] pb-3">
          PARÁMETROS PREDETERMINADOS DE PRÉSTAMOS
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-widest text-zinc-400 mb-1">
              Días Normales de Pago
            </label>
            <input
              type="number"
              min="1"
              max="365"
              required
              value={normalDays}
              onChange={(e) => setNormalDays(Number(e.target.value))}
              className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Plazo base para calcular cuota diaria de nuevos préstamos (Predeterminado: 65 días).</p>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-widest text-zinc-400 mb-1">
              Días de Gracia (Permiso)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              required
              value={graceDays}
              onChange={(e) => setGraceDays(Number(e.target.value))}
              className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Días adicionales al plazo normal sin generar atraso (Predeterminado: 0 días).</p>
          </div>

          <div className="sm:col-span-2 space-y-3 pt-2 border-t border-[#1F1F1F]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={chargeSundays}
                onChange={(e) => setChargeSundays(e.target.checked)}
                className="w-4 h-4 accent-[#22C55E] rounded"
              />
              <span className="text-xs font-semibold text-zinc-300">Cobrar Domingos y Festivos (Días Consecutivos)</span>
            </label>
          </div>

          <div className="sm:col-span-2 space-y-3 pt-4 border-t border-[#1F1F1F]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={lateFeeEnabled}
                onChange={(e) => setLateFeeEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#22C55E] rounded"
              />
              <span className="text-xs font-semibold text-zinc-300">Cobro por días de retraso</span>
            </label>

            {lateFeeEnabled && (
              <div className="pl-7 pt-2 space-y-3">
                <div>
                  <label className="block font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                    Tipo de Recargo
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setLateFeeType('percentage')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                        lateFeeType === 'percentage'
                          ? 'bg-[#22C55E]/15 border-[#22C55E] text-[#22C55E]'
                          : 'bg-[#161616] border-[#1F1F1F] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Porcentaje (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLateFeeType('fixed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                        lateFeeType === 'fixed'
                          ? 'bg-[#22C55E]/15 border-[#22C55E] text-[#22C55E]'
                          : 'bg-[#161616] border-[#1F1F1F] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Cantidad fija ($)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-widest text-zinc-500 mb-1">
                    {lateFeeType === 'percentage' ? 'Porcentaje de Recargo (%)' : 'Monto Fijo de Recargo ($)'}
                  </label>
                  <div className="relative w-52">
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
                      className={`w-full bg-[#161616] border border-[#1F1F1F] rounded-lg ${
                        lateFeeType === 'fixed' ? 'pl-7 pr-3.5' : 'pl-3.5 pr-8'
                      } py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]`}
                      placeholder={lateFeeType === 'percentage' ? 'Ej. 5' : 'Ej. 50'}
                    />
                    {lateFeeType === 'percentage' && (
                      <span className="absolute right-3 top-2 text-xs font-bold text-zinc-500 pointer-events-none">%</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {lateFeeType === 'percentage'
                      ? 'Porcentaje aplicado sobre la cuota diaria por cada día de retraso (Ej. 5%).'
                      : 'Cantidad fija monetaria cobrada por cada día de retraso (Ej. $50).'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[#1F1F1F] flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-[#22C55E] hover:bg-green-400 disabled:opacity-50 text-black text-xs font-bold rounded transition-colors flex items-center gap-2 cursor-pointer uppercase tracking-wider shadow-lg shadow-green-950/40"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Parámetros</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Backup and Data Export/Import Section */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 space-y-4 shadow-2xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-[#1F1F1F] pb-3">
          RESPALDO Y SEGURIDAD DE DATOS
        </h3>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={exportBackupJSON}
            className="px-4 py-2 bg-[#161616] hover:bg-zinc-800 text-zinc-200 font-bold text-xs rounded border border-[#1F1F1F] flex items-center gap-2 transition-colors cursor-pointer uppercase tracking-wider"
          >
            <Download className="w-4 h-4 text-[#22C55E]" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[#161616] hover:bg-zinc-800 text-zinc-200 font-bold text-xs rounded border border-[#1F1F1F] flex items-center gap-2 transition-colors cursor-pointer uppercase tracking-wider"
          >
            <Upload className="w-4 h-4 text-[#22C55E]" />
            <span>Importar JSON</span>
          </button>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            onClick={() => {
              if (confirm('¿Seguro que deseas eliminar todos los datos de la aplicación? Esta acción no se puede deshacer.')) {
                resetDataToDemo();
              }
            }}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold text-xs rounded flex items-center gap-2 transition-colors cursor-pointer border border-red-900/60 ml-auto uppercase tracking-wider"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Vaciar Base de Datos</span>
          </button>
        </div>
      </div>
    </div>
  );
};

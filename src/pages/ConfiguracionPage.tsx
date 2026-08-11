import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Save, Download, Upload, RotateCcw, ShieldCheck, DollarSign } from 'lucide-react';

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

  const [normalDays, setNormalDays] = useState(settings.defaultNormalDays);
  const [graceDays, setGraceDays] = useState(settings.defaultGraceDays);
  const [chargeSundays, setChargeSundays] = useState(settings.chargeSundays);
  const [lateFeeEnabled, setLateFeeEnabled] = useState(settings.lateFeeEnabled);
  const [lateFeeAmount, setLateFeeAmount] = useState(settings.lateFeeAmount);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      defaultNormalDays: normalDays,
      defaultGraceDays: graceDays,
      chargeSundays,
      lateFeeEnabled,
      lateFeeAmount
    });
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
              value={normalDays}
              onChange={(e) => setNormalDays(Number(e.target.value))}
              className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Configuración estándar: 60 días para calcular cuota diaria.</p>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-widest text-zinc-400 mb-1">
              Días de Gracia (Permiso)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={graceDays}
              onChange={(e) => setGraceDays(Number(e.target.value))}
              className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Configuración estándar: 5 días finales sin marcar atraso definitivo.</p>
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
              <span className="text-xs font-semibold text-zinc-300">Activar Recargo Automático por Atraso</span>
            </label>

            {lateFeeEnabled && (
              <div className="pl-7 pt-2">
                <label className="block font-bold uppercase tracking-widest text-zinc-500 mb-1">Monto de Recargo por Día ($ MXN)</label>
                <input
                  type="number"
                  value={lateFeeAmount}
                  onChange={(e) => setLateFeeAmount(Number(e.target.value))}
                  className="w-48 bg-[#161616] border border-[#1F1F1F] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[#1F1F1F] flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 bg-[#22C55E] hover:bg-green-400 text-black text-xs font-bold rounded transition-colors flex items-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Parámetros</span>
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

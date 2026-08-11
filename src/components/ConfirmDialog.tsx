import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = true,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-sm animate-in fade-in overflow-hidden">
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl w-full max-w-md max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isDanger ? 'bg-red-950/80 text-red-400 border-red-800/60' : 'bg-amber-950/80 text-amber-400 border-amber-800/60'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">{message}</p>
        </div>

        <div className="p-4 bg-[#161616] border-t border-[#1F1F1F] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[#161616] hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-[#1F1F1F]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-[#22C55E] hover:bg-green-400 text-black'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

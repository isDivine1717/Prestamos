import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { AlertTriangle, Trash2, X, User, Check, Loader2 } from 'lucide-react';

interface DeleteClientModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (clientId: string) => boolean;
}

export const DeleteClientModal: React.FC<DeleteClientModalProps> = ({
  client,
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTypedName('');
      setIsDeleting(false);
    }
  }, [isOpen, client]);

  if (!isOpen || !client) return null;

  const clientFullName = `${client.firstName} ${client.lastName}`.trim();
  const isNameMatched =
    typedName.trim().toLowerCase() === clientFullName.toLowerCase();

  const handleSecondStepConfirm = () => {
    if (!isNameMatched || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = onConfirmDelete(client.id);
      if (success) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-hidden">
      <div className="bg-[#111111] border border-red-900/60 rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-red-900/40 flex items-center justify-between bg-red-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-950/80 rounded-xl text-red-500 border border-red-900/60">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                Acción Destructiva
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                ¿Eliminar cliente permanentemente?
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-zinc-400 hover:text-white bg-[#1A1A1A] border border-[#1F1F1F] rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {step === 1 ? (
            <>
              {/* Warning Alert Banner */}
              <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Advertencia Importante</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Esta acción eliminará permanentemente al cliente y toda la
                  información asociada a él, incluyendo sus préstamos, pagos,
                  historial y demás datos. Esta acción no se puede deshacer.
                </p>
              </div>

              {/* Client Info Summary */}
              <div className="p-3.5 bg-[#161616] border border-[#1F1F1F] rounded-xl flex items-center gap-3">
                <div className="p-2 bg-[#111111] border border-[#1F1F1F] rounded-lg text-zinc-400">
                  <User className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                    Cliente Seleccionado
                  </span>
                  <p className="text-sm font-bold text-white">
                    Cliente: <span className="text-red-400">{clientFullName}</span>
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Step 2 Body */}
              <div className="space-y-3">
                <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-300">
                  <p className="font-semibold">
                    Para confirmar la eliminación permanente, escribe el nombre
                    completo del cliente.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Nombre a confirmar: <span className="text-white font-mono">{clientFullName}</span>
                  </label>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Escribe el nombre del cliente"
                    autoFocus
                    className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                {typedName.trim().length > 0 && (
                  <p className="text-[11px] font-mono">
                    {isNameMatched ? (
                      <span className="text-green-400 flex items-center gap-1 font-bold">
                        <Check className="w-3.5 h-3.5" /> El nombre coincide correctamente.
                      </span>
                    ) : (
                      <span className="text-zinc-500">
                        El nombre ingresado no coincide aún.
                      </span>
                    )}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="p-4 bg-[#161616] border-t border-[#1F1F1F] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 bg-[#161616] hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded transition-colors cursor-pointer border border-[#1F1F1F] uppercase tracking-wider disabled:opacity-50"
          >
            Cancelar
          </button>
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer uppercase tracking-wider shadow-lg shadow-red-950/50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar permanentemente</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSecondStepConfirm}
              disabled={!isNameMatched || isDeleting}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white text-xs font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed uppercase tracking-wider shadow-lg shadow-red-950/50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar definitivamente</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

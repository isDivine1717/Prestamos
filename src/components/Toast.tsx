import React from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface ToastProps {
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  const bgColors = {
    success: 'bg-emerald-950/95 text-emerald-100 border-emerald-700/60',
    error: 'bg-red-950/95 text-red-100 border-red-700/60',
    info: 'bg-[#161616]/95 text-zinc-100 border-[#1F1F1F]',
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />,
    error: <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-sm ml-auto animate-in fade-in slide-in-from-bottom-5 pointer-events-none">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${bgColors[toast.type]}`}>
        {icons[toast.type]}
        <p className="text-xs font-semibold pr-2 tracking-tight">{toast.message}</p>
      </div>
    </div>
  );
};

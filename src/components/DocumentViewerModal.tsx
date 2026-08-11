import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Trash2, Calendar, FileText } from 'lucide-react';
import { formatDateTimeLocale } from '../utils/dates';

export const DocumentViewerModal: React.FC = () => {
  const { viewingDocument, setViewingDocument, deleteClientDocument } = useApp();

  if (!viewingDocument) return null;

  const { doc, clientName } = viewingDocument;

  const handleDelete = () => {
    if (confirm(`¿Seguro que deseas eliminar el documento "${doc.title}"?`)) {
      deleteClientDocument(doc.clientId, doc.id);
      setViewingDocument(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in overflow-hidden">
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl w-full max-w-3xl max-h-[90dvh] overflow-hidden shadow-2xl flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 px-5 sm:px-6 border-b border-[#1F1F1F] bg-[#161616] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 bg-[#1A1A1A] rounded-xl text-zinc-300 border border-[#1F1F1F] shrink-0">
              <FileText className="w-5 h-5 text-[#22C55E]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white uppercase tracking-tight truncate">{doc.title}</h3>
              <p className="text-xs text-zinc-500 truncate">Expediente: <span className="text-zinc-300 font-bold">{clientName}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 rounded transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Eliminar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewingDocument(null)}
              className="p-2 text-zinc-400 hover:text-white bg-[#1A1A1A] border border-[#1F1F1F] rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Image Container */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto flex items-center justify-center bg-[#0A0A0A]">
          <img
            src={doc.fileUrl}
            alt={doc.title}
            className="max-w-full max-h-[60vh] object-contain rounded-xl border border-[#1F1F1F] shadow-2xl"
          />
        </div>

        {/* Footer info */}
        <div className="p-4 px-5 sm:px-6 border-t border-[#1F1F1F] bg-[#161616] flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] truncate pr-2">
            <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="truncate">Subido el: {formatDateTimeLocale(doc.uploadedAt)}</span>
          </div>
          <button
            type="button"
            onClick={() => setViewingDocument(null)}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-zinc-800 text-zinc-200 font-bold rounded text-xs border border-[#1F1F1F] uppercase tracking-wider cursor-pointer shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

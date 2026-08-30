import React from 'react';
import { Phone, MessageCircle, MapPin } from 'lucide-react';
import { getTelUrl, getWhatsAppUrl, getGoogleMapsUrl } from '../utils/contact';

interface ClientQuickContactProps {
  phone?: string | null;
  address?: string | null;
  className?: string;
  variant?: 'banner' | 'compact' | 'card';
}

export const ClientQuickContact: React.FC<ClientQuickContactProps> = ({
  phone,
  address,
  className = '',
  variant = 'banner'
}) => {
  const telUrl = getTelUrl(phone);
  const whatsappUrl = getWhatsAppUrl(phone);
  const mapsUrl = getGoogleMapsUrl(address);

  const hasPhone = Boolean(telUrl);
  const hasAddress = Boolean(mapsUrl);

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
          <span>Contacto Rápido</span>
        </h4>
        {(!hasPhone || !hasAddress) && (
          <span className="text-[10px] text-zinc-500 font-medium">
            {!hasPhone && !hasAddress
              ? 'Sin teléfono ni dirección'
              : !hasPhone
              ? 'Sin teléfono'
              : 'Sin dirección'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 1. BOTÓN LLAMAR */}
        {hasPhone ? (
          <a
            href={telUrl!}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#161616] hover:bg-[#1E1E1E] border border-[#22C55E]/40 hover:border-[#22C55E] text-[#22C55E] rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] group cursor-pointer"
            title={`Llamar a ${phone}`}
          >
            <Phone className="w-4 h-4 text-[#22C55E] group-hover:scale-110 transition-transform" />
            <span className="tracking-wide">Llamar</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#141414] border border-[#1F1F1F] text-zinc-600 rounded-xl text-xs font-medium cursor-not-allowed opacity-60"
            title="El cliente no tiene teléfono registrado"
          >
            <Phone className="w-4 h-4 text-zinc-600" />
            <span>Sin Teléfono</span>
          </button>
        )}

        {/* 2. BOTÓN WHATSAPP */}
        {hasPhone ? (
          <a
            href={whatsappUrl!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/50 hover:border-[#22C55E] text-[#22C55E] rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] group cursor-pointer"
            title={`Enviar WhatsApp a ${phone}`}
          >
            <MessageCircle className="w-4 h-4 text-[#22C55E] group-hover:scale-110 transition-transform" />
            <span className="tracking-wide">WhatsApp</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#141414] border border-[#1F1F1F] text-zinc-600 rounded-xl text-xs font-medium cursor-not-allowed opacity-60"
            title="El cliente no tiene teléfono registrado"
          >
            <MessageCircle className="w-4 h-4 text-zinc-600" />
            <span>Sin WhatsApp</span>
          </button>
        )}

        {/* 3. BOTÓN VER UBICACIÓN */}
        {hasAddress ? (
          <a
            href={mapsUrl!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#161616] hover:bg-[#1E1E1E] border border-sky-500/40 hover:border-sky-400 text-sky-400 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] group cursor-pointer"
            title={`Buscar dirección en Google Maps: ${address}`}
          >
            <MapPin className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="tracking-wide">Ver ubicación</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#141414] border border-[#1F1F1F] text-zinc-600 rounded-xl text-xs font-medium cursor-not-allowed opacity-60"
            title="El cliente no tiene dirección registrada"
          >
            <MapPin className="w-4 h-4 text-zinc-600" />
            <span>Sin Ubicación</span>
          </button>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Client, ClientRating } from '../types';
import { formatCurrency } from '../utils/finance';
import { getTelUrl, getWhatsAppUrl, getGoogleMapsUrl } from '../utils/contact';
import { Search, Filter, Phone, MessageCircle, MapPin, UserPlus, FileText, ChevronRight, AlertTriangle, Trophy, CheckCircle2 } from 'lucide-react';

export const ClientesPage: React.FC = () => {
  const {
    clients,
    loans,
    setSelectedClientId,
    searchQuery,
    setSearchQuery,
    setIsNewClientModalOpen
  } = useApp();

  const [ratingFilter, setRatingFilter] = useState<string>('all');

  const getRatingBadge = (rating?: ClientRating) => {
    switch (rating) {
      case 'puntual':
        return <span className="px-2.5 py-1 bg-amber-950/80 text-amber-300 border border-amber-700/60 rounded-full text-xs font-bold flex items-center gap-1">🏆 Puntual</span>;
      case 'buen_pagador':
        return <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-full text-xs font-bold flex items-center gap-1">🟢 Buen pagador</span>;
      case 'irregular':
        return <span className="px-2.5 py-1 bg-yellow-950 text-yellow-300 border border-yellow-700/60 rounded-full text-xs font-bold flex items-center gap-1">🟡 Irregular</span>;
      case 'atrasado':
        return <span className="px-2.5 py-1 bg-orange-950 text-orange-300 border border-orange-700/60 rounded-full text-xs font-bold flex items-center gap-1">🟠 Atrasado</span>;
      case 'malo':
        return <span className="px-2.5 py-1 bg-rose-950 text-rose-300 border border-rose-700/60 rounded-full text-xs font-bold flex items-center gap-1">🔴 Malo</span>;
      default:
        return <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs font-medium">Nuevo</span>;
    }
  };

  const filteredClients = clients.filter(client => {
    // Text search
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    const matchesQuery = !q || fullName.includes(q) || client.phone.includes(q);

    if (!matchesQuery) return false;

    // Category Filter
    if (ratingFilter === 'all') return true;
    if (ratingFilter === 'active') return client.status === 'active';
    if (ratingFilter === 'with_debt') {
      const clientLoans = loans.filter(l => l.clientId === client.id && (l.status === 'active' || l.status === 'overdue'));
      return clientLoans.length > 0;
    }
    if (ratingFilter === 'no_debt') {
      const clientLoans = loans.filter(l => l.clientId === client.id && (l.status === 'active' || l.status === 'overdue'));
      return clientLoans.length === 0;
    }
    if (ratingFilter === 'overdue') {
      const clientLoans = loans.filter(l => l.clientId === client.id && l.status === 'overdue');
      return clientLoans.length > 0;
    }
    if (ratingFilter === 'bad_payer') {
      return client.rating === 'malo' || client.rating === 'atrasado';
    }

    return true;
  });

  return (
    <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111111] border border-[#1F1F1F] p-4 rounded-2xl shadow-xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, apellidos o teléfono..."
            className="w-full bg-[#161616] border border-[#1F1F1F] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#22C55E]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'TODOS' },
            { id: 'with_debt', label: 'CON DEUDA' },
            { id: 'overdue', label: 'ATRASADOS' },
            { id: 'no_debt', label: 'SIN DEUDA' },
            { id: 'bad_payer', label: 'RIESGO' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setRatingFilter(f.id)}
              className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap cursor-pointer uppercase tracking-wider transition-colors ${
                ratingFilter === f.id
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'bg-[#161616] text-zinc-400 hover:text-white border border-[#1F1F1F]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsNewClientModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold text-xs rounded hover:bg-zinc-200 transition-colors shrink-0 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>NUEVO CLIENTE</span>
        </button>
      </div>

      {/* Client List Grid */}
      {clients.length === 0 ? (
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-[#161616] border border-[#1F1F1F] rounded-2xl flex items-center justify-center mx-auto text-[#22C55E]">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Aún no tienes clientes</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Agrega tu primer cliente para comenzar a administrar tus préstamos.
            </p>
          </div>
          <button
            onClick={() => setIsNewClientModalOpen(true)}
            className="px-5 py-2.5 bg-[#22C55E] hover:bg-green-400 text-black text-xs font-bold rounded transition-colors inline-flex items-center gap-2 cursor-pointer uppercase tracking-wider shadow-lg shadow-green-950/40"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Agregar cliente</span>
          </button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-12 text-center text-zinc-500">
          <p className="text-sm font-semibold text-zinc-300">No se encontraron clientes</p>
          <p className="text-xs mt-1 text-zinc-500">Prueba ajustando los términos de búsqueda o filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map(client => {
            const clientLoans = loans.filter(l => l.clientId === client.id);
            const activeLoansList = clientLoans.filter(l => l.status === 'active' || l.status === 'overdue');
            const totalCurrentDebt = activeLoansList.reduce((sum, l) => sum + l.balancePending, 0);
            const docsCount = (client.documents || []).length;

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClientId(client.id)}
                className="bg-[#111111] border border-[#1F1F1F] hover:border-zinc-700 p-5 rounded-2xl space-y-4 shadow-xl transition-all cursor-pointer group"
              >
                {/* Client Header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#22C55E] transition-colors">
                      {client.firstName} {client.lastName}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{client.phone}</span>
                      </p>
                      {/* Quick direct contact links */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {getTelUrl(client.phone) && (
                          <a
                            href={getTelUrl(client.phone)!}
                            className="p-1 rounded bg-[#161616] hover:bg-[#1E1E1E] text-[#22C55E] border border-[#22C55E]/30 hover:border-[#22C55E] transition-colors"
                            title={`Llamar a ${client.firstName}`}
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                        {getWhatsAppUrl(client.phone) && (
                          <a
                            href={getWhatsAppUrl(client.phone)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/40 hover:border-[#22C55E] transition-colors"
                            title={`WhatsApp con ${client.firstName}`}
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        )}
                        {getGoogleMapsUrl(client.address) && (
                          <a
                            href={getGoogleMapsUrl(client.address)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-[#161616] hover:bg-[#1E1E1E] text-sky-400 border border-sky-500/30 hover:border-sky-400 transition-colors"
                            title={`Ver ubicación en Google Maps`}
                          >
                            <MapPin className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {getRatingBadge(client.rating)}
                </div>

                {/* Financial Summary Box */}
                <div className="bg-[#161616] p-3.5 rounded-lg border border-[#1F1F1F] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-widest">Deuda Actual</span>
                    <span className={`font-bold text-xs ${totalCurrentDebt > 0 ? 'text-[#F97316]' : 'text-[#22C55E]'}`}>
                      {formatCurrency(totalCurrentDebt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-widest">Préstamos Activos</span>
                    <span className="font-semibold text-xs text-zinc-300">
                      {activeLoansList.length} ({clientLoans.length} total)
                    </span>
                  </div>
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-[#1F1F1F]">
                  <span className="flex items-center gap-1 text-[10px] font-medium">
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{docsCount} documento(s)</span>
                  </span>

                  <span className="text-xs font-bold text-[#22C55E] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Ver Expediente
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

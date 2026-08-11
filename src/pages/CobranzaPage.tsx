import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/finance';
import { getTodayFormatted } from '../utils/dates';
import {
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  DollarSign,
  Phone,
  Calendar
} from 'lucide-react';

export const CobranzaPage: React.FC = () => {
  const {
    loans,
    clients,
    transactions,
    setRegisterPaymentModalLoan,
    setSelectedClientId,
    setActiveTab,
    searchQuery,
    setSearchQuery
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  const todayStr = getTodayFormatted();

  // Active Loans relevant for collection
  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'overdue');

  let totalExpectedToday = 0;
  let totalCollectedToday = 0;
  let totalPendingToday = 0;

  const pendingList: { loan: typeof loans[0]; clientPhone: string; expectedAmount: number; overdueDays: number }[] = [];
  const paidList: { loan: typeof loans[0]; clientPhone: string; paidAmount: number }[] = [];
  const overdueList: { loan: typeof loans[0]; clientPhone: string; overdueDays: number; expectedAmount: number }[] = [];

  activeLoans.forEach(loan => {
    const todaySchedule = loan.schedule.find(s => s.date === todayStr);
    const expected = todaySchedule ? todaySchedule.expectedAmount : loan.dailyPayment;
    const isPaidToday = todaySchedule && (todaySchedule.status === 'paid' || todaySchedule.status === 'surplus');
    const client = clients.find(c => c.id === loan.clientId);
    const clientPhone = client ? client.phone : '';

    const overdueDaysCount = loan.schedule.filter(s => s.status === 'overdue').length;

    totalExpectedToday += expected;

    if (isPaidToday) {
      const paid = todaySchedule ? todaySchedule.paidAmount : expected;
      totalCollectedToday += paid;
      paidList.push({
        loan,
        clientPhone,
        paidAmount: paid
      });
    } else {
      totalPendingToday += expected;
      
      if (loan.status === 'overdue' || overdueDaysCount > 0) {
        overdueList.push({
          loan,
          clientPhone,
          overdueDays: overdueDaysCount || 1,
          expectedAmount: expected
        });
      } else {
        pendingList.push({
          loan,
          clientPhone,
          expectedAmount: expected,
          overdueDays: 0
        });
      }
    }
  });

  // Search filter
  const matchesSearch = (clientName: string, phone: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return clientName.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
  };

  const filteredPending = pendingList.filter(item => matchesSearch(item.loan.clientName, item.clientPhone));
  const filteredOverdue = overdueList.filter(item => matchesSearch(item.loan.clientName, item.clientPhone));
  const filteredPaid = paidList.filter(item => matchesSearch(item.loan.clientName, item.clientPhone));

  return (
    <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
      {/* Top Summary Bar */}
      <div className="bg-[#111111] border border-[#1F1F1F] p-6 rounded-2xl shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1A1A1A] border border-[#1F1F1F] text-[#22C55E] rounded-xl font-black shadow-lg">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Panel de Cobranza Rápida</span>
              <h2 className="text-xl font-bold text-white tracking-tight">COBRANZA DE HOY</h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 border-t lg:border-t-0 lg:border-l border-[#1F1F1F] pt-4 lg:pt-0 lg:pl-6">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Total Esperado</span>
              <span className="text-lg font-light text-white tracking-tighter">{formatCurrency(totalExpectedToday)}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#22C55E] font-bold uppercase tracking-widest block">Cobrado Hoy</span>
              <span className="text-lg font-light text-[#22C55E] tracking-tighter">{formatCurrency(totalCollectedToday)}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#F97316] font-bold uppercase tracking-widest block">Pendiente Hoy</span>
              <span className="text-lg font-light text-[#F97316] tracking-tighter">{formatCurrency(totalPendingToday)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `TODOS (${pendingList.length + overdueList.length + paidList.length})` },
          { id: 'pending', label: `PENDIENTES (${pendingList.length})` },
          { id: 'overdue', label: `ATRASADOS (${overdueList.length})` },
          { id: 'paid', label: `PAGADOS HOY (${paidList.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-4 py-2 rounded text-xs font-bold transition-all whitespace-nowrap cursor-pointer uppercase tracking-wider ${
              activeFilter === tab.id
                ? 'bg-white text-black font-bold shadow-sm'
                : 'bg-[#111111] text-zinc-400 border border-[#1F1F1F] hover:text-white hover:bg-[#161616]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Global empty state when no loans exist */}
      {loans.length === 0 ? (
        <div className="bg-[#111111] border border-[#1F1F1F] p-12 rounded-2xl text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 bg-[#161616] border border-[#1F1F1F] rounded-2xl flex items-center justify-center mx-auto text-[#22C55E]">
            <Banknote className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No hay cobranza pendiente</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Los pagos pendientes aparecerán aquí cuando tengas préstamos activos.
          </p>
        </div>
      ) : (
        <>
          {/* OVERDUE PAYMENTS SECTION */}
          {(activeFilter === 'all' || activeFilter === 'overdue') && filteredOverdue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">ATRASOS ACUMULADOS ({filteredOverdue.length})</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOverdue.map(({ loan, clientPhone, overdueDays, expectedAmount }) => (
                  <div
                    key={loan.id}
                    className="bg-[#111111] border border-red-900/40 p-5 rounded-2xl space-y-3 shadow-lg hover:border-red-700/60 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4
                          onClick={() => {
                            setSelectedClientId(loan.clientId);
                            setActiveTab('clientes');
                          }}
                          className="font-bold text-sm text-white hover:text-red-400 cursor-pointer"
                        >
                          {loan.clientName}
                        </h4>
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-zinc-500" />
                          <span>{clientPhone}</span>
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded uppercase tracking-tighter">
                        {overdueDays} DÍAS ATRASO
                      </span>
                    </div>

                    <div className="bg-[#161616] p-3 rounded-lg border border-[#1F1F1F] flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-widest">Cuota diaria</span>
                        <span className="text-xs font-semibold text-zinc-300">{formatCurrency(expectedAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-red-500 block uppercase font-bold tracking-widest">Saldo total</span>
                        <span className="text-sm font-bold text-red-500">{formatCurrency(loan.balancePending)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setRegisterPaymentModalLoan(loan)}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5 stroke-[3]" />
                      <span>REGISTRAR PAGO DE ATRASO</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PENDING PAYMENTS SECTION */}
          {(activeFilter === 'all' || activeFilter === 'pending') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#F97316]">
                <Clock className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">PENDIENTES DE HOY ({filteredPending.length})</h3>
              </div>

              {filteredPending.length === 0 ? (
                <div className="bg-[#111111] border border-[#1F1F1F] p-8 rounded-2xl text-center space-y-1">
                  <p className="text-sm font-bold text-white">Todo tranquilo por aquí</p>
                  <p className="text-xs text-zinc-400">No tienes pagos pendientes actualmente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPending.map(({ loan, clientPhone, expectedAmount }) => (
                    <div
                      key={loan.id}
                      className="bg-[#111111] border border-[#1F1F1F] p-5 rounded-2xl space-y-3 shadow-lg hover:border-zinc-700 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4
                            onClick={() => {
                              setSelectedClientId(loan.clientId);
                              setActiveTab('clientes');
                            }}
                            className="font-bold text-sm text-white hover:text-[#22C55E] cursor-pointer"
                          >
                            {loan.clientName}
                          </h4>
                          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            <span>{clientPhone}</span>
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-orange-500/10 text-[#F97316] text-[10px] font-bold rounded uppercase tracking-tighter">
                          PENDIENTE
                        </span>
                      </div>

                      <div className="bg-[#161616] p-3 rounded-lg border border-[#1F1F1F] flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-widest">Cuota de Hoy</span>
                          <span className="text-sm font-bold text-[#22C55E]">{formatCurrency(expectedAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-widest">Saldo Restante</span>
                          <span className="text-xs font-semibold text-zinc-300">{formatCurrency(loan.balancePending)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setRegisterPaymentModalLoan(loan)}
                        className="w-full py-2 bg-[#22C55E] hover:bg-green-400 text-black font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5 stroke-[3]" />
                        <span>REGISTRAR PAGO</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PAID PAYMENTS SECTION */}
          {(activeFilter === 'all' || activeFilter === 'paid') && filteredPaid.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#1F1F1F]">
              <div className="flex items-center gap-2 text-[#22C55E]">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                <h3 className="text-xs font-bold uppercase tracking-widest">PAGADOS HOY ({filteredPaid.length})</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPaid.map(({ loan, clientPhone, paidAmount }) => (
                  <div
                    key={loan.id}
                    className="bg-[#111111] border border-[#1F1F1F] p-4 rounded-2xl space-y-2 opacity-90"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs text-white">{loan.clientName}</h4>
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded uppercase tracking-tighter">
                        PAGADO
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-400 pt-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Cobrado:</span>
                      <span className="font-bold text-[#22C55E] text-xs">{formatCurrency(paidAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

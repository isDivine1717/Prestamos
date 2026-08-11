import React from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/StatCard';
import { AlertsBanner } from '../components/AlertsBanner';
import { formatCurrency } from '../utils/finance';
import { getTodayFormatted } from '../utils/dates';
import {
  Banknote,
  Clock,
  Users,
  CreditCard,
  Plus,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    loans,
    clients,
    transactions,
    setActiveTab,
    setIsNewClientModalOpen,
    setIsNewLoanModalOpen,
    setRegisterPaymentModalLoan,
    setSelectedClientId
  } = useApp();

  const todayStr = getTodayFormatted();

  // 1. Calculations for Today
  const todayTxns = transactions.filter(t => t.date === todayStr);
  const totalCollectedToday = todayTxns.reduce((sum, t) => sum + t.amountReceived, 0);
  const capitalRecoveredToday = todayTxns.reduce((sum, t) => sum + t.capitalPortion, 0);
  const profitRecoveredToday = todayTxns.reduce((sum, t) => sum + t.profitPortion, 0);

  // Active Loans calculations
  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'overdue');
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const liquidatedLoans = loans.filter(l => l.status === 'liquidated');

  // Daily Collection status lists for today
  const pendingTodayList: { loan: typeof loans[0]; clientName: string; expectedAmount: number }[] = [];
  const paidTodayList: { loan: typeof loans[0]; clientName: string; paidAmount: number }[] = [];
  const overdueList: { loan: typeof loans[0]; clientName: string; overdueDays: number; amount: number }[] = [];

  let pendingMoneyToday = 0;

  activeLoans.forEach(loan => {
    const todaySchedule = loan.schedule.find(s => s.date === todayStr);
    const isPaidToday = todaySchedule && (todaySchedule.status === 'paid' || todaySchedule.status === 'surplus');
    const isOverdue = loan.status === 'overdue';

    if (isPaidToday) {
      paidTodayList.push({
        loan,
        clientName: loan.clientName,
        paidAmount: todaySchedule ? todaySchedule.paidAmount : loan.dailyPayment
      });
    } else {
      const expected = todaySchedule ? todaySchedule.expectedAmount : loan.dailyPayment;
      pendingMoneyToday += expected;
      
      if (isOverdue) {
        const overdueDaysCount = loan.schedule.filter(s => s.status === 'overdue').length;
        overdueList.push({
          loan,
          clientName: loan.clientName,
          overdueDays: overdueDaysCount || 1,
          amount: expected * (overdueDaysCount || 1)
        });
      } else {
        pendingTodayList.push({
          loan,
          clientName: loan.clientName,
          expectedAmount: expected
        });
      }
    }
  });

  // Client Stats
  const activeClientsCount = clients.filter(c => c.status === 'active').length;
  const overdueClientsCount = clients.filter(c => {
    const clientLoans = loans.filter(l => l.clientId === c.id);
    return clientLoans.some(l => l.status === 'overdue');
  }).length;
  const debtFreeClientsCount = clients.filter(c => {
    const clientLoans = loans.filter(l => l.clientId === c.id && (l.status === 'active' || l.status === 'overdue'));
    return clientLoans.length === 0;
  }).length;

  return (
    <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Clean Welcome Banner for empty app */}
      {clients.length === 0 && (
        <div className="bg-[#111111] border border-[#1F1F1F] p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Buenos días</h2>
            <p className="text-xs text-zinc-400 mt-1">Tu gestor de préstamos está listo.</p>
            <p className="text-xs font-semibold text-[#22C55E] mt-2">Comienza agregando tu primer cliente.</p>
          </div>
          <button
            onClick={() => setIsNewClientModalOpen(true)}
            className="px-5 py-2.5 bg-[#22C55E] hover:bg-green-400 text-black font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 uppercase tracking-wider shrink-0 cursor-pointer shadow-lg shadow-green-950/40"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nuevo cliente</span>
          </button>
        </div>
      )}

      {/* Visual Alerts Banner */}
      <AlertsBanner />

      {/* Top Quick Actions Bar */}
      <div className="flex items-center justify-between gap-4 bg-[#111111] border border-[#1F1F1F] p-5 rounded-2xl flex-wrap shadow-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#22C55E]" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Acciones Rápidas</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsNewClientModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-zinc-800 text-white text-xs font-bold border border-[#1F1F1F] rounded transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>+ NUEVO CLIENTE</span>
          </button>

          <button
            onClick={() => setIsNewLoanModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-orange-600 text-white text-xs font-bold rounded transition-colors shadow-lg shadow-orange-900/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ NUEVO PRÉSTAMO</span>
          </button>

          <button
            onClick={() => setActiveTab('cobranza')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors cursor-pointer shadow-md"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>VER COBRANZA COMPLETA</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="COBRADO HOY"
          value={formatCurrency(totalCollectedToday)}
          subtitle={`${todayTxns.length} abonos registrados hoy`}
          accentColor="emerald"
          icon={<Banknote className="w-4 h-4" />}
          breakdown={[
            { label: 'Capital Recup.', value: formatCurrency(capitalRecoveredToday), color: 'text-zinc-200' },
            { label: 'Ganancia Recup.', value: formatCurrency(profitRecoveredToday), color: 'text-[#22C55E]' },
          ]}
        />

        <StatCard
          title="COBRANZA PENDIENTE HOY"
          value={formatCurrency(pendingMoneyToday)}
          subtitle={`${pendingTodayList.length + overdueList.length} cobro(s) pendientes`}
          accentColor="amber"
          icon={<Clock className="w-4 h-4" />}
        />

        <StatCard
          title="CLIENTES TOTALES"
          value={clients.length}
          subtitle={`${activeClientsCount} activos • ${overdueClientsCount} con atraso`}
          accentColor="blue"
          icon={<Users className="w-4 h-4" />}
          breakdown={[
            { label: 'Sin Deuda', value: String(debtFreeClientsCount), color: 'text-zinc-300' },
            { label: 'Con Atraso', value: String(overdueClientsCount), color: 'text-red-500' },
          ]}
        />

        <StatCard
          title="PRÉSTAMOS ACTIVOS"
          value={activeLoans.length}
          subtitle={`${overdueLoans.length} atrasados • ${liquidatedLoans.length} liquidados`}
          accentColor={overdueLoans.length > 0 ? 'rose' : 'zinc'}
          icon={<CreditCard className="w-4 h-4" />}
        />
      </div>

      {/* Daily Collections Section */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-[#1F1F1F] bg-[#161616] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Banknote className="w-4 h-4 text-[#22C55E]" />
              <span>Resumen de Cobranza del Día</span>
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">Control directo de cuotas de hoy</p>
          </div>

          <button
            onClick={() => setActiveTab('cobranza')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#22C55E] hover:text-green-400 transition-colors cursor-pointer"
          >
            <span>Ir a Cobranza</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: PENDIENTES */}
          <div className="bg-[#161616] p-4 rounded-xl border border-[#1F1F1F] space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#F97316] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F97316]"></span>
                Pendientes de Hoy ({pendingTodayList.length})
              </span>
            </div>

            {pendingTodayList.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center font-medium">No hay cobros pendientes normales hoy</p>
            ) : (
              <div className="space-y-2.5">
                {pendingTodayList.map(({ loan, clientName, expectedAmount }) => (
                  <div key={loan.id} className="p-3 bg-[#111111] rounded-lg border border-[#1F1F1F] flex items-center justify-between hover:border-zinc-700 transition-colors">
                    <div>
                      <h5
                        onClick={() => {
                          setSelectedClientId(loan.clientId);
                          setActiveTab('clientes');
                        }}
                        className="text-xs font-bold text-white hover:text-[#22C55E] cursor-pointer transition-colors"
                      >
                        {clientName}
                      </h5>
                      <span className="text-sm font-semibold text-[#22C55E]">{formatCurrency(expectedAmount)}</span>
                    </div>

                    <button
                      onClick={() => setRegisterPaymentModalLoan(loan)}
                      className="px-3 py-1.5 bg-[#22C55E] hover:bg-green-400 text-black text-xs font-bold rounded transition-colors cursor-pointer"
                    >
                      Pagar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: PAGADOS HOY */}
          <div className="bg-[#161616] p-4 rounded-xl border border-[#1F1F1F] space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                Pagados Hoy ({paidTodayList.length})
              </span>
            </div>

            {paidTodayList.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center font-medium">Aún no se registra ningún pago hoy.</p>
            ) : (
              <div className="space-y-2.5">
                {paidTodayList.map(({ loan, clientName, paidAmount }) => (
                  <div key={loan.id} className="p-3 bg-[#111111] rounded-lg border border-[#1F1F1F] flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">{clientName}</h5>
                      <span className="text-xs text-zinc-400">Cobrado: <span className="font-bold text-[#22C55E]">{formatCurrency(paidAmount)}</span></span>
                    </div>
                    <span className="px-2 py-0.5 bg-green-500/10 text-[#22C55E] text-[10px] font-bold rounded uppercase tracking-wider">
                      Pagado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 3: ATRASADOS */}
          <div className="bg-[#161616] p-4 rounded-xl border border-red-900/30 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Atrasados ({overdueList.length})
              </span>
            </div>

            {overdueList.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center font-medium">Sin pagos en atraso.</p>
            ) : (
              <div className="space-y-2.5">
                {overdueList.map(({ loan, clientName, overdueDays, amount }) => (
                  <div key={loan.id} className="p-3 bg-red-950/20 rounded-lg border border-red-900/30 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-red-200">{clientName}</h5>
                      <p className="text-[11px] text-red-400 font-medium">{overdueDays} día(s) de atraso</p>
                    </div>

                    <button
                      onClick={() => setRegisterPaymentModalLoan(loan)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded transition-colors cursor-pointer"
                    >
                      Pagar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

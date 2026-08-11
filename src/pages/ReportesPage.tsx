import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, calculateClientRating } from '../utils/finance';
import { getTodayFormatted, addDays, getDaysDifference, formatDateLocale } from '../utils/dates';
import { StatCard } from '../components/StatCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { BarChart3, Calendar, Banknote, Users, Trophy, TrendingUp, Filter, ShieldAlert } from 'lucide-react';

export const ReportesPage: React.FC = () => {
  const { loans, clients, transactions } = useApp();

  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState(addDays(getTodayFormatted(), -30));
  const [customEnd, setCustomEnd] = useState(getTodayFormatted());

  const todayStr = getTodayFormatted();

  // Date Filtering logic
  const isInRange = (dateStr: string) => {
    if (dateRange === 'today') return dateStr === todayStr;
    if (dateRange === 'week') {
      const diff = getDaysDifference(dateStr, todayStr);
      return diff >= 0 && diff < 7;
    }
    if (dateRange === 'month') {
      const diff = getDaysDifference(dateStr, todayStr);
      return diff >= 0 && diff < 30;
    }
    // custom
    return dateStr >= customStart && dateStr <= customEnd;
  };

  // Filter transactions in range
  const filteredTxns = transactions.filter(t => isInRange(t.date));

  const totalCollected = filteredTxns.reduce((sum, t) => sum + t.amountReceived, 0);
  const capitalRecovered = filteredTxns.reduce((sum, t) => sum + t.capitalPortion, 0);
  const profitRecovered = filteredTxns.reduce((sum, t) => sum + t.profitPortion, 0);

  // New loans created in range
  const newLoans = loans.filter(l => isInRange(l.startDate));
  const totalNewCapital = newLoans.reduce((sum, l) => sum + l.capital, 0);

  // Liquidated loans in range
  const liquidatedInPeriod = loans.filter(l => l.liquidatedAt && isInRange(l.liquidatedAt));

  // Chart Data: Last 7 Days Collected Breakdown
  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(todayStr, -(6 - i));
    const dayTxns = transactions.filter(t => t.date === d);
    const dayCap = dayTxns.reduce((sum, t) => sum + t.capitalPortion, 0);
    const dayProf = dayTxns.reduce((sum, t) => sum + t.profitPortion, 0);
    const dayTotal = dayCap + dayProf;

    return {
      day: formatDateLocale(d, { day: 'numeric', month: 'short' }),
      Capital: dayCap,
      Ganancia: dayProf,
      Total: dayTotal
    };
  });

  // Client Classifications
  const clientRankings = clients.map(client => {
    const clientLoans = loans.filter(l => l.clientId === client.id);
    const clientTxns = transactions.filter(t => t.clientId === client.id);
    const ratingInfo = calculateClientRating(clientLoans, clientTxns);
    const liquidatedCount = clientLoans.filter(l => l.status === 'liquidated').length;

    return {
      client,
      ratingInfo,
      liquidatedCount
    };
  });

  return (
    <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Top Filter Selection */}
      <div className="bg-[#111111] border border-[#1F1F1F] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
            <BarChart3 className="w-5 h-5 text-[#22C55E]" />
            <span>INFORMES Y RENDIMIENTO FINANCIERO</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Métricas de cobro, distribución de capital vs ganancias y calificación de pagadores</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'today', label: 'HOY' },
            { id: 'week', label: 'ESTA SEMANA (7D)' },
            { id: 'month', label: 'ESTE MES (30D)' },
            { id: 'custom', label: 'RANGO PERSONALIZADO' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setDateRange(r.id as any)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer uppercase tracking-wider ${
                dateRange === r.id
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'bg-[#161616] text-zinc-400 border border-[#1F1F1F] hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global No-Data Banner when completely empty */}
      {transactions.length === 0 && loans.length === 0 && (
        <div className="bg-[#111111] border border-[#1F1F1F] p-8 rounded-2xl text-center space-y-2 shadow-xl">
          <div className="w-10 h-10 bg-[#161616] border border-[#1F1F1F] rounded-xl flex items-center justify-center mx-auto text-[#22C55E]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Aún no hay datos para mostrar</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Los reportes aparecerán conforme registres clientes, préstamos y pagos.
          </p>
        </div>
      )}

      {/* Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Cobrado"
          value={formatCurrency(totalCollected)}
          subtitle={`${filteredTxns.length} abonos recibidos`}
          accentColor="emerald"
          breakdown={[
            { label: 'Capital Recup.', value: formatCurrency(capitalRecovered), color: 'text-zinc-300' },
            { label: 'Ganancia Recup.', value: formatCurrency(profitRecovered), color: 'text-[#22C55E]' },
          ]}
        />

        <StatCard
          title="Nuevos Préstamos"
          value={formatCurrency(totalNewCapital)}
          subtitle={`${newLoans.length} colocados en periodo`}
          accentColor="zinc"
        />

        <StatCard
          title="Liquidados"
          value={liquidatedInPeriod.length}
          subtitle="Saldos cobrados al 100%"
          accentColor="blue"
        />

        <StatCard
          title="Margen de Ganancia"
          value={totalCollected > 0 ? `${Math.round((profitRecovered / totalCollected) * 100)}%` : '0%'}
          subtitle="Retorno respecto al cobro total"
          accentColor="amber"
        />
      </div>

      {/* Financial Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart */}
        <div className="lg:col-span-2 bg-[#111111] border border-[#1F1F1F] p-6 rounded-2xl shadow-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#22C55E]" />
            <span>EVOLUCIÓN DE COBRANZA DIARIA (ÚLTIMOS 7 DÍAS)</span>
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData}>
                <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161616', borderColor: '#1F1F1F', borderRadius: '0.5rem', color: '#ffffff' }}
                  formatter={(val: any) => formatCurrency(Number(val))}
                />
                <Bar dataKey="Capital" stackId="a" fill="#3f3f46" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Ganancia" stackId="a" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Pie Chart */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-6 rounded-2xl shadow-2xl space-y-4 flex flex-col justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">DISTRIBUCIÓN DE COBRANZA</h3>

          {capitalRecovered === 0 && profitRecovered === 0 ? (
            <div className="h-48 w-full flex flex-col items-center justify-center text-center p-4 text-zinc-500">
              <span className="text-xs font-bold text-zinc-300">Sin datos todavía</span>
              <span className="text-[11px] mt-1 text-zinc-500">Registra préstamos y pagos para comenzar a generar estadísticas.</span>
            </div>
          ) : (
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Capital Recuperado', value: capitalRecovered, fill: '#3f3f46' },
                      { name: 'Ganancia Recuperada', value: profitRecovered, fill: '#22C55E' },
                    ]}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    <Cell fill="#3f3f46" />
                    <Cell fill="#22C55E" />
                  </Pie>
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-[#1F1F1F] text-xs">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-600"></span>
                Capital Recuperado
              </span>
              <span className="font-bold text-white">{formatCurrency(capitalRecovered)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]"></span>
                Ganancia Recuperada
              </span>
              <span className="font-bold text-[#22C55E]">{formatCurrency(profitRecovered)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RENDIMIENTO DE CLIENTES SECTION */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 space-y-6 shadow-2xl">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#F97316]" />
            <span>CLASIFICACIÓN Y RENDIMIENTO DE CLIENTES</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Evaluación basada en % de puntualidad, días de atraso y préstamos liquidados</p>
        </div>

        {clientRankings.length === 0 ? (
          <div className="p-8 text-center bg-[#161616] rounded-xl border border-[#1F1F1F] text-zinc-500 text-xs">
            No hay clientes registrados aún. Agrega clientes para consultar su clasificación de cobro.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientRankings.map(({ client, ratingInfo, liquidatedCount }) => (
              <div key={client.id} className="bg-[#161616] p-4 rounded-xl border border-[#1F1F1F] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-xs text-white">{client.firstName} {client.lastName}</h4>
                    <p className="text-xs text-zinc-500">{client.phone}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#111111] text-[#22C55E] border border-[#1F1F1F] uppercase tracking-wider">
                    {ratingInfo.rating.toUpperCase().replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold">Puntualidad:</span>
                    <span className="font-bold text-[#22C55E]">{ratingInfo.punctualityPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold">Préstamos Liquidados:</span>
                    <span className="font-bold text-zinc-200">{liquidatedCount}</span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 pt-2 border-t border-[#1F1F1F] italic">
                  "{ratingInfo.description}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

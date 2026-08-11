import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  accentColor?: 'emerald' | 'rose' | 'amber' | 'blue' | 'zinc';
  breakdown?: { label: string; value: string; color?: string }[];
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'zinc',
  breakdown
}) => {
  const valueColorClass =
    accentColor === 'amber'
      ? 'text-[#F97316]'
      : accentColor === 'rose'
      ? 'text-red-500'
      : accentColor === 'emerald'
      ? 'text-white'
      : 'text-white';

  const containerBorderClass =
    accentColor === 'rose'
      ? 'border-red-900/30 bg-gradient-to-br from-[#111111] to-red-950/10'
      : 'border-[#1F1F1F] bg-[#111111]';

  return (
    <div className={`p-6 rounded-2xl border shadow-lg transition-all hover:border-zinc-700/80 ${containerBorderClass}`}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{title}</span>
        {icon && (
          <div className="p-2 rounded-lg bg-[#1A1A1A] border border-[#1F1F1F] text-zinc-300">
            {icon}
          </div>
        )}
      </div>

      {/* Main High-Hierarchy Financial Value */}
      <div className="my-1">
        <h2 className={`text-3xl font-light tracking-tighter ${valueColorClass}`}>
          {value}
        </h2>
      </div>

      {subtitle && (
        <p className="text-[10px] text-zinc-500 mt-2 font-medium">{subtitle}</p>
      )}

      {/* Sub-breakdown if provided */}
      {breakdown && breakdown.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#1F1F1F] grid grid-cols-2 gap-2 text-xs">
          {breakdown.map((item, idx) => (
            <div key={idx} className="bg-[#161616] p-2 rounded-lg border border-[#1F1F1F]">
              <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-widest">{item.label}</span>
              <span className={`font-semibold text-xs ${item.color || 'text-zinc-200'}`}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

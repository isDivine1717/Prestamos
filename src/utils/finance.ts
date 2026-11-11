import { Loan, LoanScheduleDay, ProfitType, PaymentTransaction, LoanFine } from '../types';
import { addDays, getTodayFormatted, getDaysDifference } from './dates';

/**
 * Currency formatting helper with standard Mexican Pesos format
 * e.g., $10,000.00 MXN
 */
export function formatCurrency(amount: number, showSymbol: boolean = true, showCode: boolean = false): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);

  if (!showSymbol) {
    return formatted.replace('$', '').trim();
  }
  if (showCode) {
    return `${formatted} MXN`;
  }
  return formatted;
}

/**
 * Calculates profit amount based on type
 */
export function calculateProfit(capital: number, profitType: ProfitType, profitValue: number): number {
  if (profitType === 'fixed') {
    return Math.round((profitValue + Number.EPSILON) * 100) / 100;
  }
  // percentage
  const profit = (capital * profitValue) / 100;
  return Math.round((profit + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates daily payment given total amount and normal days (default 65)
 */
export function calculateDailyPayment(totalToPay: number, normalDays: number = 65): number {
  if (normalDays <= 0) return totalToPay;
  const daily = totalToPay / normalDays;
  return Math.round((daily + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates exact proportion of capital and profit for a payment
 */
export function calculatePaymentBreakdown(
  paymentAmount: number,
  capital: number,
  totalToPay: number,
  lateFeePortion: number = 0
): { capitalPortion: number; profitPortion: number; lateFeePortion: number } {
  const effectiveLateFee = Math.max(0, Math.min(paymentAmount, lateFeePortion));
  const principalPayment = Math.max(0, paymentAmount - effectiveLateFee);

  if (totalToPay <= 0 || principalPayment <= 0) {
    return { capitalPortion: principalPayment, profitPortion: 0, lateFeePortion: effectiveLateFee };
  }

  const capitalRatio = capital / totalToPay;
  const capitalPortion = Math.round((principalPayment * capitalRatio + Number.EPSILON) * 100) / 100;
  const profitPortion = Math.round(((principalPayment - capitalPortion) + Number.EPSILON) * 100) / 100;
  
  return { capitalPortion, profitPortion, lateFeePortion: effectiveLateFee };
}

export interface LoanLateFeeInfo {
  isLateFeeApplicable: boolean;
  overdueDays: number;
  feeType: 'percentage' | 'fixed';
  feeValue: number;
  percentage: number;
  dailyLateFee: number;
  totalLateFee: number;
  rateDescription: string;
}

/**
 * Calculates the late fee (recargo por días de retraso) for a loan.
 * Applies only when there are overdue days (> 0) and late fee is enabled for this specific loan.
 * Supports both Percentage (%) of daily payment and Fixed Amount ($) per day.
 */
export function calculateLoanLateFee(loan: Loan, overdueDaysCount?: number): LoanLateFeeInfo {
  const overdueDays = overdueDaysCount !== undefined
    ? Math.max(0, overdueDaysCount)
    : (loan.schedule || []).filter(s => s.status === 'overdue').length;

  const isEnabled = Boolean(loan.lateFeeEnabled);

  // Determine lateFeeType and lateFeeValue with full backward compatibility:
  let feeType: 'percentage' | 'fixed' = loan.lateFeeType || 'percentage';
  let feeValue = 0;

  if (loan.lateFeeValue !== undefined && loan.lateFeeValue !== null) {
    feeValue = Number(loan.lateFeeValue);
  } else if (loan.lateFeeType === 'fixed') {
    feeValue = Number(loan.lateFeeAmount ?? 0);
  } else if (loan.lateFeeType === 'percentage') {
    feeValue = Number(loan.lateFeePercentage ?? loan.lateFeeAmount ?? 0);
  } else if (loan.lateFeePercentage !== undefined && loan.lateFeePercentage > 0) {
    feeType = 'percentage';
    feeValue = Number(loan.lateFeePercentage);
  } else if (loan.lateFeeAmount !== undefined && loan.lateFeeAmount > 0) {
    feeType = 'fixed';
    feeValue = Number(loan.lateFeeAmount);
  }

  if (!isEnabled || overdueDays <= 0 || feeValue <= 0) {
    return {
      isLateFeeApplicable: false,
      overdueDays,
      feeType,
      feeValue,
      percentage: feeType === 'percentage' ? feeValue : 0,
      dailyLateFee: 0,
      totalLateFee: 0,
      rateDescription: feeValue > 0
        ? (feeType === 'percentage' ? `${feeValue}% por día` : `${formatCurrency(feeValue)} fijo por día`)
        : 'Sin recargo'
    };
  }

  let dailyLateFee = 0;
  let rateDescription = '';

  if (feeType === 'percentage') {
    dailyLateFee = Math.round((loan.dailyPayment * (feeValue / 100) + Number.EPSILON) * 100) / 100;
    rateDescription = `${feeValue}% por día (${formatCurrency(dailyLateFee)}/día)`;
  } else {
    dailyLateFee = Math.round((feeValue + Number.EPSILON) * 100) / 100;
    rateDescription = `${formatCurrency(feeValue)} fijo por día`;
  }

  const totalLateFee = Math.round((dailyLateFee * overdueDays + Number.EPSILON) * 100) / 100;

  return {
    isLateFeeApplicable: totalLateFee > 0,
    overdueDays,
    feeType,
    feeValue,
    percentage: feeType === 'percentage' ? feeValue : 0,
    dailyLateFee,
    totalLateFee,
    rateDescription
  };
}

/**
 * Generates initial payment calendar schedule based on normal days and optional grace days
 */
export function generateLoanSchedule(
  startDate: string,
  totalToPay: number,
  normalDays: number = 65,
  graceDays: number = 0
): LoanScheduleDay[] {
  const dailyPayment = calculateDailyPayment(totalToPay, normalDays);
  const totalDays = normalDays + graceDays;
  const schedule: LoanScheduleDay[] = [];

  for (let i = 1; i <= totalDays; i++) {
    const isGracePeriod = i > normalDays;
    const date = addDays(startDate, i - 1);
    
    schedule.push({
      dayNumber: i,
      date,
      isGracePeriod,
      expectedAmount: isGracePeriod ? 0 : dailyPayment, // Grace days expect $0 daily default unless paying balance
      paidAmount: 0,
      status: 'pending'
    });
  }

  return schedule;
}

/**
 * Re-evaluates loan status and overdue days based on today's date
 */
export function updateLoanStatusAndSchedule(loan: Loan, todayDate: string = getTodayFormatted()): Loan {
  if (loan.status === 'liquidated' || loan.status === 'cancelled') {
    return loan;
  }

  let totalPaid = 0;
  let capitalRecovered = 0;
  let profitRecovered = 0;
  let isAnyPastDayOverdue = false;

  const capitalRatio = loan.capital / loan.totalToPay;

  const updatedSchedule = loan.schedule.map(day => {
    totalPaid += day.paidAmount;
    
    // Check overdue
    let status = day.status;
    const isPast = getDaysDifference(day.date, todayDate) > 0;
    
    if (day.paidAmount >= day.expectedAmount && day.expectedAmount > 0) {
      status = day.paidAmount > day.expectedAmount ? 'surplus' : 'paid';
    } else if (day.paidAmount > 0 && day.paidAmount < day.expectedAmount) {
      status = 'partial';
      if (isPast) isAnyPastDayOverdue = true;
    } else if (day.paidAmount === 0 && day.expectedAmount > 0 && isPast) {
      status = 'overdue';
      isAnyPastDayOverdue = true;
    }

    return {
      ...day,
      status
    };
  });

  totalPaid = Math.round((totalPaid + Number.EPSILON) * 100) / 100;
  capitalRecovered = Math.round((totalPaid * capitalRatio + Number.EPSILON) * 100) / 100;
  profitRecovered = Math.round(((totalPaid - capitalRecovered) + Number.EPSILON) * 100) / 100;
  
  const balancePending = Math.max(0, Math.round(((loan.totalToPay - totalPaid) + Number.EPSILON) * 100) / 100);

  let status: Loan['status'] = loan.status;
  if (balancePending <= 0) {
    status = 'liquidated';
  } else if (isAnyPastDayOverdue) {
    status = 'overdue';
  } else {
    status = 'active';
  }

  return {
    ...loan,
    totalPaid,
    capitalRecovered,
    profitRecovered,
    balancePending,
    status,
    schedule: updatedSchedule,
    liquidatedAt: status === 'liquidated' && !loan.liquidatedAt ? todayDate : loan.liquidatedAt
  };
}

/* ==========================================================================
   GANANCIAS POR MULTAS — ÚNICA FUENTE DE VERDAD (sin duplicar)
   --------------------------------------------------------------------------
   Regla:
   - Una multa REGISTRADA (pendiente) NO es ganancia todavía.
   - Una multa COBRADA sí es ganancia realizada, y su cobro siempre pasa
     por una transacción de pago cuyo `lateFeePortion` es el monto de la
     multa. La multa guarda el `paymentId` de esa transacción.
   - La ganancia normal (`profitPortion`) NUNCA incluye la multa: el
     desglose del pago resta primero la porción de multa y reparte solo
     el resto entre capital y ganancia normal (ver calculatePaymentBreakdown).
   - Por eso la ganancia por multas es:
         multas cobradas (por su monto, vinculadas por paymentId)
         + mora automática histórica: de cada transacción, solo el
           excedente de su lateFeePortion sobre las multas manuales
           vinculadas a esa misma transacción (p. ej. recargos
           cobrados antes de que existiera el registro manual, o la
           parte automática de un pago que también saldó multas).
     Nunca se suma el monto del pago y el de la multa por separado:
     de una transacción vinculada a multas solo se cuenta el excedente
     no cubierto por esas multas.
   - Ganancia total = ganancia normal + ganancia por multas.
   - Y se cumple: total cobrado = capital recuperado + ganancia normal
     + ganancia por multas (las multas cobradas solas tienen capital 0
     y ganancia normal 0; su monto entero es lateFeePortion).
   ========================================================================== */

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export interface FineProfitBreakdown {
  /** Ganancia realizada por multas (cobrado). */
  fineProfit: number;
  /** Suma de multas con estado 'collected' (en el rango, si se filtra). */
  collectedFinesTotal: number;
  /** Mora automática histórica sin multa manual vinculada. */
  legacyLateFeeTotal: number;
  /** Multas registradas pendientes (NO son ganancia). */
  registeredPendingTotal: number;
}

/**
 * Ganancia por multas, sin duplicar. `isInRange` filtra por fecha:
 * para multas cobradas usa su fecha de cobro; para mora histórica
 * usa la fecha de la transacción. Sin filtro, suma todo el historial.
 */
export function calculateFineProfit(
  transactions: PaymentTransaction[],
  fines: LoanFine[],
  isInRange?: (date: string) => boolean
): FineProfitBreakdown {
  const inRange = (date?: string) =>
    !isInRange || (date !== undefined && date !== '' && isInRange(date));

  const allCollectedFines = fines.filter(f => f.status === 'collected');
  const collectedFines = allCollectedFines.filter(f =>
    inRange(f.collectedDate ?? f.date)
  );
  const collectedFinesTotal = roundMoney(
    collectedFines.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
  );

  // De cada transacción, solo se cuenta como mora histórica la parte
  // de su lateFeePortion que NO corresponde a multas manuales ya
  // contadas arriba. Así un pago que trae mora automática ($100) y
  // además salda multas manuales ($50) aporta $50 de mora + $50 de
  // multas, nunca $100 + $50 ni $50 solos.
  const linkedFineAmountByPayment = new Map<string, number>();
  for (const f of allCollectedFines) {
    if (!f.paymentId) continue;
    linkedFineAmountByPayment.set(
      f.paymentId,
      (linkedFineAmountByPayment.get(f.paymentId) ?? 0) +
        (Number(f.amount) || 0)
    );
  }
  const legacyLateFeeTotal = roundMoney(
    transactions
      .filter(t => (Number(t.lateFeePortion) || 0) > 0)
      // Un cobro directo de multa (isFineOnly) siempre corresponde a
      // su multa registrada; si no hay vínculo es porque la multa se
      // registró fuera del rango o se perdió, y su monto ya se contó
      // (o se contará) por la multa, no por la transacción.
      .filter(t => !t.isFineOnly)
      .filter(t => inRange(t.date))
      .reduce((sum, t) => {
        const linked = linkedFineAmountByPayment.get(t.id) ?? 0;
        return sum + Math.max(0, (Number(t.lateFeePortion) || 0) - linked);
      }, 0)
  );

  const registeredPendingTotal = roundMoney(
    fines
      .filter(f => f.status === 'registered')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
  );

  return {
    fineProfit: roundMoney(collectedFinesTotal + legacyLateFeeTotal),
    collectedFinesTotal,
    legacyLateFeeTotal,
    registeredPendingTotal,
  };
}

/**
 * Ganancia normal de un préstamo. Fuente preferida: la suma de
 * `profitPortion` de sus transacciones (excluye multas por diseño).
 * Si el préstamo no tiene transacciones (p. ej. préstamos históricos
 * de libreta), se usa `loan.profitRecovered` como respaldo.
 */
export function calculateNormalProfitForLoan(
  loan: Loan,
  transactions: PaymentTransaction[]
): number {
  const loanTxns = transactions.filter(t => t.loanId === loan.id);
  if (loanTxns.length === 0) {
    return roundMoney(Number(loan.profitRecovered) || 0);
  }
  return roundMoney(
    loanTxns.reduce((sum, t) => sum + (Number(t.profitPortion) || 0), 0)
  );
}

export interface LoanProfitSummary {
  loanId: string;
  normalProfit: number;
  fineProfit: number;
  totalProfit: number;
}

/** Ganancia de un préstamo, desglosada y coherente con los totales. */
export function summarizeLoanProfit(
  loan: Loan,
  transactions: PaymentTransaction[],
  fines: LoanFine[]
): LoanProfitSummary {
  const normalProfit = calculateNormalProfitForLoan(loan, transactions);
  const { fineProfit } = calculateFineProfit(
    transactions.filter(t => t.loanId === loan.id),
    fines.filter(f => f.loanId === loan.id)
  );
  return {
    loanId: loan.id,
    normalProfit,
    fineProfit,
    totalProfit: roundMoney(normalProfit + fineProfit),
  };
}

export interface ClientProfitSummary {
  loanCount: number;
  activeLoanCount: number;
  liquidatedLoanCount: number;
  capitalLent: number;
  totalPaid: number;
  normalProfit: number;
  fineProfit: number;
  totalProfit: number;
  perLoan: Array<LoanProfitSummary & { loan: Loan }>;
}

/** Ganancia histórica de un cliente (expediente). La suma por préstamo
 *  cuadra con la ganancia total de la app porque usa los mismos
 *  helpers que Reportes. */
export function summarizeClientProfit(
  clientId: string,
  loans: Loan[],
  transactions: PaymentTransaction[],
  fines: LoanFine[]
): ClientProfitSummary {
  const clientLoans = loans.filter(l => l.clientId === clientId);
  const perLoan = clientLoans.map(loan => ({
    loan,
    ...summarizeLoanProfit(loan, transactions, fines),
  }));
  const normalProfit = roundMoney(
    perLoan.reduce((sum, p) => sum + p.normalProfit, 0)
  );
  const fineProfit = roundMoney(
    perLoan.reduce((sum, p) => sum + p.fineProfit, 0)
  );
  return {
    loanCount: clientLoans.length,
    activeLoanCount: clientLoans.filter(
      l => l.status === 'active' || l.status === 'overdue'
    ).length,
    liquidatedLoanCount: clientLoans.filter(
      l => l.status === 'liquidated'
    ).length,
    capitalLent: roundMoney(
      clientLoans.reduce((sum, l) => sum + (Number(l.capital) || 0), 0)
    ),
    totalPaid: roundMoney(
      clientLoans.reduce((sum, l) => sum + (Number(l.totalPaid) || 0), 0)
    ),
    normalProfit,
    fineProfit,
    totalProfit: roundMoney(normalProfit + fineProfit),
    perLoan,
  };
}

/**
 * Calculates client rating based on historical performance
 */
export function calculateClientRating(
  loans: Loan[],
  transactions: PaymentTransaction[]
): { rating: 'puntual' | 'buen_pagador' | 'irregular' | 'atrasado' | 'malo'; punctualityPct: number; overdueDaysCount: number; description: string } {
  if (loans.length === 0) {
    return {
      rating: 'buen_pagador',
      punctualityPct: 100,
      overdueDaysCount: 0,
      description: 'Cliente nuevo sin historial previo registrado.'
    };
  }

  let totalScheduledDaysUpToNow = 0;
  let totalOnTimeDays = 0;
  let currentOverdueDaysCount = 0;
  let totalOverdueDaysCount = 0;
  let liquidatedLoansCount = 0;

  const today = getTodayFormatted();

  loans.forEach(loan => {
    if (loan.status === 'liquidated') liquidatedLoansCount++;
    
    loan.schedule.forEach(day => {
      const isPastOrToday = getDaysDifference(day.date, today) >= 0;
      if (isPastOrToday && day.expectedAmount > 0) {
        totalScheduledDaysUpToNow++;
        if (day.paidAmount >= day.expectedAmount) {
          totalOnTimeDays++;
        } else {
          totalOverdueDaysCount++;
          if (getDaysDifference(day.date, today) > 0) {
            currentOverdueDaysCount++;
          }
        }
      }
    });
  });

  const punctualityPct = totalScheduledDaysUpToNow > 0
    ? Math.round((totalOnTimeDays / totalScheduledDaysUpToNow) * 100)
    : 100;

  if (currentOverdueDaysCount >= 5 || punctualityPct < 60) {
    return {
      rating: 'malo',
      punctualityPct,
      overdueDaysCount: currentOverdueDaysCount,
      description: `${punctualityPct}% de pagos puntuales, ${currentOverdueDaysCount} pagos en atraso activo. Requiere atención constante.`
    };
  } else if (currentOverdueDaysCount > 0 || punctualityPct < 75) {
    return {
      rating: 'atrasado',
      punctualityPct,
      overdueDaysCount: currentOverdueDaysCount,
      description: `${punctualityPct}% de pagos puntuales. Presenta ${currentOverdueDaysCount} cuota(s) con atraso actualmente.`
    };
  } else if (punctualityPct < 90) {
    return {
      rating: 'irregular',
      punctualityPct,
      overdueDaysCount: currentOverdueDaysCount,
      description: `${punctualityPct}% de pagos puntuales con variabilidad ocasional en las fechas de cobro.`
    };
  } else if (punctualityPct < 96) {
    return {
      rating: 'buen_pagador',
      punctualityPct,
      overdueDaysCount: currentOverdueDaysCount,
      description: `${punctualityPct}% de pagos puntuales. Excelente historial de respuesta con ${liquidatedLoansCount} préstamo(s) liquidados.`
    };
  } else {
    return {
      rating: 'puntual',
      punctualityPct,
      overdueDaysCount: currentOverdueDaysCount,
      description: `${punctualityPct}% de cumplimiento perfecto. Cliente destacado con máxima puntualidad.`
    };
  }
}

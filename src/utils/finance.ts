import { Loan, LoanScheduleDay, ProfitType, PaymentTransaction } from '../types';
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

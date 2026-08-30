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
export function calculatePaymentBreakdown(paymentAmount: number, capital: number, totalToPay: number): { capitalPortion: number; profitPortion: number } {
  if (totalToPay <= 0) {
    return { capitalPortion: paymentAmount, profitPortion: 0 };
  }
  const capitalRatio = capital / totalToPay;
  const capitalPortion = Math.round((paymentAmount * capitalRatio + Number.EPSILON) * 100) / 100;
  const profitPortion = Math.round(((paymentAmount - capitalPortion) + Number.EPSILON) * 100) / 100;
  
  return { capitalPortion, profitPortion };
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

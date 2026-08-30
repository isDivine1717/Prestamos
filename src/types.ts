export type ClientStatus = 'active' | 'inactive';

export type ClientRating = 'puntual' | 'buen_pagador' | 'irregular' | 'atrasado' | 'malo';

export type DocumentType = 'ine_frente' | 'ine_reverso' | 'curp' | 'comprobante' | 'otro';

export interface ClientDocument {
  id: string;
  clientId: string;
  title: string;
  type: DocumentType;
  fileUrl: string; // Base64 or Object URL
  uploadedAt: string; // ISO String
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  references: string;
  notes: string;
  status: ClientStatus;
  createdAt: string;
  rating?: ClientRating;
  documents?: ClientDocument[];
}

export type ProfitType = 'fixed' | 'percentage';

export type LoanStatus = 'active' | 'overdue' | 'liquidated' | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'surplus';

export type PaymentMethod = 'cash' | 'transfer' | 'deposit' | 'other';

export interface LoanScheduleDay {
  dayNumber: number; // 1 to totalDays
  date: string; // YYYY-MM-DD
  isGracePeriod: boolean;
  expectedAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  paidAt?: string; // ISO Date Time
  paymentMethod?: PaymentMethod;
  note?: string;
  transactionId?: string;
}

export interface Loan {
  id: string;
  clientId: string;
  clientName: string;
  startDate: string; // YYYY-MM-DD
  capital: number;
  profitType: ProfitType;
  profitValue: number; // Amount or percentage
  totalProfit: number;
  totalToPay: number; // capital + totalProfit
  normalDays: number; // default 65
  graceDays: number; // default 0
  dailyPayment: number; // totalToPay / normalDays
  status: LoanStatus;
  capitalRecovered: number;
  profitRecovered: number;
  totalPaid: number;
  balancePending: number;
  liquidatedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  schedule: LoanScheduleDay[];
}

export interface PaymentTransaction {
  id: string;
  loanId: string;
  clientId: string;
  clientName: string;
  date: string; // YYYY-MM-DD payment date
  timestamp: string; // Full ISO timestamp
  expectedAmount: number;
  amountReceived: number;
  capitalPortion: number;
  profitPortion: number;
  difference: number; // Surplus (>0) or Shortfall (<0)
  paymentMethod: PaymentMethod;
  note?: string;
  dayNumber?: number;
}

export interface AppSettings {
  defaultNormalDays: number;
  defaultGraceDays: number;
  dailyCollectionEnabled: boolean;
  chargeSundays: boolean;
  chargeHolidays: boolean;
  lateFeeEnabled: boolean;
  lateFeeType: 'fixed' | 'percentage';
  lateFeeAmount: number;
  currencySymbol: string;
  currencyCode: string;
}

export interface AdminUser {
  email: string;
  name: string;
}

export interface DailySummary {
  date: string;
  totalCollectedToday: number;
  capitalRecoveredToday: number;
  profitRecoveredToday: number;
  pendingToCollectToday: number;
  pendingClientsCount: number;
  activeClientsCount: number;
  overdueClientsCount: number;
  debtFreeClientsCount: number;
  activeLoansCount: number;
  overdueLoansCount: number;
  liquidatedLoansCount: number;
}

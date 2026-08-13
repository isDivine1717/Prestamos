import { supabase } from '../lib/supabase';
import {
  Client,
  Loan,
  LoanScheduleDay,
  PaymentTransaction,
  AppSettings,
  PaymentMethod,
  PaymentStatus,
  ProfitType,
  LoanStatus,
  ClientRating,
} from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  defaultNormalDays: 60,
  defaultGraceDays: 5,
  dailyCollectionEnabled: true,
  chargeSundays: true,
  chargeHolidays: true,
  lateFeeEnabled: false,
  lateFeeType: 'fixed',
  lateFeeAmount: 50,
  currencySymbol: '$',
  currencyCode: 'MXN',
};

/* =========================================================
   HELPERS
========================================================= */

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('No hay una sesión activa de Supabase.');
  }

  return user.id;
}

/* =========================================================
   CLIENTS
========================================================= */

function mapClientFromDb(row: any): Client {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? '',
    address: row.address ?? '',
    references: row.references_text ?? '',
    notes: row.notes ?? '',
    status: row.status as Client['status'],
    createdAt: row.created_at,
    rating: row.rating as ClientRating | undefined,
    documents: [],
  };
}

function mapClientToDb(client: Partial<Client>, userId: string) {
  return {
    user_id: userId,
    ...(client.id ? { id: client.id } : {}),
    ...(client.firstName !== undefined
      ? { first_name: client.firstName }
      : {}),
    ...(client.lastName !== undefined
      ? { last_name: client.lastName }
      : {}),
    ...(client.phone !== undefined ? { phone: client.phone } : {}),
    ...(client.address !== undefined ? { address: client.address } : {}),
    ...(client.references !== undefined
      ? { references_text: client.references }
      : {}),
    ...(client.notes !== undefined ? { notes: client.notes } : {}),
    ...(client.status !== undefined ? { status: client.status } : {}),
    ...(client.rating !== undefined ? { rating: client.rating } : {}),
  };
}

/* =========================================================
   LOAN SCHEDULE
========================================================= */

function mapScheduleFromDb(row: any): LoanScheduleDay {
  return {
    dayNumber: row.day_number,
    date: row.payment_date,
    isGracePeriod: row.is_grace_period,
    expectedAmount: Number(row.expected_amount),
    paidAmount: Number(row.paid_amount),
    status: row.status as PaymentStatus,
    paidAt: row.paid_at ?? undefined,
    paymentMethod: row.payment_method as PaymentMethod | undefined,
    note: row.note ?? undefined,
    transactionId: row.transaction_id ?? undefined,
  };
}

function mapScheduleToDb(
  schedule: LoanScheduleDay,
  loanId: string,
  userId: string
) {
  return {
    user_id: userId,
    loan_id: loanId,
    day_number: schedule.dayNumber,
    payment_date: schedule.date,
    is_grace_period: schedule.isGracePeriod,
    expected_amount: schedule.expectedAmount,
    paid_amount: schedule.paidAmount,
    status: schedule.status,
    paid_at: schedule.paidAt ?? null,
    payment_method: schedule.paymentMethod ?? null,
    note: schedule.note ?? null,
    transaction_id: schedule.transactionId ?? null,
  };
}

/* =========================================================
   LOANS
========================================================= */

function mapLoanFromDb(row: any): Loan {
  const client = Array.isArray(row.clients)
    ? row.clients[0]
    : row.clients;

  const scheduleRows = Array.isArray(row.loan_schedule)
    ? row.loan_schedule
    : [];

  const clientName = client
    ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
    : 'Cliente';

  return {
    id: row.id,
    clientId: row.client_id,
    clientName,
    startDate: row.start_date,
    capital: Number(row.capital),
    profitType: row.profit_type as ProfitType,
    profitValue: Number(row.profit_value),
    totalProfit: Number(row.total_profit),
    totalToPay: Number(row.total_to_pay),
    normalDays: row.normal_days,
    graceDays: row.grace_days,
    dailyPayment: Number(row.daily_payment),
    status: row.status as LoanStatus,
    capitalRecovered: Number(row.capital_recovered),
    profitRecovered: Number(row.profit_recovered),
    totalPaid: Number(row.total_paid),
    balancePending: Number(row.balance_pending),
    liquidatedAt: row.liquidated_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    schedule: scheduleRows
      .map(mapScheduleFromDb)
      .sort((a: LoanScheduleDay, b: LoanScheduleDay) => {
        return a.dayNumber - b.dayNumber;
      }),
  };
}

/* =========================================================
   PAYMENTS
========================================================= */

function mapPaymentFromDb(row: any): PaymentTransaction {
  const client = Array.isArray(row.clients)
    ? row.clients[0]
    : row.clients;

  const clientName = client
    ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
    : 'Cliente';

  return {
    id: row.id,
    loanId: row.loan_id,
    clientId: row.client_id,
    clientName,
    date: row.payment_date,
    timestamp: row.timestamp,
    expectedAmount: Number(row.expected_amount),
    amountReceived: Number(row.amount_received),
    capitalPortion: Number(row.capital_portion),
    profitPortion: Number(row.profit_portion),
    difference: Number(row.difference),
    paymentMethod: row.payment_method as PaymentMethod,
    note: row.note ?? undefined,
    dayNumber: row.day_number ?? undefined,
  };
}

/* =========================================================
   STORAGE SERVICE
========================================================= */

export const SupabaseStorage = {

  /* =========================
     CLIENTS
  ========================= */

  async getClients(): Promise<Client[]> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map(mapClientFromDb);
  },

  async createClient(
    clientData: Omit<Client, 'id' | 'createdAt' | 'rating' | 'documents'>
  ): Promise<Client> {
    const userId = await getCurrentUserId();

    const payload = {
      user_id: userId,
      first_name: clientData.firstName,
      last_name: clientData.lastName,
      phone: clientData.phone ?? '',
      address: clientData.address ?? '',
      references_text: clientData.references ?? '',
      notes: clientData.notes ?? '',
      status: clientData.status ?? 'active',
      rating: 'buen_pagador',
    };

    const { data, error } = await supabase
      .from('clients')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    return mapClientFromDb(data);
  },

  async updateClient(
    id: string,
    clientData: Partial<Client>
  ): Promise<Client> {
    const userId = await getCurrentUserId();

    const payload = mapClientToDb(clientData, userId);

    delete (payload as any).id;
    delete (payload as any).user_id;

    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;

    return mapClientFromDb(data);
  },

  async deleteClient(id: string): Promise<void> {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /* =========================
     LOANS
  ========================= */

  async getLoans(): Promise<Loan[]> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('loans')
      .select(`
        *,
        clients (
          first_name,
          last_name
        ),
        loan_schedule (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map(mapLoanFromDb);
  },

  async createLoan(
    loanData: Omit<
      Loan,
      'id' | 'clientName' | 'schedule'
    >
  ): Promise<Loan> {
    const userId = await getCurrentUserId();

    const loanPayload = {
      user_id: userId,
      client_id: loanData.clientId,
      start_date: loanData.startDate,
      capital: loanData.capital,
      profit_type: loanData.profitType,
      profit_value: loanData.profitValue,
      total_profit: loanData.totalProfit,
      total_to_pay: loanData.totalToPay,
      normal_days: loanData.normalDays,
      grace_days: loanData.graceDays,
      daily_payment: loanData.dailyPayment,
      status: loanData.status,
      capital_recovered: loanData.capitalRecovered,
      profit_recovered: loanData.profitRecovered,
      total_paid: loanData.totalPaid,
      balance_pending: loanData.balancePending,
      liquidated_at: loanData.liquidatedAt ?? null,
      cancelled_at: loanData.cancelledAt ?? null,
      cancellation_reason: loanData.cancellationReason ?? null,
    };

    const { data: loanRow, error: loanError } = await supabase
      .from('loans')
      .insert(loanPayload)
      .select(`
        *,
        clients (
          first_name,
          last_name
        )
      `)
      .single();

    if (loanError) throw loanError;

    if (loanData.schedule.length > 0) {
      const schedulePayload = loanData.schedule.map(day =>
        mapScheduleToDb(day, loanRow.id, userId)
      );

      const { error: scheduleError } = await supabase
        .from('loan_schedule')
        .insert(schedulePayload);

      if (scheduleError) {
        await supabase
          .from('loans')
          .delete()
          .eq('id', loanRow.id)
          .eq('user_id', userId);

        throw scheduleError;
      }
    }

    const { data: completeLoan, error: completeError } = await supabase
      .from('loans')
      .select(`
        *,
        clients (
          first_name,
          last_name
        ),
        loan_schedule (*)
      `)
      .eq('id', loanRow.id)
      .eq('user_id', userId)
      .single();

    if (completeError) throw completeError;

    return mapLoanFromDb(completeLoan);
  },

  async cancelLoan(
    loanId: string,
    reason: string
  ): Promise<Loan> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('loans')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', loanId)
      .eq('user_id', userId)
      .select(`
        *,
        clients (
          first_name,
          last_name
        ),
        loan_schedule (*)
      `)
      .single();

    if (error) throw error;

    return mapLoanFromDb(data);
  },

  /* =========================
     DELETE LOAN
  ========================= */

  async deleteLoan(loanId: string): Promise<void> {
    const userId = await getCurrentUserId();

    /*
      El orden importa porque payments y loan_schedule
      dependen del préstamo.
    */

    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('loan_id', loanId)
      .eq('user_id', userId);

    if (paymentsError) throw paymentsError;

    const { error: scheduleError } = await supabase
      .from('loan_schedule')
      .delete()
      .eq('loan_id', loanId)
      .eq('user_id', userId);

    if (scheduleError) throw scheduleError;

    const { error: loanError } = await supabase
      .from('loans')
      .delete()
      .eq('id', loanId)
      .eq('user_id', userId);

    if (loanError) throw loanError;
  },

  /* =========================
     PAYMENTS
  ========================= */

  async getTransactions(): Promise<PaymentTransaction[]> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        clients (
          first_name,
          last_name
        )
      `)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return (data ?? []).map(mapPaymentFromDb);
  },

  async createPayment(payment: {
    loanId: string;
    clientId: string;
    paymentDate: string;
    expectedAmount: number;
    amountReceived: number;
    capitalPortion: number;
    profitPortion: number;
    difference: number;
    paymentMethod: PaymentMethod;
    note?: string;
    dayNumber?: number;
  }): Promise<PaymentTransaction> {
    const userId = await getCurrentUserId();

    const payload = {
      user_id: userId,
      loan_id: payment.loanId,
      client_id: payment.clientId,
      payment_date: payment.paymentDate,
      expected_amount: payment.expectedAmount,
      amount_received: payment.amountReceived,
      capital_portion: payment.capitalPortion,
      profit_portion: payment.profitPortion,
      difference: payment.difference,
      payment_method: payment.paymentMethod,
      note: payment.note ?? null,
      day_number: payment.dayNumber ?? null,
    };

    const { data, error } = await supabase
      .from('payments')
      .insert(payload)
      .select(`
        *,
        clients (
          first_name,
          last_name
        )
      `)
      .single();

    if (error) throw error;

    return mapPaymentFromDb(data);
  },

  /* =========================
     LOAN SCHEDULE
  ========================= */

  async updateScheduleDay(
    loanId: string,
    dayNumber: number,
    update: {
      paidAmount: number;
      status: PaymentStatus;
      paidAt?: string;
      paymentMethod?: PaymentMethod;
      note?: string;
      transactionId?: string;
    }
  ): Promise<void> {
    const userId = await getCurrentUserId();

    const payload = {
      paid_amount: update.paidAmount,
      status: update.status,
      paid_at: update.paidAt ?? null,
      payment_method: update.paymentMethod ?? null,
      note: update.note ?? null,
      transaction_id: update.transactionId ?? null,
    };

    const { error } = await supabase
      .from('loan_schedule')
      .update(payload)
      .eq('loan_id', loanId)
      .eq('day_number', dayNumber)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /* =========================
     UPDATE LOAN FINANCIAL DATA
  ========================= */

  async updateLoan(
    loanId: string,
    updates: Partial<{
      totalPaid: number;
      capitalRecovered: number;
      profitRecovered: number;
      balancePending: number;
      status: LoanStatus;
      liquidatedAt: string | null;
      cancelledAt: string | null;
      cancellationReason: string | null;
    }>
  ): Promise<Loan> {
    const userId = await getCurrentUserId();

    const payload: Record<string, any> = {};

    if (updates.totalPaid !== undefined)
      payload.total_paid = updates.totalPaid;

    if (updates.capitalRecovered !== undefined)
      payload.capital_recovered = updates.capitalRecovered;

    if (updates.profitRecovered !== undefined)
      payload.profit_recovered = updates.profitRecovered;

    if (updates.balancePending !== undefined)
      payload.balance_pending = updates.balancePending;

    if (updates.status !== undefined)
      payload.status = updates.status;

    if (updates.liquidatedAt !== undefined)
      payload.liquidated_at = updates.liquidatedAt;

    if (updates.cancelledAt !== undefined)
      payload.cancelled_at = updates.cancelledAt;

    if (updates.cancellationReason !== undefined)
      payload.cancellation_reason = updates.cancellationReason;

    const { data, error } = await supabase
      .from('loans')
      .update(payload)
      .eq('id', loanId)
      .eq('user_id', userId)
      .select(`
        *,
        clients (
          first_name,
          last_name
        ),
        loan_schedule (*)
      `)
      .single();

    if (error) throw error;

    return mapLoanFromDb(data);
  },

  /* =========================
     SETTINGS
  ========================= */

  async getSettings(): Promise<AppSettings> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return DEFAULT_SETTINGS;
    }

    return {
      defaultNormalDays: data.default_normal_days,
      defaultGraceDays: data.default_grace_days,
      dailyCollectionEnabled: data.daily_collection_enabled,
      chargeSundays: data.charge_sundays,
      chargeHolidays: data.charge_holidays,
      lateFeeEnabled: data.late_fee_enabled,
      lateFeeType: data.late_fee_type,
      lateFeeAmount: Number(data.late_fee_amount),
      currencySymbol: data.currency_symbol,
      currencyCode: data.currency_code,
    };
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    const userId = await getCurrentUserId();

    const payload = {
      user_id: userId,
      default_normal_days: settings.defaultNormalDays,
      default_grace_days: settings.defaultGraceDays,
      daily_collection_enabled: settings.dailyCollectionEnabled,
      charge_sundays: settings.chargeSundays,
      charge_holidays: settings.chargeHolidays,
      late_fee_enabled: settings.lateFeeEnabled,
      late_fee_type: settings.lateFeeType,
      late_fee_amount: settings.lateFeeAmount,
      currency_symbol: settings.currencySymbol,
      currency_code: settings.currencyCode,
    };

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) throw error;

    return {
      defaultNormalDays: data.default_normal_days,
      defaultGraceDays: data.default_grace_days,
      dailyCollectionEnabled: data.daily_collection_enabled,
      chargeSundays: data.charge_sundays,
      chargeHolidays: data.charge_holidays,
      lateFeeEnabled: data.late_fee_enabled,
      lateFeeType: data.late_fee_type,
      lateFeeAmount: Number(data.late_fee_amount),
      currencySymbol: data.currency_symbol,
      currencyCode: data.currency_code,
    };
  },

  /* =========================
     DELETE ALL USER DATA
  ========================= */

  async clearAllData(): Promise<void> {
    const userId = await getCurrentUserId();

    /*
      El orden importa por las relaciones:
      payments / schedule dependen de loans,
      loans dependen de clients.
    */

    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('user_id', userId);

    if (paymentsError) throw paymentsError;

    const { error: scheduleError } = await supabase
      .from('loan_schedule')
      .delete()
      .eq('user_id', userId);

    if (scheduleError) throw scheduleError;

    const { error: loansError } = await supabase
      .from('loans')
      .delete()
      .eq('user_id', userId);

    if (loansError) throw loansError;

    const { error: clientsError } = await supabase
      .from('clients')
      .delete()
      .eq('user_id', userId);

    if (clientsError) throw clientsError;
  },
};
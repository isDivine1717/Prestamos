import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StorageService } from './storage';
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
  ClientDocument,
  DocumentType,
} from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  defaultNormalDays: 60,
  defaultGraceDays: 5,
  dailyCollectionEnabled: true,
  chargeSundays: true,
  chargeHolidays: true,
  lateFeeEnabled: false,
  lateFeeType: 'percentage',
  lateFeeValue: 0,
  lateFeePercentage: 0,
  lateFeeAmount: 0,
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
  const docs: ClientDocument[] = Array.isArray(row.client_documents)
    ? row.client_documents.map((d: any) => ({
        id: d.id,
        clientId: d.client_id,
        title: d.title,
        type: d.type as DocumentType,
        fileUrl: d.file_url,
        uploadedAt: d.uploaded_at,
      }))
    : Array.isArray(row.documents)
    ? row.documents
    : [];

  return {
    id: row.id,
    firstName: row.first_name || row.firstName || '',
    lastName: row.last_name || row.lastName || '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    references: row.references_text ?? row.references ?? '',
    notes: row.notes ?? '',
    status: (row.status as Client['status']) || 'active',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    rating: (row.rating as ClientRating | undefined) || 'buen_pagador',
    documents: docs,
  };
}

function mapClientToDb(client: Partial<Client>, userId: string) {
  return {
    user_id: userId,
    ...(client.id ? { id: client.id } : {}),
    ...(client.firstName !== undefined ? { first_name: client.firstName } : {}),
    ...(client.lastName !== undefined ? { last_name: client.lastName } : {}),
    ...(client.phone !== undefined ? { phone: client.phone } : {}),
    ...(client.address !== undefined ? { address: client.address } : {}),
    ...(client.references !== undefined ? { references_text: client.references } : {}),
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
  const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  const scheduleRows = Array.isArray(row.loan_schedule) ? row.loan_schedule : [];

  const clientName = client
    ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
    : row.clientName || 'Cliente';

  const lateFeeType: 'percentage' | 'fixed' = (
    row.late_fee_type ||
    row.lateFeeType ||
    (row.late_fee_amount !== undefined && (row.late_fee_percentage === undefined || Number(row.late_fee_percentage) === 0) ? 'fixed' : 'percentage')
  ) as 'percentage' | 'fixed';

  let lateFeeValue = 0;
  if (row.late_fee_value !== undefined && row.late_fee_value !== null) {
    lateFeeValue = Number(row.late_fee_value);
  } else if (lateFeeType === 'fixed') {
    lateFeeValue = Number(row.late_fee_amount ?? row.lateFeeAmount ?? 0);
  } else {
    lateFeeValue = Number(row.late_fee_percentage ?? row.late_fee_amount ?? row.lateFeePercentage ?? row.lateFeeAmount ?? 0);
  }

  return {
    id: row.id,
    clientId: row.client_id || row.clientId,
    clientName,
    startDate: row.start_date || row.startDate,
    capital: Number(row.capital),
    profitType: row.profit_type as ProfitType || row.profitType,
    profitValue: Number(row.profit_value ?? row.profitValue ?? 0),
    totalProfit: Number(row.total_profit ?? row.totalProfit ?? 0),
    totalToPay: Number(row.total_to_pay ?? row.totalToPay ?? 0),
    normalDays: row.normal_days ?? row.normalDays,
    graceDays: row.grace_days ?? row.graceDays,
    dailyPayment: Number(row.daily_payment ?? row.dailyPayment ?? 0),
    status: row.status as LoanStatus,
    capitalRecovered: Number(row.capital_recovered ?? row.capitalRecovered ?? 0),
    profitRecovered: Number(row.profit_recovered ?? row.profitRecovered ?? 0),
    totalPaid: Number(row.total_paid ?? row.totalPaid ?? 0),
    balancePending: Number(row.balance_pending ?? row.balancePending ?? 0),
    lateFeeEnabled: row.late_fee_enabled ?? row.lateFeeEnabled ?? false,
    lateFeeType,
    lateFeeValue,
    lateFeePercentage: lateFeeType === 'percentage' ? lateFeeValue : (Number(row.late_fee_percentage ?? row.lateFeePercentage ?? 0)),
    lateFeeAmount: lateFeeType === 'fixed' ? lateFeeValue : (Number(row.late_fee_amount ?? row.lateFeeAmount ?? 0)),
    liquidatedAt: row.liquidated_at || row.liquidatedAt || undefined,
    cancelledAt: row.cancelled_at || row.cancelledAt || undefined,
    cancellationReason: row.cancellation_reason || row.cancellationReason || undefined,
    schedule: scheduleRows.length > 0
      ? scheduleRows.map(mapScheduleFromDb).sort((a: LoanScheduleDay, b: LoanScheduleDay) => a.dayNumber - b.dayNumber)
      : (Array.isArray(row.schedule) ? row.schedule : []),
  };
}

/* =========================================================
   PAYMENTS
========================================================= */

function mapPaymentFromDb(row: any): PaymentTransaction {
  const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;

  const clientName = client
    ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
    : row.clientName || 'Cliente';

  return {
    id: row.id,
    loanId: row.loan_id || row.loanId,
    clientId: row.client_id || row.clientId,
    clientName,
    date: row.payment_date || row.date,
    timestamp: row.timestamp,
    expectedAmount: Number(row.expected_amount ?? row.expectedAmount ?? 0),
    amountReceived: Number(row.amount_received ?? row.amountReceived ?? 0),
    capitalPortion: Number(row.capital_portion ?? row.capitalPortion ?? 0),
    profitPortion: Number(row.profit_portion ?? row.profitPortion ?? 0),
    difference: Number(row.difference ?? 0),
    lateFeePortion: Number(row.late_fee_portion ?? row.lateFeePortion ?? 0),
    paymentMethod: (row.payment_method || row.paymentMethod) as PaymentMethod,
    note: row.note ?? undefined,
    dayNumber: row.day_number ?? row.dayNumber ?? undefined,
  };
}

async function fetchLoanById(loanId: string, userId: string): Promise<Loan> {
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
    .eq('id', loanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!error && data) {
    return mapLoanFromDb(data);
  }

  if (error && error.code !== 'PGRST200') {
    throw error;
  }

  const { data: loanRow, error: loanErr } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .eq('user_id', userId)
    .single();

  if (loanErr) throw loanErr;

  const { data: clientRow } = await supabase
    .from('clients')
    .select('first_name, last_name')
    .eq('id', loanRow.client_id)
    .maybeSingle();

  const { data: scheduleRows } = await supabase
    .from('loan_schedule')
    .select('*')
    .eq('loan_id', loanId)
    .eq('user_id', userId);

  return mapLoanFromDb({
    ...loanRow,
    clients: clientRow ? [clientRow] : [],
    loan_schedule: scheduleRows || [],
  });
}

/* =========================================================
   STORAGE SERVICE
========================================================= */

export const SupabaseStorage = {

  /* =========================
     CLIENTS
  ========================= */

  async getClients(): Promise<Client[]> {
    if (!isSupabaseConfigured) {
      return StorageService.getClients();
    }

    const userId = await getCurrentUserId();

    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (clientsError) throw clientsError;

    const { data: docsData, error: docsError } = await supabase
      .from('client_documents')
      .select('*')
      .eq('user_id', userId);

    if (docsError) {
      console.warn('Error al obtener client_documents de Supabase:', docsError);
    }

    const docsByClientId: Record<string, any[]> = {};
    if (docsData) {
      for (const doc of docsData) {
        if (!docsByClientId[doc.client_id]) {
          docsByClientId[doc.client_id] = [];
        }
        docsByClientId[doc.client_id].push(doc);
      }
    }

    return (clientsData ?? []).map(clientRow =>
      mapClientFromDb({
        ...clientRow,
        client_documents: docsByClientId[clientRow.id] || [],
      })
    );
  },

  async createClient(
    clientData: Omit<Client, 'id' | 'createdAt' | 'rating' | 'documents'>
  ): Promise<Client> {
    if (!isSupabaseConfigured) {
      const newClient: Client = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        ...clientData,
        createdAt: new Date().toISOString(),
        rating: 'buen_pagador',
        documents: [],
      };
      const clients = StorageService.getClients();
      StorageService.saveClients([newClient, ...clients]);
      return newClient;
    }

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

    return mapClientFromDb({
      ...data,
      client_documents: [],
    });
  },

  async updateClient(
    id: string,
    clientData: Partial<Client>
  ): Promise<Client> {
    if (!isSupabaseConfigured) {
      const clients = StorageService.getClients();
      let updated: Client | null = null;
      const nextClients = clients.map(c => {
        if (c.id === id) {
          updated = { ...c, ...clientData };
          return updated;
        }
        return c;
      });
      StorageService.saveClients(nextClients);
      if (!updated) throw new Error('Cliente no encontrado');
      return updated;
    }

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

    const { data: docsData } = await supabase
      .from('client_documents')
      .select('*')
      .eq('client_id', id)
      .eq('user_id', userId);

    return mapClientFromDb({
      ...data,
      client_documents: docsData || [],
    });
  },

  async deleteClient(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const clients = StorageService.getClients().filter(c => c.id !== id);
      StorageService.saveClients(clients);
      const loans = StorageService.getLoans().filter(l => l.clientId !== id);
      StorageService.saveLoans(loans);
      const txns = StorageService.getTransactions().filter(t => t.clientId !== id);
      StorageService.saveTransactions(txns);
      return;
    }

    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /* =========================
     CLIENT DOCUMENTS
  ========================= */

  async uploadClientDocument(
    clientId: string,
    title: string,
    type: DocumentType,
    file: File
  ): Promise<ClientDocument> {
    const docId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

    if (!isSupabaseConfigured) {
      const fileUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const doc: ClientDocument = {
        id: docId,
        clientId,
        title,
        type,
        fileUrl,
        uploadedAt: new Date().toISOString(),
      };

      const clients = StorageService.getClients();
      const nextClients = clients.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            documents: [doc, ...(c.documents || [])],
          };
        }
        return c;
      });
      StorageService.saveClients(nextClients);
      return doc;
    }

    const userId = await getCurrentUserId();
    const sanitizeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${clientId}/${docId}_${sanitizeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Error al subir archivo a Supabase Storage: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('client-documents')
      .getPublicUrl(storagePath);

    const fileUrl = urlData?.publicUrl || storagePath;
    const uploadedAt = new Date().toISOString();

    const { error: dbError } = await supabase.from('client_documents').insert({
      id: docId,
      user_id: userId,
      client_id: clientId,
      title,
      type,
      file_url: fileUrl,
      uploaded_at: uploadedAt,
    });

    if (dbError) throw dbError;

    return {
      id: docId,
      clientId,
      title,
      type,
      fileUrl,
      uploadedAt,
    };
  },

  async deleteClientDocument(clientId: string, documentId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const clients = StorageService.getClients();
      const nextClients = clients.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            documents: (c.documents || []).filter(d => d.id !== documentId),
          };
        }
        return c;
      });
      StorageService.saveClients(nextClients);
      return;
    }

    const userId = await getCurrentUserId();

    const { data: docData } = await supabase
      .from('client_documents')
      .select('file_url')
      .eq('id', documentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (docData?.file_url) {
      try {
        const url = docData.file_url;
        const bucketMarker = '/client-documents/';
        if (url.includes(bucketMarker)) {
          const filePath = url.split(bucketMarker)[1];
          if (filePath) {
            await supabase.storage
              .from('client-documents')
              .remove([decodeURIComponent(filePath)]);
          }
        }
      } catch (e) {
        console.warn('No se pudo borrar el archivo de Supabase Storage:', e);
      }
    }

    const { error } = await supabase
      .from('client_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /* =========================
     LOANS
  ========================= */

  async getLoans(): Promise<Loan[]> {
    if (!isSupabaseConfigured) {
      return StorageService.getLoans();
    }

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

    if (!error) {
      return (data ?? []).map(mapLoanFromDb);
    }

    if (error.code !== 'PGRST200') {
      throw error;
    }

    // Fallback if foreign key embedding fails due to missing schema relationships
    const { data: loansData, error: loansErr } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (loansErr) throw loansErr;

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('user_id', userId);

    const { data: scheduleData } = await supabase
      .from('loan_schedule')
      .select('*')
      .eq('user_id', userId);

    const clientMap = new Map((clientsData || []).map(c => [c.id, c]));
    const scheduleMap = new Map<string, any[]>();
    (scheduleData || []).forEach(s => {
      if (!scheduleMap.has(s.loan_id)) {
        scheduleMap.set(s.loan_id, []);
      }
      scheduleMap.get(s.loan_id)!.push(s);
    });

    return (loansData || []).map(loan =>
      mapLoanFromDb({
        ...loan,
        clients: clientMap.get(loan.client_id) ? [clientMap.get(loan.client_id)] : [],
        loan_schedule: scheduleMap.get(loan.id) || [],
      })
    );
  },

  async createLoan(
    loanData: Omit<Loan, 'id' | 'clientName'>
  ): Promise<Loan> {
    if (!isSupabaseConfigured) {
      const clients = StorageService.getClients();
      const client = clients.find(c => c.id === loanData.clientId);
      const clientName = client ? `${client.firstName} ${client.lastName}`.trim() : 'Cliente';
      const newLoan: Loan = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        clientName,
        ...loanData,
      };
      const loans = StorageService.getLoans();
      StorageService.saveLoans([newLoan, ...loans]);
      return newLoan;
    }

    const userId = await getCurrentUserId();

    const feeType = loanData.lateFeeType || 'percentage';
    const feeVal = loanData.lateFeeValue ?? (feeType === 'percentage' ? (loanData.lateFeePercentage ?? 0) : (loanData.lateFeeAmount ?? 0));

    const loanPayload: Record<string, any> = {
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
      late_fee_enabled: Boolean(loanData.lateFeeEnabled),
      late_fee_type: feeType,
      late_fee_amount: feeType === 'fixed' ? feeVal : feeVal,
      late_fee_percentage: feeType === 'percentage' ? feeVal : 0,
      late_fee_value: feeVal,
      liquidated_at: loanData.liquidatedAt ?? null,
      cancelled_at: loanData.cancelledAt ?? null,
      cancellation_reason: loanData.cancellationReason ?? null,
    };

    let loanRow: any = null;
    const { data, error: loanError } = await supabase
      .from('loans')
      .insert(loanPayload)
      .select('*')
      .single();

    if (!loanError && data) {
      loanRow = data;
    } else if (loanError) {
      // If late_fee_value or late_fee_percentage column does not exist in the DB schema, retry progressively
      if (loanError.message && (loanError.message.includes('late_fee_value') || loanError.message.includes('late_fee_percentage') || loanError.message.includes('column') || loanError.code === 'PGRST204')) {
        const { late_fee_value, ...cleanPayload } = loanPayload;
        const { data: retryData, error: retryError } = await supabase
          .from('loans')
          .insert(cleanPayload)
          .select('*')
          .single();

        if (retryError) {
          const { late_fee_percentage, ...cleanPayload2 } = cleanPayload;
          const { data: retryData2, error: retryError2 } = await supabase
            .from('loans')
            .insert({
              ...cleanPayload2,
              late_fee_type: feeType,
              late_fee_amount: feeVal
            })
            .select('*')
            .single();

          if (retryError2) {
            const { late_fee_type, late_fee_amount, ...minimalPayload } = cleanPayload2;
            const { data: minData, error: minError } = await supabase
              .from('loans')
              .insert(minimalPayload)
              .select('*')
              .single();
            if (minError) throw minError;
            loanRow = minData;
          } else {
            loanRow = retryData2;
          }
        } else {
          loanRow = retryData;
        }
      } else {
        throw loanError;
      }
    }

    if (loanData.schedule.length > 0 && loanRow) {
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

    return fetchLoanById(loanRow.id, userId);
  },

  async cancelLoan(
    loanId: string,
    reason: string
  ): Promise<Loan> {
    if (!isSupabaseConfigured) {
      const loans = StorageService.getLoans();
      let updated: Loan | null = null;
      const nextLoans = loans.map(l => {
        if (l.id === loanId) {
          updated = {
            ...l,
            status: 'cancelled' as const,
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason,
          };
          return updated;
        }
        return l;
      });
      StorageService.saveLoans(nextLoans);
      if (!updated) throw new Error('Préstamo no encontrado');
      return updated;
    }

    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from('loans')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', loanId)
      .eq('user_id', userId);

    if (error) throw error;

    return fetchLoanById(loanId, userId);
  },

  /* =========================
     DELETE LOAN
  ========================= */

  async deleteLoan(loanId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const loans = StorageService.getLoans().filter(l => l.id !== loanId);
      StorageService.saveLoans(loans);
      const txns = StorageService.getTransactions().filter(t => t.loanId !== loanId);
      StorageService.saveTransactions(txns);
      return;
    }

    const userId = await getCurrentUserId();

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
    if (!isSupabaseConfigured) {
      return StorageService.getTransactions();
    }

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

    if (!error) {
      return (data ?? []).map(mapPaymentFromDb);
    }

    if (error.code !== 'PGRST200') {
      throw error;
    }

    const { data: pmtsData, error: pmtsErr } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (pmtsErr) throw pmtsErr;

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('user_id', userId);

    const clientMap = new Map((clientsData || []).map(c => [c.id, c]));

    return (pmtsData || []).map(pmt =>
      mapPaymentFromDb({
        ...pmt,
        clients: clientMap.get(pmt.client_id) ? [clientMap.get(pmt.client_id)] : [],
      })
    );
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
    lateFeePortion?: number;
    paymentMethod: PaymentMethod;
    note?: string;
    dayNumber?: number;
  }): Promise<PaymentTransaction> {
    if (!isSupabaseConfigured) {
      const clients = StorageService.getClients();
      const client = clients.find(c => c.id === payment.clientId);
      const clientName = client ? `${client.firstName} ${client.lastName}`.trim() : 'Cliente';
      const newTxn: PaymentTransaction = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        clientName,
        timestamp: new Date().toISOString(),
        date: payment.paymentDate,
        ...payment,
      };
      const txns = StorageService.getTransactions();
      StorageService.saveTransactions([newTxn, ...txns]);
      return newTxn;
    }

    const userId = await getCurrentUserId();

    const payload: Record<string, any> = {
      user_id: userId,
      loan_id: payment.loanId,
      client_id: payment.clientId,
      payment_date: payment.paymentDate,
      expected_amount: payment.expectedAmount,
      amount_received: payment.amountReceived,
      capital_portion: payment.capitalPortion,
      profit_portion: payment.profitPortion,
      difference: payment.difference,
      late_fee_portion: payment.lateFeePortion ?? 0,
      payment_method: payment.paymentMethod,
      note: payment.note ?? null,
      day_number: payment.dayNumber ?? null,
    };

    let pmtResult: any = null;
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

    if (!error && data) {
      return mapPaymentFromDb(data);
    }

    if (error && error.code !== 'PGRST200') {
      // If late_fee_portion column is not in DB table, retry without it
      if (error.message && (error.message.includes('late_fee_portion') || error.message.includes('column') || error.code === 'PGRST204')) {
        const { late_fee_portion, ...cleanPayload } = payload;
        const { data: retryData, error: retryError } = await supabase
          .from('payments')
          .insert(cleanPayload)
          .select(`
            *,
            clients (
              first_name,
              last_name
            )
          `)
          .single();

        if (!retryError && retryData) {
          return mapPaymentFromDb(retryData);
        }
      }
      throw error;
    }

    const { data: pmtData, error: pmtErr } = await supabase
      .from('payments')
      .insert(payload)
      .select('*')
      .single();

    if (pmtErr) throw pmtErr;

    const { data: clientRow } = await supabase
      .from('clients')
      .select('first_name, last_name')
      .eq('id', payment.clientId)
      .maybeSingle();

    return mapPaymentFromDb({
      ...pmtData,
      clients: clientRow ? [clientRow] : [],
    });
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
    if (!isSupabaseConfigured) {
      const loans = StorageService.getLoans();
      const nextLoans = loans.map(l => {
        if (l.id === loanId) {
          const schedule = l.schedule.map(s => {
            if (s.dayNumber === dayNumber) {
              return { ...s, ...update };
            }
            return s;
          });
          return { ...l, schedule };
        }
        return l;
      });
      StorageService.saveLoans(nextLoans);
      return;
    }

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
    if (!isSupabaseConfigured) {
      const loans = StorageService.getLoans();
      let updated: Loan | null = null;
      const nextLoans = loans.map(l => {
        if (l.id === loanId) {
          const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== null)
          );
          updated = { ...l, ...cleanUpdates } as Loan;
          return updated;
        }
        return l;
      });
      StorageService.saveLoans(nextLoans);
      if (!updated) throw new Error('Préstamo no encontrado');
      return updated;
    }

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

    const { error } = await supabase
      .from('loans')
      .update(payload)
      .eq('id', loanId)
      .eq('user_id', userId);

    if (error) throw error;

    return fetchLoanById(loanId, userId);
  },

  /* =========================
     SETTINGS
  ========================= */

  async getSettings(): Promise<AppSettings> {
    if (!isSupabaseConfigured) {
      return StorageService.getSettings();
    }

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

    const lateFeeType: 'percentage' | 'fixed' = (data.late_fee_type || DEFAULT_SETTINGS.lateFeeType) as 'percentage' | 'fixed';
    let lateFeeValue = 0;
    if (data.late_fee_value !== undefined && data.late_fee_value !== null) {
      lateFeeValue = Number(data.late_fee_value);
    } else if (lateFeeType === 'fixed') {
      lateFeeValue = Number(data.late_fee_amount ?? DEFAULT_SETTINGS.lateFeeValue);
    } else {
      lateFeeValue = Number(data.late_fee_percentage ?? data.late_fee_amount ?? DEFAULT_SETTINGS.lateFeeValue);
    }

    return {
      defaultNormalDays: data.default_normal_days ?? DEFAULT_SETTINGS.defaultNormalDays,
      defaultGraceDays: data.default_grace_days ?? DEFAULT_SETTINGS.defaultGraceDays,
      dailyCollectionEnabled: data.daily_collection_enabled ?? DEFAULT_SETTINGS.dailyCollectionEnabled,
      chargeSundays: data.charge_sundays ?? DEFAULT_SETTINGS.chargeSundays,
      chargeHolidays: data.charge_holidays ?? DEFAULT_SETTINGS.chargeHolidays,
      lateFeeEnabled: data.late_fee_enabled ?? DEFAULT_SETTINGS.lateFeeEnabled,
      lateFeeType,
      lateFeeValue,
      lateFeePercentage: lateFeeType === 'percentage' ? lateFeeValue : 0,
      lateFeeAmount: lateFeeType === 'fixed' ? lateFeeValue : 0,
      currencySymbol: data.currency_symbol ?? DEFAULT_SETTINGS.currencySymbol,
      currencyCode: data.currency_code ?? DEFAULT_SETTINGS.currencyCode,
    };
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    if (!isSupabaseConfigured) {
      StorageService.saveSettings(settings);
      return settings;
    }

    const userId = await getCurrentUserId();

    const feeType = settings.lateFeeType || 'percentage';
    const feeVal = settings.lateFeeValue ?? (feeType === 'percentage' ? (settings.lateFeePercentage ?? 0) : (settings.lateFeeAmount ?? 0));

    const payload: Record<string, any> = {
      user_id: userId,
      default_normal_days: settings.defaultNormalDays,
      default_grace_days: settings.defaultGraceDays,
      daily_collection_enabled: settings.dailyCollectionEnabled,
      charge_sundays: settings.chargeSundays,
      charge_holidays: settings.chargeHolidays,
      late_fee_enabled: settings.lateFeeEnabled,
      late_fee_type: feeType,
      late_fee_amount: feeType === 'fixed' ? feeVal : feeVal,
      late_fee_percentage: feeType === 'percentage' ? feeVal : 0,
      late_fee_value: feeVal,
      currency_symbol: settings.currencySymbol,
      currency_code: settings.currencyCode,
    };

    let savedRow: any = null;
    const { data, error } = await supabase
      .from('app_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (!error && data) {
      savedRow = data;
    } else if (error) {
      // If late_fee_value or late_fee_percentage is rejected due to missing column, retry progressively
      if (error.message && (error.message.includes('late_fee_value') || error.message.includes('late_fee_percentage') || error.message.includes('column') || error.code === 'PGRST204')) {
        const { late_fee_value, ...cleanPayload } = payload;
        const { data: retryData, error: retryError } = await supabase
          .from('app_settings')
          .upsert(cleanPayload, { onConflict: 'user_id' })
          .select('*')
          .single();

        if (retryError) {
          const { late_fee_percentage, ...cleanPayload2 } = cleanPayload;
          const { data: retryData2, error: retryError2 } = await supabase
            .from('app_settings')
            .upsert({
              ...cleanPayload2,
              late_fee_type: feeType,
              late_fee_amount: feeVal
            }, { onConflict: 'user_id' })
            .select('*')
            .single();

          if (retryError2) throw retryError2;
          savedRow = retryData2;
        } else {
          savedRow = retryData;
        }
      } else {
        throw error;
      }
    }

    const resLateFeeType: 'percentage' | 'fixed' = (savedRow?.late_fee_type || feeType) as 'percentage' | 'fixed';
    let resLateFeeValue = feeVal;
    if (savedRow?.late_fee_value !== undefined && savedRow?.late_fee_value !== null) {
      resLateFeeValue = Number(savedRow.late_fee_value);
    } else if (resLateFeeType === 'fixed') {
      resLateFeeValue = Number(savedRow?.late_fee_amount ?? feeVal);
    } else {
      resLateFeeValue = Number(savedRow?.late_fee_percentage ?? savedRow?.late_fee_amount ?? feeVal);
    }

    return {
      defaultNormalDays: savedRow?.default_normal_days ?? settings.defaultNormalDays,
      defaultGraceDays: savedRow?.default_grace_days ?? settings.defaultGraceDays,
      dailyCollectionEnabled: savedRow?.daily_collection_enabled ?? settings.dailyCollectionEnabled,
      chargeSundays: savedRow?.charge_sundays ?? settings.chargeSundays,
      chargeHolidays: savedRow?.charge_holidays ?? settings.chargeHolidays,
      lateFeeEnabled: savedRow?.late_fee_enabled ?? settings.lateFeeEnabled,
      lateFeeType: resLateFeeType,
      lateFeeValue: resLateFeeValue,
      lateFeePercentage: resLateFeeType === 'percentage' ? resLateFeeValue : 0,
      lateFeeAmount: resLateFeeType === 'fixed' ? resLateFeeValue : 0,
      currencySymbol: savedRow?.currency_symbol ?? settings.currencySymbol,
      currencyCode: savedRow?.currency_code ?? settings.currencyCode,
    };
  },

  /* =========================
     DELETE ALL USER DATA
  ========================= */

  async clearAllData(): Promise<void> {
    if (!isSupabaseConfigured) {
      StorageService.clearAllData();
      return;
    }

    const userId = await getCurrentUserId();

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

    const { error: docsError } = await supabase
      .from('client_documents')
      .delete()
      .eq('user_id', userId);

    if (docsError) throw docsError;

    const { error: clientsError } = await supabase
      .from('clients')
      .delete()
      .eq('user_id', userId);

    if (clientsError) throw clientsError;
  },
};

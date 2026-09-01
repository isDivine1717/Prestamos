import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';

import {
  Client,
  Loan,
  PaymentTransaction,
  AppSettings,
  AdminUser,
  ClientDocument,
  PaymentMethod
} from '../types';

import { DEFAULT_ADMIN, DEFAULT_SETTINGS, StorageService } from '../services/storage';
import { SupabaseStorage } from '../services/supabaseStorage';

import { getTodayFormatted } from '../utils/dates';

import {
  calculatePaymentBreakdown,
  calculateClientRating,
  generateLoanSchedule
} from '../utils/finance';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type AppTab =
  | 'inicio'
  | 'clientes'
  | 'cobranza'
  | 'reportes'
  | 'configuracion';

interface AppContextType {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;

  clients: Client[];
  loans: Loan[];
  transactions: PaymentTransaction[];
  settings: AppSettings;
  adminUser: AdminUser;

  isLoggedIn: boolean;
  isAuthLoading: boolean;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  filterStatus: string;
  setFilterStatus: (filter: string) => void;

  isNewClientModalOpen: boolean;
  setIsNewClientModalOpen: (open: boolean) => void;

  clientToEdit: Client | null;
  setClientToEdit: (client: Client | null) => void;

  isNewLoanModalOpen: boolean;
  setIsNewLoanModalOpen: (open: boolean) => void;

  isLoanTypeSelectModalOpen: boolean;
  setIsLoanTypeSelectModalOpen: (open: boolean) => void;

  isPaidLoanModalOpen: boolean;
  setIsPaidLoanModalOpen: (open: boolean) => void;

  loanClientPreselectId: string | null;
  setLoanClientPreselectId: (id: string | null) => void;

  registerPaymentModalLoan: Loan | null;
  setRegisterPaymentModalLoan: (loan: Loan | null) => void;

  viewingDocument: {
    doc: ClientDocument;
    clientName: string;
  } | null;

  setViewingDocument: (
    item: {
      doc: ClientDocument;
      clientName: string;
    } | null
  ) => void;

  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
  } | null;

  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info'
  ) => void;

  // CLIENTES
  addClient: (
    clientData: Omit<
      Client,
      'id' | 'createdAt' | 'rating' | 'documents'
    >
  ) => Promise<Client>;

  updateClient: (
    id: string,
    clientData: Partial<Client>
  ) => Promise<void>;

  deleteClient: (id: string) => Promise<boolean>;

  uploadClientDocument: (
    clientId: string,
    title: string,
    type: ClientDocument['type'],
    file: File
  ) => Promise<void>;

  deleteClientDocument: (
    clientId: string,
    documentId: string
  ) => Promise<void>;

  // PRESTAMOS
  createLoan: (loanData: {
    clientId: string;
    capital: number;
    profitType: 'fixed' | 'percentage';
    profitValue: number;
    totalProfit: number;
    normalDays: number;
    graceDays: number;
    lateFeeEnabled?: boolean;
    lateFeeType?: 'percentage' | 'fixed';
    lateFeeValue?: number;
    lateFeePercentage?: number;
    lateFeeAmount?: number;
  }) => Promise<Loan>;

  createHistoricalPaidLoan: (data: {
    clientId: string;
    startDate: string;
    endDate: string;
    capital: number;
    notes?: string;
  }) => Promise<Loan>;

  cancelLoan: (
    loanId: string,
    reason: string
  ) => Promise<void>;

  deleteLoan: (loanId: string) => Promise<boolean>;

  // PAGOS
  registerPayment: (params: {
    loanId: string;
    amountReceived: number;
    paymentMethod: PaymentMethod;
    note?: string;
    lateFeePortion?: number;
  }) => Promise<boolean>;

  // CONFIGURACION
  updateSettings: (
    newSettings: Partial<AppSettings>
  ) => Promise<void>;

  // AUTH
  signUp: (
    name: string,
    email: string,
    pass: string
  ) => Promise<{
    success: boolean;
    requiresConfirmation?: boolean;
    error?: string;
  }>;

  login: (
    email: string,
    pass: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  logout: () => Promise<void>;

  // DATOS
  resetDataToDemo: () => Promise<void>;
  exportBackupJSON: () => void;
  importBackupJSON: (jsonStr: string) => boolean;
}

const AppContext = createContext<
  AppContextType | undefined
>(undefined);

export const AppProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [activeTab, setActiveTab] =
    useState<AppTab>('inicio');

  const [selectedClientId, setSelectedClientId] =
    useState<string | null>(null);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [loans, setLoans] =
    useState<Loan[]>([]);

  const [transactions, setTransactions] =
    useState<PaymentTransaction[]>([]);

  const [settings, setSettings] =
    useState<AppSettings>(DEFAULT_SETTINGS);

  const [adminUser, setAdminUser] =
    useState<AdminUser>(DEFAULT_ADMIN);

  const [isLoggedIn, setIsLoggedIn] =
    useState<boolean>(false);

  const [isAuthLoading, setIsAuthLoading] =
    useState<boolean>(true);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [filterStatus, setFilterStatus] =
    useState('all');

  const [
    isNewClientModalOpen,
    setIsNewClientModalOpen
  ] = useState(false);

  const [
    clientToEdit,
    setClientToEdit
  ] = useState<Client | null>(null);

  const [
    isNewLoanModalOpen,
    setIsNewLoanModalOpen
  ] = useState(false);

  const [
    isLoanTypeSelectModalOpen,
    setIsLoanTypeSelectModalOpen
  ] = useState(false);

  const [
    isPaidLoanModalOpen,
    setIsPaidLoanModalOpen
  ] = useState(false);

  const [
    loanClientPreselectId,
    setLoanClientPreselectId
  ] = useState<string | null>(null);

  const [
    registerPaymentModalLoan,
    setRegisterPaymentModalLoan
  ] = useState<Loan | null>(null);

  const [
    viewingDocument,
    setViewingDocument
  ] = useState<{
    doc: ClientDocument;
    clientName: string;
  } | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  /* =========================================================
     TOAST
  ========================================================= */

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setToast({
      message,
      type
    });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (!isSupabaseConfigured) {
        if (mounted) {
          const logged = StorageService.isLoggedIn();
          setIsLoggedIn(logged);
          setIsAuthLoading(false);
        }
        return;
      }

      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          setIsLoggedIn(true);

          const name =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'Administrador';

          setAdminUser({
            email:
              session.user.email || '',
            name
          });
        } else {
          setIsLoggedIn(StorageService.isLoggedIn());
        }
      } catch (error) {
        console.error(
          'Error al consultar sesión de Supabase:',
          error
        );

        if (mounted) {
          setIsLoggedIn(StorageService.isLoggedIn());
        }
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setIsLoggedIn(true);

          const name =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'Administrador';

          setAdminUser({
            email:
              session.user.email || '',
            name
          });
        } else {
          setIsLoggedIn(false);
          setClients([]);
          setLoans([]);
          setTransactions([]);
          setSettings(DEFAULT_SETTINGS);
        }

        setIsAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================================
     LOAD SUPABASE DATA
  ========================================================= */

  useEffect(() => {
    if (!isLoggedIn) {
      setClients([]);
      setLoans([]);
      setTransactions([]);
      setSettings(DEFAULT_SETTINGS);
      return;
    }

    const loadData = async () => {
      try {
        const [
          loadedClients,
          loadedLoans,
          loadedTransactions,
          loadedSettings
        ] = await Promise.all([
          SupabaseStorage.getClients(),
          SupabaseStorage.getLoans(),
          SupabaseStorage.getTransactions(),
          SupabaseStorage.getSettings()
        ]);

        setClients(loadedClients);
        setLoans(loadedLoans);
        setTransactions(loadedTransactions);
        setSettings(loadedSettings);
      } catch (error: any) {
        console.error(
          'Error cargando datos desde la base de datos:',
          error
        );

        showToast(
          error?.message ||
            'Error al cargar la información desde la base de datos.',
          'error'
        );
      }
    };

    loadData();
  }, [isLoggedIn]);

  /* =========================================================
     CLIENT RATINGS
  ========================================================= */

  const refreshClientRatings = (
    currentClients: Client[],
    currentLoans: Loan[],
    currentTxns: PaymentTransaction[]
  ) => {
    return currentClients.map(client => {
      const clientLoans =
        currentLoans.filter(
          loan =>
            loan.clientId === client.id
        );

      const ratingInfo =
        calculateClientRating(
          clientLoans,
          currentTxns
        );

      return {
        ...client,
        rating: ratingInfo.rating
      };
    });
  };

  /* =========================================================
     CREATE CLIENT
  ========================================================= */

  const addClient = async (
    clientData: Omit<
      Client,
      'id' | 'createdAt' | 'rating' | 'documents'
    >
  ): Promise<Client> => {
    try {
      const newClient =
        await SupabaseStorage.createClient(
          clientData
        );

      setClients(prev => [
        newClient,
        ...prev
      ]);

      showToast(
        `Cliente ${newClient.firstName} ${newClient.lastName} creado exitosamente.`
      );

      return newClient;
    } catch (error: any) {
      console.error(
        'Error creando cliente:',
        error
      );

      showToast(
        error?.message ||
          'No se pudo crear el cliente.',
        'error'
      );

      throw error;
    }
  };

  /* =========================================================
     UPDATE CLIENT
  ========================================================= */

  const updateClient = async (
    id: string,
    clientData: Partial<Client>
  ): Promise<void> => {
    try {
      const updatedClient =
        await SupabaseStorage.updateClient(
          id,
          clientData
        );

      setClients(prev =>
        prev.map(client =>
          client.id === id
            ? updatedClient
            : client
        )
      );

      const fullName = `${updatedClient.firstName} ${updatedClient.lastName}`.trim();
      setLoans(prev =>
        prev.map(loan =>
          loan.clientId === id
            ? { ...loan, clientName: fullName }
            : loan
        )
      );

      setTransactions(prev =>
        prev.map(tx =>
          tx.clientId === id
            ? { ...tx, clientName: fullName }
            : tx
        )
      );

      showToast(
        'Expediente del cliente actualizado.'
      );
    } catch (error: any) {
      console.error(
        'Error actualizando cliente:',
        error
      );

      showToast(
        error?.message ||
          'No se pudo actualizar el cliente.',
        'error'
      );

      throw error;
    }
  };

  /* =========================================================
     DELETE CLIENT
  ========================================================= */

  const deleteClient = async (
    id: string
  ): Promise<boolean> => {
    try {
      const targetClient =
        clients.find(
          client => client.id === id
        );

      if (!targetClient) {
        showToast(
          'No se pudo encontrar el cliente.',
          'error'
        );

        return false;
      }

      await SupabaseStorage.deleteClient(id);

      setClients(prev =>
        prev.filter(
          client => client.id !== id
        )
      );

      setLoans(prev =>
        prev.filter(
          loan => loan.clientId !== id
        )
      );

      setTransactions(prev =>
        prev.filter(
          transaction =>
            transaction.clientId !== id
        )
      );

      if (selectedClientId === id) {
        setSelectedClientId(null);
      }

      if (
        registerPaymentModalLoan &&
        registerPaymentModalLoan.clientId === id
      ) {
        setRegisterPaymentModalLoan(null);
      }

      if (loanClientPreselectId === id) {
        setLoanClientPreselectId(null);
      }

      if (
        viewingDocument &&
        viewingDocument.doc.clientId === id
      ) {
        setViewingDocument(null);
      }

      showToast(
        'Cliente eliminado correctamente.',
        'success'
      );

      return true;
    } catch (error: any) {
      console.error(
        'Error eliminando cliente:',
        error
      );

      showToast(
        error?.message ||
          'No se pudo eliminar el cliente.',
        'error'
      );

      return false;
    }
  };

  /* =========================================================
     DOCUMENTS - SUPABASE STORAGE
  ========================================================= */

  const uploadClientDocument = async (
    clientId: string,
    title: string,
    type: ClientDocument['type'],
    file: File
  ): Promise<void> => {
    try {
      const newDocument =
        await SupabaseStorage.uploadClientDocument(
          clientId,
          title,
          type,
          file
        );

      setClients(prev =>
        prev.map(client => {
          if (client.id !== clientId) {
            return client;
          }

          return {
            ...client,
            documents: [
              newDocument,
              ...(client.documents || [])
            ]
          };
        })
      );

      showToast(
        `Documento "${title}" añadido al expediente.`
      );
    } catch (error: any) {
      console.error(
        'Error subiendo documento:',
        error
      );

      showToast(
        error?.message ||
          'No se pudo subir el documento.',
        'error'
      );

      throw error;
    }
  };

  const deleteClientDocument = async (
    clientId: string,
    documentId: string
  ): Promise<void> => {
    try {
      await SupabaseStorage.deleteClientDocument(
        clientId,
        documentId
      );

      setClients(prev =>
        prev.map(client => {
          if (client.id !== clientId) {
            return client;
          }

          return {
            ...client,
            documents: (
              client.documents || []
            ).filter(
              document =>
                document.id !== documentId
            )
          };
        })
      );

      if (
        viewingDocument &&
        viewingDocument.doc.id === documentId
      ) {
        setViewingDocument(null);
      }

      showToast(
        'Documento eliminado.',
        'info'
      );
    } catch (error: any) {
      console.error(
        'Error eliminando documento:',
        error
      );

      showToast(
        error?.message ||
          'No se pudo eliminar el documento.',
        'error'
      );

      throw error;
    }
  };

  /* =========================================================
     CREATE LOAN
  ========================================================= */

  const createLoan = async (
    loanData: {
      clientId: string;
      capital: number;
      profitType: 'fixed' | 'percentage';
      profitValue: number;
      totalProfit: number;
      normalDays: number;
      graceDays: number;
      lateFeeEnabled?: boolean;
      lateFeeType?: 'percentage' | 'fixed';
      lateFeeValue?: number;
      lateFeePercentage?: number;
      lateFeeAmount?: number;
    }
  ): Promise<Loan> => {
    try {
      const client = clients.find(
        item =>
          item.id === loanData.clientId
      );

      if (!client) {
        throw new Error(
          'No se encontró el cliente seleccionado.'
        );
      }

      const totalToPay =
        loanData.capital +
        loanData.totalProfit;

      const dailyPayment =
        Math.round(
          (
            totalToPay /
              loanData.normalDays +
            Number.EPSILON
          ) * 100
        ) / 100;

      const startDate =
        getTodayFormatted();

      const schedule =
        generateLoanSchedule(
          startDate,
          totalToPay,
          loanData.normalDays,
          loanData.graceDays
        );

      const effectiveLateFeeEnabled =
        loanData.lateFeeEnabled !== undefined
          ? loanData.lateFeeEnabled
          : (settings.lateFeeEnabled ?? false);

      const effectiveLateFeeType =
        loanData.lateFeeType !== undefined
          ? loanData.lateFeeType
          : (settings.lateFeeType ?? 'percentage');

      const effectiveLateFeeValue =
        loanData.lateFeeValue !== undefined
          ? loanData.lateFeeValue
          : (loanData.lateFeePercentage !== undefined
              ? loanData.lateFeePercentage
              : (settings.lateFeeValue ?? settings.lateFeePercentage ?? 0));

      const loanDataForSupabase = {
        clientId: loanData.clientId,
        startDate,
        capital: loanData.capital,
        profitType: loanData.profitType,
        profitValue: loanData.profitValue,
        totalProfit: loanData.totalProfit,
        totalToPay,
        normalDays: loanData.normalDays,
        graceDays: loanData.graceDays,
        dailyPayment,
        status: 'active' as const,
        capitalRecovered: 0,
        profitRecovered: 0,
        totalPaid: 0,
        balancePending: totalToPay,
        lateFeeEnabled: effectiveLateFeeEnabled,
        lateFeeType: effectiveLateFeeType,
        lateFeeValue: effectiveLateFeeValue,
        lateFeePercentage: effectiveLateFeeType === 'percentage' ? effectiveLateFeeValue : 0,
        lateFeeAmount: effectiveLateFeeType === 'fixed' ? effectiveLateFeeValue : 0,
        liquidatedAt: undefined,
        cancelledAt: undefined,
        cancellationReason: undefined,
        schedule
      };

      const newLoan =
        await SupabaseStorage.createLoan(
          loanDataForSupabase
        );

      setLoans(prev => [
        newLoan,
        ...prev
      ]);

      showToast(
        `Préstamo de $${totalToPay.toLocaleString(
          'es-MX'
        )} registrado correctamente.`
      );

      return newLoan;
    } catch (error: any) {
      console.error(
        'Error creando préstamo:',
        error
      );

      showToast(
        error?.message ||
          'No se pudo crear el préstamo.',
        'error'
      );

      throw error;
    }
  };

  /* =========================================================
     CREATE HISTORICAL PAID LOAN
  ========================================================= */

  const createHistoricalPaidLoan = async (data: {
    clientId: string;
    startDate: string;
    endDate: string;
    capital: number;
    notes?: string;
  }): Promise<Loan> => {
    try {
      const client = clients.find(
        item => item.id === data.clientId
      );

      if (!client) {
        throw new Error(
          'No se encontró el cliente seleccionado.'
        );
      }

      if (data.capital <= 0) {
        throw new Error(
          'El monto del préstamo debe ser mayor a $0.'
        );
      }

      const loanDataForSupabase = {
        clientId: data.clientId,
        startDate: data.startDate,
        capital: data.capital,
        profitType: 'fixed' as const,
        profitValue: 0,
        totalProfit: 0,
        totalToPay: data.capital,
        normalDays: 0,
        graceDays: 0,
        dailyPayment: 0,
        status: 'liquidated' as const,
        capitalRecovered: data.capital,
        profitRecovered: 0,
        totalPaid: data.capital,
        balancePending: 0,
        lateFeeEnabled: false,
        lateFeeType: 'percentage' as const,
        lateFeeValue: 0,
        lateFeePercentage: 0,
        lateFeeAmount: 0,
        liquidatedAt: data.endDate,
        cancelledAt: undefined,
        cancellationReason: data.notes?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        schedule: []
      };

      const newLoan = await SupabaseStorage.createLoan(
        loanDataForSupabase
      );

      setLoans(prev => [
        newLoan,
        ...prev
      ]);

      showToast(
        `Préstamo histórico de $${data.capital.toLocaleString('es-MX')} guardado como liquidado.`
      );

      return newLoan;
    } catch (error: any) {
      console.error(
        'Error guardando préstamo histórico:',
        error
      );

      showToast(
        error?.message ||
          'No se pudo guardar el préstamo histórico.',
        'error'
      );

      throw error;
    }
  };

  /* =========================================================
     CANCEL LOAN
  ========================================================= */

  const cancelLoan = async (
    loanId: string,
    reason: string
  ): Promise<void> => {
    try {
      const updatedLoan =
        await SupabaseStorage.cancelLoan(
          loanId,
          reason
        );

      setLoans(prev =>
        prev.map(loan =>
          loan.id === loanId
            ? updatedLoan
            : loan
        )
      );

      showToast(
        'El préstamo ha sido marcado como cancelado.',
        'info'
      );
    } catch (error: any) {
      console.error(
        'Error cancelando préstamo:',
        error
      );

      showToast(
        error?.message ||
          'No se pudo cancelar el préstamo.',
        'error'
      );

      throw error;
    }
  };

  const deleteLoan = async (loanId: string): Promise<boolean> => {
    try {
      await SupabaseStorage.deleteLoan(loanId);

      setLoans(prev => prev.filter(loan => loan.id !== loanId));

      setTransactions(prev =>
        prev.filter(transaction => transaction.loanId !== loanId)
      );

      if (
        registerPaymentModalLoan &&
        registerPaymentModalLoan.id === loanId
      ) {
        setRegisterPaymentModalLoan(null);
      }

      showToast('Préstamo eliminado correctamente.', 'success');

      return true;
    } catch (error: any) {
      console.error('Error eliminando préstamo:', error);

      showToast(
        error?.message || 'No se pudo eliminar el préstamo.',
        'error'
      );

      return false;
    }
  };

  /* =========================================================
     REGISTER PAYMENT
  ========================================================= */

  const registerPayment = async (
    params: {
      loanId: string;
      amountReceived: number;
      paymentMethod: PaymentMethod;
      note?: string;
      lateFeePortion?: number;
    }
  ): Promise<boolean> => {
    try {
      const loan = loans.find(
        item =>
          item.id === params.loanId
      );

      if (!loan) {
        showToast(
          'No se encontró el préstamo especificado.',
          'error'
        );

        return false;
      }

      const today =
        getTodayFormatted();

      const timestamp =
        new Date().toISOString();

      /* -----------------------------------------
         CALCULAR CAPITAL Y GANANCIA
      ----------------------------------------- */

      const {
        capitalPortion,
        profitPortion,
        lateFeePortion
      } =
        calculatePaymentBreakdown(
          params.amountReceived,
          loan.capital,
          loan.totalToPay,
          params.lateFeePortion ?? 0
        );

      /* -----------------------------------------
         BUSCAR DÍA DEL PAGO
      ----------------------------------------- */

      let dayIndex =
        loan.schedule.findIndex(
          day => day.date === today
        );

      if (dayIndex === -1) {
        dayIndex =
          loan.schedule.findIndex(
            day =>
              day.status === 'pending' ||
              day.status === 'overdue' ||
              day.status === 'partial'
          );
      }

      if (dayIndex === -1) {
        dayIndex = 0;
      }

      const targetDay =
        loan.schedule[dayIndex];

      const expectedAmount =
        targetDay
          ? targetDay.expectedAmount
          : loan.dailyPayment;

      /* -----------------------------------------
         CREAR PAGO EN SUPABASE
      ----------------------------------------- */

      const newTransaction =
        await SupabaseStorage.createPayment({
          loanId: loan.id,
          clientId: loan.clientId,
          paymentDate: today,
          expectedAmount,
          amountReceived:
            params.amountReceived,
          capitalPortion,
          profitPortion,
          lateFeePortion,
          difference:
            Math.round(
              (
                params.amountReceived -
                expectedAmount +
                Number.EPSILON
              ) * 100
            ) / 100,
          paymentMethod:
            params.paymentMethod,
          note: params.note,
          dayNumber: targetDay
            ? targetDay.dayNumber
            : undefined
        });

      /* -----------------------------------------
         ACTUALIZAR DÍA DEL CALENDARIO
      ----------------------------------------- */

      if (targetDay) {
        const newPaidAmount =
          Math.round(
            (
              targetDay.paidAmount +
              params.amountReceived +
              Number.EPSILON
            ) * 100
          ) / 100;

        let newStatus =
          targetDay.status;

        if (
          newPaidAmount >=
            targetDay.expectedAmount &&
          targetDay.expectedAmount > 0
        ) {
          newStatus =
            newPaidAmount >
            targetDay.expectedAmount
              ? 'surplus'
              : 'paid';
        } else if (
          newPaidAmount > 0
        ) {
          newStatus = 'partial';
        }

        await SupabaseStorage.updateScheduleDay(
          loan.id,
          targetDay.dayNumber,
          {
            paidAmount: newPaidAmount,
            status: newStatus,
            paidAt: timestamp,
            paymentMethod:
              params.paymentMethod,
            note: params.note,
            transactionId:
              newTransaction.id
          }
        );
      }

      /* -----------------------------------------
         ACTUALIZAR TOTALES DEL PRÉSTAMO
      ----------------------------------------- */

      const newTotalPaid =
        Math.round(
          (
            loan.totalPaid +
            params.amountReceived +
            Number.EPSILON
          ) * 100
        ) / 100;

      const newCapitalRecovered =
        Math.round(
          (
            loan.capitalRecovered +
            capitalPortion +
            Number.EPSILON
          ) * 100
        ) / 100;

      const newProfitRecovered =
        Math.round(
          (
            loan.profitRecovered +
            profitPortion +
            Number.EPSILON
          ) * 100
        ) / 100;

      const newBalancePending =
        Math.max(
          0,
          Math.round(
            (
              loan.totalToPay -
              newTotalPaid +
              Number.EPSILON
            ) * 100
          ) / 100
        );

      let newLoanStatus =
        loan.status;

      if (newBalancePending <= 0) {
        newLoanStatus =
          'liquidated';
      } else {
        const updatedSchedule =
          loan.schedule.map(
            (day, index) => {
              if (
                index !== dayIndex
              ) {
                return day;
              }

              const paidAmount =
                Math.round(
                  (
                    day.paidAmount +
                    params.amountReceived +
                    Number.EPSILON
                  ) * 100
                ) / 100;

              let status =
                day.status;

              if (
                paidAmount >=
                  day.expectedAmount &&
                day.expectedAmount > 0
              ) {
                status =
                  paidAmount >
                  day.expectedAmount
                    ? 'surplus'
                    : 'paid';
              } else if (
                paidAmount > 0
              ) {
                status =
                  'partial';
              }

              return {
                ...day,
                paidAmount,
                status
              };
            }
          );

        const hasOverdue =
          updatedSchedule.some(
            day =>
              day.status ===
              'overdue'
          );

        newLoanStatus =
          hasOverdue
            ? 'overdue'
            : 'active';
      }

      const updatedLoan =
        await SupabaseStorage.updateLoan(
          loan.id,
          {
            totalPaid:
              newTotalPaid,
            capitalRecovered:
              newCapitalRecovered,
            profitRecovered:
              newProfitRecovered,
            balancePending:
              newBalancePending,
            status:
              newLoanStatus,
            liquidatedAt:
              newLoanStatus ===
              'liquidated'
                ? timestamp
                : loan.liquidatedAt
          }
        );

      /* -----------------------------------------
         ACTUALIZAR ESTADO LOCAL
      ----------------------------------------- */

      setLoans(prev =>
        prev.map(item =>
          item.id === loan.id
            ? updatedLoan
            : item
        )
      );

      setTransactions(prev => [
        newTransaction,
        ...prev
      ]);

      /* -----------------------------------------
         ACTUALIZAR RATING
      ----------------------------------------- */

      const updatedTransactions = [
        newTransaction,
        ...transactions
      ];

      const ratedClients =
        refreshClientRatings(
          clients,
          loans.map(item =>
            item.id === loan.id
              ? updatedLoan
              : item
          ),
          updatedTransactions
        );

      setClients(ratedClients);

      showToast(
        `Pago de $${params.amountReceived.toLocaleString(
          'es-MX'
        )} registrado con éxito.`
      );

      return true;
    } catch (error: any) {
      console.error(
        'Error registrando pago:',
        error
      );

      showToast(
        error?.message ||
          'No se pudo registrar el pago.',
        'error'
      );

      return false;
    }
  };

  /* =========================================================
     SETTINGS
  ========================================================= */

  const updateSettings = async (
    newSettings: Partial<AppSettings>
  ): Promise<void> => {
    try {
      const updatedSettings = {
        ...settings,
        ...newSettings
      };

      const savedSettings =
        await SupabaseStorage.saveSettings(
          updatedSettings
        );

      setSettings(savedSettings);

      showToast(
        'Configuración guardada.'
      );
    } catch (error: any) {
      console.error(
        'Error guardando configuración:',
        error
      );

      showToast(
        error?.message ||
          'No se pudo guardar la configuración.',
        'error'
      );

      throw error;
    }
  };

  /* =========================================================
     SIGN UP
  ========================================================= */

  const signUp = async (
    name: string,
    email: string,
    pass: string
  ): Promise<{
    success: boolean;
    requiresConfirmation?: boolean;
    error?: string;
  }> => {
    if (!isSupabaseConfigured) {
      StorageService.setLoggedIn(true);
      setIsLoggedIn(true);
      setAdminUser({
        email,
        name
      });
      showToast('Cuenta creada e inicio de sesión exitoso.');
      return { success: true };
    }

    try {
      const {
        data,
        error
      } =
        await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              full_name: name,
              name
            }
          }
        });

      if (error) {
        let errorMessage =
          error.message;

        if (
          error.message.includes(
            'User already registered'
          ) ||
          error.message.includes(
            'already exists'
          )
        ) {
          errorMessage =
            'Este correo electrónico ya se encuentra registrado.';
        } else if (
          error.message.includes(
            'Password should be'
          )
        ) {
          errorMessage =
            'La contraseña debe tener al menos 6 caracteres.';
        } else if (
          error.message.includes(
            'invalid email'
          )
        ) {
          errorMessage =
            'El formato del correo electrónico no es válido.';
        }

        showToast(
          errorMessage,
          'error'
        );

        return {
          success: false,
          error: errorMessage
        };
      }

      if (
        data.user &&
        !data.session
      ) {
        showToast(
          'Registro exitoso. Revisa tu correo electrónico para confirmar tu cuenta.',
          'info'
        );

        return {
          success: true,
          requiresConfirmation: true
        };
      }

      showToast(
        'Cuenta creada e inicio de sesión exitoso.'
      );

      return {
        success: true
      };
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        'Error durante el registro.';

      showToast(
        errorMessage,
        'error'
      );

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  /* =========================================================
     LOGIN
  ========================================================= */

  const login = async (
    email: string,
    pass: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!isSupabaseConfigured) {
      StorageService.setLoggedIn(true);
      setIsLoggedIn(true);
      setAdminUser({
        email: email || 'admin@prestamos.mx',
        name: email ? email.split('@')[0] : 'Administrador'
      });
      showToast('Sesión iniciada correctamente.');
      return { success: true };
    }

    try {
      const {
        data,
        error
      } =
        await supabase.auth.signInWithPassword(
          {
            email,
            password: pass
          }
        );

      if (error) {
        let errorMessage =
          'Error al iniciar sesión.';

        if (
          error.message.includes(
            'Invalid login credentials'
          )
        ) {
          errorMessage =
            'Correo electrónico o contraseña incorrectos.';
        } else if (
          error.message.includes(
            'Email not confirmed'
          )
        ) {
          errorMessage =
            'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada.';
        } else {
          errorMessage =
            error.message;
        }

        showToast(
          errorMessage,
          'error'
        );

        return {
          success: false,
          error: errorMessage
        };
      }

      if (data.user) {
        const name =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split('@')[0] ||
          'Administrador';

        setAdminUser({
          email:
            data.user.email || '',
          name
        });
      }

      showToast(
        'Sesión iniciada correctamente.'
      );

      return {
        success: true
      };
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        'Error al iniciar sesión.';

      showToast(
        errorMessage,
        'error'
      );

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const logout = async (): Promise<void> => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error(
        'Error al cerrar sesión:',
        error
      );
    } finally {
      StorageService.setLoggedIn(false);
      setIsLoggedIn(false);

      setClients([]);
      setLoans([]);
      setTransactions([]);

      setSelectedClientId(null);
      setRegisterPaymentModalLoan(null);
      setViewingDocument(null);

      showToast(
        'Sesión cerrada.',
        'info'
      );
    }
  };

  /* =========================================================
     DELETE ALL USER DATA
  ========================================================= */

  const resetDataToDemo =
    async (): Promise<void> => {
      try {
        await SupabaseStorage.clearAllData();

        setClients([]);
        setLoans([]);
        setTransactions([]);
        setSelectedClientId(null);
        setViewingDocument(null);
        setRegisterPaymentModalLoan(null);

        showToast(
          'Todos los datos han sido eliminados correctamente.',
          'info'
        );
      } catch (error: any) {
        console.error(
          'Error eliminando datos:',
          error
        );

        showToast(
          error?.message ||
            'No se pudieron eliminar los datos.',
          'error'
        );
      }
    };

  /* =========================================================
     BACKUP
  ========================================================= */

  const exportBackupJSON = () => {
    const backup = {
      clients,
      loans,
      transactions,
      settings,
      exportedAt:
        new Date().toISOString()
    };

    const jsonStr =
      JSON.stringify(
        backup,
        null,
        2
      );

    const blob = new Blob(
      [jsonStr],
      {
        type: 'application/json'
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement('a');

    a.href = url;

    a.download =
      `backup_prestamos_${getTodayFormatted()}.json`;

    a.click();

    URL.revokeObjectURL(url);

    showToast(
      'Respaldo descargado exitosamente.'
    );
  };

  const importBackupJSON = (
    jsonStr: string
  ): boolean => {
    try {
      const data =
        JSON.parse(jsonStr);

      if (
        data.clients &&
        Array.isArray(data.clients)
      ) {
        setClients(data.clients);
      }

      if (
        data.loans &&
        Array.isArray(data.loans)
      ) {
        setLoans(data.loans);
      }

      if (
        data.transactions &&
        Array.isArray(
          data.transactions
        )
      ) {
        setTransactions(
          data.transactions
        );
      }

      if (data.settings) {
        setSettings(data.settings);
      }

      showToast(
        'Respaldo importado correctamente.'
      );

      return true;
    } catch (error) {
      console.error(
        'Error importando respaldo:',
        error
      );

      showToast(
        'Error al importar el archivo de respaldo.',
        'error'
      );

      return false;
    }
  };

  /* =========================================================
     CONTEXT
  ========================================================= */

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,

        selectedClientId,
        setSelectedClientId,

        clients,
        loans,
        transactions,
        settings,
        adminUser,

        isLoggedIn,
        isAuthLoading,

        searchQuery,
        setSearchQuery,

        filterStatus,
        setFilterStatus,

        isNewClientModalOpen,
        setIsNewClientModalOpen,

        clientToEdit,
        setClientToEdit,

        isNewLoanModalOpen,
        setIsNewLoanModalOpen,

        isLoanTypeSelectModalOpen,
        setIsLoanTypeSelectModalOpen,

        isPaidLoanModalOpen,
        setIsPaidLoanModalOpen,

        loanClientPreselectId,
        setLoanClientPreselectId,

        registerPaymentModalLoan,
        setRegisterPaymentModalLoan,

        viewingDocument,
        setViewingDocument,

        toast,
        showToast,

        addClient,
        updateClient,
        deleteClient,

        uploadClientDocument,
        deleteClientDocument,

        createLoan,
        createHistoricalPaidLoan,
        cancelLoan,
        deleteLoan,

        registerPayment,

        updateSettings,

        signUp,
        login,
        logout,

        resetDataToDemo,

        exportBackupJSON,
        importBackupJSON
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context =
    useContext(AppContext);

  if (!context) {
    throw new Error(
      'useApp must be used within an AppProvider'
    );
  }

  return context;
};
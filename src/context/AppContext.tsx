import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Client,
  Loan,
  PaymentTransaction,
  AppSettings,
  AdminUser,
  ClientDocument,
  PaymentMethod
} from '../types';
import { StorageService, DEFAULT_ADMIN } from '../services/storage';
import { getTodayFormatted } from '../utils/dates';
import {
  calculatePaymentBreakdown,
  updateLoanStatusAndSchedule,
  calculateClientRating,
  generateLoanSchedule
} from '../utils/finance';
import { supabase } from '../lib/supabase';

export type AppTab = 'inicio' | 'clientes' | 'cobranza' | 'reportes' | 'configuracion';

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

  // Modals & Triggers
  isNewClientModalOpen: boolean;
  setIsNewClientModalOpen: (open: boolean) => void;
  isNewLoanModalOpen: boolean;
  setIsNewLoanModalOpen: (open: boolean) => void;
  loanClientPreselectId: string | null;
  setLoanClientPreselectId: (id: string | null) => void;
  
  registerPaymentModalLoan: Loan | null;
  setRegisterPaymentModalLoan: (loan: Loan | null) => void;

  viewingDocument: { doc: ClientDocument; clientName: string } | null;
  setViewingDocument: (item: { doc: ClientDocument; clientName: string } | null) => void;

  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Actions
  addClient: (clientData: Omit<Client, 'id' | 'createdAt' | 'rating' | 'documents'>) => Client;
  updateClient: (id: string, clientData: Partial<Client>) => void;
  deleteClient: (id: string) => boolean;

  uploadClientDocument: (clientId: string, title: string, type: ClientDocument['type'], fileUrl: string) => void;
  deleteClientDocument: (clientId: string, documentId: string) => void;

  createLoan: (loanData: {
    clientId: string;
    capital: number;
    profitType: 'fixed' | 'percentage';
    profitValue: number;
    totalProfit: number;
    normalDays: number;
    graceDays: number;
  }) => Loan;

  cancelLoan: (loanId: string, reason: string) => void;

  registerPayment: (params: {
    loanId: string;
    amountReceived: number;
    paymentMethod: PaymentMethod;
    note?: string;
  }) => boolean;

  updateSettings: (newSettings: Partial<AppSettings>) => void;
  signUp: (name: string, email: string, pass: string) => Promise<{ success: boolean; requiresConfirmation?: boolean; error?: string }>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetDataToDemo: () => void;
  exportBackupJSON: () => void;
  importBackupJSON: (jsonStr: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<AppTab>('inicio');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [adminUser, setAdminUser] = useState<AdminUser>(DEFAULT_ADMIN);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [loanClientPreselectId, setLoanClientPreselectId] = useState<string | null>(null);
  const [registerPaymentModalLoan, setRegisterPaymentModalLoan] = useState<Loan | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{ doc: ClientDocument; clientName: string } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Initialize Supabase Auth session & listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true);
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Administrador';
        setAdminUser({
          email: session.user.email || '',
          name
        });
      } else {
        setIsLoggedIn(false);
      }
      setIsAuthLoading(false);
    }).catch((err) => {
      console.error('Error al consultar sesión de Supabase:', err);
      setIsLoggedIn(false);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Administrador';
        setAdminUser({
          email: session.user.email || '',
          name
        });
      } else {
        setIsLoggedIn(false);
      }
      setIsAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load initial data
  useEffect(() => {
    const loadedClients = StorageService.getClients();
    const loadedLoans = StorageService.getLoans();
    const loadedTxns = StorageService.getTransactions();
    
    setClients(loadedClients);
    setLoans(loadedLoans);
    setTransactions(loadedTxns);
  }, []);

  // Save changes
  const refreshClientRatings = (currentClients: Client[], currentLoans: Loan[], currentTxns: PaymentTransaction[]) => {
    return currentClients.map(client => {
      const clientLoans = currentLoans.filter(l => l.clientId === client.id);
      const ratingInfo = calculateClientRating(clientLoans, currentTxns);
      return {
        ...client,
        rating: ratingInfo.rating
      };
    });
  };

  // CRUD Client
  const addClient = (clientData: Omit<Client, 'id' | 'createdAt' | 'rating' | 'documents'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: `cli_${Date.now()}`,
      createdAt: getTodayFormatted(),
      rating: 'buen_pagador',
      documents: []
    };

    const updated = [newClient, ...clients];
    setClients(updated);
    StorageService.saveClients(updated);
    showToast(`Cliente ${newClient.firstName} ${newClient.lastName} creado exitosamente.`);
    return newClient;
  };

  const updateClient = (id: string, clientData: Partial<Client>) => {
    const updated = clients.map(c => c.id === id ? { ...c, ...clientData } : c);
    setClients(updated);
    StorageService.saveClients(updated);
    showToast('Expediente del cliente actualizado.');
  };

  const deleteClient = (id: string): boolean => {
    try {
      const targetClient = clients.find(c => c.id === id);
      if (!targetClient) {
        showToast('No se pudo encontrar el cliente.', 'error');
        return false;
      }

      // Collect all loan IDs associated with this client
      const clientLoans = loans.filter(l => l.clientId === id);
      const clientLoanIds = clientLoans.map(l => l.id);

      // Filter out client, loans, and transactions completely
      const updatedClients = clients.filter(c => c.id !== id);
      const updatedLoans = loans.filter(l => l.clientId !== id);
      const updatedTxns = transactions.filter(
        t => t.clientId !== id && !clientLoanIds.includes(t.loanId)
      );

      // Update state
      setClients(updatedClients);
      setLoans(updatedLoans);
      setTransactions(updatedTxns);

      // Save to storage
      StorageService.saveClients(updatedClients);
      StorageService.saveLoans(updatedLoans);
      StorageService.saveTransactions(updatedTxns);

      // Clean up references in state
      if (selectedClientId === id) {
        setSelectedClientId(null);
      }
      if (registerPaymentModalLoan && registerPaymentModalLoan.clientId === id) {
        setRegisterPaymentModalLoan(null);
      }
      if (loanClientPreselectId === id) {
        setLoanClientPreselectId(null);
      }
      if (viewingDocument && viewingDocument.doc.clientId === id) {
        setViewingDocument(null);
      }

      showToast('Cliente eliminado correctamente.', 'success');
      return true;
    } catch (error) {
      showToast('No se pudo eliminar el cliente. Inténtalo nuevamente.', 'error');
      return false;
    }
  };

  // Documents
  const uploadClientDocument = (clientId: string, title: string, type: ClientDocument['type'], fileUrl: string) => {
    const newDoc: ClientDocument = {
      id: `doc_${Date.now()}`,
      clientId,
      title,
      type,
      fileUrl,
      uploadedAt: new Date().toISOString()
    };

    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        const existingDocs = c.documents || [];
        return {
          ...c,
          documents: [newDoc, ...existingDocs]
        };
      }
      return c;
    });

    setClients(updatedClients);
    StorageService.saveClients(updatedClients);
    showToast(`Documento "${title}" añadido al expediente.`);
  };

  const deleteClientDocument = (clientId: string, documentId: string) => {
    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          documents: (c.documents || []).filter(d => d.id !== documentId)
        };
      }
      return c;
    });

    setClients(updatedClients);
    StorageService.saveClients(updatedClients);
    showToast('Documento eliminado.', 'info');
  };

  // Create Loan
  const createLoan = (loanData: {
    clientId: string;
    capital: number;
    profitType: 'fixed' | 'percentage';
    profitValue: number;
    totalProfit: number;
    normalDays: number;
    graceDays: number;
  }): Loan => {
    const client = clients.find(c => c.id === loanData.clientId);
    const clientName = client ? `${client.firstName} ${client.lastName}` : 'Cliente';
    const totalToPay = loanData.capital + loanData.totalProfit;
    const dailyPayment = Math.round((totalToPay / loanData.normalDays + Number.EPSILON) * 100) / 100;
    const startDate = getTodayFormatted();

    const schedule = StorageService.getLoans(); // Ensure sync
    const newSchedule = loanData;

    const rawLoan: Loan = {
      id: `prestamo_${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: loanData.clientId,
      clientName,
      startDate,
      capital: loanData.capital,
      profitType: loanData.profitType,
      profitValue: loanData.profitValue,
      totalProfit: loanData.totalProfit,
      totalToPay,
      normalDays: loanData.normalDays,
      graceDays: loanData.graceDays,
      dailyPayment,
      status: 'active',
      capitalRecovered: 0,
      profitRecovered: 0,
      totalPaid: 0,
      balancePending: totalToPay,
      schedule: []
    };

    // Build loan schedule using dates helper
    const newScheduleDays = generateLoanSchedule(
      startDate,
      totalToPay,
      loanData.normalDays,
      loanData.graceDays
    );

    const completedLoan: Loan = {
      ...rawLoan,
      schedule: newScheduleDays
    };

    const updatedLoans = [completedLoan, ...loans];
    setLoans(updatedLoans);
    StorageService.saveLoans(updatedLoans);

    // Update client ratings
    const ratedClients = refreshClientRatings(clients, updatedLoans, transactions);
    setClients(ratedClients);
    StorageService.saveClients(ratedClients);

    showToast(`Préstamo de $${totalToPay.toLocaleString('es-MX')} registrado correctamente.`);
    return completedLoan;
  };

  // Cancel Loan
  const cancelLoan = (loanId: string, reason: string) => {
    const today = getTodayFormatted();
    const updatedLoans = loans.map(loan => {
      if (loan.id === loanId) {
        return {
          ...loan,
          status: 'cancelled' as const,
          cancelledAt: today,
          cancellationReason: reason
        };
      }
      return loan;
    });

    setLoans(updatedLoans);
    StorageService.saveLoans(updatedLoans);
    showToast('El préstamo ha sido marcado como cancelado.', 'info');
  };

  // Register Payment
  const registerPayment = (params: {
    loanId: string;
    amountReceived: number;
    paymentMethod: PaymentMethod;
    note?: string;
  }): boolean => {
    const loan = loans.find(l => l.id === params.loanId);
    if (!loan) {
      showToast('No se encontró el préstamo especificado.', 'error');
      return false;
    }

    const today = getTodayFormatted();
    const timestamp = new Date().toISOString();

    // Breakdown capital vs profit
    const { capitalPortion, profitPortion } = calculatePaymentBreakdown(
      params.amountReceived,
      loan.capital,
      loan.totalToPay
    );

    // Find target day in schedule: today's date if exists, or first pending/overdue day
    let dayIndex = loan.schedule.findIndex(d => d.date === today);
    if (dayIndex === -1) {
      dayIndex = loan.schedule.findIndex(d => d.status === 'pending' || d.status === 'overdue' || d.status === 'partial');
    }
    if (dayIndex === -1) {
      dayIndex = 0;
    }

    const targetDay = loan.schedule[dayIndex];
    const expectedAmount = targetDay ? targetDay.expectedAmount : loan.dailyPayment;

    // Create transaction log
    const newTxn: PaymentTransaction = {
      id: `tx_${Date.now()}`,
      loanId: loan.id,
      clientId: loan.clientId,
      clientName: loan.clientName,
      date: today,
      timestamp,
      expectedAmount,
      amountReceived: params.amountReceived,
      capitalPortion,
      profitPortion,
      difference: Math.round((params.amountReceived - expectedAmount + Number.EPSILON) * 100) / 100,
      paymentMethod: params.paymentMethod,
      note: params.note,
      dayNumber: targetDay ? targetDay.dayNumber : undefined
    };

    // Update schedule
    const updatedSchedule = loan.schedule.map((day, idx) => {
      if (idx === dayIndex) {
        const newPaidAmount = Math.round((day.paidAmount + params.amountReceived + Number.EPSILON) * 100) / 100;
        let newStatus = day.status;
        if (newPaidAmount >= day.expectedAmount && day.expectedAmount > 0) {
          newStatus = newPaidAmount > day.expectedAmount ? 'surplus' : 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }
        return {
          ...day,
          paidAmount: newPaidAmount,
          status: newStatus,
          paidAt: timestamp,
          paymentMethod: params.paymentMethod,
          note: params.note || day.note,
          transactionId: newTxn.id
        };
      }
      return day;
    });

    const newTotalPaid = Math.round((loan.totalPaid + params.amountReceived + Number.EPSILON) * 100) / 100;
    const newCapRecovered = Math.round((loan.capitalRecovered + capitalPortion + Number.EPSILON) * 100) / 100;
    const newProfRecovered = Math.round((loan.profitRecovered + profitPortion + Number.EPSILON) * 100) / 100;
    const newBalancePending = Math.max(0, Math.round((loan.totalToPay - newTotalPaid + Number.EPSILON) * 100) / 100);

    let newLoanStatus = loan.status;
    if (newBalancePending <= 0) {
      newLoanStatus = 'liquidated';
    } else {
      // re-check overdue
      const stillHasOverdue = updatedSchedule.some(d => d.status === 'overdue');
      newLoanStatus = stillHasOverdue ? 'overdue' : 'active';
    }

    const updatedLoan: Loan = {
      ...loan,
      totalPaid: newTotalPaid,
      capitalRecovered: newCapRecovered,
      profitRecovered: newProfRecovered,
      balancePending: newBalancePending,
      status: newLoanStatus,
      liquidatedAt: newLoanStatus === 'liquidated' ? today : loan.liquidatedAt,
      schedule: updatedSchedule
    };

    const updatedLoans = loans.map(l => l.id === loan.id ? updatedLoan : l);
    const updatedTxns = [newTxn, ...transactions];

    setLoans(updatedLoans);
    setTransactions(updatedTxns);

    StorageService.saveLoans(updatedLoans);
    StorageService.saveTransactions(updatedTxns);

    // Refresh rating
    const ratedClients = refreshClientRatings(clients, updatedLoans, updatedTxns);
    setClients(ratedClients);
    StorageService.saveClients(ratedClients);

    showToast(`Pago de $${params.amountReceived.toLocaleString('es-MX')} registrado con éxito.`);
    return true;
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    StorageService.saveSettings(updated);
    showToast('Configuración guardada.');
  };

  const signUp = async (
    name: string,
    email: string,
    pass: string
  ): Promise<{ success: boolean; requiresConfirmation?: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: name,
            name: name
          }
        }
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('User already registered') || error.message.includes('already exists')) {
          errorMessage = 'Este correo electrónico ya se encuentra registrado.';
        } else if (error.message.includes('Password should be')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (error.message.includes('invalid email')) {
          errorMessage = 'El formato del correo electrónico no es válido.';
        }
        showToast(errorMessage, 'error');
        return { success: false, error: errorMessage };
      }

      if (data.user && !data.session) {
        showToast('Registro exitoso. Revisa tu correo electrónico para confirmar tu cuenta.', 'info');
        return { success: true, requiresConfirmation: true };
      }

      showToast('Cuenta creada e inicio de sesión exitoso.');
      return { success: true };
    } catch (err: any) {
      const errorMessage = err?.message || 'Error durante el registro.';
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });

      if (error) {
        let errorMessage = 'Error al iniciar sesión.';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Correo electrónico o contraseña incorrectos.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada.';
        } else {
          errorMessage = error.message;
        }
        showToast(errorMessage, 'error');
        return { success: false, error: errorMessage };
      }

      showToast('Sesión iniciada correctamente.');
      return { success: true };
    } catch (err: any) {
      const errorMessage = err?.message || 'Error al iniciar sesión.';
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setIsLoggedIn(false);
      showToast('Sesión cerrada.', 'info');
    }
  };

  const resetDataToDemo = () => {
    StorageService.clearAllData();
    setClients([]);
    setLoans([]);
    setTransactions([]);
    setSelectedClientId(null);
    showToast('Todos los datos han sido eliminados correctamente.', 'info');
  };

  const exportBackupJSON = () => {
    const jsonStr = StorageService.exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_prestamos_${getTodayFormatted()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Respaldo descargado exitosamente.');
  };

  const importBackupJSON = (jsonStr: string): boolean => {
    const success = StorageService.importDataJSON(jsonStr);
    if (success) {
      setClients(StorageService.getClients());
      setLoans(StorageService.getLoans());
      setTransactions(StorageService.getTransactions());
      setSettings(StorageService.getSettings());
      showToast('Respaldo importado correctamente.');
      return true;
    }
    showToast('Error al importar el archivo de respaldo.', 'error');
    return false;
  };

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
        isNewLoanModalOpen,
        setIsNewLoanModalOpen,
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
        cancelLoan,
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
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

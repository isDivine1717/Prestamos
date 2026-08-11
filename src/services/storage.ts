import { Client, Loan, PaymentTransaction, AppSettings, AdminUser, ClientDocument } from '../types';
import { updateLoanStatusAndSchedule } from '../utils/finance';
import { getTodayFormatted } from '../utils/dates';

const STORAGE_KEYS = {
  CLIENTS: 'gp_clients_v1',
  LOANS: 'gp_loans_v1',
  TRANSACTIONS: 'gp_transactions_v1',
  SETTINGS: 'gp_settings_v1',
  AUTH: 'gp_auth_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
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

export const DEFAULT_ADMIN: AdminUser = {
  email: 'admin@prestamos.mx',
  name: 'Administrador Principal',
};

export const StorageService = {
  getClients(): Client[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveClients(clients: Client[]): void {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  },

  getLoans(): Loan[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LOANS);
    if (!raw) {
      return [];
    }
    try {
      const loans: Loan[] = JSON.parse(raw);
      const today = getTodayFormatted();
      return loans.map(loan => updateLoanStatusAndSchedule(loan, today));
    } catch {
      return [];
    }
  },

  saveLoans(loans: Loan[]): void {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
  },

  getTransactions(): PaymentTransaction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveTransactions(txns: PaymentTransaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txns));
  },

  getSettings(): AppSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  isLoggedIn(): boolean {
    const auth = localStorage.getItem(STORAGE_KEYS.AUTH);
    return auth === 'true';
  },

  setLoggedIn(status: boolean): void {
    if (status) {
      localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
    }
  },

  exportDataJSON(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      clients: this.getClients(),
      loans: this.getLoans(),
      transactions: this.getTransactions(),
      settings: this.getSettings()
    };
    return JSON.stringify(data, null, 2);
  },

  importDataJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.clients && parsed.loans) {
        if (Array.isArray(parsed.clients)) this.saveClients(parsed.clients);
        if (Array.isArray(parsed.loans)) this.saveLoans(parsed.loans);
        if (Array.isArray(parsed.transactions)) this.saveTransactions(parsed.transactions);
        if (parsed.settings) this.saveSettings(parsed.settings);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  clearAllData(): void {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  },

  resetToDemo(): void {
    this.clearAllData();
  }
};

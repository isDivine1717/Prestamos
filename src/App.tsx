import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { Toast } from './components/Toast';

import { DashboardPage } from './pages/DashboardPage';
import { CobranzaPage } from './pages/CobranzaPage';
import { ClientesPage } from './pages/ClientesPage';
import { ExpedienteClientePage } from './pages/ExpedienteClientePage';
import { ReportesPage } from './pages/ReportesPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { LoginPage } from './pages/LoginPage';

import { RegisterPaymentModal } from './components/RegisterPaymentModal';
import { NewLoanModal } from './components/NewLoanModal';
import { LoanTypeSelectionModal } from './components/LoanTypeSelectionModal';
import { AddPaidLoanModal } from './components/AddPaidLoanModal';
import { NewClientModal } from './components/NewClientModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';

const MainAppContent: React.FC = () => {
  const {
    isAuthLoading,
    isLoggedIn,
    activeTab,
    selectedClientId,
    clients,
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
    toast
  } = useApp();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#F4F4F5] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#22C55E] border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Comprobando sesión...
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'inicio':
        return <DashboardPage />;
      case 'cobranza':
        return <CobranzaPage />;
      case 'clientes':
        return selectedClientId ? <ExpedienteClientePage /> : <ClientesPage />;
      case 'reportes':
        return <ReportesPage />;
      case 'configuracion':
        return <ConfiguracionPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F4F4F5] flex flex-col md:flex-row antialiased font-sans selection:bg-[#22C55E] selection:text-black">
      {/* Desktop Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <Header />
        <main className="flex-1">
          {renderActivePage()}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />

      {/* Modals & Dialogs */}
      <RegisterPaymentModal
        loan={registerPaymentModalLoan}
        onClose={() => setRegisterPaymentModalLoan(null)}
      />

      <LoanTypeSelectionModal
        isOpen={isLoanTypeSelectModalOpen}
        clientName={
          loanClientPreselectId
            ? (() => {
                const c = clients.find(cl => cl.id === loanClientPreselectId);
                return c ? `${c.firstName} ${c.lastName}` : undefined;
              })()
            : undefined
        }
        onClose={() => {
          setIsLoanTypeSelectModalOpen(false);
          setLoanClientPreselectId(null);
        }}
        onSelectNewLoan={() => {
          setIsLoanTypeSelectModalOpen(false);
          setIsNewLoanModalOpen(true);
        }}
        onSelectPaidLoan={() => {
          setIsLoanTypeSelectModalOpen(false);
          setIsPaidLoanModalOpen(true);
        }}
      />

      <NewLoanModal
        isOpen={isNewLoanModalOpen}
        preselectedClientId={loanClientPreselectId}
        onClose={() => {
          setIsNewLoanModalOpen(false);
          setLoanClientPreselectId(null);
        }}
      />

      <AddPaidLoanModal
        isOpen={isPaidLoanModalOpen}
        preselectedClientId={loanClientPreselectId}
        onClose={() => {
          setIsPaidLoanModalOpen(false);
          setLoanClientPreselectId(null);
        }}
      />

      <NewClientModal
        isOpen={isNewClientModalOpen}
        clientToEdit={clientToEdit}
        onClose={() => {
          setIsNewClientModalOpen(false);
          setClientToEdit(null);
        }}
      />

      <DocumentViewerModal />

      {/* Toast Messages */}
      <Toast toast={toast} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

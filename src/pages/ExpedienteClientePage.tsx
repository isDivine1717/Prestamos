import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Client, ClientDocument, Loan } from '../types';
import { formatCurrency, calculateClientRating } from '../utils/finance';
import { formatDateLocale, formatDateTimeLocale, getDaysDifference, getTodayFormatted } from '../utils/dates';
import { DeleteClientModal } from '../components/DeleteClientModal';
import { StatementModal } from '../components/StatementModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ClientQuickContact } from '../components/ClientQuickContact';
import {
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  History,
  Plus,
  Upload,
  Camera,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  ArrowLeft,
  DollarSign
} from 'lucide-react';

export const ExpedienteClientePage: React.FC = () => {
  const {
    clients,
    loans,
    transactions,
    selectedClientId,
    setSelectedClientId,
    updateClient,
    deleteClient,
    uploadClientDocument,
    deleteClientDocument,
    setRegisterPaymentModalLoan,
    setIsNewLoanModalOpen,
    setLoanClientPreselectId,
    setViewingDocument,
    deleteLoan
  } = useApp();

  const [activeTab, setActiveTab] = useState<'resumen' | 'personal' | 'documentos' | 'prestamos' | 'historial'>('resumen');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStatementLoan, setSelectedStatementLoan] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  // Document Upload States
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<ClientDocument['type']>('ine_frente');
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const client = clients.find(c => c.id === selectedClientId);

  if (!client) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <p className="text-base font-semibold text-zinc-200">No se ha seleccionado ningún cliente.</p>
        <button
          onClick={() => setSelectedClientId(clients[0]?.id || null)}
          className="mt-4 px-4 py-2 bg-emerald-600 text-zinc-950 font-bold rounded-xl text-xs"
        >
          Ver Lista de Clientes
        </button>
      </div>
    );
  }

  const clientLoans = loans.filter(l => l.clientId === client.id);
  const activeLoans = clientLoans.filter(l => l.status === 'active' || l.status === 'overdue');
  const liquidatedLoans = clientLoans.filter(l => l.status === 'liquidated');
  const clientTxns = transactions.filter(t => t.clientId === client.id);

  // Stats
  const totalBorrowedHist = clientLoans.reduce((sum, l) => sum + l.totalToPay, 0);
  const totalPaidHist = clientLoans.reduce((sum, l) => sum + l.totalPaid, 0);
  const currentTotalDebt = activeLoans.reduce((sum, l) => sum + l.balancePending, 0);
  const totalProfitGenerated = clientLoans.reduce((sum, l) => sum + l.profitRecovered, 0);

  const ratingInfo = calculateClientRating(clientLoans, clientTxns);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setSelectedFileUrl(url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmUpload = () => {
    if (!selectedFileUrl || !docTitle.trim()) return;
    uploadClientDocument(client.id, docTitle.trim(), docType, selectedFileUrl);
    setDocTitle('');
    setSelectedFileUrl(null);
  };

  return (
    <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
      {/* Back to Clients List button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedClientId(null)}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Clientes</span>
        </button>
      </div>

      {/* Main Dossier Header */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#161616] border border-[#1F1F1F] flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg">
              {client.firstName.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{client.firstName} {client.lastName}</h2>
                <span className="px-2 py-0.5 rounded bg-[#161616] text-[#22C55E] border border-[#1F1F1F] text-[10px] font-bold uppercase tracking-wider">
                  {ratingInfo.rating.toUpperCase().replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  {client.phone}
                </span>
                {client.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    {client.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Debt Display */}
          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[#1F1F1F] pt-4 md:pt-0 md:pl-6 flex-wrap">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Deuda Actual</span>
              <span className={`text-xl font-light tracking-tighter ${currentTotalDebt > 0 ? 'text-[#F97316]' : 'text-[#22C55E]'}`}>
                {formatCurrency(currentTotalDebt)}
              </span>
            </div>

            <button
              onClick={() => {
                setLoanClientPreselectId(client.id);
                setIsNewLoanModalOpen(true);
              }}
              className="px-4 py-2 bg-[#F97316] hover:bg-orange-600 text-white font-bold text-xs rounded shadow-lg shadow-orange-900/20 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ NUEVO PRÉSTAMO</span>
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3.5 py-2 bg-red-950/50 hover:bg-red-900/80 border border-red-900/60 text-red-400 hover:text-red-200 font-bold text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 uppercase tracking-wider"
              title="Eliminar cliente permanentemente"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar cliente</span>
            </button>
          </div>
        </div>

        {/* Quick Contact Bar */}
        <div className="p-4 bg-[#161616] rounded-xl border border-[#1F1F1F]">
          <ClientQuickContact phone={client.phone} address={client.address} />
        </div>

        {/* Qualification Description Banner */}
        <div className="p-3 bg-[#161616] rounded-lg border border-[#1F1F1F] text-xs text-zinc-300 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
          <p className="text-xs"><strong>Calificación:</strong> {ratingInfo.description}</p>
        </div>

        {/* Dossier Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-[#1F1F1F] overflow-x-auto">
          {[
            { id: 'resumen', label: 'Resumen Financiero', icon: <CreditCard className="w-3.5 h-3.5" /> },
            { id: 'personal', label: 'Datos Personales', icon: <User className="w-3.5 h-3.5" /> },
            { id: 'documentos', label: `Documentos (${(client.documents || []).length})`, icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'prestamos', label: `Préstamos Activos (${activeLoans.length})`, icon: <DollarSign className="w-3.5 h-3.5" /> },
            { id: 'historial', label: `Historial (${clientLoans.length})`, icon: <History className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer uppercase tracking-wider ${
                activeTab === tab.id
                  ? 'border-[#22C55E] text-white bg-[#161616]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: RESUMEN FINANCIERO */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Prestado Históricamente</span>
            <span className="text-2xl font-mono font-bold text-zinc-100">{formatCurrency(totalBorrowedHist)}</span>
            <p className="text-[11px] text-zinc-400">{clientLoans.length} préstamos en total</p>
          </div>

          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Total Pagado</span>
            <span className="text-2xl font-mono font-bold text-emerald-400">{formatCurrency(totalPaidHist)}</span>
            <p className="text-[11px] text-zinc-400">Capital e intereses liquidados</p>
          </div>

          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Deuda Pendiente</span>
            <span className="text-2xl font-mono font-bold text-amber-400">{formatCurrency(currentTotalDebt)}</span>
            <p className="text-[11px] text-zinc-400">{activeLoans.length} préstamos vigentes</p>
          </div>

          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Ganancia Generada</span>
            <span className="text-2xl font-mono font-bold text-emerald-400">{formatCurrency(totalProfitGenerated)}</span>
            <p className="text-[11px] text-zinc-400">{ratingInfo.punctualityPct}% puntualidad global</p>
          </div>
        </div>
      )}

      {/* TAB 2: INFORMACIÓN PERSONAL */}
      {activeTab === 'personal' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-base font-bold text-zinc-100 border-b border-zinc-800 pb-3">Datos del Expediente</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <span className="text-zinc-500 block uppercase font-medium">Nombre Completo:</span>
              <span className="text-sm font-bold text-zinc-200">{client.firstName} {client.lastName}</span>
            </div>

            <div>
              <span className="text-zinc-500 block uppercase font-medium">Teléfono:</span>
              <span className="text-sm font-mono font-bold text-zinc-200">{client.phone || 'No registrado'}</span>
            </div>

            <div>
              <span className="text-zinc-500 block uppercase font-medium">Dirección:</span>
              <span className="text-sm font-medium text-zinc-200">{client.address || 'No especificada'}</span>
            </div>

            <div>
              <span className="text-zinc-500 block uppercase font-medium">Referencias Personales / Aval:</span>
              <span className="text-sm font-medium text-zinc-200">{client.references || 'Sin referencias'}</span>
            </div>

            <div className="md:col-span-2">
              <span className="text-zinc-500 block uppercase font-medium">Notas u Observaciones:</span>
              <span className="text-sm font-medium text-zinc-200">{client.notes || 'Sin notas.'}</span>
            </div>

            <div>
              <span className="text-zinc-500 block uppercase font-medium">Fecha de Registro:</span>
              <span className="text-sm font-medium text-zinc-200">{formatDateLocale(client.createdAt)}</span>
            </div>
          </div>

          {/* Quick Contact within Tab */}
          <div className="p-4 bg-[#141414] rounded-xl border border-zinc-800">
            <ClientQuickContact phone={client.phone} address={client.address} />
          </div>

          {/* Danger Zone for Client Deletion */}
          <div className="pt-6 border-t border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-950/20 p-4 rounded-xl border border-red-900/30">
            <div>
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Zona de Peligro</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Eliminar permanentemente este cliente y todos sus préstamos, pagos e historial.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 uppercase tracking-wider shadow-lg shadow-red-950/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar cliente</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CARPETA DE DOCUMENTOS */}
      {activeTab === 'documentos' && (
        <div className="space-y-6">
          {/* Document Upload Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-400" />
              <span>📁 Cargar Nuevo Documento al Expediente</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Título del Documento</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Ej. INE Frente, Comprobante CFE..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Tipo de Documento</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ine_frente">INE Frente</option>
                  <option value="ine_reverso">INE Reverso</option>
                  <option value="curp">CURP</option>
                  <option value="comprobante">Comprobante de Domicilio</option>
                  <option value="otro">Otro Documento</option>
                </select>
              </div>
            </div>

            {/* Hidden Inputs for File/Camera */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex items-center gap-3 flex-wrap pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Seleccionar Imagen (PC / Móvil)</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Tomar Foto con Cámara</span>
              </button>

              {selectedFileUrl && (
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={!docTitle.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <span>Guardar en Carpeta</span>
                </button>
              )}
            </div>

            {selectedFileUrl && (
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center gap-4">
                <img src={selectedFileUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-zinc-700" />
                <p className="text-xs text-emerald-400 font-medium">Imagen lista para guardar.</p>
              </div>
            )}
          </div>

          {/* Documents Gallery */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-zinc-100">Carpeta Digital del Cliente</h3>

            {!client.documents || client.documents.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center text-zinc-500 text-xs">
                Esta carpeta aún no tiene documentos guardados.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {client.documents.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => setViewingDocument({ doc, clientName: `${client.firstName} ${client.lastName}` })}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden shadow-lg cursor-pointer group transition-all"
                  >
                    <div className="h-36 bg-zinc-950 overflow-hidden relative">
                      <img src={doc.fileUrl} alt={doc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="p-3 space-y-1">
                      <h4 className="text-xs font-bold text-zinc-200 truncate">{doc.title}</h4>
                      <p className="text-[10px] text-zinc-500">{formatDateTimeLocale(doc.uploadedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PRÉSTAMOS ACTIVOS */}
      {activeTab === 'prestamos' && (
        <div className="space-y-6">
          {activeLoans.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center text-zinc-400 text-xs font-medium">
              El cliente no tiene préstamos activos actualmente.
            </div>
          ) : (
            activeLoans.map(loan => (
              <div key={loan.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 font-mono">ID: {loan.id}</span>
                    <h3 className="text-lg font-bold text-zinc-100">Capital: {formatCurrency(loan.capital)}</h3>
                    <p className="text-xs text-zinc-400">Total a Pagar: <span className="font-mono text-emerald-400 font-bold">{formatCurrency(loan.totalToPay)}</span></p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedStatementLoan(loan)}
                      className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-zinc-800 text-zinc-200 border border-[#1F1F1F] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Generar estado de cuenta en PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#22C55E]" />
                      <span>Generar estado de cuenta</span>
                    </button>

                    <button
                      onClick={() => setRegisterPaymentModalLoan(loan)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                    >
                      Registrar Pago
                    </button>

                    <button
                      onClick={() => setLoanToDelete(loan)}
                      className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/70 border border-red-900/50 text-red-400 hover:text-red-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Eliminar este préstamo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar préstamo</span>
                    </button>

                    <button
                      onClick={() => setExpandedLoanId(expandedLoanId === loan.id ? null : loan.id)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors cursor-pointer"
                    >
                      {expandedLoanId === loan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-400 font-mono">
                    <span>Pagado: {formatCurrency(loan.totalPaid)}</span>
                    <span>Pendiente: {formatCurrency(loan.balancePending)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, (loan.totalPaid / loan.totalToPay) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Schedule Calendar Drawer */}
                {expandedLoanId === loan.id && (
                  <div className="pt-4 border-t border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Calendario del Préstamo ({loan.normalDays || 65} Días{loan.graceDays > 0 ? ` + ${loan.graceDays} de Gracia` : ''})
                    </h4>
                    <div className="max-h-60 overflow-y-auto bg-zinc-950 rounded-xl p-3 border border-zinc-800 divide-y divide-zinc-800/60 font-mono text-xs">
                      {loan.schedule.map(day => (
                        <div key={day.dayNumber} className="py-2 px-2 flex justify-between items-center text-zinc-300">
                          <div>
                            <span className="font-bold">Día {day.dayNumber} ({day.date})</span>
                            {day.isGracePeriod && <span className="ml-2 text-[10px] text-amber-400 font-sans font-bold">[DÍA DE GRACIA]</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={day.status === 'paid' || day.status === 'surplus' ? 'text-emerald-400 font-bold' : day.status === 'overdue' ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                              {formatCurrency(day.paidAmount)} / {formatCurrency(day.expectedAmount)}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              day.status === 'paid' || day.status === 'surplus' ? 'bg-emerald-950 text-emerald-300' :
                              day.status === 'overdue' ? 'bg-rose-950 text-rose-300' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {day.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: HISTORIAL */}
      {activeTab === 'historial' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-zinc-100">Historial de Todos los Préstamos</h3>

          <div className="divide-y divide-zinc-800 font-mono text-xs">
            {clientLoans.map(loan => (
              <div key={loan.id} className="py-3 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <span className="font-bold text-zinc-200">ID: {loan.id}</span>
                  <p className="text-zinc-500 text-[11px] font-sans">Inicio: {formatDateLocale(loan.startDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-bold text-zinc-200 block">{formatCurrency(loan.totalToPay)}</span>
                    <span className={`text-[10px] uppercase font-bold ${
                      loan.status === 'liquidated' ? 'text-blue-400' : loan.status === 'active' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {loan.status}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedStatementLoan(loan)}
                    className="px-3 py-1.5 bg-[#161616] hover:bg-zinc-800 text-zinc-200 border border-[#1F1F1F] font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors font-sans"
                    title="Generar estado de cuenta en PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Generar estado de cuenta</span>
                  </button>

                  <button
                    onClick={() => setLoanToDelete(loan)}
                    className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/70 border border-red-900/50 text-red-400 hover:text-red-200 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors font-sans"
                    title="Eliminar este préstamo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar préstamo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Delete Client Confirmation Modal */}
      <DeleteClientModal
        client={client}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={(clientId) => {
          const success = deleteClient(clientId);
          if (success) {
            setIsDeleteModalOpen(false);
            setSelectedClientId(null);
          }
          return success;
        }}
      />
      {/* Statement PDF Modal */}
      <StatementModal
        isOpen={!!selectedStatementLoan}
        client={client}
        loan={selectedStatementLoan}
        onClose={() => setSelectedStatementLoan(null)}
      />
      {/* Delete Loan Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!loanToDelete}
        title="¿Eliminar préstamo seleccionado?"
        message={
          loanToDelete
            ? `¿Estás seguro de que deseas eliminar permanentemente el préstamo de ${formatCurrency(
                loanToDelete.capital
              )} (ID: ${loanToDelete.id})? Esta acción eliminará el calendario de pagos y las transacciones asociadas a este préstamo. NOTA: Esta acción NO eliminará al cliente (${client.firstName} ${client.lastName}).`
            : ''
        }
        confirmText="Eliminar Préstamo"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={async () => {
          if (!loanToDelete) return;
          const targetId = loanToDelete.id;
          const success = await deleteLoan(targetId);
          if (success) {
            if (selectedStatementLoan?.id === targetId) {
              setSelectedStatementLoan(null);
            }
            setLoanToDelete(null);
          }
        }}
        onCancel={() => setLoanToDelete(null)}
      />
    </div>
  );
};

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, Loan, PaymentTransaction } from '../types';
import { formatCurrency } from './finance';
import { formatDateLocale, getTodayFormatted } from './dates';

/**
 * Sanitizes a string for safe usage in filenames
 */
function sanitizeFilename(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

/**
 * Translates payment method code to human readable Spanish string
 */
function getPaymentMethodLabel(method?: string): string {
  if (!method) return '—';
  switch (method) {
    case 'cash':
      return 'Efectivo';
    case 'transfer':
      return 'Transferencia';
    case 'deposit':
      return 'Depósito';
    case 'other':
      return 'Otro';
    default:
      return method;
  }
}

/**
 * Translates payment status to readable text
 */
function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'Pagado';
    case 'surplus':
      return 'Excedente';
    case 'partial':
      return 'Parcial';
    case 'overdue':
      return 'Atrasado';
    case 'pending':
      return 'Pendiente';
    default:
      return status;
  }
}

/**
 * Generates and triggers download of a formal, professional PDF Statement of Account
 */
export function generateLoanStatementPDF(
  client: Client,
  loan: Loan,
  transactions: PaymentTransaction[]
): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter' // 215.9mm x 279.4mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = 16;

  // Colors
  const darkColor: [number, number, number] = [24, 24, 27]; // zinc-900
  const secondaryColor: [number, number, number] = [82, 82, 91]; // zinc-600
  const borderColor: [number, number, number] = [212, 212, 216]; // zinc-300
  const tableHeaderBg: [number, number, number] = [30, 41, 59]; // slate-800

  // 1. HEADER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...darkColor);
  doc.text('ESTADO DE CUENTA', marginLeft, y);

  // Issue Date on top right
  const todayFormatted = formatDateLocale(getTodayFormatted());
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text(`Fecha de emisión: ${todayFormatted}`, pageWidth - marginRight, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Gestor de Préstamos — Control Financiero', marginLeft, y);

  y += 5;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);

  y += 8;

  // Helper for section headers
  const drawSectionHeader = (title: string, startY: number) => {
    doc.setFillColor(245, 245, 247);
    doc.rect(marginLeft, startY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...darkColor);
    doc.text(title.toUpperCase(), marginLeft + 2, startY + 4.2);
    return startY + 9;
  };

  // 2. DATOS DEL CLIENTE
  y = drawSectionHeader('DATOS DEL CLIENTE', y);

  const clientFullName = `${client.firstName} ${client.lastName}`.trim();
  const clientPhone = client.phone || 'No registrado';
  const clientAddress = client.address || 'No registrada';
  const clientRegDate = client.createdAt ? formatDateLocale(client.createdAt) : 'No registrada';

  doc.setFontSize(9);

  // Col 1
  doc.setFont('helvetica', 'bold');
  doc.text('Nombre completo:', marginLeft + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(clientFullName, marginLeft + 35, y);

  // Col 2
  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono:', marginLeft + 105, y);
  doc.setFont('helvetica', 'normal');
  doc.text(clientPhone, marginLeft + 130, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', marginLeft + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(clientAddress, marginLeft + 35, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de registro:', marginLeft + 105, y);
  doc.setFont('helvetica', 'normal');
  doc.text(clientRegDate, marginLeft + 130, y);

  y += 9;

  // 3. INFORMACIÓN DEL PRÉSTAMO
  y = drawSectionHeader('INFORMACIÓN DEL PRÉSTAMO', y);

  const statusLabel =
    loan.status === 'liquidated'
      ? 'LIQUIDADO'
      : loan.status === 'overdue'
      ? 'ATRASADO'
      : loan.status === 'cancelled'
      ? 'CANCELADO'
      : 'ACTIVO';

  // Last schedule day date = predicted end date
  const lastScheduleDay = loan.schedule && loan.schedule.length > 0
    ? loan.schedule[loan.schedule.length - 1]
    : null;
  const endDateFormatted = lastScheduleDay ? formatDateLocale(lastScheduleDay.date) : '—';

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Número de préstamo:', marginLeft + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(loan.id, marginLeft + 42, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', marginLeft + 105, y);
  doc.setFont('helvetica', 'bold');
  if (loan.status === 'overdue') {
    doc.setTextColor(185, 28, 28);
  } else if (loan.status === 'liquidated') {
    doc.setTextColor(22, 163, 74);
  } else {
    doc.setTextColor(30, 41, 59);
  }
  doc.text(statusLabel, marginLeft + 130, y);
  doc.setTextColor(...darkColor);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de inicio:', marginLeft + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDateLocale(loan.startDate), marginLeft + 42, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha prevista fin:', marginLeft + 105, y);
  doc.setFont('helvetica', 'normal');
  doc.text(endDateFormatted, marginLeft + 130, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Capital prestado:', marginLeft + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(loan.capital), marginLeft + 42, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Ganancia pactada:', marginLeft + 105, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(loan.totalProfit), marginLeft + 130, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Total del préstamo:', marginLeft + 2, y);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(loan.totalToPay), marginLeft + 42, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Pago diario:', marginLeft + 105, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatCurrency(loan.dailyPayment)} / día`, marginLeft + 130, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Duración:', marginLeft + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${loan.normalDays} días normales + ${loan.graceDays} días de gracia`, marginLeft + 42, y);

  y += 9;

  // 4. RESUMEN FINANCIERO Y ESTADO ACTUAL
  y = drawSectionHeader('RESUMEN FINANCIERO Y ESTADO ACTUAL', y);

  // Render a clean 2-column box layout
  const boxTop = y;
  const boxHeight = loan.status === 'liquidated' ? 24 : 28;

  doc.setDrawColor(...borderColor);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(marginLeft, boxTop, contentWidth, boxHeight, 2, 2, 'FD');

  const col1X = marginLeft + 4;
  const col2X = marginLeft + 98;
  let boxY = boxTop + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  // Left Column: Financials
  doc.text('Capital prestado:', col1X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(loan.capital), col1X + 38, boxY);

  doc.setFont('helvetica', 'bold');
  doc.text('Total pagado:', col2X, boxY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrency(loan.totalPaid), col2X + 42, boxY);
  doc.setTextColor(...darkColor);

  boxY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Ganancia pactada:', col1X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(loan.totalProfit), col1X + 38, boxY);

  doc.setFont('helvetica', 'bold');
  doc.text('Capital recuperado:', col2X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(loan.capitalRecovered), col2X + 42, boxY);

  boxY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Total a pagar:', col1X, boxY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(loan.totalToPay), col1X + 38, boxY);

  doc.setFont('helvetica', 'bold');
  doc.text('Ganancia recuperada:', col2X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(loan.profitRecovered), col2X + 42, boxY);

  boxY += 5;
  doc.setDrawColor(...borderColor);
  doc.line(col1X, boxY - 1, col1X + 80, boxY - 1);
  doc.line(col2X, boxY - 1, col2X + 80, boxY - 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Saldo pendiente:', col1X, boxY + 3);
  doc.setFont('helvetica', 'bold');
  if (loan.balancePending > 0) {
    doc.setTextColor(225, 29, 72);
  } else {
    doc.setTextColor(22, 163, 74);
  }
  doc.text(formatCurrency(loan.balancePending), col1X + 38, boxY + 3);
  doc.setTextColor(...darkColor);

  // Right column state summary
  const paidDaysCount = loan.schedule.filter(s => s.status === 'paid' || s.status === 'surplus').length;
  const pendingDaysCount = loan.schedule.filter(s => s.status === 'pending' || s.status === 'overdue' || s.status === 'partial').length;
  const overdueDaysCount = loan.schedule.filter(s => s.status === 'overdue').length;

  if (loan.status === 'liquidated') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('PRÉSTAMO LIQUIDADO', col2X, boxY + 3);
    doc.setTextColor(...darkColor);
    if (loan.liquidatedAt) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Fecha liquidación: ${formatDateLocale(loan.liquidatedAt)}`, col2X + 42, boxY + 3);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text(`Pagos realiz.: ${paidDaysCount}  |  Pend.: ${pendingDaysCount}  |  Atrasos: ${overdueDaysCount}`, col2X, boxY + 3);
  }

  y = boxTop + boxHeight + 9;

  // 5. HISTORIAL DE PAGOS (Table)
  y = drawSectionHeader('HISTORIAL DE PAGOS DETALLADO', y);

  // Prepare table data from loan schedule and transactions
  const tableRows: string[][] = [];

  // Filter transactions associated with this loan
  const loanTxns = transactions.filter(t => t.loanId === loan.id);

  loan.schedule.forEach(day => {
    // Find matching transaction if available
    const matchedTxn = loanTxns.find(t => t.dayNumber === day.dayNumber || (t.date === day.date && day.paidAmount > 0));

    const method = matchedTxn ? getPaymentMethodLabel(matchedTxn.paymentMethod) : getPaymentMethodLabel(day.paymentMethod);
    const expectedStr = formatCurrency(day.expectedAmount);
    const receivedStr = formatCurrency(day.paidAmount);
    const statusStr = getPaymentStatusLabel(day.status);

    tableRows.push([
      formatDateLocale(day.date),
      `Día ${day.dayNumber}${day.isGracePeriod ? ' (Gracia)' : ''}`,
      expectedStr,
      receivedStr,
      method,
      statusStr
    ]);
  });

  // Execute jspdf-autotable
  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Día / Período', 'Pago Esperado', 'Pago Recibido', 'Método', 'Estado']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      font: 'helvetica',
      cellPadding: 2,
      textColor: darkColor
    },
    headStyles: {
      fillColor: tableHeaderBg,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 29, halign: 'center' }
    },
    margin: { top: 22, bottom: 22, left: marginLeft, right: marginRight },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 5) {
        const statusText = data.cell.raw as string;
        if (statusText === 'Pagado' || statusText === 'Excedente') {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else if (statusText === 'Atrasado') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (statusText === 'Parcial') {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: function(data) {
      // Header on page 2+
      if (data.pageNumber > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...secondaryColor);
        doc.text(`ESTADO DE CUENTA — ${clientFullName.toUpperCase()} (PRÉSTAMO ${loan.id})`, marginLeft, 12);
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.3);
        doc.line(marginLeft, 15, pageWidth - marginRight, 15);
      }
    }
  });

  // Get final Y coordinate after table
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : y + 40;

  // Final Summary Block (if space allows on same page, or pushed)
  let footerSummaryY = finalY;
  if (footerSummaryY + 30 > pageHeight - 20) {
    doc.addPage();
    footerSummaryY = 25;
  }

  doc.setFillColor(245, 245, 247);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginLeft, footerSummaryY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  doc.text('RESUMEN FINAL Y CONFORMIDAD', marginLeft + 4, footerSummaryY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Capital prestado: ${formatCurrency(loan.capital)}  |  Ganancia: ${formatCurrency(loan.totalProfit)}  |  Total a pagar: ${formatCurrency(
      loan.totalToPay
    )}`,
    marginLeft + 4,
    footerSummaryY + 11
  );

  doc.setFont('helvetica', 'bold');
  doc.text(
    `Total pagado a la fecha: ${formatCurrency(loan.totalPaid)}      Saldo pendiente actual: ${formatCurrency(
      loan.balancePending
    )}      Estado: ${statusLabel}`,
    marginLeft + 4,
    footerSummaryY + 17
  );

  // FOOTER PAGINATION ON ALL PAGES
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);

    const footerTextLeft = `Estado de cuenta — ${clientFullName} (${loan.id})`;
    const footerTextRight = `Página ${i} de ${totalPages}`;

    doc.text(footerTextLeft, marginLeft, pageHeight - 10);
    doc.text(footerTextRight, pageWidth - marginRight, pageHeight - 10, { align: 'right' });

    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, pageHeight - 14, pageWidth - marginRight, pageHeight - 14);
  }

  // ConstructFilename
  const filename = `Estado_de_Cuenta_${sanitizeFilename(clientFullName)}_${sanitizeFilename(loan.id)}.pdf`;

  // Trigger Save
  doc.save(filename);

  return filename;
}

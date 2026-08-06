import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from 'pdf-lib';

const PAGE_SIZE: [number, number] = [595, 842];
const MARGIN_X = 36;
const CONTENT_WIDTH = PAGE_SIZE[0] - MARGIN_X * 2;
const HEADER_GREEN = rgb(0.06, 0.28, 0.2);
const BORDER = rgb(0.73, 0.78, 0.76);
const TEXT = rgb(0.06, 0.07, 0.08);
const MUTED = rgb(0.34, 0.38, 0.42);
const LIGHT_FILL = rgb(0.96, 0.98, 0.97);

export interface SalarySlipPdfRecord {
  employeeName: string;
  employeeCode: string;
  roleTitle: string;
  department?: string | null;
  gender?: string | null;
  region?: string | null;
  headQuarter?: string | null;
  panNumber?: string | null;
  bankDetails?: string | null;
  bankAccountNumber?: string | null;
}

export interface SalarySlipPdfData {
  periodMonth: Date;
  workingDays: number;
  basicPaise: bigint | number;
  hraPaise: bigint | number;
  specialAllowancePaise: bigint | number;
  deductionPaise: bigint | number;
  netPayPaise: bigint | number;
  transactionDate: Date | null;
  transactionReference: string | null;
  notes: string | null;
}

export interface ExpenseSlipWorkDay {
  workDate: Date;
  location?: string | null;
}

export interface ExpenseSlipExtraClaim {
  expenseDate: Date;
  type: string;
  amountPaise: bigint | number;
  description?: string | null;
  billKey?: string | null;
}

export interface ExpenseSlipPdfRecord {
  employeeName: string;
  employeeCode: string;
  roleTitle?: string | null;
  department?: string | null;
  region?: string | null;
  headQuarter?: string | null;
  panNumber?: string | null;
}

export interface ExpenseSlipPdfData {
  periodMonth: Date;
  workingDays: number;
  dailyAllowancePaise: bigint | number;
  petrolAllowancePaise: bigint | number;
  mobileAllowancePaise: bigint | number;
  monthlyAllowanceCapPaise: bigint | number;
  calculatedDailyAllowancePaise: bigint | number;
  calculatedAllowancePaise: bigint | number;
  approvedExtraExpensePaise: bigint | number;
  pendingExtraExpensePaise: bigint | number;
  totalPayablePaise: bigint | number;
  transactionDate: Date | null;
  transactionReference: string | null;
  notes: string | null;
  workedDays: ExpenseSlipWorkDay[];
  extraClaims: ExpenseSlipExtraClaim[];
}

export interface WorkReportPdfRecord {
  employeeName: string;
  employeeCode: string;
  roleTitle?: string | null;
  region?: string | null;
  headQuarter?: string | null;
}

export interface WorkReportPdfRow {
  workDate: Date;
  location?: string | null;
  orthCalls: number;
  mdCalls: number;
  gpCalls: number;
  gynCalls: number;
  otherCalls: number;
  totalDoctors: number;
  totalChemist: number;
  note?: string | null;
}

export interface WorkReportPdfData {
  periodMonth: Date;
  reports: WorkReportPdfRow[];
}

interface PdfContext {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
}

function toNumber(value: bigint | number): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

function formatInr(paise: bigint | number): string {
  const rupees = toNumber(paise) / 100;
  return `Rs. ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees)}`;
}

function formatDate(value: Date | null): string {
  if (!value) return '-';
  const iso = value.toISOString().slice(0, 10);
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function formatMonthYear(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function escapeHtmlCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderWorkReportExcel(
  record: WorkReportPdfRecord,
  data: WorkReportPdfData,
): Uint8Array {
  const rows: (string | number | null | undefined)[][] = [
    ['PARSHLO WORK REPORT'],
    ['Employee Name', record.employeeName],
    ['Employee No.', record.employeeCode],
    ['Designation', record.roleTitle ?? '-'],
    ['Region', record.region ?? record.headQuarter ?? '-'],
    ['Month', formatMonthYear(data.periodMonth)],
    [],
    [
      'Date',
      'Location',
      'ORTH',
      'MD',
      'GP',
      'GYN',
      'Others',
      'Total Dr',
      'Total Chemist',
      'Remarks',
    ],
    ...data.reports.map((report) => [
      formatDate(report.workDate),
      report.location ?? '',
      report.orthCalls,
      report.mdCalls,
      report.gpCalls,
      report.gynCalls,
      report.otherCalls,
      report.totalDoctors,
      report.totalChemist,
      report.note ?? '',
    ]),
  ];
  const tableRows = rows
    .map((row, rowIndex) => {
      const cells = row.length === 0 ? [''] : row;
      const tag = rowIndex === 0 || rowIndex === 7 ? 'th' : 'td';
      const colspan = rowIndex === 0 ? ' colspan="10"' : '';
      return `<tr>${cells
        .map((cell, cellIndex) =>
          cellIndex === 0 && colspan
            ? `<${tag}${colspan}>${escapeHtmlCell(cell)}</${tag}>`
            : `<${tag}>${escapeHtmlCell(cell)}</${tag}>`,
        )
        .join('')}</tr>`;
    })
    .join('');
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
    th { background: #eaf3ef; color: #103f2f; font-weight: 700; }
    th, td { border: 1px solid #9fb0aa; padding: 6px 8px; vertical-align: top; }
  </style>
</head>
<body><table>${tableRows}</table></body>
</html>`;
  return Buffer.from(html, 'utf8');
}

function sanitize(text: string): string {
  return text.replace(/[₹–—]/g, (char) => {
    if (char === '₹') return 'Rs.';
    return '-';
  });
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  options: { color?: ReturnType<typeof rgb>; maxWidth?: number } = {},
): void {
  const clean = sanitize(text);
  const maxWidth = options.maxWidth;
  let clipped = clean;
  if (maxWidth && font.widthOfTextAtSize(clipped, size) > maxWidth) {
    while (clipped.length > 1 && font.widthOfTextAtSize(`${clipped}...`, size) > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    clipped = `${clipped}...`;
  }
  page.drawText(clipped, {
    x,
    y,
    size,
    font,
    color: options.color ?? TEXT,
  });
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = TEXT,
): void {
  const clean = sanitize(text);
  const width = font.widthOfTextAtSize(clean, size);
  drawText(page, clean, (PAGE_SIZE[0] - width) / 2, y, font, size, { color });
}

function addPage(ctx: PdfContext): void {
  ctx.page = ctx.pdf.addPage(PAGE_SIZE);
  ctx.y = 790;
}

function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.y - needed < 48) addPage(ctx);
}

function drawBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { fill?: ReturnType<typeof rgb>; border?: ReturnType<typeof rgb> } = {},
): void {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderWidth: 0.8,
    borderColor: options.border ?? BORDER,
    color: options.fill,
  });
}

function drawHeader(ctx: PdfContext, title: string, subtitle: string): void {
  drawBox(ctx.page, MARGIN_X, 752, CONTENT_WIDTH, 66, { fill: LIGHT_FILL, border: HEADER_GREEN });
  drawCentered(ctx.page, 'PARSHLO', 799, ctx.bold, 17, HEADER_GREEN);
  drawCentered(
    ctx.page,
    'Phase 2, Office No. 3, Laxminagar Commercial Complex,',
    782,
    ctx.font,
    8,
    MUTED,
  );
  drawCentered(
    ctx.page,
    'S. No. 93, Final Plot No. 512, Parvati, Pune - 411009, Maharashtra, INDIA.',
    770,
    ctx.font,
    8,
    MUTED,
  );
  drawBox(ctx.page, MARGIN_X, 722, CONTENT_WIDTH, 22, { fill: HEADER_GREEN, border: HEADER_GREEN });
  drawCentered(ctx.page, `${title} - ${subtitle.toUpperCase()}`, 729, ctx.bold, 10.5, rgb(1, 1, 1));
  ctx.y = 698;
}

function drawTwoColumnDetails(ctx: PdfContext, rows: [string, string, string, string][]): void {
  const rowHeight = 22;
  const height = rows.length * rowHeight + 14;
  ensureSpace(ctx, height);
  drawBox(ctx.page, MARGIN_X, ctx.y - height + 8, CONTENT_WIDTH, height, { border: BORDER });
  let rowY = ctx.y - 10;
  for (const [leftLabel, leftValue, rightLabel, rightValue] of rows) {
    drawText(ctx.page, leftLabel, MARGIN_X + 12, rowY, ctx.bold, 8.5, { color: MUTED });
    drawText(ctx.page, leftValue || '-', MARGIN_X + 118, rowY, ctx.font, 8.5, { maxWidth: 140 });
    drawText(ctx.page, rightLabel, MARGIN_X + 292, rowY, ctx.bold, 8.5, { color: MUTED });
    drawText(ctx.page, rightValue || '-', MARGIN_X + 398, rowY, ctx.font, 8.5, { maxWidth: 120 });
    rowY -= rowHeight;
  }
  ctx.y -= height + 12;
}

function drawSectionTitle(ctx: PdfContext, title: string): void {
  ensureSpace(ctx, 28);
  drawText(ctx.page, title.toUpperCase(), MARGIN_X, ctx.y, ctx.bold, 9.5, { color: HEADER_GREEN });
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ctx.y - 6 },
    end: { x: MARGIN_X + CONTENT_WIDTH, y: ctx.y - 6 },
    thickness: 0.6,
    color: BORDER,
  });
  ctx.y -= 22;
}

function drawAmountTable(
  ctx: PdfContext,
  leftTitle: string,
  leftRows: [string, bigint | number | string][],
  rightTitle: string,
  rightRows: [string, bigint | number | string][],
): void {
  const rowCount = Math.max(leftRows.length, rightRows.length);
  const rowHeight = 23;
  const tableHeight = 34 + rowCount * rowHeight;
  ensureSpace(ctx, tableHeight + 14);
  drawBox(ctx.page, MARGIN_X, ctx.y - tableHeight, CONTENT_WIDTH, tableHeight, { border: BORDER });
  drawBox(ctx.page, MARGIN_X, ctx.y - 24, CONTENT_WIDTH / 2, 24, {
    fill: LIGHT_FILL,
    border: BORDER,
  });
  drawBox(ctx.page, MARGIN_X + CONTENT_WIDTH / 2, ctx.y - 24, CONTENT_WIDTH / 2, 24, {
    fill: LIGHT_FILL,
    border: BORDER,
  });
  drawText(ctx.page, leftTitle, MARGIN_X + 10, ctx.y - 16, ctx.bold, 8.5, { color: HEADER_GREEN });
  drawText(ctx.page, 'Payroll', MARGIN_X + 198, ctx.y - 16, ctx.bold, 8.5, { color: HEADER_GREEN });
  drawText(ctx.page, rightTitle, MARGIN_X + CONTENT_WIDTH / 2 + 10, ctx.y - 16, ctx.bold, 8.5, {
    color: HEADER_GREEN,
  });
  drawText(ctx.page, 'Payroll', MARGIN_X + CONTENT_WIDTH / 2 + 198, ctx.y - 16, ctx.bold, 8.5, {
    color: HEADER_GREEN,
  });
  let rowY = ctx.y - 44;
  for (let index = 0; index < rowCount; index += 1) {
    const left = leftRows[index];
    const right = rightRows[index];
    if (index < leftRows.length) {
      drawText(ctx.page, left[0], MARGIN_X + 10, rowY, ctx.font, 8.5, { maxWidth: 150 });
      drawText(
        ctx.page,
        typeof left[1] === 'string' ? left[1] : formatInr(left[1]),
        MARGIN_X + 190,
        rowY,
        ctx.font,
        8.5,
      );
    }
    if (index < rightRows.length) {
      drawText(ctx.page, right[0], MARGIN_X + CONTENT_WIDTH / 2 + 10, rowY, ctx.font, 8.5, {
        maxWidth: 150,
      });
      drawText(
        ctx.page,
        typeof right[1] === 'string' ? right[1] : formatInr(right[1]),
        MARGIN_X + CONTENT_WIDTH / 2 + 190,
        rowY,
        ctx.font,
        8.5,
      );
    }
    rowY -= rowHeight;
  }
  ctx.y -= tableHeight + 14;
}

function drawPaymentRows(
  ctx: PdfContext,
  amountPaise: bigint | number,
  transactionDate: Date | null,
  transactionReference: string | null,
  notes: string | null,
): void {
  drawSectionTitle(ctx, 'Payment Details');
  ensureSpace(ctx, 104);
  drawBox(ctx.page, MARGIN_X, ctx.y - 88, CONTENT_WIDTH, 88, { border: BORDER });
  drawBox(ctx.page, MARGIN_X, ctx.y - 24, CONTENT_WIDTH, 24, { fill: LIGHT_FILL, border: BORDER });
  const columns: [string, string, number, number][] = [
    ['NEFT/DD/CHQ DATE', formatDate(transactionDate), 12, 150],
    ['NEFT/DD/CHQ NO.', transactionReference ?? '-', 196, 158],
    ['AMOUNT', formatInr(amountPaise), 390, 118],
  ];
  for (const [label, value, x, width] of columns) {
    drawText(ctx.page, label, MARGIN_X + x, ctx.y - 16, ctx.bold, 8, {
      color: HEADER_GREEN,
      maxWidth: width,
    });
    drawText(ctx.page, value, MARGIN_X + x, ctx.y - 48, ctx.font, 8.5, { maxWidth: width });
  }
  drawText(ctx.page, 'REMARKS', MARGIN_X + 12, ctx.y - 74, ctx.bold, 8, {
    color: MUTED,
  });
  drawText(ctx.page, notes ?? '-', MARGIN_X + 104, ctx.y - 74, ctx.font, 8.5, {
    maxWidth: CONTENT_WIDTH - 122,
  });
  ctx.y -= 104;
}

function drawReceiptPaymentRows(
  ctx: PdfContext,
  amountPaise: bigint | number,
  transactionDate: Date | null,
  transactionReference: string | null,
  employeeName: string,
  region: string,
): void {
  ensureSpace(ctx, 96);
  drawBox(ctx.page, MARGIN_X, ctx.y - 84, CONTENT_WIDTH, 84, { border: BORDER });
  const rows: [string, string, string, string][] = [
    [
      'NEFT/DD/CHQ DATE',
      formatDate(transactionDate),
      'NEFT/DD/CHQ NO.',
      transactionReference ?? '-',
    ],
    ['AMOUNT', formatInr(amountPaise), 'NAME', employeeName],
    ['DIVISION', 'PARSHLO', 'REGION', region],
  ];
  let rowY = ctx.y - 18;
  for (const [leftLabel, leftValue, rightLabel, rightValue] of rows) {
    drawText(ctx.page, leftLabel, MARGIN_X + 12, rowY, ctx.bold, 8, { color: MUTED });
    drawText(ctx.page, leftValue, MARGIN_X + 126, rowY, ctx.font, 8.5, { maxWidth: 142 });
    drawText(ctx.page, rightLabel, MARGIN_X + 296, rowY, ctx.bold, 8, { color: MUTED });
    drawText(ctx.page, rightValue, MARGIN_X + 402, rowY, ctx.font, 8.5, { maxWidth: 110 });
    rowY -= 24;
  }
  ctx.y -= 98;
}

function drawReceiptCutout(
  ctx: PdfContext,
  label: string,
  monthYear: string,
  amountPaise: bigint | number,
  transactionDate: Date | null,
  transactionReference: string | null,
  employeeName: string,
  region: string,
): void {
  ensureSpace(ctx, 150);
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ctx.y },
    end: { x: MARGIN_X + CONTENT_WIDTH, y: ctx.y },
    thickness: 0.7,
    dashArray: [4, 4],
    color: MUTED,
  });
  ctx.y -= 20;
  drawCentered(ctx.page, 'Kindly cut here and send HO', ctx.y, ctx.bold, 9, MUTED);
  ctx.y -= 28;
  drawCentered(
    ctx.page,
    `I have received ${label} for the month of ${monthYear}`,
    ctx.y,
    ctx.bold,
    9.5,
  );
  ctx.y -= 28;
  drawReceiptPaymentRows(
    ctx,
    amountPaise,
    transactionDate,
    transactionReference,
    employeeName,
    region,
  );
}

async function createContext(): Promise<PdfContext> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(PAGE_SIZE);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  return { pdf, page, font, bold, y: 790 };
}

export async function renderSalarySlipPdf(
  record: SalarySlipPdfRecord,
  slip: SalarySlipPdfData,
): Promise<Uint8Array> {
  const ctx = await createContext();
  const monthYear = formatMonthYear(slip.periodMonth);
  const region = record.region ?? record.headQuarter ?? '-';
  const totalEarnings =
    toNumber(slip.basicPaise) + toNumber(slip.hraPaise) + toNumber(slip.specialAllowancePaise);
  const totalDeduction = toNumber(slip.deductionPaise);

  drawHeader(ctx, 'Salary Slip', monthYear);
  drawTwoColumnDetails(ctx, [
    ['EMPLOYEE NAME', record.employeeName, 'EMPLOYEE NO.', record.employeeCode],
    ['DESIGNATION', record.roleTitle, 'DEPARTMENT', record.department ?? '-'],
    ['GENDER', record.gender ?? '-', 'REGION', region],
    ['PAN NO.', record.panNumber ?? '-', 'PAID DAYS', String(slip.workingDays)],
    ['BANK DETAILS', record.bankDetails ?? '-', 'BANK A/C NO.', record.bankAccountNumber ?? '-'],
  ]);

  drawAmountTable(
    ctx,
    'EARNINGS',
    [
      ['BASIC', slip.basicPaise],
      ['HRA', slip.hraPaise],
      ['SPECIAL ALLOWANCE', slip.specialAllowancePaise],
      ['TOTAL EARNINGS', totalEarnings],
    ],
    'DEDUCTION',
    [
      ['MH - PROF. TAX', slip.deductionPaise],
      ['INCOME TAX (TDS)', '-'],
      ['LOAN', '-'],
      ['ADVANCE', '-'],
      ['TOTAL DEDUCTION', totalDeduction],
      ['TOTAL PAYABLE', slip.netPayPaise],
    ],
  );

  drawPaymentRows(
    ctx,
    slip.netPayPaise,
    slip.transactionDate,
    slip.transactionReference,
    slip.notes,
  );
  drawCentered(
    ctx.page,
    'Since this is a computer generated slip no signature is required.',
    ctx.y,
    ctx.font,
    8.5,
    MUTED,
  );
  ctx.y -= 30;
  drawReceiptCutout(
    ctx,
    'salary',
    monthYear,
    slip.netPayPaise,
    slip.transactionDate,
    slip.transactionReference,
    record.employeeName,
    region,
  );

  return ctx.pdf.save();
}

function drawSimpleTableHeader(ctx: PdfContext, columns: [string, number, number][]): void {
  ensureSpace(ctx, 28);
  drawBox(ctx.page, MARGIN_X, ctx.y - 22, CONTENT_WIDTH, 22, { fill: LIGHT_FILL, border: BORDER });
  for (const [label, x, width] of columns) {
    drawText(ctx.page, label, MARGIN_X + x, ctx.y - 14, ctx.bold, 8, {
      color: HEADER_GREEN,
      maxWidth: width,
    });
  }
  ctx.y -= 24;
}

function drawSimpleTableRow(ctx: PdfContext, columns: [string, number, number][]): void {
  ensureSpace(ctx, 24);
  for (const [value, x, width] of columns) {
    drawText(ctx.page, value, MARGIN_X + x, ctx.y - 13, ctx.font, 8, { maxWidth: width });
  }
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ctx.y - 20 },
    end: { x: MARGIN_X + CONTENT_WIDTH, y: ctx.y - 20 },
    thickness: 0.4,
    color: BORDER,
  });
  ctx.y -= 22;
}

function drawExpenseAllowanceSummary(ctx: PdfContext, slip: ExpenseSlipPdfData): void {
  drawSectionTitle(ctx, 'Overall Summary');
  ensureSpace(ctx, 108);
  drawBox(ctx.page, MARGIN_X, ctx.y - 96, CONTENT_WIDTH, 96, { border: BORDER });
  drawBox(ctx.page, MARGIN_X, ctx.y - 22, CONTENT_WIDTH, 22, { fill: LIGHT_FILL, border: BORDER });
  drawText(ctx.page, 'ALLOWANCE BASIS', MARGIN_X + 12, ctx.y - 14, ctx.bold, 8, {
    color: HEADER_GREEN,
  });
  drawText(ctx.page, 'AMOUNT', MARGIN_X + 410, ctx.y - 14, ctx.bold, 8, {
    color: HEADER_GREEN,
  });

  const rows: [string, string][] = [
    [
      `Daily allowance - ${slip.workingDays} worked day(s) x ${formatInr(slip.dailyAllowancePaise)}`,
      formatInr(slip.calculatedDailyAllowancePaise),
    ],
    ['Petrol allowance - monthly fixed', formatInr(slip.petrolAllowancePaise)],
    ['Mobile allowance - monthly fixed', formatInr(slip.mobileAllowancePaise)],
  ];

  let rowY = ctx.y - 42;
  for (const [label, amount] of rows) {
    drawText(ctx.page, label, MARGIN_X + 12, rowY, ctx.font, 8.5, { maxWidth: 360 });
    drawText(ctx.page, amount, MARGIN_X + 410, rowY, ctx.font, 8.5, { maxWidth: 98 });
    rowY -= 20;
  }

  drawText(ctx.page, 'Monthly allowance cap', MARGIN_X + 12, rowY, ctx.bold, 8.5, {
    maxWidth: 360,
  });
  drawText(
    ctx.page,
    formatInr(slip.monthlyAllowanceCapPaise),
    MARGIN_X + 410,
    rowY,
    ctx.bold,
    8.5,
    {
      maxWidth: 98,
    },
  );
  ctx.y -= 112;
}

export async function renderExpenseSlipPdf(
  record: ExpenseSlipPdfRecord,
  slip: ExpenseSlipPdfData,
): Promise<Uint8Array> {
  const ctx = await createContext();
  const monthYear = formatMonthYear(slip.periodMonth);
  const region = record.region ?? record.headQuarter ?? '-';

  drawHeader(ctx, 'Expense Slip', monthYear);
  drawTwoColumnDetails(ctx, [
    ['EMPLOYEE NAME', record.employeeName, 'EMPLOYEE NO.', record.employeeCode],
    ['DESIGNATION', record.roleTitle ?? '-', 'DEPARTMENT', record.department ?? '-'],
    ['REGION', region, 'PAN NO.', record.panNumber ?? '-'],
    [
      'WORKED DAYS',
      String(slip.workingDays),
      'MONTHLY CAP',
      formatInr(slip.monthlyAllowanceCapPaise),
    ],
  ]);

  drawExpenseAllowanceSummary(ctx, slip);

  drawAmountTable(
    ctx,
    'AUTOMATIC ALLOWANCE',
    [
      ['DAILY ALLOWANCE TOTAL', slip.calculatedDailyAllowancePaise],
      ['PETROL', slip.petrolAllowancePaise],
      ['MOBILE', slip.mobileAllowancePaise],
      ['AUTOMATIC TOTAL', slip.calculatedAllowancePaise],
    ],
    'EXTRA CLAIMS',
    [
      ['APPROVED EXTRA CLAIMS', slip.approvedExtraExpensePaise],
      ['PENDING EXTRA CLAIMS', slip.pendingExtraExpensePaise],
      ['TOTAL PAYABLE', slip.totalPayablePaise],
    ],
  );

  drawSectionTitle(ctx, 'Approved Extra Claims');
  drawSimpleTableHeader(ctx, [
    ['DATE', 10, 70],
    ['TYPE', 100, 95],
    ['DESCRIPTION', 215, 170],
    ['BILL', 405, 70],
    ['AMOUNT', 465, 60],
  ]);
  if (slip.extraClaims.length === 0) {
    drawSimpleTableRow(ctx, [['No approved extra claims for this month.', 10, 420]]);
  } else {
    for (const claim of slip.extraClaims) {
      drawSimpleTableRow(ctx, [
        [formatDate(claim.expenseDate), 10, 70],
        [claim.type.replace(/_/g, ' '), 100, 95],
        [claim.description ?? '-', 215, 170],
        [claim.billKey ? 'Attached' : '-', 405, 70],
        [formatInr(claim.amountPaise), 465, 60],
      ]);
    }
  }

  ctx.y -= 14;
  drawPaymentRows(
    ctx,
    slip.totalPayablePaise,
    slip.transactionDate,
    slip.transactionReference,
    slip.notes,
  );
  drawCentered(
    ctx.page,
    'Since this is a computer generated slip no signature is required.',
    ctx.y,
    ctx.font,
    8.5,
    MUTED,
  );
  ctx.y -= 30;
  drawReceiptCutout(
    ctx,
    'expenses',
    monthYear,
    slip.totalPayablePaise,
    slip.transactionDate,
    slip.transactionReference,
    record.employeeName,
    region,
  );

  return ctx.pdf.save();
}

export async function renderWorkReportPdf(
  record: WorkReportPdfRecord,
  data: WorkReportPdfData,
): Promise<Uint8Array> {
  const ctx = await createContext();
  const monthYear = formatMonthYear(data.periodMonth);
  const region = record.region ?? record.headQuarter ?? '-';
  const totals = data.reports.reduce(
    (current, report) => ({
      orth: current.orth + report.orthCalls,
      md: current.md + report.mdCalls,
      gp: current.gp + report.gpCalls,
      gyn: current.gyn + report.gynCalls,
      others: current.others + report.otherCalls,
      doctors: current.doctors + report.totalDoctors,
      chemists: current.chemists + report.totalChemist,
    }),
    { orth: 0, md: 0, gp: 0, gyn: 0, others: 0, doctors: 0, chemists: 0 },
  );

  drawHeader(ctx, 'Work Report', monthYear);
  drawTwoColumnDetails(ctx, [
    ['EMPLOYEE NAME', record.employeeName, 'EMPLOYEE NO.', record.employeeCode],
    ['DESIGNATION', record.roleTitle ?? '-', 'REGION', region],
    ['REPORTED DAYS', String(data.reports.length), 'TOTAL DR', String(totals.doctors)],
    ['TOTAL CHEMIST', String(totals.chemists), 'MONTH', monthYear],
  ]);

  drawSectionTitle(ctx, 'Call Summary');
  drawAmountTable(
    ctx,
    'DOCTOR CALLS',
    [
      ['ORTH', String(totals.orth)],
      ['MD', String(totals.md)],
      ['GP', String(totals.gp)],
      ['GYN', String(totals.gyn)],
      ['OTHERS', String(totals.others)],
      ['TOTAL DR', String(totals.doctors)],
    ],
    'CHEMIST CALLS',
    [
      ['TOTAL CHEMIST', String(totals.chemists)],
      [
        'AVG DR / DAY',
        data.reports.length > 0 ? (totals.doctors / data.reports.length).toFixed(1) : '0',
      ],
      [
        'AVG CHEMIST / DAY',
        data.reports.length > 0 ? (totals.chemists / data.reports.length).toFixed(1) : '0',
      ],
    ],
  );

  drawSectionTitle(ctx, 'Daily Details');
  drawSimpleTableHeader(ctx, [
    ['DATE', 6, 58],
    ['LOCATION', 70, 72],
    ['ORTH', 150, 34],
    ['MD', 190, 28],
    ['GP', 224, 28],
    ['GYN', 258, 30],
    ['OTH', 294, 30],
    ['DR', 330, 34],
    ['CHEM', 370, 42],
    ['REMARKS', 420, 88],
  ]);
  if (data.reports.length === 0) {
    drawSimpleTableRow(ctx, [['No work reports submitted for this month.', 10, 420]]);
  } else {
    for (const report of data.reports) {
      drawSimpleTableRow(ctx, [
        [formatDate(report.workDate), 6, 58],
        [report.location ?? '-', 70, 72],
        [String(report.orthCalls), 150, 34],
        [String(report.mdCalls), 190, 28],
        [String(report.gpCalls), 224, 28],
        [String(report.gynCalls), 258, 30],
        [String(report.otherCalls), 294, 30],
        [String(report.totalDoctors), 330, 34],
        [String(report.totalChemist), 370, 42],
        [report.note?.trim() ? report.note : '-', 420, 88],
      ]);
    }
  }

  drawCentered(
    ctx.page,
    'Since this is a computer generated report no signature is required.',
    Math.max(ctx.y - 8, 38),
    ctx.font,
    8.5,
    MUTED,
  );

  return ctx.pdf.save();
}

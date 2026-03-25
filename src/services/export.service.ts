import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Transaction, ReportData } from '@/types';
import { getStoredLanguage } from '@/i18n';
import type { AppLanguage } from '@/i18n';
import { formatDate } from '@/utils/formatters';

type ExportKind = 'transactions' | 'report';

const vfs = (pdfFonts as { pdfMake?: { vfs?: Record<string, string> }; vfs?: Record<string, string> }).pdfMake?.vfs
  ?? (pdfFonts as { vfs?: Record<string, string> }).vfs;

if (vfs) {
  (pdfMake as unknown as { vfs: Record<string, string> }).vfs = vfs;
}

const getCurrentLanguage = (): AppLanguage => {
  return getStoredLanguage();
};

const STRINGS: Record<AppLanguage, Record<string, string>> = {
  ru: {
    reportTitle: 'FinTrack Финансовый отчет',
    generatedAt: 'Сгенерировано',
    summary: 'Сводка',
    totalIncome: 'Общий доход',
    totalExpenses: 'Общие расходы',
    balance: 'Баланс',
    savings: 'Накопления',
    savingsRate: 'Процент накоплений',
    txCount: 'Количество транзакций',
    categoryCount: 'Количество категорий',
    recCount: 'Количество рекомендаций',
    topCategories: 'Основные категории расходов',
    recentTransactions: 'Недавние транзакции',
    income: 'Доход',
    expense: 'Расход',
    uncategorized: 'Без категории',
    noDescription: 'Без описания',
    date: 'Дата',
    type: 'Тип',
    category: 'Категория',
    amount: 'Сумма',
    description: 'Описание',
    merchant: 'Мерчант',
    parameter: 'Параметр',
    value: 'Значение',
    percent: 'Процент',
    count: 'Количество',
    month: 'Месяц',
    sheetSummary: 'Сводка',
    sheetTransactions: 'Транзакции',
    sheetCategories: 'Категории',
    sheetTrend: 'Динамика',
    fileTransactions: 'tranzakcii',
    fileReport: 'otchet',
  },
  en: {
    reportTitle: 'FinTrack Financial Report',
    generatedAt: 'Generated at',
    summary: 'Summary',
    totalIncome: 'Total income',
    totalExpenses: 'Total expenses',
    balance: 'Balance',
    savings: 'Savings',
    savingsRate: 'Savings rate',
    txCount: 'Transactions count',
    categoryCount: 'Categories count',
    recCount: 'Recommendations count',
    topCategories: 'Top expense categories',
    recentTransactions: 'Recent transactions',
    income: 'Income',
    expense: 'Expense',
    uncategorized: 'Uncategorized',
    noDescription: 'No description',
    date: 'Date',
    type: 'Type',
    category: 'Category',
    amount: 'Amount',
    description: 'Description',
    merchant: 'Merchant',
    parameter: 'Parameter',
    value: 'Value',
    percent: 'Percent',
    count: 'Count',
    month: 'Month',
    sheetSummary: 'Summary',
    sheetTransactions: 'Transactions',
    sheetCategories: 'Categories',
    sheetTrend: 'Trend',
    fileTransactions: 'transactions',
    fileReport: 'report',
  },
};

const formatByLanguage = (value: number, language: AppLanguage): string => {
  return new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDateTimeByLanguage = (iso: string, language: AppLanguage): string => {
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
};

const formatDateByLanguage = (iso: string, language: AppLanguage): string => {
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
    dateStyle: 'short',
  }).format(new Date(iso));
};

const getTypeLabel = (type: Transaction['type'], language: AppLanguage): string => {
  const t = STRINGS[language];
  return type === 'income' ? t.income : t.expense;
};

const createPdfBlob = async (definition: TDocumentDefinitions): Promise<Blob> => {
  return pdfMake.createPdf(definition).getBlob();
};

const getLocalizedFileBase = (fileName: string | undefined, language: AppLanguage, kind: ExportKind): string => {
  const tr = STRINGS[language];
  const fallback = kind === 'report' ? tr.fileReport : tr.fileTransactions;
  const raw = (fileName || '').trim().toLowerCase();

  if (!raw) return fallback;

  const reportAliases = ['report', 'financial_report', 'otchet', 'otchot'];
  const txAliases = ['transactions', 'report_transactions', 'tranzakcii'];

  if (kind === 'report' && reportAliases.includes(raw)) {
    return fallback;
  }

  if (kind === 'transactions' && txAliases.includes(raw)) {
    return fallback;
  }

  return fileName as string;
};

const formatNumberForCsv = (value: number, language: AppLanguage): string => {
  return formatByLanguage(value, language).replace(/\u00A0/g, ' ');
};

const escapeCsvCell = (value: string): string => {
  if (/([";\n\r])/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Экспорт транзакций в CSV
 */
export const exportTransactionsToCSV = (
  transactions: Transaction[],
  filename: string = 'transactions'
): void => {
  const language = getCurrentLanguage();
  const tr = STRINGS[language];
  const localizedFilename = getLocalizedFileBase(filename, language, 'transactions');
  const headers = [tr.date, tr.type, tr.category, tr.amount, tr.description, tr.merchant];
  
  const csvData = transactions.map((tx) => [
    formatDateByLanguage(tx.date, language),
    getTypeLabel(tx.type, language),
    tx.category?.name || tr.uncategorized,
    formatNumberForCsv(Number(tx.amount), language),
    tx.description || '',
    tx.merchant || '',
  ]);

  const csvContent = [headers, ...csvData]
    .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(';'))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${localizedFilename}_${formatDate(new Date().toISOString(), 'dd-MM-yyyy')}.csv`);
};

/**
 * Экспорт транзакций в Excel
 */
export const exportTransactionsToExcel = (
  transactions: Transaction[],
  filename: string = 'transactions'
): void => {
  const language = getCurrentLanguage();
  const tr = STRINGS[language];
  const localizedFilename = getLocalizedFileBase(filename, language, 'transactions');

  const data = transactions.map((tx) => ({
    [tr.date]: formatDateByLanguage(tx.date, language),
    [tr.type]: getTypeLabel(tx.type, language),
    [tr.category]: tx.category?.name || tr.uncategorized,
    [tr.amount]: Number(tx.amount),
    [tr.description]: tx.description || '',
    [tr.merchant]: tx.merchant || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tr.sheetTransactions);
  
  XLSX.writeFile(wb, `${localizedFilename}_${formatDate(new Date().toISOString(), 'dd-MM-yyyy')}.xlsx`);
};

/**
 * Экспорт отчёта в Excel с несколькими листами
 */
export const exportReportToExcel = (reportData: ReportData, filename: string = 'report'): void => {
  const language = getCurrentLanguage();
  const tr = STRINGS[language];
  const localizedFilename = getLocalizedFileBase(filename, language, 'report');
  const wb = XLSX.utils.book_new();

  const summaryData = [
    { [tr.parameter]: tr.totalIncome, [tr.value]: reportData.summary.totalIncome },
    { [tr.parameter]: tr.totalExpenses, [tr.value]: reportData.summary.totalExpenses },
    { [tr.parameter]: tr.balance, [tr.value]: reportData.summary.balance },
    { [tr.parameter]: tr.savings, [tr.value]: reportData.summary.savings },
    { [tr.parameter]: tr.savingsRate, [tr.value]: reportData.summary.savingsRate.toFixed(2) + '%' },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, tr.sheetSummary);

  const transactionsData = reportData.transactions.map((tx) => ({
    [tr.date]: formatDateByLanguage(tx.date, language),
    [tr.type]: getTypeLabel(tx.type, language),
    [tr.category]: tx.category?.name || tr.uncategorized,
    [tr.amount]: Number(tx.amount),
    [tr.description]: tx.description || '',
  }));

  const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(wb, wsTransactions, tr.sheetTransactions);

  const categoriesData = reportData.categories.map((c) => ({
    [tr.category]: c.category?.name || c.category_name || c.category_id || tr.uncategorized,
    [tr.amount]: c.amount,
    [tr.percent]: c.percentage.toFixed(2) + '%',
    [tr.count]: c.count,
  }));

  const wsCategories = XLSX.utils.json_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, wsCategories, tr.sheetCategories);

  const monthlyData = reportData.monthlyTrend.map((m) => ({
    [tr.month]: m.month,
    [tr.totalIncome]: m.income,
    [tr.totalExpenses]: m.expenses,
    [tr.balance]: m.profit,
  }));

  const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);
  XLSX.utils.book_append_sheet(wb, wsMonthly, tr.sheetTrend);

  XLSX.writeFile(wb, `${localizedFilename}_${formatDate(new Date().toISOString(), 'dd-MM-yyyy')}.xlsx`);
};

/**
 * Генерация PDF отчёта
 * Используется pdfmake для корректной поддержки кириллицы и локализации.
 */
export const generatePDFReport = async (
  reportData: ReportData,
  filename: string = 'report'
): Promise<void> => {
  try {
    const language = getCurrentLanguage();
    const t = STRINGS[language];
    const localizedFilename = getLocalizedFileBase(filename, language, 'report');
    const now = new Date().toISOString();
    const categoryLines: Content[] = reportData.categories.slice(0, 10).map((item, index) => {
      const categoryName = item.category?.name || item.category_name || item.category_id || t.uncategorized;
      return {
        text: `${index + 1}. ${categoryName}: ${formatByLanguage(item.amount, language)} (${item.percentage.toFixed(1)}%)`,
      };
    });

    const transactionLines: Content[] = reportData.transactions.slice(0, 15).map((tx, index) => {
      const category = tx.category?.name || t.uncategorized;
      const desc = tx.description || t.noDescription;
      const typeLabel = tx.type === 'income' ? t.income : t.expense;
      const txDate = formatDateTimeByLanguage(tx.date, language);

      return {
        text: `${index + 1}. ${txDate} | ${typeLabel} | ${category} | ${formatByLanguage(Number(tx.amount), language)} | ${desc}`,
      };
    });

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
      },
      content: [
        { text: t.reportTitle, style: 'header' },
        { text: `${t.generatedAt}: ${formatDateTimeByLanguage(now, language)}`, margin: [0, 0, 0, 12] },
        { text: t.summary, style: 'sectionTitle' },
        { text: `${t.totalIncome}: ${formatByLanguage(reportData.summary.totalIncome, language)}` },
        { text: `${t.totalExpenses}: ${formatByLanguage(reportData.summary.totalExpenses, language)}` },
        { text: `${t.balance}: ${formatByLanguage(reportData.summary.balance, language)}` },
        { text: `${t.savings}: ${formatByLanguage(reportData.summary.savings, language)}` },
        { text: `${t.savingsRate}: ${reportData.summary.savingsRate.toFixed(2)}%`, margin: [0, 0, 0, 8] },
        { text: `${t.txCount}: ${reportData.transactions.length}` },
        { text: `${t.categoryCount}: ${reportData.categories.length}` },
        { text: `${t.recCount}: ${reportData.recommendations.length}`, margin: [0, 0, 0, 12] },
        { text: t.topCategories, style: 'sectionTitle' },
        ...(categoryLines.length > 0 ? categoryLines : [{ text: '-' }]),
        { text: '', margin: [0, 0, 0, 6] },
        { text: t.recentTransactions, style: 'sectionTitle' },
        ...(transactionLines.length > 0 ? transactionLines : [{ text: '-' }]),
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 10],
        },
        sectionTitle: {
          fontSize: 12,
          bold: true,
          margin: [0, 6, 0, 6],
        },
      },
    };

    const blob = await createPdfBlob(docDefinition);
    saveAs(blob, `${localizedFilename}_${formatDate(now, 'dd-MM-yyyy')}.pdf`);
  } catch (err) {
    console.error('Ошибка генерации PDF отчёта', err);
    throw err;
  }
};
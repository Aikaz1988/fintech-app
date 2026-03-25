import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Download, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { BudgetProgress, ReportData, TransactionFilters } from '@/types';
import * as analyticsService from '@/services/analytics.service';
import * as budgetService from '@/services/budgets.service';
import * as transactionsService from '@/services/transactions.service';
import {
  exportReportToExcel,
  exportTransactionsToCSV,
  generatePDFReport,
} from '@/services/export.service';
import { CSVExport } from './CSVExport';
import { PDFExport } from './PDFExport';
import { formatCurrency, formatDateRange } from '@/utils/formatters';

type ReportPeriod = 'month' | 'quarter' | 'year' | 'custom';

const PERIOD_OPTIONS: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'month', label: 'Текущий месяц' },
  { value: 'quarter', label: 'Последний квартал' },
  { value: 'year', label: 'Текущий год' },
  { value: 'custom', label: 'Произвольный период' },
];

const toIsoDate = (date: Date): string => date.toISOString().split('T')[0];

const getDateRange = (period: ReportPeriod, customFrom?: string, customTo?: string) => {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (period === 'month') {
    start.setDate(1);
  } else if (period === 'quarter') {
    start.setMonth(start.getMonth() - 2, 1);
  } else if (period === 'year') {
    start.setMonth(0, 1);
  } else {
    return {
      dateFrom: customFrom || toIsoDate(start),
      dateTo: customTo || toIsoDate(end),
    };
  }

  return {
    dateFrom: toIsoDate(start),
    dateTo: toIsoDate(end),
  };
};

export const ReportGenerator: React.FC = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const { user } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const { dateFrom, dateTo } = useMemo(
    () => getDateRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const canLoad = period !== 'custom' || (customFrom && customTo);

  const loadReport = async () => {
    if (!user || !canLoad) return;

    try {
      setLoading(true);
      setError(null);

      const filters: TransactionFilters = {
        date_from: dateFrom,
        date_to: dateTo,
      };

      const [summary, categories, monthlyTrend, recommendations, txResult, budgets] = await Promise.all([
        analyticsService.getSummaryStats(user.id),
        analyticsService.getCategoryStats(user.id, 'expense'),
        analyticsService.getMonthlyTrend(user.id, 6),
        analyticsService.getRecommendations(user.id),
        transactionsService.getTransactions(user.id, filters, { page: 1, limit: 500 }),
        budgetService.getBudgets(user.id, {
          period: period === 'custom' ? 'custom' : 'month',
          date_from: period === 'custom' ? dateFrom : undefined,
          date_to: period === 'custom' ? dateTo : undefined,
          month: new Date().toISOString().slice(0, 7),
        }),
      ]);

      const budgetsProgress: BudgetProgress[] = budgets.map((budget) => {
        const spent = Number(budget.spent_amount || budget.spent || 0);
        const limit = Number(budget.limit_amount || budget.limit || 0);
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;

        return {
          budget,
          spent,
          limit,
          percentage,
          status: percentage >= 100 ? 'critical' : percentage >= 80 ? 'warning' : 'normal',
        };
      });

      setReportData({
        summary,
        categories,
        monthlyTrend,
        recommendations,
        transactions: txResult.data,
        budgets: budgetsProgress,
      });
    } catch (err) {
      console.error(err);
      setError('Не удалось сформировать отчет');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvExport = () => {
    if (!reportData) return;
    exportTransactionsToCSV(reportData.transactions, 'report_transactions');
  };

  const handleExcelExport = () => {
    if (!reportData) return;
    exportReportToExcel(reportData, 'financial_report');
  };

  const handlePdfExport = async () => {
    if (!reportData) return;
    await generatePDFReport(reportData, 'financial_report');
  };

  return (
    <Box data-cmp="ReportGenerator">
      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mb: 2 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontSize: { xs: '1.5rem', sm: '1.25rem' } }}>
            Параметры отчета
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', mb: 1.5 }}>
            <TextField
              size="small"
              select
              label="Период"
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              sx={{ minWidth: { xs: '100%', sm: 240 } }}
            >
              {PERIOD_OPTIONS.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>

            {period === 'custom' && (
              <TextField
                size="small"
                label="Дата с"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            )}

            {period === 'custom' && (
              <TextField
                size="small"
                label="Дата по"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={16} />}
              onClick={loadReport}
              disabled={loading || !canLoad}
              size="small"
              sx={{ minHeight: 30 }}
            >
              Сформировать
            </Button>
            <CSVExport onExport={handleCsvExport} disabled={!reportData || loading} />
            <Button
              variant="outlined"
              startIcon={<Download size={18} />}
              onClick={handleExcelExport}
              disabled={!reportData || loading}
              size="small"
              sx={{ minHeight: 30 }}
            >
              Excel
            </Button>
            <PDFExport onExport={handlePdfExport} disabled={!reportData || loading} />
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {reportData && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Typography color="text.secondary">Доходы</Typography>
                <Typography variant="h6" color="success.main">
                  {formatCurrency(reportData.summary.totalIncome)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Typography color="text.secondary">Расходы</Typography>
                <Typography variant="h6" color="error.main">
                  {formatCurrency(reportData.summary.totalExpenses)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Typography color="text.secondary">Баланс</Typography>
                <Typography variant="h6">{formatCurrency(reportData.summary.balance)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600}>
                  Предпросмотр отчета
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Период: {formatDateRange(dateFrom, dateTo)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Транзакций: {reportData.transactions.length}, категорий: {reportData.categories.length}, рекомендаций: {reportData.recommendations.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

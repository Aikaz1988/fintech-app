import React, { useState } from 'react';
import { Box, Typography, Button, TextField, MenuItem, Alert } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Plus } from 'lucide-react';
import { useBudgets } from '@/hooks/useBudgets';
import { BudgetList } from '@/components/Budgets/BudgetList';
import { BudgetForm } from '@/components/Budgets/BudgetForm';
import { BudgetAlerts } from '@/components/Budgets/BudgetAlerts';
import type { Budget, BudgetFormData, BudgetPeriod } from '@/types';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';

const DEFAULT_MONTH = new Date().toISOString().slice(0, 7);

const PERIOD_OPTIONS: Array<{ value: BudgetPeriod; key: TranslationKey }> = [
  { value: 'today', key: 'pages.budgets.period.today' },
  { value: 'yesterday', key: 'pages.budgets.period.yesterday' },
  { value: 'week', key: 'pages.budgets.period.week' },
  { value: 'month', key: 'pages.budgets.period.month' },
  { value: 'last30days', key: 'pages.budgets.period.last30days' },
  { value: 'custom', key: 'pages.budgets.period.custom' },
  { value: 'all', key: 'pages.budgets.period.all' },
];

const Budgets: React.FC = () => {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const { budgets, loading, error, addBudget, updateBudget, deleteBudget, loadBudgets } = useBudgets();
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('month');
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  React.useEffect(() => {
    void loadBudgets({
      month,
      period,
      date_from: period === 'custom' ? dateFrom : undefined,
      date_to: period === 'custom' ? dateTo : undefined,
    });
  }, [period, month, dateFrom, dateTo, loadBudgets]);

  const handleAddClick = () => {
    setEditingBudget(undefined);
    setFormError('');
    setFormOpen(true);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormError('');
    setFormOpen(true);
  };

  const handleDelete = async (budgetId: string) => {
    if (confirm(t('pages.budgets.confirmDelete'))) {
      try {
        await deleteBudget(budgetId);
      } catch (error) {
        console.error(t('pages.budgets.deleteError'), error);
      }
    }
  };

  const handleFormSubmit = async (data: BudgetFormData) => {
    setFormLoading(true);
    setFormError('');
    try {
      let result;
      if (editingBudget) {
        result = await updateBudget(editingBudget.id, data);
      } else {
        result = await addBudget(data);
      }

      if (!result?.success) {
        throw new Error(result?.error || t('pages.budgets.saveError'));
      }

      setFormOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('pages.budgets.saveFormError'));
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 }, flexGrow: 1 }} data-cmp="Budgets">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: isCompactMobile ? 1 : 1.5, sm: 2 }, mb: { xs: isCompactMobile ? 2 : 4, sm: 4 } }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '2.5rem' }, lineHeight: 1.2 }}>{t('pages.budgets.title')}</Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '1rem' } }}>{t('pages.budgets.subtitle')}</Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus size={isMobile ? 16 : 20} />}
          onClick={handleAddClick}
          size={isMobile ? 'small' : 'medium'}
          sx={{ height: { xs: isCompactMobile ? 24 : 30, sm: 44 }, minHeight: { xs: isCompactMobile ? 24 : 30, sm: 44 }, px: { xs: isCompactMobile ? 0.75 : 1.5, sm: 2 }, py: { xs: 0.1, sm: 1 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '1rem' }, lineHeight: 1 }}
        >
          {t('pages.budgets.newBudget')}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: { xs: isCompactMobile ? 1 : 1.5, sm: 1.5 }, mb: { xs: isCompactMobile ? 1.5 : 2, sm: 2 }, flexWrap: 'wrap' }}>
        <TextField
          select
          label={t('pages.budgets.periodLabel')}
          value={period}
          onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
          size={isCompactMobile ? 'small' : 'medium'}
          sx={{ minWidth: { xs: '100%', sm: 240 } }}
        >
          {PERIOD_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t(option.key)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label={t('pages.budgets.monthLabel')}
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          size={isCompactMobile ? 'small' : 'medium'}
          InputLabelProps={{ shrink: true }}
          helperText={t('pages.budgets.monthHelper')}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        />

        {period === 'custom' && (
          <TextField
            label={t('pages.budgets.from')}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            size={isCompactMobile ? 'small' : 'medium'}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          />
        )}

        {period === 'custom' && (
          <TextField
            label={t('pages.budgets.to')}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            size={isCompactMobile ? 'small' : 'medium'}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <BudgetAlerts />
      </Box>

      <BudgetList
        budgets={budgets}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <BudgetForm
        open={formOpen}
        budget={editingBudget}
        loading={formLoading}
        error={formError}
        onSubmit={handleFormSubmit}
        onClose={() => setFormOpen(false)}
      />
    </Box>
  );
};

export default Budgets;

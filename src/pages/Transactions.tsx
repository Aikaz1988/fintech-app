import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Card, CardContent, Chip, Button, Alert, Collapse } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Plus } from 'lucide-react';
import type { Category, TransactionFormData } from '@/types';
import { useTransactions } from '@/hooks/useTransactions';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCategories } from '@/hooks/useCategories';
import { TransactionList } from '@/components/Transactions/TransactionList';
import { TransactionForm } from '@/components/Transactions/TransactionForm';
import { TransactionFilters } from '@/components/Transactions/TransactionFilters';
import { CategoryManager } from '@/components/Transactions/CategoryManager';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/utils/constants';
import { useI18n } from '@/i18n';

const ADVANCED_FILTERS_STORAGE_KEY = 'transactions_advanced_filters_open';

const Transactions: React.FC = () => {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const {
    transactions,
    loading,
    total,
    page,
    hasMore,
    filters,
    setFilters,
    loadTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();
  const { accounts } = useBankAccounts();
  const {
    categories: dbCategories,
    loading: categoriesLoading,
    addCategory,
    editCategory,
    removeCategory,
  } = useCategories();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(() => {
    if (typeof window === 'undefined') return false;

    const stored = window.localStorage.getItem(ADVANCED_FILTERS_STORAGE_KEY);
    return stored === 'true';
  });
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

  useEffect(() => {
    window.localStorage.setItem(ADVANCED_FILTERS_STORAGE_KEY, String(isAdvancedFiltersOpen));
  }, [isAdvancedFiltersOpen]);

  const categories = useMemo<Category[]>(() => {
    const expense = DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, id: c.name, created_at: '' } as Category));
    const income = DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, id: c.name, created_at: '' } as Category));
    const map = new Map<string, Category>();
    [...expense, ...income, ...dbCategories].forEach((category) => {
      const key = `${category.name}-${category.type}`;
      map.set(key, category);
    });
    return Array.from(map.values());
  }, [dbCategories]);

  const handleSubmit = async (data: TransactionFormData) => {
    const result = editingTransaction
      ? await updateTransaction(editingTransaction.id, data)
      : await addTransaction(data);

    if (!result.success) {
      throw new Error(result.error || t('pages.transactions.operationSaveError'));
    }

    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const handleEdit = (tx: any) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  const activeFilter = filters.type || 'all';
  const activeAdvancedFiltersCount = [
    filters.search,
    filters.category_id,
    filters.type,
    filters.date_from,
    filters.date_to,
    filters.amount_min !== undefined ? 'amount_min' : '',
    filters.amount_max !== undefined ? 'amount_max' : '',
    filters.is_imported !== undefined ? 'is_imported' : '',
  ].filter((value) => value !== '').length;
  const hasAdvancedFilters = activeAdvancedFiltersCount > 0;

  return (
    <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 }, flexGrow: 1 }} data-cmp="Transactions">
      <Box sx={{ mb: { xs: isCompactMobile ? 2 : 4, sm: 4 }, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: isCompactMobile ? 1 : 1.5, sm: 2 } }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '2.5rem' }, lineHeight: 1.2 }}>{t('pages.transactions.title')}</Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '1rem' } }}>{t('pages.transactions.subtitle')}</Typography>
        </Box>
        <Box sx={{ display: 'grid', gap: isCompactMobile ? 0.75 : 1, width: { xs: '100%', sm: 'auto' }, gridTemplateColumns: { xs: '1fr 1fr', sm: 'auto auto' } }}>
          <Button variant="outlined" onClick={() => setIsCategoriesOpen(true)} size={isMobile ? 'small' : 'medium'} sx={{ height: { xs: isCompactMobile ? 24 : 30, sm: 42 }, minHeight: { xs: isCompactMobile ? 24 : 30, sm: 42 }, px: { xs: isCompactMobile ? 0.75 : 1, sm: 2 }, py: { xs: 0.1, sm: 1 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '1rem' }, lineHeight: 1 }}>
            {t('pages.transactions.categories')}
          </Button>
          <Button variant="contained" startIcon={<Plus size={isMobile ? 16 : 18} />} onClick={() => setIsFormOpen(true)} size={isMobile ? 'small' : 'medium'} sx={{ height: { xs: isCompactMobile ? 24 : 30, sm: 42 }, minHeight: { xs: isCompactMobile ? 24 : 30, sm: 42 }, px: { xs: isCompactMobile ? 0.75 : 1, sm: 2 }, py: { xs: 0.1, sm: 1 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '1rem' }, lineHeight: 1 }}>
            {t('pages.transactions.newTransaction')}
          </Button>
        </Box>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mb: { xs: isCompactMobile ? 1.5 : 2, sm: 2 } }}>
        <CardContent sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: isAdvancedFiltersOpen ? 2 : 0, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Typography variant="h6" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '1.25rem' } }}>{t('pages.transactions.advancedFilters')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' }, flexWrap: 'nowrap' }}>
              {!isAdvancedFiltersOpen && hasAdvancedFilters && (
                <Chip
                  label={`${t('pages.transactions.activeFilters')}: ${activeAdvancedFiltersCount}`}
                  color="primary"
                  size="small"
                  variant="outlined"
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                />
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsAdvancedFiltersOpen((prev) => !prev)}
                sx={{ whiteSpace: 'nowrap', minHeight: { xs: isCompactMobile ? 24 : 30, sm: 32 }, px: { xs: isCompactMobile ? 0.75 : 1.25, sm: 1.5 }, fontSize: { xs: isCompactMobile ? '0.74rem' : '0.8rem', sm: '0.85rem' } }}
              >
                {isAdvancedFiltersOpen ? t('common.actions.hide') : t('common.actions.show')}
              </Button>
            </Box>
          </Box>

          <Collapse in={isAdvancedFiltersOpen}>
            <TransactionFilters
              filters={filters}
              categories={categories}
              onChange={setFilters}
              onReset={() => setFilters({})}
            />
          </Collapse>

          {!isAdvancedFiltersOpen && hasAdvancedFilters && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t('pages.transactions.filtersHint')}
            </Alert>
          )}

          {categoriesLoading && <Alert severity="info">{t('pages.transactions.categoriesLoading')}</Alert>}
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <Box sx={{ display: 'flex', gap: isCompactMobile ? 0.75 : 1, p: { xs: isCompactMobile ? 1.25 : 2, sm: 2 }, borderBottom: '1px solid rgba(0,0,0,0.08)', backgroundColor: 'rgba(248, 249, 250, 0.5)', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <Chip
            label={t('pages.transactions.allOperations')}
            color={activeFilter === 'all' ? 'primary' : 'default'}
            variant={activeFilter === 'all' ? 'filled' : 'outlined'}
            sx={{ borderRadius: 1, minHeight: { xs: isCompactMobile ? 22 : 28, sm: 32 }, '& .MuiChip-label': { px: { xs: isCompactMobile ? 0.75 : 1, sm: 1.25 }, fontSize: { xs: isCompactMobile ? '0.72rem' : '0.78rem', sm: '0.875rem' } } }}
            onClick={() => setFilters({})}
          />
          <Chip
            label={t('pages.transactions.income')}
            color={activeFilter === 'income' ? 'primary' : 'default'}
            variant={activeFilter === 'income' ? 'filled' : 'outlined'}
            sx={{ borderRadius: 1, minHeight: { xs: isCompactMobile ? 22 : 28, sm: 32 }, '& .MuiChip-label': { px: { xs: isCompactMobile ? 0.75 : 1, sm: 1.25 }, fontSize: { xs: isCompactMobile ? '0.72rem' : '0.78rem', sm: '0.875rem' } } }}
            onClick={() => setFilters({ ...filters, type: 'income' })}
          />
          <Chip
            label={t('pages.transactions.expenses')}
            color={activeFilter === 'expense' ? 'primary' : 'default'}
            variant={activeFilter === 'expense' ? 'filled' : 'outlined'}
            sx={{ borderRadius: 1, minHeight: { xs: isCompactMobile ? 22 : 28, sm: 32 }, '& .MuiChip-label': { px: { xs: isCompactMobile ? 0.75 : 1, sm: 1.25 }, fontSize: { xs: isCompactMobile ? '0.72rem' : '0.78rem', sm: '0.875rem' } } }}
            onClick={() => setFilters({ ...filters, type: 'expense' })}
          />
        </Box>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }}>
            <TransactionList
              transactions={transactions}
              loading={loading}
              onEdit={handleEdit}
              onDelete={async (id) => {
                await deleteTransaction(id);
              }}
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(nextPage) => {
                if (nextPage < 1) return;
                if (!hasMore && nextPage > page) return;
                void loadTransactions(nextPage);
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleSubmit}
        editTransaction={editingTransaction}
        categories={categories}
        bankAccounts={accounts}
      />

      <CategoryManager
        open={isCategoriesOpen}
        categories={categories}
        loading={categoriesLoading}
        onClose={() => setIsCategoriesOpen(false)}
        onCreate={async (payload) => {
          const result = await addCategory(payload);
          if (!result.success) throw new Error(result.error || t('pages.transactions.categoryCreateError'));
        }}
        onUpdate={async (id, payload) => {
          const result = await editCategory(id, payload);
          if (!result.success) throw new Error(result.error || t('pages.transactions.categoryUpdateError'));
        }}
        onDelete={async (id) => {
          const result = await removeCategory(id);
          if (!result.success) throw new Error(result.error || t('pages.transactions.categoryDeleteError'));
        }}
      />
    </Box>
  );
};

export default Transactions;


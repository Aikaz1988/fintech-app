import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress } from '@mui/material';
import { Plus, Bitcoin, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { TransactionForm } from '@/components/Transactions/TransactionForm';
import { supabase } from '@/lib/supabase';
import type { BankAccountFormData, Category, TransactionFormData } from '@/types';
import { validateBankAccount } from '@/utils/validators';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, CURRENCIES } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';
import { useI18n } from '@/i18n';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const { user } = useAuth();
  const { transactions, loading: transactionsLoading, loadTransactions, addTransaction } = useTransactions();
  const { accounts, loadAccounts, addAccount } = useBankAccounts();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});

  const [accountForm, setAccountForm] = useState<BankAccountFormData>({
    account_name: '',
    bank_name: '',
    account_number: '',
    balance: 0,
    currency: 'RUB',
  });

  const transactionCategories = useMemo<Category[]>(() => {
    const expense = DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, id: c.name, created_at: '' } as Category));
    const income = DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, id: c.name, created_at: '' } as Category));
    return [...expense, ...income];
  }, []);

  const recentTransactions = transactions.slice(0, 5);
  const topAccounts = accounts.slice(0, 3);

  const summary = useMemo(() => {
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return { totalBalance, income, expense };
  }, [accounts, transactions]);

  useEffect(() => {
    if (!user) return;

    void loadAccounts();
    void loadTransactions(1);

    const channel = supabase
      .channel(`dashboard-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => {
          void loadTransactions(1);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bank_accounts', filter: `user_id=eq.${user.id}` },
        () => {
          void loadAccounts();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, loadAccounts, loadTransactions]);

  const handleAccountChange = (field: keyof BankAccountFormData, value: string | number) => {
    setAccountForm((prev) => ({ ...prev, [field]: value }));
    setAccountErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleCreateAccount = async () => {
    const validation = validateBankAccount(accountForm);
    if (!validation.isValid) {
      setAccountErrors(validation.errors);
      return;
    }

    setAccountSaving(true);
    const result = await addAccount(accountForm);
    setAccountSaving(false);

    if (!result.success) {
      setAccountErrors({ form: result.error || t('pages.dashboard.accountCreateError') });
      return;
    }

    setIsAccountModalOpen(false);
    setAccountErrors({});
    setAccountForm({
      account_name: '',
      bank_name: '',
      account_number: '',
      balance: 0,
      currency: 'RUB',
    });
  };

  const handleCreateTransaction = async (data: TransactionFormData) => {
    const result = await addTransaction(data);
    if (!result.success) {
      throw new Error(result.error || t('pages.dashboard.transactionCreateError'));
    }
    setIsTransactionModalOpen(false);
  };

  return (
    <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 }, flexGrow: 1 }} data-cmp="Dashboard">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: isCompactMobile ? 1: 1.5, sm: 2 }, mb: { xs: isCompactMobile ? 2 : 4, sm: 4 } }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem': '1.5rem', sm: '2.5rem' }, lineHeight: 1.2 }}>{t('pages.dashboard.title')}</Typography>
        <Box sx={{ display: 'grid', gap: isCompactMobile ? 0.75 : 1, width: { xs: '100%', sm: 'auto' }, gridTemplateColumns: { xs: '1fr 1fr', sm: 'auto auto' } }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Plus size={isMobile ? 16 : 20} />}
            onClick={() => setIsAccountModalOpen(true)}
            size={isMobile ? 'small' : 'medium'}
            sx={{ height: { xs: isCompactMobile ? 24 : 30, sm: 44 }, minHeight: { xs: isCompactMobile ? 24 : 30, sm: 44 }, px: { xs : isCompactMobile ? 0.75 : 1, sm: 2 }, py: { xs: 0.1, sm: 1 }, fontSize: { xs: isCompactMobile ? '0.76rem': '0.82rem', sm: '1rem' }, lineHeight: 1 }}
          >
            {t('pages.dashboard.addAccount')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={isMobile ? 16 : 20} />}
            onClick={() => setIsTransactionModalOpen(true)}
            size={isMobile ? 'small' : 'medium'}
            sx={{ height: { xs: isCompactMobile ? 24 : 30, sm: 44 }, minHeight: { xs: isCompactMobile ? 24 : 30, sm: 44 }, px: { xs: isCompactMobile ? 0.75 : 1, sm: 2 }, py: { xs: 0.1, sm: 1 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '1rem' }, lineHeight: 1 }}
          >
            {t('pages.dashboard.newTransaction')}
          </Button>
        </Box>
      </Box>

      {/* Multi-currency & Crypto Overview */}
      <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: isCompactMobile ? '1.35rem': '1.5rem', sm: '1.25rem' } }}>{t('pages.dashboard.accountsTitle')}</Typography>
      <Grid container spacing={{ xs: 1.5, sm: 3 }} sx={{ mb: { xs: 2.5, sm: 4 } }}>
        {topAccounts.length === 0 ? (
          <Grid item xs={12}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ textAlign: 'center', py: { xs: 1.1, sm: 2 }, px: { xs: 1.4, sm: 2 } }}>
                <Typography color="text.secondary">{t('pages.dashboard.noAccounts')}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          topAccounts.map((account, idx) => {
            const isCrypto = account.currency !== 'RUB' && account.currency !== 'USD' && account.currency !== 'EUR';
            return (
              <Grid item xs={12} md={4} key={account.id}>
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    background:
                      isCrypto
                        ? 'linear-gradient(135deg, rgba(255, 235, 59, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%)'
                        : 'white',
                  }}
                >
                  <CardContent sx={{ py: { xs: isCompactMobile ? 1 : 1.2, sm: 2 }, px: { xs: isCompactMobile ? 1.25 : 1.5, sm: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: { xs: 1, sm: 2 } }}>
                      <Typography color="text.secondary">{account.account_name}</Typography>
                      <div
                        style={{
                          padding: '6px',
                          backgroundColor:
                            account.currency === 'RUB'
                              ? 'rgba(33, 150, 243, 0.1)'
                              : account.currency === 'USD'
                                ? 'rgba(76, 175, 80, 0.1)'
                                : 'rgba(255, 152, 0, 0.2)',
                          borderRadius: '8px',
                        }}
                      >
                        {account.currency === 'RUB' ? (
                          <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'rgb(33, 150, 243)' }}>₽</span>
                        ) : account.currency === 'USD' ? (
                          <DollarSign size={20} color="rgb(76, 175, 80)" />
                        ) : (
                          <Bitcoin size={20} color="rgb(255, 152, 0)" />
                        )}
                      </div>
                    </Box>

                    <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.75rem' : '2rem', sm: '2.125rem' }, lineHeight: 1.2 }}>
                      {formatCurrency(account.balance, account.currency)}
                    </Typography>

                    <Typography
                      variant="body2"
                      color={idx % 2 === 0 ? 'success.main' : 'error.main'}
                      sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}
                    >
                      {idx % 2 === 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {account.bank_name || t('pages.dashboard.defaultBankAccount')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      <Grid container spacing={{ xs: 1.5, sm: 3 }} sx={{ mb: { xs: 2.5, sm: 4 } }}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ py: { xs: isCompactMobile ? 1 : 1.1, sm: 2 }, px: { xs: isCompactMobile ? 1.2 : 1.4, sm: 2 } }}>
              <Typography color="text.secondary" sx={{ mb: 1 }}>{t('pages.dashboard.totalBalance')}</Typography>
              <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.15rem' : '1.3rem', sm: '1.5rem' } }}>{formatCurrency(summary.totalBalance)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ py: { xs: isCompactMobile ? 1 : 1.1, sm: 2 }, px: { xs: isCompactMobile ? 1.2 : 1.4, sm: 2 } }}>
              <Typography color="text.secondary" sx={{ mb: 1 }}>{t('pages.dashboard.income')}</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main" sx={{ fontSize: { xs: isCompactMobile ? '1.15rem' : '1.3rem', sm: '1.5rem' } }}>+ {formatCurrency(summary.income)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ py: { xs: isCompactMobile ? 1 : 1.1, sm: 2 }, px: { xs: isCompactMobile ? 1.2 : 1.4, sm: 2 } }}>
              <Typography color="text.secondary" sx={{ mb: 1 }}>{t('pages.dashboard.expenses')}</Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main" sx={{ fontSize: { xs: isCompactMobile ? '1.15rem' : '1.3rem', sm: '1.5rem' } }}>- {formatCurrency(summary.expense)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Statistics */}
      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ py: { xs: isCompactMobile ? 1.1 : 1.3, sm: 2 }, px: { xs: isCompactMobile ? 1.25 : 1.5, sm: 2 } }}>
          <Typography variant="h6" sx={{ mb: { xs: isCompactMobile ? 1.1 : 1.5, sm: 3 }, fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '1.25rem' } }}>{t('pages.dashboard.recentTransactions')}</Typography>
          {transactionsLoading ? (
            <Box sx={{ py: { xs: 2, sm: 4 }, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : recentTransactions.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: { xs: 1, sm: 2 } }}>{t('pages.dashboard.noTransactions')}</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isCompactMobile ? 1.25 : 2 }}>
              {recentTransactions.map((tx, idx) => (
                <React.Fragment key={tx.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '0.9rem' : '1rem', sm: '1rem' } }}>{tx.merchant || tx.description || t('pages.dashboard.defaultOperation')}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.75rem' : '0.875rem', sm: '0.875rem' } }}>
                        {tx.category?.name || (tx.type === 'income' ? t('pages.dashboard.incomeLabel') : t('pages.dashboard.expenseLabel'))}
                      </Typography>
                    </Box>
                    <Typography fontWeight="bold" color={tx.type === 'income' ? 'success.main' : 'error.main'} sx={{ fontSize: { xs: isCompactMobile ? '0.9rem' : '1rem', sm: '1rem' } }}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(Number(tx.amount)))}
                    </Typography>
                  </Box>
                  {idx !== recentTransactions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Box>
          )}
          <Button sx={{ mt: { xs: isCompactMobile ? 1 : 1.2, sm: 3 }, minHeight: { xs: isCompactMobile ? 26 : 30, sm: 36 }, fontSize: { xs: isCompactMobile ? '0.8rem' : '0.875rem', sm: '0.875rem' } }} fullWidth onClick={() => navigate('/transactions')}>
            {t('common.actions.viewAll')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('pages.dashboard.addBankAccountDialogTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label={t('pages.dashboard.accountNameLabel')}
            value={accountForm.account_name}
            onChange={(e) => handleAccountChange('account_name', e.target.value)}
            error={!!accountErrors.account_name}
            helperText={accountErrors.account_name}
            fullWidth
          />
          <TextField
            label={t('pages.dashboard.bankLabel')}
            value={accountForm.bank_name || ''}
            onChange={(e) => handleAccountChange('bank_name', e.target.value)}
            error={!!accountErrors.bank_name}
            helperText={accountErrors.bank_name}
            fullWidth
          />
          <TextField
            label={t('pages.dashboard.accountNumberLabel')}
            value={accountForm.account_number || ''}
            onChange={(e) => handleAccountChange('account_number', e.target.value)}
            error={!!accountErrors.account_number}
            helperText={accountErrors.account_number}
            fullWidth
          />
          <TextField
            label={t('pages.dashboard.initialBalanceLabel')}
            type="number"
            value={accountForm.balance ?? 0}
            onChange={(e) => handleAccountChange('balance', parseFloat(e.target.value) || 0)}
            error={!!accountErrors.balance}
            helperText={accountErrors.balance}
            fullWidth
          />
          <TextField
            select
            label={t('pages.dashboard.currencyLabel')}
            value={accountForm.currency || 'RUB'}
            onChange={(e) => handleAccountChange('currency', e.target.value)}
            fullWidth
          >
            {CURRENCIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>{c.value}</MenuItem>
            ))}
          </TextField>
          {accountErrors.form && (
            <Typography color="error" variant="body2">{accountErrors.form}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsAccountModalOpen(false)}>{t('common.actions.cancel')}</Button>
          <Button variant="contained" onClick={handleCreateAccount} disabled={accountSaving}>
            {accountSaving ? t('common.actions.saving') : t('common.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <TransactionForm
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSubmit={handleCreateTransaction}
        categories={transactionCategories}
        bankAccounts={accounts}
      />
    </Box>
  );
};

export default Dashboard;
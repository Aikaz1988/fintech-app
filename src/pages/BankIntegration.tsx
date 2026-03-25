import React, { useState } from 'react';
import { Alert, Box, Snackbar, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { BankAccount, TransactionFormData } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { BankConnection } from '@/components/BankIntegration/BankConnection';
import { BankAccountsList } from '@/components/BankIntegration/BankAccountsList';
import { ImportTransactions } from '@/components/BankIntegration/ImportTransactions';
import { createTransactionsBulk } from '@/services/transactions.service';

const BankIntegration: React.FC = () => {
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const { user } = useAuth();
  const { accounts, addAccount } = useBankAccounts();
  const { loadTransactions } = useTransactions();
  const [fetchedAccounts, setFetchedAccounts] = useState<BankAccount[]>([]);
  const [notice, setNotice] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
    key: number;
  }>({
    open: false,
    message: '',
    severity: 'success',
    key: 0,
  });

  const showNotice = (message: string, severity: 'success' | 'error') => {
    setNotice({
      open: true,
      message,
      severity,
      key: Date.now(),
    });
  };

  if (!user) {
    return (
      <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 } }}>
        <Alert severity="warning">Требуется авторизация</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 },
        display: 'grid',
        gap: { xs: isCompactMobile ? 1.5 : 2, sm: 2.5 },
        overflowX: 'hidden',
        '& > *': { minWidth: 0 },
      }}
      data-cmp="BankIntegrationPage"
    >
      <Box>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '2.5rem' }, lineHeight: 1.2 }}>Интеграция с банком</Typography>
        <Typography color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '1rem' } }}>Подключение банков, импорт операций и подтверждение сохранения</Typography>
      </Box>

      <BankConnection userId={user.id} onConnected={setFetchedAccounts} />

      <BankAccountsList
        fetchedAccounts={fetchedAccounts}
        onAddAccount={async (payload) => {
          const result = await addAccount(payload);
          if (result.success) {
            showNotice(`Счет «${payload.account_name}» добавлен в приложение`, 'success');
          } else {
            showNotice(result.error || `Не удалось добавить счет «${payload.account_name}»`, 'error');
          }
        }}
      />

      <ImportTransactions
        accounts={accounts}
        onImportTransactionsBulk={async (items: TransactionFormData[]) => {
          const result = await createTransactionsBulk(
            user.id,
            items.map((item) => ({ ...item, type: item.type }))
          );

          if (!result.success) {
            return {
              success: false,
              imported: 0,
              error: result.error || 'Ошибка массового импорта',
            };
          }

          await loadTransactions(1);

          return {
            success: true,
            imported: result.data?.length || 0,
          };
        }}
      />

      <Snackbar
        key={notice.key}
        open={notice.open}
        autoHideDuration={2200}
        onClose={() => setNotice((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: isCompactMobile ? 'center' : 'right' }}
      >
        <Alert
          severity={notice.severity}
          variant="filled"
          onClose={() => setNotice((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BankIntegration;

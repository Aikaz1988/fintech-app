import React from 'react';
import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { BankAccount, BankAccountFormData } from '@/types';

interface BankAccountsListProps {
  fetchedAccounts: BankAccount[];
  onAddAccount: (data: BankAccountFormData) => Promise<void>;
}

export const BankAccountsList: React.FC<BankAccountsListProps> = ({ fetchedAccounts, onAddAccount }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');

  if (fetchedAccounts.length === 0) {
    return null;
  }

  if (isMobile) {
    return (
      <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 2 }, width: '100%', minWidth: 0, overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ mb: { xs: isCompactMobile ? 1.1 : 1.5, sm: 1.5 }, fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '1.25rem' } }}>Счета, полученные из банка</Typography>
        <Box sx={{ display: 'grid', gap: isCompactMobile ? 1 : 1.25 }}>
          {fetchedAccounts.map((account) => (
            <Paper key={account.id} variant="outlined" sx={{ p: { xs: isCompactMobile ? 1 : 1.25, sm: 1.25 } }}>
              <Typography fontWeight={600} sx={{ mb: 0.5, fontSize: { xs: isCompactMobile ? '0.88rem' : '0.95rem', sm: '0.95rem' } }}>{account.account_name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '0.875rem' } }}>{account.bank_name || 'Банк не указан'}</Typography>
              <Typography sx={{ mt: 0.6, mb: 1, fontSize: { xs: isCompactMobile ? '0.84rem' : '0.92rem', sm: '0.92rem' } }}>
                {Number(account.balance).toLocaleString('ru-RU')} {account.currency}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                fullWidth
                sx={{ minHeight: { xs: isCompactMobile ? 24 : 32, sm: 32 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '0.8125rem' } }}
                onClick={() =>
                  void onAddAccount({
                    account_name: account.account_name,
                    bank_name: account.bank_name || undefined,
                    account_number: account.account_number || undefined,
                    balance: Number(account.balance),
                    currency: account.currency,
                  })
                }
              >
                Добавить
              </Button>
            </Paper>
          ))}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, width: '100%', minWidth: 0 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Счета, полученные из банка</Typography>
      <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Банк</TableCell>
              <TableCell align="right">Баланс</TableCell>
              <TableCell align="center">Действие</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fetchedAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.account_name}</TableCell>
                <TableCell>{account.bank_name}</TableCell>
                <TableCell align="right">{Number(account.balance).toLocaleString('ru-RU')} {account.currency}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'inline-flex' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ height: 40, minHeight: 40, px: 2 }}
                      onClick={() =>
                        void onAddAccount({
                          account_name: account.account_name,
                          bank_name: account.bank_name || undefined,
                          account_number: account.account_number || undefined,
                          balance: Number(account.balance),
                          currency: account.currency,
                        })
                      }
                    >
                      Добавить в приложение
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

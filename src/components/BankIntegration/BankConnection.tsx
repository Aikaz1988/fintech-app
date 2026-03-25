import React, { useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Snackbar, TextField, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { BankAccount } from '@/types';
import { connectToBank, fetchBankAccounts, getSupportedBanks } from '@/services/bankApi.service';

interface BankConnectionProps {
  userId: string;
  onConnected: (accounts: BankAccount[]) => void;
}

export const BankConnection: React.FC<BankConnectionProps> = ({ userId, onConnected }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const [bankName, setBankName] = useState(getSupportedBanks()[0]);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const validate = (): string | null => {
    const loginValue = login.trim();
    if (loginValue.length < 3) return 'Логин должен содержать минимум 3 символа';
    if (loginValue.length > 64) return 'Логин должен быть не длиннее 64 символов';
    if (!password || password.length < 6) return 'Пароль должен содержать минимум 6 символов';
    if (password.length > 128) return 'Пароль должен быть не длиннее 128 символов';
    return null;
  };

  const connect = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccessNotice('');
    setIsSuccessOpen(false);

    try {
      const result = await connectToBank(userId, bankName, { login: login.trim(), password });
      if (!result.success) {
        setError(result.error || 'Ошибка подключения');
        setLoading(false);
        return;
      }

      const accounts = await fetchBankAccounts(bankName);
      onConnected(accounts);

      const accountNames = accounts
        .map((account) => account.account_name)
        .filter(Boolean)
        .join(', ');

      const message = `Подключение к ${bankName} успешно. Получено счетов: ${accounts.length}${accountNames ? ` (${accountNames})` : ''}`;
      setSuccessNotice(message);
      setIsSuccessOpen(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ошибка подключения к банку';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 2.5 }, width: '100%', minWidth: 0, overflow: 'hidden' }}>
      <Typography variant="h6" sx={{ mb: { xs: isCompactMobile ? 1.25 : 2, sm: 2 }, fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '1.25rem' } }}>Подключение к банку</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gap: isCompactMobile ? 1 : 1.25, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr auto' }, width: '100%', minWidth: 0 }}>
        <TextField size="small" select label="Банк" value={bankName} onChange={(e) => setBankName(e.target.value)}>
          {getSupportedBanks().map((bank) => (
            <MenuItem key={bank} value={bank}>{bank}</MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Логин"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          error={!!error && login.trim().length < 3}
          helperText={login && login.trim().length < 3 ? 'Минимум 3 символа' : ' '}
        />
        <TextField
          size="small"
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!error && password.length > 0 && password.length < 6}
          helperText={password && password.length < 6 ? 'Минимум 6 символов' : ' '}
        />
        <Button
          variant="contained"
          size="small"
          sx={{ height: { xs: isCompactMobile ? 24 : 34, sm: 40 }, minHeight: { xs: isCompactMobile ? 24 : 34, sm: 40 }, px: { xs: isCompactMobile ? 1 : 2, sm: 2 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '0.875rem' }, width: { xs: '100%', md: 'auto' }, justifySelf: { xs: 'stretch', md: 'auto' } }}
          onClick={() => void connect()}
          disabled={loading}
        >
          {loading ? 'Подключение...' : 'Подключить'}
        </Button>
      </Box>

      <Snackbar
        open={isSuccessOpen}
        autoHideDuration={2200}
        onClose={() => setIsSuccessOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: isMobile ? 'center' : 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setIsSuccessOpen(false)}
          sx={{ width: '100%' }}
        >
          {successNotice}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

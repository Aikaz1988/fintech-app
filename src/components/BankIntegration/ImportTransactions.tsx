import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { BankAccount, ImportedTransaction, TransactionFormData } from '@/types';
import { importTransactionsFromBank } from '@/services/bankApi.service';

interface ImportTransactionsProps {
  accounts: BankAccount[];
  onImportTransactionsBulk: (items: TransactionFormData[]) => Promise<{ success: boolean; imported: number; error?: string }>;
}

export const ImportTransactions: React.FC<ImportTransactionsProps> = ({
  accounts,
  onImportTransactionsBulk,
}) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const [bankAccountId, setBankAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [preview, setPreview] = useState<ImportedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const validatePeriod = (): string | null => {
    if (!dateFrom || !dateTo) return 'Укажите даты периода';

    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return 'Некорректный формат даты';
    }

    if (from > to) return 'Дата "С" не может быть позже даты "По"';

    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) return 'Максимальный период импорта: 366 дней';

    return null;
  };

  const loadPreview = async () => {
    if (!bankAccountId) {
      setError('Выберите счет для импорта');
      return;
    }

    const periodError = validatePeriod();
    if (periodError) {
      setError(periodError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccessNotice('');
    setIsSuccessOpen(false);

    try {
      const result = await importTransactionsFromBank(bankAccountId, dateFrom, dateTo);
      if (!result.success) {
        setError(result.error || 'Ошибка импорта');
        setLoading(false);
        return;
      }

      if (result.transactions.length === 0) {
        setSuccessNotice('Нет операций за выбранный период');
        setIsSuccessOpen(true);
      }

      setPreview(result.transactions);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ошибка загрузки предпросмотра';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!bankAccountId || preview.length === 0) return;

    const periodError = validatePeriod();
    if (periodError) {
      setError(periodError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccessNotice('');
    setIsSuccessOpen(false);

    try {
      const payloads: TransactionFormData[] = preview.map((item) => ({
        amount: Math.abs(Number(item.amount)),
        type: Number(item.amount) >= 0 ? 'income' : 'expense',
        category_id: item.category_suggestion || 'Другое',
        bank_account_id: bankAccountId,
        date: item.date,
        description: item.description,
        merchant: item.merchant,
      }));

      const result = await onImportTransactionsBulk(payloads);
      if (!result.success) {
        setError(result.error || 'Импорт завершился с ошибкой');
        setLoading(false);
        return;
      }

      setSuccessNotice(`Импорт завершен. Добавлено ${result.imported} транзакций.`);
      setIsSuccessOpen(true);
      setPreview([]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ошибка подтверждения импорта';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 2.5 }, width: '100%', minWidth: 0, overflow: 'hidden' }}>
      <Typography variant="h6" sx={{ mb: { xs: isCompactMobile ? 1.25 : 2, sm: 2 }, fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '1.25rem' } }}>Импорт транзакций</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {accounts.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Для импорта добавьте хотя бы один счет в приложение.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: isCompactMobile ? 1 : 1.25, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr auto auto' }, mb: { xs: isCompactMobile ? 1.25 : 2, sm: 2 }, width: '100%', minWidth: 0 }}>
        <TextField
          size="small"
          select
          label="Счет"
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
        >
          <MenuItem value="">Выберите счет</MenuItem>
          {accounts.map((account) => (
            <MenuItem key={account.id} value={account.id}>
              {account.account_name} ({account.currency})
            </MenuItem>
          ))}
        </TextField>

        <TextField size="small" label="С" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" label="По" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />

        <Button size="small" sx={{ height: { xs: isCompactMobile ? 24 : 34, sm: 40 }, minHeight: { xs: isCompactMobile ? 24 : 34, sm: 40 }, px: { xs: isCompactMobile ? 1 : 1.5, sm: 1.5 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '0.8125rem' }, width: { xs: '100%', md: 'auto' } }} variant="outlined" onClick={() => void loadPreview()} disabled={loading || accounts.length === 0}>
          {loading ? 'Загрузка...' : 'Предпросмотр'}
        </Button>
        <Button size="small" sx={{ height: { xs: isCompactMobile ? 24 : 34, sm: 40 }, minHeight: { xs: isCompactMobile ? 24 : 34, sm: 40 }, px: { xs: isCompactMobile ? 1 : 1.5, sm: 1.5 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '0.8125rem' }, width: { xs: '100%', md: 'auto' } }} variant="contained" onClick={() => void confirmImport()} disabled={loading || preview.length === 0 || accounts.length === 0}>
          Подтвердить импорт
        </Button>
      </Box>

      {preview.length > 0 && (
        isMobile ? (
          <Box sx={{ display: 'grid', gap: isCompactMobile ? 0.8 : 1.1 }}>
            {preview.slice(0, 10).map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: { xs: isCompactMobile ? 0.9 : 1.1, sm: 1.1 } }}>
                <Typography sx={{ fontSize: { xs: isCompactMobile ? '0.78rem' : '0.86rem', sm: '0.86rem' }, color: 'text.secondary' }}>{item.date}</Typography>
                <Typography sx={{ mt: 0.25, mb: 0.4, fontSize: { xs: isCompactMobile ? '0.86rem' : '0.94rem', sm: '0.94rem' } }}>{item.description}</Typography>
                <Typography sx={{ fontSize: { xs: isCompactMobile ? '0.76rem' : '0.84rem', sm: '0.84rem' }, color: 'text.secondary' }}>{item.category_suggestion || 'Другое'}</Typography>
                <Typography sx={{ mt: 0.4, fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '0.9rem' }, color: item.amount < 0 ? 'error.main' : 'success.main' }}>
                  {item.amount < 0 ? '-' : '+'}{Math.abs(item.amount).toLocaleString('ru-RU')}
                </Typography>
              </Paper>
            ))}
          </Box>
        ) : (
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 620 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell>Категория</TableCell>
                  <TableCell align="right">Сумма</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.slice(0, 15).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.category_suggestion || 'Другое'}</TableCell>
                    <TableCell align="right" sx={{ color: item.amount < 0 ? 'error.main' : 'success.main' }}>
                      {item.amount < 0 ? '-' : '+'}{Math.abs(item.amount).toLocaleString('ru-RU')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )
      )}

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

import React, { useMemo } from 'react';
import { Alert, Box, Paper, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useNotifications } from '@/hooks/useNotifications';

export const BudgetAlerts: React.FC = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const { notifications, loading } = useNotifications();

  const budgetAlerts = useMemo(
    () => notifications.filter((item) => item.type === 'warning' || item.type === 'alert').slice(0, 5),
    [notifications]
  );

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1 : 1.25, sm: 2 } }}>
        <Typography color="text.secondary" sx={{ minHeight: { xs: isCompactMobile ? 20 : 22, sm: 26 }, fontSize: { xs: isCompactMobile ? '0.8rem' : '0.875rem', sm: '1rem' } }}>Загрузка уведомлений...</Typography>
      </Paper>
    );
  }

  if (budgetAlerts.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1 : 1.25, sm: 2 } }}>
        <Typography color="text.secondary" sx={{ minHeight: { xs: isCompactMobile ? 20 : 22, sm: 26 }, fontSize: { xs: isCompactMobile ? '0.8rem' : '0.875rem', sm: '1rem' } }}>Алертов бюджета нет</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: isCompactMobile ? 0.6 : isMobile ? 0.8 : 1.2 }}>
      {budgetAlerts.map((item) => (
        <Alert key={item.id} severity={item.type === 'alert' ? 'error' : 'warning'} sx={{ py: { xs: isCompactMobile ? 0.15 : 0.3, sm: 0.8 }, '& .MuiAlert-message': { py: { xs: isCompactMobile ? 0.1 : 0.2, sm: 0.4 }, fontSize: { xs: isCompactMobile ? '0.78rem' : '0.86rem', sm: '1rem' } } }}>
          {item.message}
        </Alert>
      ))}
    </Box>
  );
};

import React from 'react';
import { Box, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyticsDashboard } from '@/components/Analytics/AnalyticsDashboard';

const Analytics: React.FC = () => {
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const { user } = useAuth();

  if (!user) {
    return (
      <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 }, flexGrow: 1 }}>
        <Typography color="error">Пожалуйста, авторизуйтесь для просмотра аналитики</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 }, flexGrow: 1 }} data-cmp="Analytics">
      <Box sx={{ mb: { xs: isCompactMobile ? 2 : 4, sm: 4 } }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '2.5rem' }, lineHeight: 1.2 }}>Аналитика и отчеты</Typography>
        <Typography color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '1rem' } }}>Анализ ваших финансов и исторических тенденций</Typography>
      </Box>

      <AnalyticsDashboard userId={user.id} />
    </Box>
  );
};

export default Analytics;

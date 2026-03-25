import React from 'react';
import { Box, Typography } from '@mui/material';
import { ReportGenerator } from '@/components/Reports/ReportGenerator';
import { useI18n } from '@/i18n';

const Reports: React.FC = () => {
  const { t } = useI18n();

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, flexGrow: 1 }} data-cmp="ReportsPage">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.5rem' }, lineHeight: 1.2 }}>{t('pages.reports.title')}</Typography>
        <Typography color="text.secondary">
          {t('pages.reports.subtitle')}
        </Typography>
      </Box>

      <ReportGenerator />
    </Box>
  );
};

export default Reports;

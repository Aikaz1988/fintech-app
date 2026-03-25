import React from 'react';
import { Grid } from '@mui/material';
import { CategoryBreakdown } from './CategoryBreakdown';
import { IncomeExpenseChart } from './IncomeExpenseChart';
import { RecommendationsList } from './RecommendationsList';
import { SpendingPatterns } from './SpendingPatterns';

interface AnalyticsDashboardProps {
  userId: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId }) => {
  return (
    <Grid container spacing={{ xs: 1.5, sm: 4 }}>
      <Grid item xs={12}>
        <IncomeExpenseChart userId={userId} />
      </Grid>
      <Grid item xs={12}>
        <CategoryBreakdown userId={userId} />
      </Grid>
      <Grid item xs={12} md={6}>
        <SpendingPatterns userId={userId} />
      </Grid>
      <Grid item xs={12} md={6}>
        <RecommendationsList userId={userId} />
      </Grid>
    </Grid>
  );
};

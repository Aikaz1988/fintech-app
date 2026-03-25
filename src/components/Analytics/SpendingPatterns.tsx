import React, { useEffect, useMemo, useState } from 'react';
import { Paper, Typography, Grid, Box } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import * as transactionsService from '@/services/transactions.service';
import type { Transaction } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface SpendingPatternsProps {
  userId: string;
}

export const SpendingPatterns: React.FC<SpendingPatternsProps> = ({ userId }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const cardPadding = isCompactMobile ? 1.25 : isMobile ? 2 : 2.5;
  const titleMarginBottom = isCompactMobile ? 1.5 : isMobile ? 2 : 2.5;
  const titleFontSize = isCompactMobile ? '1.30rem' : isMobile ? '1.5rem' : '1.25rem';
  const gridSpacing = isCompactMobile ? 1.25 : isMobile ? 2 : 2;
  const labelFontSize = isCompactMobile ? '0.74rem' : isMobile ? '0.82rem' : '0.875rem';
  const valueFontSize = isCompactMobile ? '1rem' : isMobile ? '1.1rem' : '1.25rem';

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
      const to = now.toISOString().split('T')[0];
      const result = await transactionsService.getTransactions(
        userId,
        { type: 'expense', date_from: from, date_to: to },
        { page: 1, limit: 500 }
      );
      setTransactions(result.data);
    };

    void load();
  }, [userId]);

  const stats = useMemo(() => {
    if (transactions.length === 0) {
      return {
        avgExpense: 0,
        topCategory: 'Нет данных',
        totalExpenses: 0,
        frequentMerchant: 'Нет данных',
      };
    }

    const totalExpenses = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const daySet = new Set(transactions.map((tx) => tx.date));
    const avgExpense = daySet.size > 0 ? totalExpenses / daySet.size : totalExpenses;

    const categoryCount = new Map<string, number>();
    const merchantCount = new Map<string, number>();

    transactions.forEach((tx) => {
      const categoryName = tx.category?.name || 'Без категории';
      categoryCount.set(categoryName, (categoryCount.get(categoryName) || 0) + 1);

      const merchant = tx.merchant || 'Не указан';
      merchantCount.set(merchant, (merchantCount.get(merchant) || 0) + 1);
    });

    const topCategory = [...categoryCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Нет данных';
    const frequentMerchant = [...merchantCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Нет данных';

    return {
      avgExpense,
      topCategory,
      totalExpenses,
      frequentMerchant,
    };
  }, [transactions]);

  return (
    <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', p: cardPadding }}>
      <Typography variant="h6" sx={{ mb: titleMarginBottom, fontSize: titleFontSize }}>
        Паттерны расходов (90 дней)
      </Typography>

      <Grid container spacing={gridSpacing}>
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: labelFontSize }}>Средний расход в день</Typography>
            <Typography variant="h6" sx={{ fontSize: valueFontSize }}>{formatCurrency(stats.avgExpense)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: labelFontSize }}>Общий расход</Typography>
            <Typography variant="h6" sx={{ fontSize: valueFontSize }}>{formatCurrency(stats.totalExpenses)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: labelFontSize }}>Частая категория</Typography>
            <Typography variant="h6" sx={{ fontSize: valueFontSize }}>{stats.topCategory}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: labelFontSize }}>Частый мерчант</Typography>
            <Typography variant="h6" sx={{ fontSize: valueFontSize }}>{stats.frequentMerchant}</Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

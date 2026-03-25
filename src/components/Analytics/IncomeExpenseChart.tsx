import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import * as analyticsService from '@/services/analytics.service';
import type { MonthlyData } from '@/types';
import { formatCurrency, getMonthName } from '@/utils/formatters';

interface IncomeExpenseChartProps {
  userId: string;
}

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({ userId }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const monthlyData = await analyticsService.getMonthlyTrend(userId);
        // Format for display
        const formattedData = monthlyData.map((item) => ({
          ...item,
          monthDisplay: getMonthName(new Date(item.month + '-01').getMonth()).substring(0, 3),
        }));
        setData(formattedData);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  if (loading) {
    return (
      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography color="text.secondary">Данных для отображения нет</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 2.5 } }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: { xs: isCompactMobile ? 1.5 : 3, sm: 3 }, fontSize: { xs: isCompactMobile ? '1.30rem' : '1.5rem', sm: '1.25rem' } }}>
          Динамика доходов и расходов
        </Typography>

        <ResponsiveContainer width="100%" height={isCompactMobile ? 190 : isMobile ? 220 : 300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="monthDisplay" tick={{ fontSize: isCompactMobile ? 10 : isMobile ? 11 : 12 }} />
            <YAxis tick={{ fontSize: isCompactMobile ? 10 : isMobile ? 11 : 12 }} width={isCompactMobile ? 30 : isMobile ? 34 : 46} />
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}
            />
            <Legend wrapperStyle={{ fontSize: isCompactMobile ? 11 : isMobile ? 12 : 14 }} />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              name="Доход"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: isCompactMobile ? 2.5 : isMobile ? 3 : 4 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#EF4444"
              name="Расходы"
              strokeWidth={2}
              dot={{ fill: '#EF4444', r: isCompactMobile ? 2.5 : isMobile ? 3 : 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Summary Statistics */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: { xs: isCompactMobile ? 1.25 : 2, sm: 2 },
            mt: { xs: isCompactMobile ? 1.5 : 3, sm: 3 },
            pt: { xs: isCompactMobile ? 1.5 : 3, sm: 3 },
            borderTop: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {data.slice(-3).map((item) => (
            <Box key={item.month}>
              <Typography variant="caption" color="text.secondary">
                {item.monthDisplay}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Box>
                  <Typography variant="body2" color="success.main">
                    {formatCurrency(item.income)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Доход</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="error.main">
                    {formatCurrency(item.expenses)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Расходы</Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

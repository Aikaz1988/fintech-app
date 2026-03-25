import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as analyticsService from '@/services/analytics.service';
import type { CategoryStats } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { CHART_COLORS } from '@/utils/constants';

interface CategoryBreakdownProps {
  userId: string;
}

type CategoryPeriod = 'day' | 'month' | 'year';

const PERIOD_LABELS: Record<CategoryPeriod, string> = {
  day: 'День',
  month: 'Месяц',
  year: 'Год',
};

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ userId }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const [data, setData] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('bar');
  const [period, setPeriod] = useState<CategoryPeriod>('month');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const stats = await analyticsService.getCategoryStats(userId, 'expense', { period });
        setData(stats);
      } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, period]);

  if (loading) {
    return (
      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
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

  const chartData = data.map((item) => ({
    name: item.category_name || item.category?.name || 'Без категории',
    value: item.amount,
    percentage: item.percentage,
  }));

  return (
    <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: isCompactMobile ? 0.75 : 1, sm: 0 }, mb: { xs: isCompactMobile ? 1.5 : 3, sm: 3 } }}>
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.30rem' : '1.5rem', sm: '1.25rem' } }}>Расходы по категориям</Typography>
          <Box sx={{ display: 'flex', gap: isCompactMobile ? 1 : 1.5, alignItems: 'center', width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {(Object.keys(PERIOD_LABELS) as CategoryPeriod[]).map((key) => (
                <Typography
                  key={key}
                  variant="body2"
                  onClick={() => setPeriod(key)}
                  sx={{
                    cursor: 'pointer',
                    pb: isCompactMobile ? 0.5 : 1,
                    borderBottom: period === key ? '2px solid #3B82F6' : 'none',
                    color: period === key ? '#3B82F6' : 'text.secondary',
                    fontSize: { xs: isCompactMobile ? '0.76rem' : '0.88rem', sm: '0.95rem' },
                  }}
                >
                  {PERIOD_LABELS[key]}
                </Typography>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
            <Typography
              variant="body2"
              onClick={() => setChartType('bar')}
              sx={{
                cursor: 'pointer',
                pb: isCompactMobile ? 0.5 : 1,
                borderBottom: chartType === 'bar' ? '2px solid #3B82F6' : 'none',
                color: chartType === 'bar' ? '#3B82F6' : 'text.secondary',
                fontSize: { xs: isCompactMobile ? '0.76rem' : '0.88rem', sm: '0.95rem' },
              }}
            >
              График
            </Typography>
            <Typography
              variant="body2"
              onClick={() => setChartType('pie')}
              sx={{
                cursor: 'pointer',
                pb: isCompactMobile ? 0.5 : 1,
                borderBottom: chartType === 'pie' ? '2px solid #3B82F6' : 'none',
                color: chartType === 'pie' ? '#3B82F6' : 'text.secondary',
                fontSize: { xs: isCompactMobile ? '0.76rem' : '0.88rem', sm: '0.95rem' },
              }}
            >
              Круговая
            </Typography>
            </Box>
          </Box>
        </Box>

        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={isCompactMobile ? 190 : isMobile ? 220 : 300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis
                dataKey="name"
                angle={isCompactMobile ? -22 : isMobile ? -30 : -45}
                textAnchor="end"
                height={isCompactMobile ? 36 : isMobile ? 44 : 60}
                tick={{ fontSize: isCompactMobile ? 10 : isMobile ? 11 : 12 }}
                tickFormatter={(value: string) => ((isCompactMobile || isMobile) && value.length > 10 ? `${value.slice(0, isCompactMobile ? 8 : 10)}...` : value)}
              />
              <YAxis tick={{ fontSize: isCompactMobile ? 10 : isMobile ? 11 : 12 }} width={isCompactMobile ? 30 : isMobile ? 34 : 46} />
              <Tooltip
                formatter={(value) => [formatCurrency(value as number), 'Сумма']}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} barSize={isCompactMobile ? 16 : isMobile ? 22 : 36} maxBarSize={isCompactMobile ? 20 : isMobile ? 26 : 42} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={isCompactMobile ? 220 : 300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                  label={!isMobile ? ({ name }) => `${name}` : undefined}
                  outerRadius={isMobile ? 68 : 80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Category Details */}
        <Box sx={{ mt: { xs: isCompactMobile ? 1.5 : 3, sm: 3 }, pt: { xs: isCompactMobile ? 1.5 : 3, sm: 3 }, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: { xs: isCompactMobile ? 1 : 2, sm: 2 }, fontSize: { xs: isCompactMobile ? '0.8rem' : '0.875rem', sm: '0.875rem' } }}>Детализация по категориям</Typography>
          {data.map((item) => (
            <Box
              key={item.category_id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: isCompactMobile ? 1 : 1.5,
                pb: isCompactMobile ? 1 : 1.5,
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                '&:last-child': { borderBottom: 'none', mb: 0, pb: 0 },
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight="500">
                  {item.category_name || item.category?.name || 'Без категории'}
                </Typography>
                <Box
                  sx={{
                    height: 4,
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    borderRadius: 2,
                    mt: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${item.percentage}%`,
                      backgroundColor: '#3B82F6',
                      borderRadius: 2,
                    }}
                  />
                </Box>
              </Box>
              <Box sx={{ ml: isCompactMobile ? 1.25 : 2, textAlign: 'right', minWidth: { xs: isCompactMobile ? 96 : 120, sm: 120 } }}>
                <Typography variant="body2" fontWeight="bold">
                  {formatCurrency(item.amount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.percentage.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit2, Trash2, AlertCircle } from 'lucide-react';
import type { Budget } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface BudgetListProps {
  budgets: Budget[];
  loading: boolean;
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
}

export const BudgetList: React.FC<BudgetListProps> = ({
  budgets,
  loading,
  onEdit,
  onDelete,
}) => {
  const getProgressColor = (spent: number, limit: number) => {
    if (limit <= 0) return '#10B981';
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return '#EF4444'; // Red
    if (percentage >= 80) return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  const getStatusIcon = (spent: number, limit: number) => {
    if (limit <= 0) return null;
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) {
      return <AlertCircle size={16} className="text-red-500" />;
    }
    return null;
  };

  if (loading) {
    return <Typography color="text.secondary">Загрузка бюджетов...</Typography>;
  }

  if (budgets.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Бюджеты не найдены</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
      <Table>
        <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <TableRow>
            <TableCell>Категория</TableCell>
            <TableCell align="right">Лимит</TableCell>
            <TableCell align="right">Потрачено</TableCell>
            <TableCell>Прогресс</TableCell>
            <TableCell align="right">Осталось</TableCell>
            <TableCell align="center">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {budgets.map((budget) => {
            const spent = budget.spent_amount || budget.spent || 0;
            const limit = budget.limit_amount || budget.limit || 0;
            const remaining = limit - spent;
            const rawPercentage = limit > 0 ? (spent / limit) * 100 : 0;
            const percentage = Math.min(100, Math.max(0, rawPercentage));
            const color = getProgressColor(spent, limit);

            return (
              <TableRow
                key={budget.id}
                hover
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  backgroundColor: percentage >= 100 ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                }}
              >
                <TableCell sx={{ fontWeight: 500 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {budget.category_name || budget.category?.name || budget.category_id}
                    {getStatusIcon(spent, limit)}
                  </Box>
                </TableCell>
                <TableCell align="right">{formatCurrency(limit)}</TableCell>
                <TableCell align="right" sx={{ color }}>
                  {formatCurrency(spent)}
                </TableCell>
                <TableCell sx={{ width: 150 }}>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor: 'rgba(0,0,0,0.08)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: color,
                        borderRadius: 1,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {percentage.toFixed(0)}%
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    sx={{
                      color: remaining > 0 ? '#10B981' : '#EF4444',
                      fontWeight: 500,
                    }}
                  >
                    {remaining >= 0 ? formatCurrency(remaining) : `-${formatCurrency(Math.abs(remaining))}`}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Редактировать">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(budget)}
                      sx={{ color: '#3B82F6' }}
                    >
                      <Edit2 size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Удалить">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(budget.id)}
                      sx={{ color: '#EF4444' }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

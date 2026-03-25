import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import type { FinancialGoal } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface GoalsListProps {
  goals: FinancialGoal[];
  loading: boolean;
  onEdit: (goal: FinancialGoal) => void;
  onDelete: (id: string) => void;
  onToggleAchieved: (goal: FinancialGoal) => void;
}

const priorityColor = (priority: FinancialGoal['priority']) => {
  if (priority === 'high') return 'error';
  if (priority === 'medium') return 'warning';
  return 'default';
};

export const GoalsList: React.FC<GoalsListProps> = ({
  goals,
  loading,
  onEdit,
  onDelete,
  onToggleAchieved,
}) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');

  if (loading) {
    return <Typography color="text.secondary">Загрузка целей...</Typography>;
  }

  if (goals.length === 0) {
    return (
      <Paper sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3 }, textAlign: 'center' }}>
        <Typography color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '1rem' } }}>Финансовые цели пока не добавлены</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', maxWidth: { xs: '100%', sm: '100%' }, '& .MuiTableCell-root': { px: { xs: isCompactMobile ? 0.75 : 1.25, sm: 2 } } }}>
      <Table>
        <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <TableRow>
            <TableCell>Цель</TableCell>
            <TableCell align="right">Прогресс</TableCell>
            <TableCell>Индикатор</TableCell>
            <TableCell align="right">Дедлайн</TableCell>
            <TableCell align="right">Приоритет</TableCell>
            <TableCell align="center">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {goals.map((goal) => {
            const target = Number(goal.target_amount || 0);
            const current = Number(goal.current_amount || 0);
            const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
            const achieved = goal.is_achieved || current >= target;

            return (
              <TableRow key={goal.id} hover>
                <TableCell sx={{ py: { xs: isCompactMobile ? 0.85 : 1.25, sm: 2 } }}>
                  <Box>
                    <Typography fontWeight={600} sx={{ fontSize: { xs: isCompactMobile ? '0.84rem' : '0.92rem', sm: '1rem' } }}>{goal.goal_name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.74rem' : '0.82rem', sm: '0.875rem' } }}>
                      {formatCurrency(current)} / {formatCurrency(target)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ py: { xs: isCompactMobile ? 0.85 : 1.25, sm: 2 }, fontSize: { xs: isCompactMobile ? '0.74rem' : '0.82rem', sm: '0.875rem' } }}>{progress.toFixed(0)}%</TableCell>
                <TableCell sx={{ width: isCompactMobile ? 120 : isMobile ? 150 : 220, py: { xs: isCompactMobile ? 0.85 : 1.25, sm: 2 } }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: isCompactMobile ? 6 : 8,
                      borderRadius: 1,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: achieved ? '#10B981' : '#3B82F6',
                      },
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ py: { xs: isCompactMobile ? 0.85 : 1.25, sm: 2 }, fontSize: { xs: isCompactMobile ? '0.74rem' : '0.82rem', sm: '0.875rem' } }}>{goal.deadline ? formatDate(goal.deadline) : 'Без срока'}</TableCell>
                <TableCell align="right" sx={{ py: { xs: isCompactMobile ? 0.85 : 1.25, sm: 2 } }}>
                  <Chip
                    size="small"
                    label={goal.priority === 'high' ? 'Высокий' : goal.priority === 'medium' ? 'Средний' : 'Низкий'}
                    color={priorityColor(goal.priority) as any}
                    variant="outlined"
                    sx={{ minHeight: { xs: isCompactMobile ? 20 : 24, sm: 24 }, '& .MuiChip-label': { fontSize: { xs: isCompactMobile ? '0.66rem' : '0.72rem', sm: '0.75rem' }, px: { xs: isCompactMobile ? 0.5 : 0.75, sm: 1 } } }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={achieved ? 'Отметить как в процессе' : 'Отметить как выполнено'}>
                    <IconButton onClick={() => onToggleAchieved(goal)} color={achieved ? 'success' : 'default'} sx={{ p: { xs: isCompactMobile ? 0.5 : 1, sm: 1 } }}>
                      <CheckCircle2 size={isCompactMobile ? 15 : 17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Редактировать">
                    <IconButton onClick={() => onEdit(goal)} color="primary" sx={{ p: { xs: isCompactMobile ? 0.5 : 1, sm: 1 } }}>
                      <Edit2 size={isCompactMobile ? 15 : 17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Удалить">
                    <IconButton onClick={() => onDelete(goal.id)} color="error" sx={{ p: { xs: isCompactMobile ? 0.5 : 1, sm: 1 } }}>
                      <Trash2 size={isCompactMobile ? 15 : 17} />
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

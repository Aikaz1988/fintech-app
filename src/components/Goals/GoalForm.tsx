import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { FinancialGoal, GoalFormData, PriorityType } from '@/types';
import { validateGoal } from '@/utils/validators';

interface GoalFormProps {
  open: boolean;
  goal?: FinancialGoal;
  loading?: boolean;
  error?: string;
  onSubmit: (data: GoalFormData) => Promise<void>;
  onClose: () => void;
}

const defaultForm: GoalFormData = {
  goal_name: '',
  target_amount: 0,
  current_amount: 0,
  deadline: '',
  priority: 'medium',
};

export const GoalForm: React.FC<GoalFormProps> = ({
  open,
  goal,
  loading = false,
  error,
  onSubmit,
  onClose,
}) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const [formData, setFormData] = useState<GoalFormData>(defaultForm);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (goal) {
      setFormData({
        goal_name: goal.goal_name,
        target_amount: Number(goal.target_amount),
        current_amount: Number(goal.current_amount),
        deadline: goal.deadline || '',
        priority: goal.priority,
      });
    } else {
      setFormData(defaultForm);
    }
    setValidationErrors({});
  }, [goal, open]);

  const handleChange = (field: keyof GoalFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    const validation = validateGoal(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { width: { xs: '92%', sm: '100%' }, m: { xs: isCompactMobile ? 0.75 : 1, sm: 2 } } }}>
      <DialogTitle sx={{ pb: { xs: isCompactMobile ? 1 : 2, sm: 2 }, fontSize: { xs: isCompactMobile ? '1rem' : '1.125rem', sm: '1.25rem' } }}>{goal ? 'Редактировать цель' : 'Новая финансовая цель'}</DialogTitle>
      <DialogContent sx={{ pt: { xs: isCompactMobile ? 1 : 2, sm: 2 }, display: 'flex', flexDirection: 'column', gap: { xs: isCompactMobile ? 1 : 1.5, sm: 1.5 } }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          size="small"
          label="Название цели"
          value={formData.goal_name}
          onChange={(e) => handleChange('goal_name', e.target.value)}
          error={!!validationErrors.goal_name}
          helperText={validationErrors.goal_name}
          fullWidth
        />

        <TextField
          size="small"
          label="Целевая сумма"
          type="number"
          value={formData.target_amount}
          onChange={(e) => handleChange('target_amount', Number(e.target.value))}
          error={!!validationErrors.target_amount}
          helperText={validationErrors.target_amount}
          fullWidth
        />

        <TextField
          size="small"
          label="Текущая сумма"
          type="number"
          value={formData.current_amount || 0}
          onChange={(e) => handleChange('current_amount', Number(e.target.value))}
          error={!!validationErrors.current_amount}
          helperText={validationErrors.current_amount}
          fullWidth
        />

        <TextField
          size="small"
          label="Дедлайн"
          type="date"
          value={formData.deadline || ''}
          onChange={(e) => handleChange('deadline', e.target.value)}
          error={!!validationErrors.deadline}
          helperText={validationErrors.deadline}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />

        <TextField
          size="small"
          select
          label="Приоритет"
          value={formData.priority}
          onChange={(e) => handleChange('priority', e.target.value as PriorityType)}
          fullWidth
        >
          <MenuItem value="low">Низкий</MenuItem>
          <MenuItem value="medium">Средний</MenuItem>
          <MenuItem value="high">Высокий</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions sx={{ p: { xs: isCompactMobile ? 1 : 1.5, sm: 1.5 } }}>
        <Button onClick={onClose} disabled={submitting || loading} size={isMobile ? 'small' : 'medium'} sx={{ minHeight: { xs: isCompactMobile ? 24 : 30, sm: 36 }, px: { xs: isCompactMobile ? 1 : 1.5, sm: 2 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '0.875rem' } }}>
          Отмена
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting || loading} size={isMobile ? 'small' : 'medium'} sx={{ minHeight: { xs: isCompactMobile ? 24 : 30, sm: 36 }, px: { xs: isCompactMobile ? 1 : 1.5, sm: 2 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '0.875rem' } }}>
          {submitting || loading ? <CircularProgress size={20} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

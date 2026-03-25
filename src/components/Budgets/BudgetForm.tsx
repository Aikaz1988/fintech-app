import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { Budget, BudgetFormData } from '@/types';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/utils/constants';
import { validateBudget } from '@/utils/validators';

const monthInputValue = (value?: string): string => {
  if (!value) return new Date().toISOString().slice(0, 7);
  return value.length >= 7 ? value.slice(0, 7) : value;
};

const getCategoryType = (categoryName: string): 'income' | 'expense' => {
  if (DEFAULT_INCOME_CATEGORIES.some((c) => c.name === categoryName)) {
    return 'income';
  }

  return 'expense';
};

interface BudgetFormProps {
  open: boolean;
  budget?: Budget;
  loading?: boolean;
  error?: string;
  onSubmit: (data: BudgetFormData) => Promise<void>;
  onClose: () => void;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({
  open,
  budget,
  loading = false,
  error,
  onSubmit,
  onClose,
}) => {
  const [formData, setFormData] = useState<BudgetFormData>({
    category_id: '',
    limit: 0,
    month: new Date().toISOString().slice(0, 7),
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (budget) {
      setFormData({
        category_id: budget.category?.name || budget.category_id,
        category_type: budget.category?.type,
        limit: budget.limit_amount || budget.limit || 0,
        month: monthInputValue(budget.month),
      });
    } else {
      setFormData({
        category_id: '',
        category_type: 'expense',
        limit: 0,
        month: new Date().toISOString().slice(0, 7),
      });
    }
    setValidationErrors({});
  }, [budget, open]);

  const handleChange = (field: keyof BudgetFormData, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    setValidationErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  const handleSubmit = async () => {
    // Validation
    const { isValid, errors } = validateBudget(formData);
    if (!isValid) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error('Ошибка при сохранении бюджета:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {budget ? 'Редактировать бюджет' : 'Создать новый бюджет'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <FormControl fullWidth error={!!validationErrors.category_id}>
          <InputLabel>Категория</InputLabel>
          <Select
            value={formData.category_id}
            onChange={(e: any) => {
              const value = e.target.value;
              handleChange('category_id', value);
              handleChange('category_type', getCategoryType(value));
            }}
            label="Категория"
            disabled={submitting || loading}
          >
            {[...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].map((cat) => (
              <MenuItem key={cat.name} value={cat.name}>
                {cat.name} {getCategoryType(cat.name) === 'income' ? '(доход)' : '(расход)'}
              </MenuItem>
            ))}
          </Select>
          {validationErrors.category_id && (
            <Box sx={{ color: '#EF4444', fontSize: '0.75rem', mt: 0.5 }}>
              {validationErrors.category_id}
            </Box>
          )}
        </FormControl>

        <TextField
          label="Лимит (RUB)"
          type="number"
          value={formData.limit}
          onChange={(e) => handleChange('limit', parseFloat(e.target.value) || 0)}
          disabled={submitting || loading}
          error={!!validationErrors.limit}
          helperText={validationErrors.limit}
          inputProps={{ step: '0.01', min: '0' }}
          fullWidth
        />

        <TextField
          label="Месяц"
          type="month"
          value={formData.month}
          onChange={(e) => handleChange('month', e.target.value)}
          disabled={submitting || loading}
          error={!!validationErrors.month}
          helperText={validationErrors.month}
          fullWidth
          InputLabelProps={{
            shrink: true,
          }}
        />
      </DialogContent>
      <DialogActions sx={{ gap: 1, p: 2 }}>
        <Button onClick={onClose} disabled={submitting || loading}>
          Отмена
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || loading}
          sx={{ minWidth: 100 }}
        >
          {submitting || loading ? <CircularProgress size={24} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

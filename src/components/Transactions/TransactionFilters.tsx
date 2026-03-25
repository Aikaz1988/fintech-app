import React from 'react';
import { Box, Button, MenuItem, TextField } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Category, TransactionFilters as Filters } from '@/types';

interface TransactionFiltersProps {
  filters: Filters;
  categories: Category[];
  onChange: (next: Filters) => void;
  onReset: () => void;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  categories,
  onChange,
  onReset,
}) => {
  const isCompactMobile = useMediaQuery('(max-width:380px)');

  const inputSx = {
    '& .MuiInputBase-root': {
      minHeight: { xs: isCompactMobile ? 30 : 36, sm: 40, md: 40 },
      fontSize: { xs: isCompactMobile ? '0.78rem' : '0.86rem', sm: '0.88rem', md: '0.9rem' },
    },
    '& .MuiInputLabel-root': {
      fontSize: { xs: isCompactMobile ? '0.74rem' : '0.8rem', sm: '0.82rem', md: '0.86rem' },
    },
    '& .MuiFormHelperText-root': {
      fontSize: { xs: isCompactMobile ? '0.7rem' : '0.75rem', sm: '0.75rem', md: '0.78rem' },
      mt: 0.5,
    },
  };

  return (
    <Box sx={{ display: 'grid', gap: { xs: isCompactMobile ? 0.8 : 1.1, sm: 1.25, md: 1.5 }, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, mb: { xs: isCompactMobile ? 1.25 : 1.5, sm: 1.5, md: 2 } }}>
      <TextField
        size="small"
        label="Поиск"
        value={filters.search || ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        sx={inputSx}
      />

      <TextField
        size="small"
        select
        label="Категория"
        value={filters.category_id || ''}
        onChange={(e) => onChange({ ...filters, category_id: e.target.value || undefined })}
        sx={inputSx}
      >
        <MenuItem value="">Все категории</MenuItem>
        {categories.map((category) => (
          <MenuItem key={category.id} value={category.id}>
            {category.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        size="small"
        select
        label="Тип"
        value={filters.type || ''}
        onChange={(e) => onChange({ ...filters, type: (e.target.value || undefined) as Filters['type'] })}
        sx={inputSx}
      >
        <MenuItem value="">Все типы</MenuItem>
        <MenuItem value="income">Доходы</MenuItem>
        <MenuItem value="expense">Расходы</MenuItem>
      </TextField>

      <TextField
        size="small"
        label="Дата с"
        type="date"
        value={filters.date_from || ''}
        onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined })}
        InputLabelProps={{ shrink: true }}
        sx={inputSx}
      />

      <TextField
        size="small"
        label="Дата по"
        type="date"
        value={filters.date_to || ''}
        onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined })}
        InputLabelProps={{ shrink: true }}
        sx={inputSx}
      />

      <TextField
        size="small"
        label="Сумма от"
        type="number"
        value={filters.amount_min ?? ''}
        onChange={(e) => onChange({ ...filters, amount_min: e.target.value ? Number(e.target.value) : undefined })}
        sx={inputSx}
      />

      <TextField
        size="small"
        label="Сумма до"
        type="number"
        value={filters.amount_max ?? ''}
        onChange={(e) => onChange({ ...filters, amount_max: e.target.value ? Number(e.target.value) : undefined })}
        sx={inputSx}
      />

      <TextField
        size="small"
        select
        label="Источник"
        value={filters.is_imported === undefined ? '' : String(filters.is_imported)}
        onChange={(e) => {
          const value = e.target.value;
          onChange({
            ...filters,
            is_imported: value === '' ? undefined : value === 'true',
          });
        }}
        sx={inputSx}
      >
        <MenuItem value="">Все</MenuItem>
        <MenuItem value="false">Ручные</MenuItem>
        <MenuItem value="true">Импортированные</MenuItem>
      </TextField>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'stretch', sm: 'flex-start' } }}>
        <Button
          variant="outlined"
          onClick={onReset}
          size="small"
          sx={{
            height: { xs: isCompactMobile ? 24 : 30, sm: 36, md: 36 },
            minHeight: { xs: isCompactMobile ? 24 : 30, sm: 36, md: 36 },
            px: { xs: isCompactMobile ? 0.75 : 1.25, sm: 1.5, md: 1.75 },
            fontSize: { xs: isCompactMobile ? '0.74rem' : '0.8rem', sm: '0.84rem', md: '0.86rem' },
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          Сбросить
        </Button>
      </Box>
    </Box>
  );
};

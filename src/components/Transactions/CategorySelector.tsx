import React from 'react';
import { MenuItem, TextField } from '@mui/material';
import type { Category, TransactionType } from '@/types';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  type: TransactionType;
  categories: Category[];
  label?: string;
  error?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  onChange,
  type,
  categories,
  label = 'Категория',
  error,
}) => {
  const filtered = categories.filter((category) => category.type === type);

  return (
    <TextField
      select
      fullWidth
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={!!error}
      helperText={error}
    >
      <MenuItem value="">Выберите категорию</MenuItem>
      {filtered.map((category) => (
        <MenuItem key={category.id} value={category.id}>
          {category.name}
        </MenuItem>
      ))}
    </TextField>
  );
};

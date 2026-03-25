import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Edit2, Trash2 } from 'lucide-react';
import type { Category, TransactionType } from '@/types';

interface CategoryManagerProps {
  open: boolean;
  categories: Category[];
  loading: boolean;
  onClose: () => void;
  onCreate: (payload: Pick<Category, 'name' | 'type' | 'color' | 'icon'>) => Promise<void>;
  onUpdate: (id: string, payload: Partial<Pick<Category, 'name' | 'type' | 'color' | 'icon'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const defaultForm = {
  name: '',
  type: 'expense' as TransactionType,
  color: '#3B82F6',
  icon: 'tag',
};

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  open,
  categories,
  loading,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userCategories = useMemo(() => categories.filter((category) => !!category.user_id), [categories]);

  const reset = () => {
    setForm(defaultForm);
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const validate = (): string | null => {
    const name = form.name.trim();
    const color = form.color.trim();

    if (name.length < 2) return 'Название категории должно содержать минимум 2 символа';
    if (name.length > 40) return 'Название категории должно быть не длиннее 40 символов';
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return 'Цвет категории должен быть в формате HEX, например #3B82F6';

    const duplicate = categories.find((category) => {
      if (editingId && category.id === editingId) return false;
      return category.type === form.type && category.name.trim().toLowerCase() === name.toLowerCase();
    });

    if (duplicate) return 'Категория с таким названием и типом уже существует';
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (editingId) {
        await onUpdate(editingId, form);
        setSuccess('Категория обновлена');
      } else {
        await onCreate(form);
        setSuccess('Категория добавлена');
      }

      setForm(defaultForm);
      setEditingId(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось сохранить категорию';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    const confirmed = window.confirm('Удалить категорию? Это действие нельзя отменить.');
    if (!confirmed) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await onDelete(id);
      setSuccess('Категория удалена');
      if (editingId === id) {
        setForm(defaultForm);
        setEditingId(null);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось удалить категорию';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Управление категориями</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr auto' }, gap: 1.5, mb: 2 }}>
          <TextField
            label="Название"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            select
            label="Тип"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as TransactionType }))}
          >
            <MenuItem value="expense">Расход</MenuItem>
            <MenuItem value="income">Доход</MenuItem>
          </TextField>
          <TextField
            label="Цвет"
            type="color"
            value={form.color}
            onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={() => void submit()}>
            {submitting ? 'Сохранение...' : editingId ? 'Сохранить' : 'Добавить'}
          </Button>
        </Box>

        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Категория</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Цвет</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography color="text.secondary">Загрузка...</Typography>
                  </TableCell>
                </TableRow>
              ) : userCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography color="text.secondary">Пользовательские категории пока не добавлены</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                userCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>{category.type === 'income' ? 'Доход' : 'Расход'}</TableCell>
                    <TableCell>
                      <Box sx={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: category.color }} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        disabled={submitting}
                        onClick={() => {
                          setEditingId(category.id);
                          setForm({
                            name: category.name,
                            type: category.type,
                            color: category.color,
                            icon: category.icon,
                          });
                        }}
                      >
                        <Edit2 size={14} />
                      </IconButton>
                      <IconButton size="small" color="error" disabled={submitting} onClick={() => void remove(category.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button disabled={submitting} onClick={() => { reset(); onClose(); }}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryManager } from '@/components/Transactions/CategoryManager';
import type { Category } from '@/types';

const categories: Category[] = [
  {
    id: 'c-1',
    user_id: 'u-1',
    name: 'Транспорт',
    color: '#3B82F6',
    icon: 'car',
    type: 'expense',
    created_at: new Date().toISOString(),
  },
];

describe('CategoryManager', () => {
  it('shows validation error for short name', async () => {
    render(
      <CategoryManager
        open
        categories={[]}
        loading={false}
        onClose={vi.fn()}
        onCreate={vi.fn(async () => undefined)}
        onUpdate={vi.fn(async () => undefined)}
        onDelete={vi.fn(async () => undefined)}
      />
    );

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(await screen.findByText('Название категории должно содержать минимум 2 символа')).toBeInTheDocument();
  });

  it('prevents duplicate category for same type', async () => {
    const onCreate = vi.fn(async () => undefined);

    render(
      <CategoryManager
        open
        categories={categories}
        loading={false}
        onClose={vi.fn()}
        onCreate={onCreate}
        onUpdate={vi.fn(async () => undefined)}
        onDelete={vi.fn(async () => undefined)}
      />
    );

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'транспорт' } });
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(await screen.findByText('Категория с таким названием и типом уже существует')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('creates category on valid input', async () => {
    const onCreate = vi.fn(async () => undefined);

    render(
      <CategoryManager
        open
        categories={[]}
        loading={false}
        onClose={vi.fn()}
        onCreate={onCreate}
        onUpdate={vi.fn(async () => undefined)}
        onDelete={vi.fn(async () => undefined)}
      />
    );

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Аптеки' } });
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Категория добавлена')).toBeInTheDocument();
  });
});

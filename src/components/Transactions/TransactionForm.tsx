import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Transaction, TransactionFormData, Category, BankAccount } from '@/types';
import { validateTransaction } from '@/utils/validators';
import { CategorySelector } from './CategorySelector';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  categories: Category[];
  bankAccounts?: BankAccount[];
  editTransaction?: Transaction | null;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  bankAccounts = [],
  editTransaction,
}) => {
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    category_id: '',
    bank_account_id: '',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    description: '',
    merchant: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    return 'Не удалось сохранить операцию. Попробуйте снова.';
  };

  // Заполнение формы при редактировании
  useEffect(() => {
    if (editTransaction) {
      setFormData({
        amount: editTransaction.amount.toString(),
        category_id: editTransaction.category_id,
        bank_account_id: editTransaction.bank_account_id || '',
        type: editTransaction.type,
        date: editTransaction.date,
        description: editTransaction.description || '',
        merchant: editTransaction.merchant || '',
      });
    } else {
      resetForm();
    }
  }, [editTransaction, isOpen]);

  const resetForm = () => {
    setFormData({
      amount: '',
      category_id: '',
      bank_account_id: '',
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      description: '',
      merchant: '',
    });
    setErrors({});
    setSubmitError('');
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSubmitError('');
    
    // Очистка ошибки при изменении поля
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    
    // Валидация
    const validation = validateTransaction(formData as any);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount as unknown as string),
      } as TransactionFormData);
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении транзакции:', error);
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Фильтрация категорий по типу
  const filteredCategories = categories.filter(
    (cat) => cat.type === formData.type
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {editTransaction ? 'Редактировать транзакцию' : 'Новая транзакция'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Тип операции */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип операции *
            </label>
            <div className="flex space-x-4">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={formData.type === 'expense'}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="text-center py-3 px-4 border-2 border-gray-300 rounded-lg peer-checked:border-red-500 peer-checked:bg-red-50 hover:bg-gray-50 transition-colors">
                  <span className="text-sm font-medium text-gray-900">Расход</span>
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  checked={formData.type === 'income'}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="text-center py-3 px-4 border-2 border-gray-300 rounded-lg peer-checked:border-green-500 peer-checked:bg-green-50 hover:bg-gray-50 transition-colors">
                  <span className="text-sm font-medium text-gray-900">Доход</span>
                </div>
              </label>
            </div>
          </div>

          {/* Сумма */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Сумма (₽) *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Категория */}
          <CategorySelector
            value={formData.category_id}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, category_id: value }));
              if (errors.category_id) {
                setErrors((prev) => ({ ...prev, category_id: '' }));
              }
            }}
            type={formData.type}
            categories={filteredCategories}
            error={errors.category_id}
          />

          {/* Счет */}
          <div>
            <label htmlFor="bank_account_id" className="block text-sm font-medium text-gray-700 mb-1">
              Счет
            </label>
            <select
              id="bank_account_id"
              name="bank_account_id"
              value={formData.bank_account_id || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
            >
              <option value="">Без привязки к счету</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name} ({account.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Дата */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Дата *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Описание */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Комментарий к транзакции"
              maxLength={500}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {formData.description.length}/500
            </div>
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Мерчант */}
          <div>
            <label htmlFor="merchant" className="block text-sm font-medium text-gray-700 mb-1">
              Магазин/Сервис
            </label>
            <input
              type="text"
              id="merchant"
              name="merchant"
              value={formData.merchant}
              onChange={handleChange}
              placeholder="Например: Пятёрочка, Яндекс.Такси"
              maxLength={100}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.merchant ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.merchant && (
              <p className="mt-1 text-sm text-red-600">{errors.merchant}</p>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
        </form>
      </div>
    </div>
  );
};
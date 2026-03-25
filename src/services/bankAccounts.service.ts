import { supabase } from '@/lib/supabase';
import type { BankAccount, BankAccountFormData, OperationResult } from '@/types';

export const getBankAccounts = async (userId: string): Promise<BankAccount[]> => {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Ошибка при получении счетов:', error);
    return [];
  }
};

export const createBankAccount = async (
  userId: string,
  formData: BankAccountFormData
): Promise<OperationResult<BankAccount>> => {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert({
        user_id: userId,
        account_name: formData.account_name,
        bank_name: formData.bank_name || null,
        account_number: formData.account_number || null,
        balance: formData.balance ?? 0,
        currency: formData.currency || 'RUB',
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Ошибка при создании счета:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось создать счет',
    };
  }
};

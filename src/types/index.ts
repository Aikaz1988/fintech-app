export type TransactionType = 'income' | 'expense';
export type NotificationType = 'warning' | 'alert';
export type PriorityType = 'low' | 'medium' | 'high';

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  icon: string;
  type: TransactionType;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  description: string | null;
  date: string;
  type: TransactionType;
  created_at: string;
  is_imported: boolean;
  bank_account_id: string | null;
  merchant: string | null;
  mcc_code: string | null;
  category?: Category;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  limit_amount: number;
  month: string;
  created_at: string;
  category?: Category;
  spent_amount?: number;
  remaining_amount?: number;
  percentage_used?: number;
  // Convenience aliases for UI components
  limit?: number;
  spent?: number;
  category_name?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  budget_id: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  threshold_percent?: number | null;
  spent_amount?: number | null;
  limit_amount?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  category_name?: string | null;
  budget?: Budget;
}

export interface NotificationPreferences {
  user_id: string;
  warning_threshold_percent: number;
  alert_threshold_percent: number;
  cadence_minutes: number;
  push_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  calendar_enabled: boolean;
  notifications_paused_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  account_name: string;
  bank_name: string | null;
  account_number: string | null;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface FinancialGoal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  priority: PriorityType;
  is_achieved: boolean;
  created_at: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  recommendation_text: string;
  category: string | null;
  priority: PriorityType;
  is_read: boolean;
  created_at: string;
}

export interface SummaryStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savings: number;
  savingsRate: number;
}

export interface CategoryStats {
  category: Category;
  amount: number;
  percentage: number;
  count: number;
  // Convenience aliases for UI components
  category_id?: string;
  category_name?: string;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
  // Convenience alias for chart display
  monthDisplay?: string;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  limit: number;
  percentage: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface TransactionFormData {
  amount: number | string;
  category_id: string;
  bank_account_id?: string;
  type: TransactionType;
  date: string;
  description: string;
  merchant?: string;
}

export interface BudgetFormData {
  category_id: string;
  category_type?: TransactionType;
  limit: number;
  month: string;
}

export type BudgetPeriod =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'last30days'
  | 'custom'
  | 'all';

export interface BudgetQueryOptions {
  month?: string;
  period?: BudgetPeriod;
  date_from?: string;
  date_to?: string;
}

export interface GoalFormData {
  goal_name: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string;
  priority: PriorityType;
}

export interface BankAccountFormData {
  account_name: string;
  bank_name?: string;
  account_number?: string;
  balance?: number;
  currency?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search?: string;
  is_imported?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ExportParams {
  format: 'pdf' | 'excel' | 'csv';
  date_from: string;
  date_to: string;
  include_charts: boolean;
  categories: string[];
}

export interface ReportData {
  summary: SummaryStats;
  transactions: Transaction[];
  categories: CategoryStats[];
  monthlyTrend: MonthlyData[];
  budgets: BudgetProgress[];
  recommendations: Recommendation[];
}

export interface BankConnectionData {
  bank_name: string;
  login: string;
  password: string;
}

export interface ImportedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchant: string;
  mcc_code?: string;
  category_suggestion?: string;
}

export interface ImportResult {
  success: boolean;
  count: number;
  transactions: ImportedTransaction[];
  error?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type BillingPeriod = 'monthly' | 'yearly';
export type SubscriptionUsageState = 'active' | 'rarely_used' | 'unused';
export type SubscriptionCategory =
  | 'video'
  | 'music'
  | 'education'
  | 'cloud'
  | 'gaming'
  | 'other';

export interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  category: SubscriptionCategory;
  price: number;
  currency: string;
  billing_period: BillingPeriod;
  next_charge_date: string;
  last_used_at: string | null;
  status: SubscriptionStatus;
  usage_state: SubscriptionUsageState;
  provider: string;
  cancel_url: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionInsightType = 'unused_subscription' | 'duplicate_category' | 'high_price';

export interface SubscriptionInsight {
  id: string;
  type: SubscriptionInsightType;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  potential_monthly_savings: number;
  subscription_ids: string[];
}

export interface SubscriptionsSummary {
  active_count: number;
  paused_count: number;
  monthly_total: number;
  yearly_total: number;
  projected_annual_spend: number;
  potential_monthly_savings: number;
}

export type SubscriptionAction = 'pause' | 'resume' | 'cancel' | 'mark_used';
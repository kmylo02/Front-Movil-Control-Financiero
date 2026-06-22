export interface User {
  id: string; name: string; email: string; currency: string;
}
export interface AuthResponse { user: User; access_token: string; }

export interface Category {
  _id: string; name: string; type: 'expense' | 'income' | 'both';
  icon: string; color: string; isDefault: boolean;
}
export interface Expense {
  _id: string; amount: number; description: string; date: string;
  categoryId: Category | string; mode: 'manual' | 'auto' | 'template';
  isRecurring: boolean; notes: string; createdAt: string;
}
export interface Income {
  _id: string; amount: number; description: string; date: string;
  categoryId: Category | string; isRecurring: boolean; bank: string; notes: string; createdAt: string;
}
export interface Recurring {
  _id: string; name: string; amount: number; categoryId: Category | string;
  mode: 'auto' | 'manual' | 'template'; type: 'expense' | 'income';
  dayOfMonth: number; isActive: boolean; lastGeneratedAt: string | null; notes: string;
}
export interface CategoryLimit { categoryId: Category | string; limit: number; }
export interface Budget {
  _id: string; year: number; month: number; totalLimit: number;
  categoryLimits: CategoryLimit[];
}
export interface BudgetSummary {
  budget: Budget | null; totalSpent: number;
  remaining: number | null; usagePercent: number | null;
  categoryBreakdown: { categoryId: Category; limit: number; spent: number; remaining: number; usagePercent: number }[];
}
export interface MonthlySummary {
  year: number; month: number; totalExpenses: number; agendaTotalPaid: number; totalGastado: number;
  totalIncomes: number; balance: number;
  byCategory: { category: Category; total: number; count: number }[];
  budget: BudgetSummary;
}
export interface MonthData { month: number; expenses: number; incomes: number; balance: number; }
export interface YearlySummary {
  year: number; months: MonthData[]; totalExpenses: number; totalIncomes: number;
  balance: number; averageMonthlyExpense: number; averageMonthlyIncome: number;
}
export interface MonthComparison {
  current: { year: number; month: number; expenses: number; agendaTotalPaid: number; totalGastado: number; incomes: number; balance: number };
  previousMonth: { year: number; month: number; expenses: number; agendaTotalPaid: number; totalGastado: number; incomes: number };
  sameMonthLastYear: { year: number; month: number; expenses: number; agendaTotalPaid: number; totalGastado: number; incomes: number };
  changes: { expensesVsPreviousMonth: number | null; expensesVsLastYear: number | null };
}
export interface Notification {
  _id: string; type: string; title: string; message: string; read: boolean; createdAt: string;
}
export interface BillItem {
  _id: string; name: string; amount: number;
  categoryId?: Category | string;
  dueDay: number; year: number; month: number;
  status: 'pending' | 'paid'; paidAt?: string;
  isRecurring: boolean; notes: string;
}

export const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

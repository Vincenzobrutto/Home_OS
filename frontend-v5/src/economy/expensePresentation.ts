import type { EconomyExpense } from '../api/economyTypes';
import { billSupplierLabel, isBillServiceHeading } from '../documents/billSupplierLabel';
import { invoiceMonthLabel, isUtility } from '../lib/billPeriod';

/** Saved expenses only, display only. Never infer invoice month from service dates. */
export function expenseDisplayTitle(expense: Pick<EconomyExpense, 'title' | 'supplier' | 'invoiceMonth' | 'category'>): string {
  if (!isUtility(expense.category) || !(/^bolletta$/iu.test(expense.title.trim()) || isBillServiceHeading(expense.title))) return expense.title;
  const supplier = billSupplierLabel(expense.supplier);
  const month = invoiceMonthLabel(expense.invoiceMonth);
  return supplier || month ? [`Bolletta${supplier ? ` ${supplier}` : ''}`, month].filter(Boolean).join(' · ') : expense.title;
}

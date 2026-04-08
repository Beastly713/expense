import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function EditExpensePage() {
  return (
    <RoutePlaceholder
      title="Edit expense"
      routePath="/expenses/:expenseId/edit"
      description="Expense edit page placeholder using the final route shape."
    />
  );
}
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function NewExpensePage() {
  return (
    <RoutePlaceholder
      title="Add expense"
      routePath="/expenses/new"
      description="Expense creation page placeholder. Real split logic comes in later phases."
    />
  );
}
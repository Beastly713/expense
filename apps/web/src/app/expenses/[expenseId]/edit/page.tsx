import { ProtectedRoute } from '@/components/layout/protected-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function EditExpensePage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        title="Edit expense"
        routePath="/expenses/[expenseId]/edit"
        description="Protected edit expense shell is ready."
      />
    </ProtectedRoute>
  );
}
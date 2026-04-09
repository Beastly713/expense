import { ProtectedRoute } from '@/components/layout/protected-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function NewExpensePage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        title="Add expense"
        routePath="/expenses/new"
        description="Protected add expense shell is ready."
      />
    </ProtectedRoute>
  );
}
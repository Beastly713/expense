import { ProtectedRoute } from '@/components/layout/protected-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        title="Dashboard"
        routePath="/dashboard"
        description="Protected dashboard shell is ready. Page UI comes in later phase work."
      />
    </ProtectedRoute>
  );
}
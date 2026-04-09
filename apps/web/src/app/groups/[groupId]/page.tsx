import { ProtectedRoute } from '@/components/layout/protected-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function GroupDetailsPage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        title="Group details"
        routePath="/groups/[groupId]"
        description="Protected group details shell is ready."
      />
    </ProtectedRoute>
  );
}
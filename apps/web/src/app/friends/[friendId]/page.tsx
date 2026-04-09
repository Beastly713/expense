import { ProtectedRoute } from '@/components/layout/protected-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function FriendDetailsPage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        title="Friend details"
        routePath="/friends/[friendId]"
        description="Protected friend details shell is ready."
      />
    </ProtectedRoute>
  );
}
import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function LoginPage() {
  return (
    <PublicOnlyRoute>
      <RoutePlaceholder
        title="Login"
        routePath="/login"
        description="Login page shell is ready. Form UI comes in the next commit."
      />
    </PublicOnlyRoute>
  );
}
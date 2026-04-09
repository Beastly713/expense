import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function SignupPage() {
  return (
    <PublicOnlyRoute>
      <RoutePlaceholder
        title="Signup"
        routePath="/signup"
        description="Signup page shell is ready. Form UI comes in the next commit."
      />
    </PublicOnlyRoute>
  );
}
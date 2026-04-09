import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function ForgotPasswordPage() {
  return (
    <PublicOnlyRoute>
      <RoutePlaceholder
        title="Forgot password"
        routePath="/forgot-password"
        description="Forgot password page shell is ready. Form UI comes later in this phase."
      />
    </PublicOnlyRoute>
  );
}
import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function ResetPasswordPage() {
  return (
    <PublicOnlyRoute>
      <RoutePlaceholder
        title="Reset password"
        routePath="/reset-password/[token]"
        description="Reset password page shell is ready. Form UI comes later in this phase."
      />
    </PublicOnlyRoute>
  );
}
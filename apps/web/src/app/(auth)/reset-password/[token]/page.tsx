import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function ResetPasswordPage() {
  return (
    <RoutePlaceholder
      title="Reset password"
      routePath="/reset-password/:token"
      description="Reset-password route placeholder using the final dynamic segment shape."
    />
  );
}
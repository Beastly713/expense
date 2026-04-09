import { ProtectedRoute } from '@/components/layout/protected-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        title="Onboarding"
        routePath="/onboarding"
        description="Protected onboarding shell is ready. Minimal onboarding UI comes next."
      />
    </ProtectedRoute>
  );
}
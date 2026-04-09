import { ProtectedRoute } from '@/components/layout/protected-route';
import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        title="Settings"
        routePath="/settings"
        description="Protected settings shell is ready. Page UI comes in later phase work."
      />
    </ProtectedRoute>
  );
}
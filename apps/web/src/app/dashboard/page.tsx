import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function DashboardPage() {
  return (
    <RoutePlaceholder
      title="Dashboard"
      routePath="/dashboard"
      description="Dashboard placeholder with room for summary cards, groups, friends, and activity."
    />
  );
}
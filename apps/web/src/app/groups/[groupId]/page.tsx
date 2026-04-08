import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function GroupDetailsPage() {
  return (
    <RoutePlaceholder
      title="Group details"
      routePath="/groups/:groupId"
      description="Group details page placeholder for members, balances, expenses, and activity."
    />
  );
}
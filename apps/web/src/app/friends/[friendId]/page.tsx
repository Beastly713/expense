import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function FriendDetailsPage() {
  return (
    <RoutePlaceholder
      title="Friend details"
      routePath="/friends/:friendId"
      description="Direct-ledger page placeholder for 1:1 expense tracking."
    />
  );
}
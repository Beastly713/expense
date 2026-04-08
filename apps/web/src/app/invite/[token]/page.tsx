import { RoutePlaceholder } from '@/components/layout/route-placeholder';

export default function InviteAcceptancePage() {
  return (
    <RoutePlaceholder
      title="Invite acceptance"
      routePath="/invite/:token"
      description="Invite acceptance placeholder for pending-member join flow."
    />
  );
}
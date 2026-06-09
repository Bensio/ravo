'use client';

import type { AmbassadorProfile } from '@/lib/ambassadors/ambassador-profile';
import { AmbassadorProfileForm } from '@/components/ambassador/ambassador-profile-form';

export function AmbassadorOnboardingForm({
  locale,
  orgName,
  initialProfile,
}: {
  locale: string;
  orgName: string | null;
  initialProfile: AmbassadorProfile;
}) {
  return (
    <AmbassadorProfileForm
      locale={locale}
      orgName={orgName}
      initialProfile={initialProfile}
      variant="onboarding"
    />
  );
}

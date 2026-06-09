'use client';

import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AmbassadorProfileForm } from '@/components/ambassador/ambassador-profile-form';
import { AmbassadorProfileView } from '@/components/ambassador/ambassador-profile-view';
import { Button } from '@/components/ui/button';
import type { AmbassadorProfile } from '@/lib/ambassadors/ambassador-profile';

export function AmbassadorProfilePage({
  locale,
  initialProfile,
}: {
  locale: string;
  initialProfile: AmbassadorProfile;
}) {
  const t = useTranslations('ambassador.profile');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(initialProfile);

  if (editing) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 px-0 text-muted-foreground hover:text-foreground"
          onClick={() => setEditing(false)}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('cancelEdit')}
        </Button>
        <AmbassadorProfileForm
          locale={locale}
          initialProfile={profile}
          variant="edit"
          onSaved={(next) => {
            setProfile(next);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <AmbassadorProfileView
      profile={profile}
      onEdit={() => setEditing(true)}
      onAvatarUpdated={(avatarUrl) => setProfile((p) => ({ ...p, avatarUrl }))}
    />
  );
}

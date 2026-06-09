'use client';

import { ChevronsUpDown } from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';
import { switchActiveOrgAction } from '@/lib/auth/org-actions';
import { cn } from '@/lib/utils';

type OrgOption = { id: string; slug: string; name: string };

export function OrgSwitcher({
  locale,
  orgs,
  currentOrgId,
  className,
}: {
  locale: string;
  orgs: OrgOption[];
  currentOrgId: string;
  className?: string;
}) {
  if (orgs.length <= 1) {
    return null;
  }

  return (
    <div className={cn('relative inline-flex max-w-[14rem]', className)}>
      <NativeSelect
        className="h-9 cursor-pointer appearance-none py-1.5 pl-3 pr-9 font-medium hover:bg-muted/80 focus:ring-2 focus:ring-ring"
        value={currentOrgId}
        aria-label="Switch organization"
        onChange={async (e) => {
          const org = orgs.find((o) => o.id === e.target.value);
          if (!org) return;
          await switchActiveOrgAction(locale, org.slug, org.id);
        }}
      >
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </NativeSelect>
      <ChevronsUpDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}

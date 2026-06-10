'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type FestivalSection = 'edition' | 'program' | 'shortcuts';

export function FestivalSectionNav({
  active,
  onChange,
}: {
  active: FestivalSection;
  onChange: (section: FestivalSection) => void;
}) {
  const t = useTranslations('admin.festivals.nav');

  const items: Array<{ id: FestivalSection; label: string }> = [
    { id: 'edition', label: t('edition') },
    { id: 'program', label: t('program') },
    { id: 'shortcuts', label: t('shortcuts') },
  ];

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1"
      aria-label={t('ariaLabel')}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-current={active === item.id ? 'true' : undefined}
          onClick={() => onChange(item.id)}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            active === item.id
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

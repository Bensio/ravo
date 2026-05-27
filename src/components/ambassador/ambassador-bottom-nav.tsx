import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

const NAV_ITEMS = [
  { key: 'home', href: 'home' },
  { key: 'share', href: 'share' },
  { key: 'stats', href: 'stats' },
  { key: 'rewards', href: 'rewards' },
  { key: 'community', href: 'community' },
  { key: 'profile', href: 'profile' },
] as const;

export async function AmbassadorBottomNav({ locale }: { locale: string }) {
  const t = await getTranslations('ambassador.nav');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-border bg-card">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.key}
          href={`/${locale}/app/${item.href}`}
          className="flex flex-1 flex-col items-center py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}

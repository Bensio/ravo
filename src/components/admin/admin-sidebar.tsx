import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

const NAV_ITEMS = [
  { key: 'overview', href: 'overview' },
  { key: 'ambassadors', href: 'ambassadors' },
  { key: 'tracklinks', href: 'tracklinks' },
  { key: 'salesFeed', href: 'sales-feed' },
  { key: 'rewards', href: 'rewards' },
  { key: 'settings', href: 'settings' },
] as const;

export async function AdminSidebar({
  locale,
  orgSlug,
}: {
  locale: string;
  orgSlug: string;
}) {
  const t = await getTranslations('admin.nav');

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card p-4">
      <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Ravo
      </p>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={`/${locale}/${orgSlug}/${item.href}`}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

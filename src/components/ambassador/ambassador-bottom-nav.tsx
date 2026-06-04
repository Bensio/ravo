import { getTranslations } from 'next-intl/server';
import { AmbassadorNavLink } from './ambassador-nav-link';
import { AMBASSADOR_NAV_ITEMS } from './ambassador-nav-config';

export async function AmbassadorBottomNav({ locale }: { locale: string }) {
  const t = await getTranslations('ambassador.nav');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/[0.06] bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg">
        {AMBASSADOR_NAV_ITEMS.map((item) => (
          <AmbassadorNavLink
            key={item.key}
            href={`/${locale}/app/${item.href}`}
            label={t(item.key)}
            iconName={item.iconName}
          />
        ))}
      </div>
    </nav>
  );
}

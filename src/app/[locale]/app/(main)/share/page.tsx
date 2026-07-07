import { headers } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { ShareLinks } from '@/components/ambassador/share/share-links';
import { getSessionUser } from '@/lib/auth/session';
import { listAmbassadorLinks } from '@/lib/links/list-ambassador-links';
import { createClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ locale: string }> };

export default async function SharePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getSessionUser();
  let initialLinks: Awaited<ReturnType<typeof listAmbassadorLinks>> | null = null;
  if (user) {
    try {
      const supabase = await createClient();
      const host = (await headers()).get('host') ?? undefined;
      initialLinks = await listAmbassadorLinks(supabase, host);
    } catch {
      initialLinks = null;
    }
  }
  return (
    <main className="p-6 md:p-8">
      <ShareLinks locale={locale} initialLinks={initialLinks} />
    </main>
  );
}

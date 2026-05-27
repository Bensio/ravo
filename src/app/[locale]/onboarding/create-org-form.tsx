'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

export function CreateOrgForm({ locale }: { locale: string }) {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('create_organization', {
      p_name: name.trim(),
      p_slug: slug.trim(),
      p_country: 'NL',
    });
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.push(`/${locale}/${slug.trim()}/overview`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <div>
        <label htmlFor="org-name" className="mb-1 block text-sm font-medium">
          {t('orgName')}
        </label>
        <input
          id="org-name"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="org-slug" className="mb-1 block text-sm font-medium">
          {t('orgSlug')}
        </label>
        <input
          id="org-slug"
          required
          pattern="^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('creating') : t('create')}
      </Button>
    </form>
  );
}

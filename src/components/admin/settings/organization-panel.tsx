'use client';

import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  ORG_COUNTRIES,
  ORG_CURRENCIES,
  ORG_LOCALES,
  ORG_TIMEZONES,
  slugifyOrgName,
  type OrgCountry,
  type OrgCurrency,
  type OrgLocale,
  type OrgSettings,
  type OrgTimezone,
} from '@/lib/org/org-settings';

const inputClass =
  'w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-primary/40';

export function OrganizationPanel({
  orgSlug,
  locale,
  initialSettings,
  canEdit,
  canEditBilling,
}: {
  orgSlug: string;
  locale: string;
  initialSettings: OrgSettings | null;
  canEdit: boolean;
  canEditBilling: boolean;
}) {
  const t = useTranslations('admin.settings.organization');
  const router = useRouter();
  const [settings, setSettings] = useState<OrgSettings | null>(initialSettings);
  const [name, setName] = useState(initialSettings?.name ?? '');
  const [slug, setSlug] = useState(initialSettings?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(false);
  const [country, setCountry] = useState<OrgCountry>(initialSettings?.country ?? 'NL');
  const [defaultCurrency, setDefaultCurrency] = useState<OrgCurrency>(
    initialSettings?.defaultCurrency ?? 'EUR',
  );
  const [defaultTimezone, setDefaultTimezone] = useState<OrgTimezone>(
    initialSettings?.defaultTimezone ?? 'Europe/Amsterdam',
  );
  const [defaultLocale, setDefaultLocale] = useState<OrgLocale>(
    initialSettings?.defaultLocale ?? 'en',
  );
  const [billingEmail, setBillingEmail] = useState(initialSettings?.billingEmail ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialSettings) return;
    setSettings(initialSettings);
    setName(initialSettings.name);
    setSlug(initialSettings.slug);
    setCountry(initialSettings.country);
    setDefaultCurrency(initialSettings.defaultCurrency);
    setDefaultTimezone(initialSettings.defaultTimezone);
    setDefaultLocale(initialSettings.defaultLocale);
    setBillingEmail(initialSettings.billingEmail ?? '');
    setSlugTouched(false);
    setError(null);
  }, [initialSettings]);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugifyOrgName(value));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/${orgSlug}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        country,
        defaultCurrency,
        defaultTimezone,
        defaultLocale,
        ...(canEditBilling ? { billingEmail: billingEmail.trim() || null } : {}),
      }),
    });

    if (res.ok) {
      const body = (await res.json()) as { settings: OrgSettings };
      setSettings(body.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      if (body.settings.slug !== orgSlug) {
        router.push(`/${locale}/${body.settings.slug}/settings?section=organization`);
        router.refresh();
      } else {
        router.refresh();
      }
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'error');
    }

    setSaving(false);
  }

  if (!settings) {
    return (
      <div className="ravo-glass-panel flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('loading')}
      </div>
    );
  }

  const slugChanged = slug.trim().toLowerCase() !== settings.slug;

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="ravo-glass-panel space-y-6 p-6 md:p-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="org-name" className="mb-1 block text-xs text-muted-foreground">
            {t('nameLabel')}
          </label>
          <input
            id="org-name"
            required
            readOnly={!canEdit}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="org-slug" className="mb-1 block text-xs text-muted-foreground">
            {t('slugLabel')}
          </label>
          <input
            id="org-slug"
            required
            readOnly={!canEdit}
            pattern="^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className={`${inputClass} font-mono`}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t('slugHint', { slug: slug.trim() || settings.slug })}
          </p>
          {slugChanged && canEdit && (
            <p className="mt-1 text-xs text-amber-400">{t('slugChangeWarning')}</p>
          )}
        </div>

        <div>
          <label htmlFor="org-country" className="mb-1 block text-xs text-muted-foreground">
            {t('countryLabel')}
          </label>
          <select
            id="org-country"
            disabled={!canEdit}
            value={country}
            onChange={(e) => setCountry(e.target.value as OrgCountry)}
            className={inputClass}
          >
            {ORG_COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {t(`countries.${code}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="org-currency" className="mb-1 block text-xs text-muted-foreground">
            {t('currencyLabel')}
          </label>
          <select
            id="org-currency"
            disabled={!canEdit}
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value as OrgCurrency)}
            className={inputClass}
          >
            {ORG_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="org-timezone" className="mb-1 block text-xs text-muted-foreground">
            {t('timezoneLabel')}
          </label>
          <select
            id="org-timezone"
            disabled={!canEdit}
            value={defaultTimezone}
            onChange={(e) => setDefaultTimezone(e.target.value as OrgTimezone)}
            className={inputClass}
          >
            {ORG_TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace('_', ' ')}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">{t('timezoneHint')}</p>
        </div>

        <div>
          <label htmlFor="org-locale" className="mb-1 block text-xs text-muted-foreground">
            {t('localeLabel')}
          </label>
          <select
            id="org-locale"
            disabled={!canEdit}
            value={defaultLocale}
            onChange={(e) => setDefaultLocale(e.target.value as OrgLocale)}
            className={inputClass}
          >
            {ORG_LOCALES.map((code) => (
              <option key={code} value={code}>
                {t(`locales.${code}`)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">{t('localeHint')}</p>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="org-billing-email" className="mb-1 block text-xs text-muted-foreground">
            {t('billingEmailLabel')}
          </label>
          <input
            id="org-billing-email"
            type="email"
            readOnly={!canEditBilling}
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            placeholder={t('billingEmailPlaceholder')}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {canEditBilling ? t('billingEmailHint') : t('billingEmailOwnerOnly')}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {t(
            `errors.${error}` as
              | 'errors.invalid_name'
              | 'errors.invalid_slug'
              | 'errors.slug_taken'
              | 'errors.invalid_billing_email'
              | 'errors.db_error'
              | 'errors.error',
          )}
        </p>
      )}

      {canEdit && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? t('saving') : t('save')}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <Check className="h-4 w-4" />
              {t('saved')}
            </span>
          )}
        </div>
      )}
    </form>
  );
}

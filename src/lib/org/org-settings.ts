import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';

export const ORG_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
export const ORG_COUNTRIES = [
  'NL',
  'BE',
  'DE',
  'GB',
  'IE',
  'FR',
  'ES',
  'PT',
  'AT',
  'CH',
  'LU',
  'DK',
  'SE',
  'NO',
  'FI',
  'PL',
  'IT',
] as const;
export const ORG_CURRENCIES = ['EUR', 'GBP', 'USD'] as const;
export const ORG_LOCALES = ['en', 'nl'] as const;
export const ORG_TIMEZONES = [
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Lisbon',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/Copenhagen',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Helsinki',
  'Europe/Warsaw',
  'Europe/Rome',
] as const;

export type OrgCountry = (typeof ORG_COUNTRIES)[number];
export type OrgCurrency = (typeof ORG_CURRENCIES)[number];
export type OrgLocale = (typeof ORG_LOCALES)[number];
export type OrgTimezone = (typeof ORG_TIMEZONES)[number];

export type OrgSettings = {
  id: string;
  name: string;
  slug: string;
  country: OrgCountry;
  defaultCurrency: OrgCurrency;
  defaultTimezone: OrgTimezone;
  defaultLocale: OrgLocale;
  billingEmail: string | null;
  logoUrl: string | null;
  createdAt: string;
};

export type OrgSettingsPatch = {
  name?: string;
  slug?: string;
  country?: OrgCountry;
  defaultCurrency?: OrgCurrency;
  defaultTimezone?: OrgTimezone;
  defaultLocale?: OrgLocale;
  billingEmail?: string | null;
};

export type UpdateOrgSettingsResult =
  | { ok: true; settings: OrgSettings }
  | {
      ok: false;
      error:
        | 'invalid_name'
        | 'invalid_slug'
        | 'slug_taken'
        | 'invalid_country'
        | 'invalid_currency'
        | 'invalid_locale'
        | 'invalid_timezone'
        | 'invalid_billing_email'
        | 'not_found'
        | 'db_error';
    };

export function slugifyOrgName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

function mapRow(row: {
  id: string;
  name: string;
  slug: string;
  country: string;
  default_currency: string;
  default_timezone: string;
  default_locale: string;
  billing_email: string | null;
  logo_url: string | null;
  created_at: string;
}): OrgSettings {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country as OrgCountry,
    defaultCurrency: row.default_currency as OrgCurrency,
    defaultTimezone: row.default_timezone as OrgTimezone,
    defaultLocale: row.default_locale as OrgLocale,
    billingEmail: row.billing_email,
    logoUrl: row.logo_url,
    createdAt: row.created_at,
  };
}

export const getOrgSettings = cache(async (organizationId: string): Promise<OrgSettings | null> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organizations')
    .select(
      'id, name, slug, country, default_currency, default_timezone, default_locale, billing_email, logo_url, created_at',
    )
    .eq('id', organizationId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error('get org settings failed', { message: error.message });
    }
    return null;
  }

  return mapRow(data);
});

function isValidEmail(value: string): boolean {
  return value.includes('@') && value.includes('.');
}

export type ValidateOrgSettingsResult =
  | { ok: true; patch: OrgSettingsPatch }
  | Extract<UpdateOrgSettingsResult, { ok: false }>;

export function validateOrgSettingsPatch(
  patch: OrgSettingsPatch,
  options?: { allowBillingEmail?: boolean },
): ValidateOrgSettingsResult {
  const next: OrgSettingsPatch = {};

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name.length < 2) {
      return { ok: false, error: 'invalid_name' };
    }
    next.name = name;
  }

  if (patch.slug !== undefined) {
    const slug = patch.slug.trim().toLowerCase();
    if (!ORG_SLUG_RE.test(slug)) {
      return { ok: false, error: 'invalid_slug' };
    }
    next.slug = slug;
  }

  if (patch.country !== undefined) {
    if (!ORG_COUNTRIES.includes(patch.country)) {
      return { ok: false, error: 'invalid_country' };
    }
    next.country = patch.country;
  }

  if (patch.defaultCurrency !== undefined) {
    if (!ORG_CURRENCIES.includes(patch.defaultCurrency)) {
      return { ok: false, error: 'invalid_currency' };
    }
    next.defaultCurrency = patch.defaultCurrency;
  }

  if (patch.defaultLocale !== undefined) {
    if (!ORG_LOCALES.includes(patch.defaultLocale)) {
      return { ok: false, error: 'invalid_locale' };
    }
    next.defaultLocale = patch.defaultLocale;
  }

  if (patch.defaultTimezone !== undefined) {
    if (!ORG_TIMEZONES.includes(patch.defaultTimezone)) {
      return { ok: false, error: 'invalid_timezone' };
    }
    next.defaultTimezone = patch.defaultTimezone;
  }

  if (patch.billingEmail !== undefined && options?.allowBillingEmail) {
    if (patch.billingEmail === null || patch.billingEmail === '') {
      next.billingEmail = null;
    } else {
      const email = patch.billingEmail.trim().toLowerCase();
      if (!isValidEmail(email)) {
        return { ok: false, error: 'invalid_billing_email' };
      }
      next.billingEmail = email;
    }
  }

  return { ok: true, patch: next };
}

export async function updateOrgSettings(
  organizationId: string,
  patch: OrgSettingsPatch,
  options?: { allowBillingEmail?: boolean },
): Promise<UpdateOrgSettingsResult> {
  const validated = validateOrgSettingsPatch(patch, options);
  if (!validated.ok) {
    return validated;
  }

  const updates = validated.patch;
  if (Object.keys(updates).length === 0) {
    const current = await getOrgSettings(organizationId);
    if (!current) {
      return { ok: false, error: 'not_found' };
    }
    return { ok: true, settings: current };
  }

  const admin = createAdminClient();

  if (updates.slug) {
    const { data: taken } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', updates.slug)
      .neq('id', organizationId)
      .maybeSingle();

    if (taken) {
      return { ok: false, error: 'slug_taken' };
    }
  }
  const { data, error } = await admin
    .from('organizations')
    .update({
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.slug !== undefined ? { slug: updates.slug } : {}),
      ...(updates.country !== undefined ? { country: updates.country } : {}),
      ...(updates.defaultCurrency !== undefined
        ? { default_currency: updates.defaultCurrency }
        : {}),
      ...(updates.defaultTimezone !== undefined
        ? { default_timezone: updates.defaultTimezone }
        : {}),
      ...(updates.defaultLocale !== undefined ? { default_locale: updates.defaultLocale } : {}),
      ...(updates.billingEmail !== undefined ? { billing_email: updates.billingEmail } : {}),
    })
    .eq('id', organizationId)
    .select(
      'id, name, slug, country, default_currency, default_timezone, default_locale, billing_email, logo_url, created_at',
    )
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      return { ok: false, error: 'slug_taken' };
    }
    console.error('update org settings failed', { message: error?.message });
    return { ok: false, error: 'db_error' };
  }

  return { ok: true, settings: mapRow(data) };
}

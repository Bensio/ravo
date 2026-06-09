import { describe, expect, it } from 'vitest';
import { slugifyOrgName, validateOrgSettingsPatch } from '@/lib/org/org-settings';

describe('slugifyOrgName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyOrgName('SVD Marketing')).toBe('svd-marketing');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugifyOrgName('  --My Org--  ')).toBe('my-org');
  });
});

describe('validateOrgSettingsPatch', () => {
  it('accepts a valid patch', () => {
    const result = validateOrgSettingsPatch({
      name: 'SVD Marketing',
      slug: 'svd-marketing',
      country: 'NL',
      defaultCurrency: 'EUR',
      defaultTimezone: 'Europe/Amsterdam',
      defaultLocale: 'nl',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.name).toBe('SVD Marketing');
      expect(result.patch.slug).toBe('svd-marketing');
    }
  });

  it('rejects short names', () => {
    const result = validateOrgSettingsPatch({ name: 'A' });
    expect(result).toEqual({ ok: false, error: 'invalid_name' });
  });

  it('rejects invalid slugs', () => {
    const result = validateOrgSettingsPatch({ slug: 'My Org!' });
    expect(result).toEqual({ ok: false, error: 'invalid_slug' });
  });

  it('rejects billing email without permission flag', () => {
    const result = validateOrgSettingsPatch({ billingEmail: 'finance@test.nl' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.billingEmail).toBeUndefined();
    }
  });

  it('validates billing email when allowed', () => {
    const result = validateOrgSettingsPatch(
      { billingEmail: 'finance@test.nl' },
      { allowBillingEmail: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.billingEmail).toBe('finance@test.nl');
    }
  });
});

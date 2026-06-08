import { describe, expect, it } from 'vitest';
import { getOrgSwitchPath, getPostLoginPath, pickLandingMembership } from './post-login-redirect';

describe('post-login redirect', () => {
  it('sends users with no memberships to onboarding', () => {
    expect(getPostLoginPath('en', [])).toBe('/en/onboarding');
  });

  it('sends staff to admin overview', () => {
    const path = getPostLoginPath('en', [
      { role: 'owner', org: { slug: 'sun-splash' } },
    ]);
    expect(path).toBe('/en/sun-splash/overview');
  });

  it('sends ambassador-only users to the ambassador app', () => {
    const path = getPostLoginPath('nl', [
      { role: 'ambassador', org: { slug: 'sun-splash' } },
    ]);
    expect(path).toBe('/nl/app/home');
  });

  it('prefers staff membership when user has both staff and ambassador roles', () => {
    const landing = pickLandingMembership([
      { role: 'ambassador', org: { slug: 'fest-a' } },
      { role: 'manager', org: { slug: 'fest-b' } },
    ]);
    expect(landing?.org.slug).toBe('fest-b');
    expect(getPostLoginPath('en', [
      { role: 'ambassador', org: { slug: 'fest-a' } },
      { role: 'manager', org: { slug: 'fest-b' } },
    ])).toBe('/en/fest-b/overview');
  });

  it('routes org switch by role', () => {
    expect(
      getOrgSwitchPath('en', { role: 'analyst', org: { slug: 'fest-x' } }),
    ).toBe('/en/fest-x/overview');
    expect(
      getOrgSwitchPath('en', { role: 'ambassador', org: { slug: 'fest-x' } }),
    ).toBe('/en/app/home');
  });
});

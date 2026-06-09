export const PERMISSIONS = {
  'org.update': ['owner', 'admin'],
  'org.delete': ['owner'],
  'org.billing': ['owner'],
  'org.members.invite': ['owner', 'admin'],
  'org.members.update': ['owner', 'admin'],
  'org.integrations': ['owner', 'admin'],
  'campaign.read': ['owner', 'admin', 'manager', 'analyst'],
  'campaign.create': ['owner', 'admin', 'manager'],
  'campaign.update': ['owner', 'admin', 'manager'],
  'campaign.archive': ['owner', 'admin'],
  'ambassador.read': ['owner', 'admin', 'manager', 'analyst'],
  'ambassador.invite': ['owner', 'admin', 'manager'],
  'ambassador.suspend': ['owner', 'admin', 'manager'],
  'reward.rule.create': ['owner', 'admin', 'manager'],
  'reward.fulfill': ['owner', 'admin', 'manager'],
  'reward.confirm': ['owner', 'admin', 'manager'],
  'reward.reverse': ['owner', 'admin'],
  'payout.batch.create': ['owner', 'admin'],
  'payout.batch.submit': ['owner', 'admin'],
  'attribution.reassign': ['owner', 'admin'],
  'report.export': ['owner', 'admin', 'manager', 'analyst'],
  'order.read': ['owner', 'admin', 'manager', 'analyst'],
  'order.purge_test': ['owner', 'admin'],
  'link.read': ['owner', 'admin', 'manager', 'analyst'],
  'link.create': ['owner', 'admin', 'manager'],
  'link.update': ['owner', 'admin', 'manager'],
  'link.delete': ['owner', 'admin', 'manager'],
  'self.rewards.read': ['ambassador'],
  'self.links.read': ['owner', 'admin', 'manager', 'ambassador'],
  'self.profile.read': ['ambassador'],
  'self.profile.update': ['ambassador'],
  'self.opportunities.accept': ['ambassador'],
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type Role = (typeof PERMISSIONS)[Permission][number];

export const STAFF_ROLES = ['owner', 'admin', 'manager', 'analyst'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role: Role): role is StaffRole {
  return (STAFF_ROLES as readonly Role[]).includes(role);
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

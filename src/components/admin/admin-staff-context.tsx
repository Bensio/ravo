'use client';

import { createContext, useContext, useMemo } from 'react';
import { roleHasPermission, type Permission, type Role } from '@/lib/auth/permissions';

type AdminStaffContextValue = {
  role: Role;
  activeEventName: string | null;
};

const AdminStaffContext = createContext<AdminStaffContextValue | null>(null);

export function AdminStaffProvider({
  role,
  activeEventName,
  children,
}: {
  role: Role;
  activeEventName: string | null;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ role, activeEventName }),
    [role, activeEventName],
  );

  return <AdminStaffContext.Provider value={value}>{children}</AdminStaffContext.Provider>;
}

export function useAdminStaff() {
  const ctx = useContext(AdminStaffContext);
  if (!ctx) {
    throw new Error('useAdminStaff must be used within AdminStaffProvider');
  }
  return ctx;
}

export function useAdminCan(permission: Permission) {
  const { role } = useAdminStaff();
  return roleHasPermission(role, permission);
}

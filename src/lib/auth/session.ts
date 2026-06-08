import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type SessionUser = {
  id: string;
  email: string;
};

async function getSessionUserImpl(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  return { id: user.id, email: user.email };
}

export const getSessionUser = cache(getSessionUserImpl);

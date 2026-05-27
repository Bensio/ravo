import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export async function AdminHeader({
  orgName,
  email,
}: {
  orgName: string;
  email: string;
}) {
  async function signOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div>
        <p className="text-sm font-medium">{orgName}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </header>
  );
}

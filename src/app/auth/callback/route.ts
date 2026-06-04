import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/en/onboarding';
  const authError = searchParams.get('error');
  const errorCode = searchParams.get('error_code');

  if (authError) {
    const login = new URL(`${origin}/en/login`);
    login.searchParams.set('error', 'auth');
    if (errorCode === 'otp_expired') {
      login.searchParams.set('reason', 'expired');
    }
    return NextResponse.redirect(login);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const login = new URL(`${origin}/en/login`);
  login.searchParams.set('error', 'auth');
  return NextResponse.redirect(login);
}

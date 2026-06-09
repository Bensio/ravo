/** True when Resend is configured for transactional sends. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getDefaultFromAddress(): string {
  return process.env.RESEND_FROM_DEFAULT?.trim() || 'Ravo <noreply@ravo.fm>';
}

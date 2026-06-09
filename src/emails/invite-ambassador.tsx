import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

type Props = {
  orgName: string;
  inviteUrl: string;
  locale: 'en' | 'nl';
};

const copy = {
  en: {
    preview: (org: string) => `Join ${org} as an ambassador on Ravo`,
    heading: (org: string) => `You're invited to ${org}`,
    body: 'Accept your ambassador invitation to share tracklinks, see your stats, and earn rewards on attributed ticket sales.',
    cta: 'Accept invitation',
    expiry: 'This link expires in 7 days. If you did not expect this email, you can ignore it.',
  },
  nl: {
    preview: (org: string) => `Word ambassadeur voor ${org} op Ravo`,
    heading: (org: string) => `Je bent uitgenodigd voor ${org}`,
    body: 'Accepteer je ambassadeuruitnodiging om tracklinks te delen, je stats te bekijken en beloningen te verdienen op toegeschreven ticketverkopen.',
    cta: 'Uitnodiging accepteren',
    expiry: 'Deze link verloopt over 7 dagen. Als je deze e-mail niet verwachtte, kun je hem negeren.',
  },
} as const;

export function InviteAmbassadorEmail({ orgName, inviteUrl, locale }: Props) {
  const t = copy[locale] ?? copy.en;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview(orgName)}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Heading style={headingStyle}>{t.heading(orgName)}</Heading>
            <Text style={textStyle}>{t.body}</Text>
            <Button href={inviteUrl} style={buttonStyle}>
              {t.cta}
            </Button>
            <Text style={mutedStyle}>{t.expiry}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: '#0a0a0b',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const containerStyle = {
  margin: '0 auto',
  padding: '32px 16px',
  maxWidth: '480px',
};

const headingStyle = {
  color: '#f4f4f5',
  fontSize: '22px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 16px',
};

const textStyle = {
  color: '#a1a1aa',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 24px',
};

const buttonStyle = {
  backgroundColor: '#8b5cf6',
  borderRadius: '8px',
  color: '#fff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
};

const mutedStyle = {
  color: '#71717a',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '24px 0 0',
};

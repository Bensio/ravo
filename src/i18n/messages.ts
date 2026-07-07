import { cache } from 'react';
import type { AbstractIntlMessages } from 'next-intl';

type MessageTree = Record<string, AbstractIntlMessages | string>;

function pickNamespace(
  messages: MessageTree,
  namespace: string,
): [string, AbstractIntlMessages | string] | null {
  const value = messages[namespace];
  if (value === undefined) return null;
  return [namespace, value];
}

export const getScopedMessages = cache(
  async (locale: string, namespaces: string[]): Promise<AbstractIntlMessages> => {
    const messages = (await import(`../messages/${locale}.json`)).default as MessageTree;
    const scoped = Object.fromEntries(
      namespaces
        .map((namespace) => pickNamespace(messages, namespace))
        .filter((entry): entry is [string, AbstractIntlMessages | string] => entry !== null),
    );
    return scoped as AbstractIntlMessages;
  },
);

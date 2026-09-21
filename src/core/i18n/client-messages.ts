export const CLIENT_MESSAGE_PATHS = [
  'common',
  'ai',
  'tools.sprites.ui',
  'pages.blog.messages',
  'pages.pricing',
  'pages.index.messages',
  'generation',
  'workspace',
  'settings.sidebar',
] as const;

type Messages = Record<string, unknown>;

function getMessageAtPath(messages: Messages, path: string) {
  let current: unknown = messages;

  for (const key of path.split('.')) {
    if (
      !current ||
      typeof current !== 'object' ||
      !Object.prototype.hasOwnProperty.call(current, key)
    ) {
      return undefined;
    }

    current = (current as Messages)[key];
  }

  return current;
}

function setMessageAtPath(messages: Messages, path: string, value: unknown) {
  const keys = path.split('.');
  let current = messages;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }

    const next = current[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Messages;
  });
}

export function pickClientMessages(messages: Messages) {
  const pickedMessages: Messages = {};

  CLIENT_MESSAGE_PATHS.forEach((path) => {
    const value = getMessageAtPath(messages, path);
    if (value !== undefined) {
      setMessageAtPath(pickedMessages, path, value);
    }
  });

  return pickedMessages;
}

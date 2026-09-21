import { v5 as uuidv5 } from 'uuid';

const DEFAULT_PROJECT_NAMESPACE = '0ff72f56-72c9-4eb0-b546-0d8361a1f76d';

export function getDefaultProjectId(userId: string) {
  return uuidv5(
    // Historical identity string; changing it would reassign existing default projects.
    `sprite-default-project:${userId}`,
    DEFAULT_PROJECT_NAMESPACE
  );
}

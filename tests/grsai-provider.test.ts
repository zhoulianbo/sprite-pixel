import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { generationModelRoutes } from '../src/config/generation/model-routes';
import { AIMediaType, AITaskStatus, GrsaiProvider } from '../src/extensions/ai';
import { getSettingGroups, getSettings } from '../src/shared/services/settings';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('SpritePixel model routing lives in code and admin exposes only Grsai credentials', async () => {
  assert.deepEqual(generationModelRoutes, {
    character: { provider: 'grsai', model: 'gpt-image-2.5', credits: 2 },
    animation: { provider: 'grsai', model: 'gpt-image-2.5', credits: 3 },
    icon: {
      provider: 'grsai',
      model: 'gpt-image-2.5',
      credits: 3,
      retryCredits: 1,
    },
  });

  const groups = await getSettingGroups();
  const settings = await getSettings();
  assert.equal(
    groups.some((group) => group.name === 'sprite_models'),
    false
  );
  assert.equal(
    settings.some((setting) => setting.name.startsWith('sprite_')),
    false
  );
  assert.deepEqual(
    settings
      .filter((setting) => setting.group === 'grsai')
      .map((setting) => setting.name),
    ['grsai_api_key', 'grsai_base_url', 'grsai_custom_storage']
  );
});

test('Grsai submits async gpt-image generate jobs and maps running tasks', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return Response.json({
      id: '14-5f3cf761-a4bb-486a-8016-77f490998f80',
      status: 'running',
    });
  };

  const provider = new GrsaiProvider({
    apiKey: 'test-key',
    baseUrl: 'https://grsai.example/',
  });
  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.IMAGE,
      model: 'gpt-image-2.5',
      prompt: 'pixel hero',
      options: {
        image_input: ['https://input.example.com/reference.png'],
        size: '1024x1024',
        quality: 'auto',
        background: 'transparent',
      },
    },
  });

  assert.equal(requestUrl, 'https://grsai.example/v1/api/generate');
  assert.equal(requestInit?.method, 'POST');
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    model: 'gpt-image-2.5',
    prompt: 'pixel hero',
    replyType: 'async',
    images: ['https://input.example.com/reference.png'],
    aspectRatio: '1024x1024',
    quality: 'auto',
    background: 'transparent',
  });
  assert.equal(result.taskId, '14-5f3cf761-a4bb-486a-8016-77f490998f80');
  assert.equal(result.taskStatus, AITaskStatus.PROCESSING);
  assert.equal(result.taskInfo?.images, undefined);
});

test('Grsai defaults image generation to a transparent background', async () => {
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    requestInit = init;
    return Response.json({
      id: '14-transparent-default',
      status: 'running',
    });
  };

  const provider = new GrsaiProvider({ apiKey: 'test-key' });
  await provider.generate({
    params: {
      mediaType: AIMediaType.IMAGE,
      model: 'gpt-image-2.5',
      prompt: 'pixel hero',
      options: { aspectRatio: '1024x1024' },
    },
  });

  assert.equal(JSON.parse(String(requestInit?.body)).background, 'transparent');
});

test('Grsai queries asynchronous image and video results', async () => {
  const requestedUrls: string[] = [];
  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    return Response.json({
      id: 'task/id',
      status: 'succeeded',
      progress: 100,
      results: [{ url: 'https://cdn.example.com/result.mp4' }],
    });
  };

  const provider = new GrsaiProvider({ apiKey: 'test-key' });
  const video = await provider.query({
    taskId: 'task/id',
    mediaType: AIMediaType.VIDEO,
  });

  assert.equal(
    requestedUrls[0],
    'https://grsaiapi.com/v1/api/result?id=task%2Fid'
  );
  assert.equal(video.taskStatus, AITaskStatus.SUCCESS);
  assert.equal(
    video.taskInfo?.videos?.[0]?.videoUrl,
    'https://cdn.example.com/result.mp4'
  );
});

test('Grsai maps running and violation statuses without losing provider errors', async () => {
  const responses = [
    { id: 'running-task', status: 'running', progress: 42 },
    { id: 'blocked-task', status: 'violation', error: 'policy blocked' },
  ];
  globalThis.fetch = async () => Response.json(responses.shift());
  const provider = new GrsaiProvider({ apiKey: 'test-key' });

  const running = await provider.query({
    taskId: 'running-task',
    mediaType: AIMediaType.IMAGE,
  });
  const blocked = await provider.query({
    taskId: 'blocked-task',
    mediaType: AIMediaType.IMAGE,
  });

  assert.equal(running.taskStatus, AITaskStatus.PROCESSING);
  assert.equal(blocked.taskStatus, AITaskStatus.FAILED);
  assert.equal(blocked.taskInfo?.errorMessage, 'policy blocked');
});

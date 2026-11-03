import {
  repairPixelImage,
  type PixelRaster,
  type PixelRepairOptions,
} from './pixel-repair';

const scope = self as unknown as {
  onmessage: (
    event: MessageEvent<PixelRaster & { options?: PixelRepairOptions }>
  ) => void;
  postMessage: (value: unknown, transfer?: Transferable[]) => void;
};
scope.onmessage = ({ data }) => {
  try {
    const result = repairPixelImage(data, data.options);
    scope.postMessage({ result }, [result.data.buffer]);
  } catch (error) {
    scope.postMessage({
      error: error instanceof Error ? error.message : 'REPAIR_FAILED',
    });
  }
};

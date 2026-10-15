// IS-Net weights distributed by rembg, pinned by SHA-256 (not a mutable latest URL).
export const BACKGROUND_MODEL = {
  key: 'models/isnet/60920e99/isnet-general-use.onnx',
  bytes: 178648008,
  sha256: '60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a',
  runtimePrefix: 'models/onnxruntime/1.24.3/',
  runtimeFiles: {
    'ort-wasm-simd-threaded.mjs': {
      bytes: 24274,
      sha256:
        '5687566b1bc1c8cf628d76c2ddb16b2a3b81a7997273d4666564880495088e57',
    },
    'ort-wasm-simd-threaded.wasm': {
      bytes: 12361745,
      sha256:
        'be0e129949062ad50290ef94683fac8be5bb6156f709e030b7a5f1661a2f6c17',
    },
  },
} as const;

import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  path.join(root, "node_modules/rollup/dist/native.js"),
  path.join(root, "node_modules/vite/node_modules/rollup/dist/native.js")
];

const fallbackSource = `const native = (() => {
  try {
    return require('./rollup.' + process.platform + '-' + process.arch + '.node');
  } catch (error) {
    try {
      return require('@rollup/wasm-node/dist/native.js');
    } catch (wasmError) {
      throw new Error('Failed to load Rollup native binary and WASM fallback.', { cause: error ?? wasmError });
    }
  }
})();

module.exports.parse = native.parse;
module.exports.parseAsync = native.parseAsync;
module.exports.xxhashBase64Url = native.xxhashBase64Url;
module.exports.xxhashBase36 = native.xxhashBase36;
module.exports.xxhashBase16 = native.xxhashBase16;
`;

for (const target of targets) {
  if (!existsSync(target)) {
    continue;
  }

  writeFileSync(target, fallbackSource, "utf8");
}

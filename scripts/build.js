// Bundles src/index.js into dist/ (ESM + minified) and enforces the size budget.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const BUDGET_KB = 20; // full bundle, min + gzip (see README.md)

const common = { entryPoints: ['src/index.js'], bundle: true, format: 'esm', target: 'es2020' };
await build({ ...common, outfile: 'dist/h3-engine.js' });
await build({ ...common, outfile: 'dist/h3-engine.min.js', minify: true, sourcemap: true });

const min = readFileSync('dist/h3-engine.min.js');
const gz = gzipSync(min).length / 1024;
console.log(`dist/h3-engine.min.js  ${(min.length / 1024).toFixed(1)} KB, ${gz.toFixed(1)} KB gzip`);
if (gz > BUDGET_KB) {
  console.error(`Over the ${BUDGET_KB} KB gzip budget`);
  process.exit(1);
}

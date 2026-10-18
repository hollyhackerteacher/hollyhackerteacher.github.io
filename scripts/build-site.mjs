import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('../_site/', import.meta.url);

// Resolve and check the exact generated directory before recursive cleanup.
const rootPath = resolve(fileURLToPath(root));
const outputPath = resolve(fileURLToPath(output));
if (outputPath !== resolve(rootPath, '_site') || dirname(outputPath) !== rootPath) {
  throw new Error('Refusing to clean outside the generated site directory.');
}
await rm(outputPath, { recursive: true, force: true });

// Publish only website files. Credentials, tooling, tests and Git history never
// enter the Pages artifact. Each Actions run starts with a clean checkout.
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'styles.css', 'script.js', 'shop.mjs', 'CNAME', 'shop', 'assets']) {
  await cp(new URL(path, root), new URL(path, output), {
    recursive: true,
    filter: source => !source.split(/[\\/]/).some(part => part.startsWith('.')) &&
      !source.replaceAll('\\', '/').endsWith('/assets/inventory.json')
  });
}

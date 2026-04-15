import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function getSrcPath(name) {
  let src = fileURLToPath(new URL(`../src/${name}.ts`, import.meta.url));
  if (!existsSync(src)) {
    src = fileURLToPath(new URL(`../src/scripts/${name}/index.ts`, import.meta.url));
  }
  return src;
}

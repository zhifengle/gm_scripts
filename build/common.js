import { existsSync } from "fs";
import { resolve } from "path";

export function getSrcPath(name) {
  let src = resolve(__dirname, `../src/${name}.ts`);
  if (!existsSync(src)) {
    src = resolve(__dirname, `../src/scripts/${name}/index.ts`);
  }
  return src;
}

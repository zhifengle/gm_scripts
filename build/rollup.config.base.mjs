import { fileURLToPath } from 'node:url';

export const sourceExtensions = ['.mjs', '.js', '.json', '.node', '.ts'];

export const sharedOutput = {
  sourcemap: false,
};

export const sharedTreeshake = {
  moduleSideEffects: false,
};

export const nodeResolvePluginOptions = {
  extensions: sourceExtensions,
};

export const typescriptPluginOptions = {
  tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  exclude: ['dist/**', 'src/**/*.test.ts'],
};

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import replace from '@rollup/plugin-replace';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import {
  nodeResolvePluginOptions,
  sharedOutput,
  sharedTreeshake,
  typescriptPluginOptions,
} from './rollup.config.base.mjs';
import { getSrcPath } from './common.mjs';

const outputName = process.env.SCRIPT_NAME;

function getHeaderContent(name) {
  const header = fileURLToPath(new URL(`../src/header/${name}.js`, import.meta.url));
  return fs.readFileSync(header, 'utf-8');
}

const extraPlugins = [];
if (process.env.XHR_MODE !== 'fetch') {
  extraPlugins.push(
    replace({
      preventAssignment: true,
      values: {
        __ENV_EXT__: '__ENV_GM__',
      },
    })
  );
}

export default {
  input: getSrcPath(outputName),
  treeshake: sharedTreeshake,
  output: {
    ...sharedOutput,
    name: outputName,
    file: fileURLToPath(new URL(`../scripts/${outputName}.user.js`, import.meta.url)),
    banner: getHeaderContent(outputName),
  },
  plugins: [
    ...extraPlugins,
    nodeResolve(nodeResolvePluginOptions),
    typescript(typescriptPluginOptions),
    commonjs(),
  ],
  external: ['bangumi-data', 'fuse.js'],
};

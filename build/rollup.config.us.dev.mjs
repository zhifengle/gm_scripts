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

function addScriptHeader(name) {
  return {
    name: 'add_script_header',
    intro() {
      const header = fileURLToPath(new URL(`../src/header/${name}.js`, import.meta.url));
      return fs.promises.readFile(header);
    },
  };
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
    file: fileURLToPath(new URL(`../dist/${outputName}.user.js`, import.meta.url)),
  },
  plugins: [
    ...extraPlugins,
    nodeResolve(nodeResolvePluginOptions),
    typescript(typescriptPluginOptions),
    commonjs(),
    addScriptHeader(outputName),
  ],
  external: ['bangumi-data', 'fuse.js'],
};

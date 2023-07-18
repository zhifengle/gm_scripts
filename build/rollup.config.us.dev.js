import fs from 'fs';
import { resolve as pathResolve } from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
// import { terser } from 'rollup-plugin-terser';
import base from './rollup.config.base';
import { getSrcPath } from './common';

// const outputName = name.replace(/-|\d+/g, '_');
const outputName = process.env.SCRIPT_NAME;

function addScriptHeader(name) {
  return {
    name: 'add_script_header',
    intro() {
      const header = pathResolve(__dirname, `../src/header/${name}.js`);
      // @TODO 版本替换
      return fs.promises.readFile(header);
    },
  };
}

let extraPlugins = [replace({ __ENV_EXT__: '__ENV_GM__' })];
if (process.env.XHR_MODE === 'fetch') {
  extraPlugins = [];
}

export default {
  input: getSrcPath(outputName),
  output: {
    name: outputName,
    file: pathResolve(__dirname, `../dist/${outputName}.user.js`),
    // format: 'iife',
    // sourcemap: true
  },
  plugins: [
    ...extraPlugins,
    ...base.plugins,
    resolve(),
    commonjs(),
    addScriptHeader(outputName),
  ],
  external: ['bangumi-data', 'fuse.js'],
};

import fsPromises from 'fs/promises';
import { resolve as pathResolve } from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
// import { terser } from 'rollup-plugin-terser';
import base from './rollup.config.base';

// const outputName = name.replace(/-|\d+/g, '_');
const outputName = process.env.SCRIPT_NAME;

function addScriptHeader(name) {
  return {
    name: 'add_script_header',
    intro() {
      const header = pathResolve(__dirname, `../src/header/${name}.js`);
      // @TODO 版本替换
      return fsPromises.readFile(header);
    },
  };
}

export default {
  input: pathResolve(__dirname, `../src/${outputName}.ts`),
  output: {
    name: outputName,
    file: pathResolve(__dirname, `../scripts/${outputName}.user.js`),
    // format: 'iife',
    // sourcemap: true
  },
  plugins: [
    replace({ __ENV_EXT__: '__ENV_GM__' }),
    ...base.plugins,
    resolve(),
    commonjs(),
    addScriptHeader(outputName),
  ],
};

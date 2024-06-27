import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const OUTPUT_DIR = 'task/dist'

// Workaround: https://github.com/microsoft/azure-pipelines-task-lib/issues/942
const shelljs = () => {
  return {
    name: 'shelljs',
    buildEnd: async () => {
      const dir = join(OUTPUT_DIR, 'node_modules', 'shelljs')
      const dummyFile = join(dir, 'index.js')

      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }

      if (!existsSync(dummyFile)) {
        await writeFile(dummyFile, '// should be empty')
      }
    },
  }
}

export default {
  input: 'task/src/index.ts',
  output: {
    file: `${OUTPUT_DIR}/index.js`,
    format: 'cjs',
  },
  plugins: [nodeResolve(), commonjs(), typescript(), shelljs()],
  external: ['shelljs'],
}

import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // módulos nativos / CommonJS que não devem ser empacotados
        external: ['node-pty', 'electron-store']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // emite CommonJS .cjs para o preload carregar de forma confiável
        // (o projeto é "type":"module", então .js seria tratado como ESM)
        output: { format: 'cjs', entryFileNames: 'index.cjs' }
      }
    }
  },
  renderer: {
    resolve: {
      alias: { '@': resolve('src/renderer') }
    },
    plugins: [react()]
  }
})

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_MASSBLOG_URL: string
  readonly VITE_MASSBLOG_API: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

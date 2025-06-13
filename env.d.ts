//para poder conectarlo a vercel
interface ImportMetaEnv {
  readonly NG_APP_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
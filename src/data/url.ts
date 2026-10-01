// Prefixa URLs internas com o BASE configurável (BASE_PATH). Só para o build (.astro).
export function withBase(path: string): string {
  const raw = import.meta.env.BASE_URL;
  const base = raw.endsWith('/') ? raw : `${raw}/`;
  return base + path.replace(/^\/+/, '');
}

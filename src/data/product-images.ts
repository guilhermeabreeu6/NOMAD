// Só para o build (componentes .astro). NUNCA importar em src/scripts/**.
import type { ImageMetadata } from 'astro';
import v55 from '../../assets/produtos/v55.png';
import v155 from '../../assets/produtos/v155.png';
import v400 from '../../assets/produtos/v400-mix-slim.png';
import elfbar from '../../assets/produtos/elfbar-pro-40k.png';
import type { ModelId } from './catalog';

export const PRODUCT_IMAGES: Record<ModelId, ImageMetadata> = {
  v55,
  v155,
  'v400-mix-slim': v400,
  'elfbar-pro-40k': elfbar,
};

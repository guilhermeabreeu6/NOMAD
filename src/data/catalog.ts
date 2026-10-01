// FONTE ÚNICA de dados do catálogo. Preços e taxas em centavos inteiros.
// Fonte: CLAUDE.md / docs/catalogo.pdf. Trocar preço exige novo PNG em assets/produtos (a imagem traz o preço "queimado").

export type FlavorToken =
  | 'pineapple' | 'grape' | 'mint' | 'menthol' | 'watermelon' | 'peach' | 'melon'
  | 'mango' | 'passion' | 'strawberry' | 'kiwi' | 'cherry' | 'apple' | 'lemonade' | 'tropical';

export const FLAVOR_TOKENS: readonly FlavorToken[] = [
  'pineapple', 'grape', 'mint', 'menthol', 'watermelon', 'peach', 'melon',
  'mango', 'passion', 'strawberry', 'kiwi', 'cherry', 'apple', 'lemonade', 'tropical',
];

export interface Flavor {
  readonly id: string;
  readonly name: string;
  readonly dots: readonly FlavorToken[];
}

export type ModelId = 'v55' | 'v155' | 'v400-mix-slim' | 'elfbar-pro-40k';

export interface Model {
  readonly id: ModelId;
  readonly name: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly priceCents: number;
  readonly flavors: readonly Flavor[];
}

export interface Region {
  readonly id: string;
  readonly label: string;
  readonly feeCents: number;
}

export interface PaymentMethod {
  readonly id: 'pix' | 'debito' | 'credito';
  readonly label: string;
}

export const STORE = {
  name: 'NOMAD puffs',
  city: 'Palmas - TO',
  whatsappE164: '5563981239498',
  whatsappDisplay: '(63) 98123-9498',
} as const;

export const MAX_QTY_PER_ITEM = 10;
export const OTHER_REGION_ID = 'outra' as const;
export const OTHER_REGION_LABEL = 'Outra região, combinar no WhatsApp';

export const MODELS: readonly Model[] = [
  {
    id: 'v55',
    name: 'V55',
    title: 'V55',
    priceCents: 8500,
    flavors: [
      { id: 'pineapple-ice', name: 'Pineapple Ice', dots: ['pineapple'] },
      { id: 'uva-ice', name: 'Uva Ice', dots: ['grape'] },
      { id: 'icy-mint', name: 'Icy Mint', dots: ['mint'] },
    ],
  },
  {
    id: 'v155',
    name: 'V155',
    title: 'V155',
    priceCents: 11000,
    flavors: [
      { id: 'pineapple-ice', name: 'Pineapple Ice', dots: ['pineapple'] },
      { id: 'menthol', name: 'Menthol', dots: ['menthol'] },
      { id: 'grape-ice', name: 'Grape Ice', dots: ['grape'] },
      { id: 'watermelon-ice', name: 'Watermelon Ice', dots: ['watermelon'] },
      { id: 'icy-mint', name: 'Icy Mint', dots: ['mint'] },
    ],
  },
  {
    id: 'v400-mix-slim',
    name: 'V400 Mix Slim',
    title: 'V400',
    subtitle: 'Mix Slim',
    priceCents: 14000,
    flavors: [
      { id: 'icy-mint-peach-grape', name: 'Icy Mint + Peach Grape', dots: ['mint', 'peach'] },
      { id: 'menthol-mighty-melon', name: 'Menthol + Mighty Melon', dots: ['menthol', 'melon'] },
      { id: 'mango-passion-fruit-guava', name: 'Mango + Passion Fruit Guava', dots: ['mango', 'passion'] },
      {
        id: 'strawberry-grape-ice-kiwi-watermelon',
        name: 'Strawberry Grape Ice + Kiwi Watermelon',
        dots: ['strawberry', 'kiwi'],
      },
      { id: 'cherry-grape', name: 'Cherry + Grape', dots: ['cherry', 'grape'] },
    ],
  },
  {
    id: 'elfbar-pro-40k',
    name: 'Elfbar Pro 40K',
    title: 'Elfbar',
    subtitle: 'Pro 40K',
    priceCents: 14000,
    flavors: [
      { id: 'sour-apple-ice', name: 'Sour Apple Ice', dots: ['apple'] },
      { id: 'strawberry-blend', name: 'Strawberry Blend', dots: ['strawberry'] },
      { id: 'pink-lemonade', name: 'Pink Lemonade', dots: ['lemonade'] },
      { id: 'watermelon-peach-frost', name: 'Watermelon + Peach Frost', dots: ['watermelon', 'peach'] },
      { id: 'tropical-baja', name: 'Tropical Baja', dots: ['tropical'] },
    ],
  },
];

export const REGIONS: readonly Region[] = [
  { id: 'q700s-200', label: 'Quadras 700 Sul a 200 Norte/Sul', feeCents: 800 },
  { id: 'q300n-600n', label: 'Quadras 300 Norte a 600 Norte', feeCents: 1000 },
  { id: 'q800-1200', label: 'Quadras 800 a 1200', feeCents: 1000 },
  { id: 'q1300s-1500s', label: 'Quadras 1300 a 1500 Sul', feeCents: 1500 },
  { id: 'santo-amaro', label: 'Santo Amaro', feeCents: 1500 },
  { id: 'lago-norte', label: 'Lago Norte', feeCents: 2000 },
  { id: 'bertaville-aurenys', label: 'Bertaville e Aurenys', feeCents: 3000 },
  { id: 'taquaralto-lago-sul', label: 'Taquaralto e Lago Sul', feeCents: 3500 },
  { id: 'taquari', label: 'Taquari', feeCents: 3500 },
];

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: 'pix', label: 'PIX' },
  { id: 'debito', label: 'Cartão de débito' },
  { id: 'credito', label: 'Cartão de crédito' },
];

export function findModel(id: string): Model | undefined {
  return MODELS.find((m) => m.id === id);
}

export function findFlavor(model: Model, flavorId: string): Flavor | undefined {
  return model.flavors.find((f) => f.id === flavorId);
}

export function findRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function findPayment(id: string): PaymentMethod | undefined {
  return PAYMENT_METHODS.find((p) => p.id === id);
}

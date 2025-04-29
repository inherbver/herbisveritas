// Define a specific type for our mock product data
export interface MockProduct {
  id: string; // Explicitly define id as string
  slug: string;
  title: string;
  imageUrl: string;
  price: number;
  category: {
    id: string;
    name: string;
  };
  description: {
    en: string;
    fr: string;
  };
  longDescription: {
    en: string;
    fr: string;
  };
  isNew?: boolean;
  isOutOfStock?: boolean;
  // Add other product-specific details as needed
}

export const mockProducts: MockProduct[] = [
  {
    id: "1",
    slug: "baume-levres-calendula",
    title: "Baume Lèvres Réparateur au Calendula",
    imageUrl: "/images/products/baume-levres-calendula.webp",
    price: 8.5,
    category: { id: "baumes", name: "Baumes" },
    description: {
      en: "Soothing lip balm with calendula extract.",
      fr: "Baume à lèvres apaisant à l'extrait de calendula.",
    },
    longDescription: {
      en: "Deeply nourishes and repairs dry, chapped lips. Formulated with organic calendula known for its healing properties. Beeswax provides a protective barrier.",
      fr: "Nourrit et répare en profondeur les lèvres sèches et gercées. Formulé avec du calendula bio reconnu pour ses propriétés cicatrisantes. La cire d'abeille offre une barrière protectrice.",
    },
    isNew: true,
    isOutOfStock: false,
  },
  {
    id: "2",
    slug: "huile-massage-relaxante",
    title: "Huile de Massage Relaxante Lavande & Camomille",
    imageUrl: "/images/products/huile-massage-relaxante.webp",
    price: 15.0,
    category: { id: "huiles", name: "Huiles" },
    description: {
      en: "Relaxing massage oil with lavender and chamomile.",
      fr: "Huile de massage relaxante à la lavande et camomille.",
    },
    longDescription: {
      en: "A blend of essential oils designed to promote relaxation and soothe muscle tension. Perfect for a calming evening ritual. Contains sweet almond oil for smooth application.",
      fr: "Un mélange d'huiles essentielles conçu pour favoriser la détente et apaiser les tensions musculaires. Parfait pour un rituel apaisant en soirée. Contient de l'huile d'amande douce pour une application fluide.",
    },
    isNew: false,
    isOutOfStock: false,
  },
  {
    id: "3",
    slug: "encens-purification-sauge",
    title: "Encens de Purification Sauge Blanche",
    imageUrl: "/images/products/encens-sauge.webp",
    price: 6.0,
    category: { id: "encens", name: "Encens" },
    description: {
      en: "White sage incense for energetic purification.",
      fr: "Encens de sauge blanche pour la purification énergétique.",
    },
    longDescription: {
      en: "Traditionally used for cleansing spaces, objects, and the aura. Burn to clear negative energy and invite positivity. Sustainably harvested.",
      fr: "Utilisé traditionnellement pour nettoyer les espaces, les objets et l'aura. À brûler pour éliminer les énergies négatives et inviter la positivité. Récolte durable.",
    },
    isNew: false,
    isOutOfStock: true, // Example out of stock
  },
  {
    id: "4",
    slug: "baton-fumigation-cedre",
    title: "Bâton de Fumigation Cèdre & Romarin",
    imageUrl: "/images/products/fumigation-cedre.webp",
    price: 9.0,
    category: { id: "fumigation", name: "Bâtons de fumigation" },
    description: {
      en: "Cedar and rosemary smudge stick for grounding.",
      fr: "Bâton de fumigation au cèdre et romarin pour l'ancrage.",
    },
    longDescription: {
      en: "A powerful combination for grounding, protection, and mental clarity. Ideal for meditation preparation or clearing stagnant energy. Hand-tied with natural cotton thread.",
      fr: "Une combinaison puissante pour l'ancrage, la protection et la clarté mentale. Idéal pour préparer la méditation ou dégager les énergies stagnantes. Lié à la main avec du fil de coton naturel.",
    },
    isNew: true,
    isOutOfStock: false,
  },
  {
    id: "5",
    slug: "encens-oliban",
    title: "Encens d'Oliban (Boswellia sacra)",
    imageUrl: "/images/products/encens-oliban.webp",
    price: 7.5,
    category: { id: "encens", name: "Encens" },
    description: {
      en: "Pure Olibanum resin incense from Oman.",
      fr: "Encens pur de résine d'Oliban d'Oman.",
    },
    longDescription: {
      en: "High-quality Olibanum resin (Boswellia sacra), also known as Frankincense, harvested in Oman. Used for centuries in spiritual practices for purification, meditation, and creating a sacred atmosphere. Burn on charcoal discs.",
      fr: "Résine d'Oliban (Boswellia sacra) de haute qualité, aussi connue sous le nom de Frankincense, récoltée à Oman. Utilisée depuis des siècles dans les pratiques spirituelles pour la purification, la méditation et la création d'une atmosphère sacrée. À brûler sur des pastilles de charbon.",
    },
    isNew: false,
    isOutOfStock: false,
  },
];

/**
 * Simulates fetching a product by its slug.
 * In a real application, this would be an API call.
 * @param slug The product slug
 * @returns The product data or null if not found
 */
export async function getProductBySlug(slug: string): Promise<MockProduct | null> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 50));

  const product = mockProducts.find((p) => p.slug === slug);
  return product || null;
}

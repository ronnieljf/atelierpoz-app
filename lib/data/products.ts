import { type Product, type ProductAttribute } from '@/types/product';

/**
 * Datos de productos de joyería
 * En producción, estos datos vendrían de una API o base de datos
 */

// Helper para generar imágenes de joyería usando Lorem Picsum
const jewelryImages = {
  ring: (index: number) => [
    `https://picsum.photos/800/800?random=${index + 100}`,
    `https://picsum.photos/800/800?random=${index + 200}`,
    `https://picsum.photos/800/800?random=${index + 300}`,
  ],
  necklace: (index: number) => [
    `https://picsum.photos/800/800?random=${index + 400}`,
    `https://picsum.photos/800/800?random=${index + 500}`,
    `https://picsum.photos/800/800?random=${index + 600}`,
  ],
  bracelet: (index: number) => [
    `https://picsum.photos/800/800?random=${index + 700}`,
    `https://picsum.photos/800/800?random=${index + 800}`,
    `https://picsum.photos/800/800?random=${index + 900}`,
  ],
  earring: (index: number) => [
    `https://picsum.photos/800/800?random=${index + 1000}`,
    `https://picsum.photos/800/800?random=${index + 1100}`,
    `https://picsum.photos/800/800?random=${index + 1200}`,
  ],
  watch: (index: number) => [
    `https://picsum.photos/800/800?random=${index + 1300}`,
    `https://picsum.photos/800/800?random=${index + 1400}`,
    `https://picsum.photos/800/800?random=${index + 1500}`,
  ],
};

// Materiales comunes
const materials = {
  gold: { name: 'Oro 18K', value: 'Gold', price: 150, color: '#FFD700' },
  silver: { name: 'Plata 925', value: 'Silver', price: 50, color: '#C0C0C0' },
  roseGold: { name: 'Oro Rosa', value: 'Rose Gold', price: 120, color: '#E8B4B8' },
  whiteGold: { name: 'Oro Blanco', value: 'White Gold', price: 130, color: '#F5F5DC' },
  platinum: { name: 'Platino', value: 'Platinum', price: 200, color: '#E5E4E2' },
  steel: { name: 'Acero Inoxidable', value: 'Stainless Steel', price: 0, color: '#808080' },
  titanium: { name: 'Titanio', value: 'Titanium', price: 80, color: '#878681' },
};

// Gemas comunes
const gemstones = {
  diamond: { name: 'Diamante', value: 'Diamond', price: 500 },
  sapphire: { name: 'Zafiro', value: 'Sapphire', price: 300 },
  ruby: { name: 'Rubí', value: 'Ruby', price: 350 },
  emerald: { name: 'Esmeralda', value: 'Emerald', price: 400 },
  pearl: { name: 'Perla', value: 'Pearl', price: 200 },
  amethyst: { name: 'Amatista', value: 'Amethyst', price: 100 },
  topaz: { name: 'Topacio', value: 'Topaz', price: 150 },
  citrine: { name: 'Citrino', value: 'Citrine', price: 120 },
  none: { name: 'Sin gema', value: 'No Gemstone', price: 0 },
};

// Tamaños de anillos
const ringSizes = [
  { id: '5', name: 'Talla 5', value: '5', stock: 8 },
  { id: '6', name: 'Talla 6', value: '6', stock: 12 },
  { id: '7', name: 'Talla 7', value: '7', stock: 15 },
  { id: '8', name: 'Talla 8', value: '8', stock: 18 },
  { id: '9', name: 'Talla 9', value: '9', stock: 12 },
  { id: '10', name: 'Talla 10', value: '10', stock: 8 },
];

// Tamaños de pulseras
const braceletSizes = [
  { id: 'small', name: 'Pequeña (16cm)', value: 'S', stock: 10 },
  { id: 'medium', name: 'Mediana (18cm)', value: 'M', stock: 15 },
  { id: 'large', name: 'Grande (20cm)', value: 'L', stock: 12 },
];

// Generar productos de joyería
const generateJewelryProducts = (): Product[] => {
  const products: Product[] = [];
  let id = 1;

  // ANILLOS (30 productos)
  const ringNames = [
    'Anillo Solitario Diamante',
    'Anillo Compromiso Clásico',
    'Anillo Eternidad Oro',
    'Anillo Vintage Art Deco',
    'Anillo Moderno Minimalista',
    'Anillo Banda Oro Liso',
    'Anillo Tres Piedras',
    'Anillo Zafiro Azul',
    'Anillo Rubí Corazón',
    'Anillo Esmeralda Verde',
    'Anillo Perla Cultivada',
    'Anillo Amatista Púrpura',
    'Anillo Topacio Azul',
    'Anillo Citrino Dorado',
    'Anillo Diamante Corte Princesa',
    'Anillo Oro Rosa Romántico',
    'Anillo Platino Elegante',
    'Anillo Acero Inoxidable Moderno',
    'Anillo Titanio Ligero',
    'Anillo Vintage Retro',
    'Anillo Banda Ancha',
    'Anillo Delgado Minimalista',
    'Anillo Con Inscripción',
    'Anillo Gemas Múltiples',
    'Anillo Diseño Único',
    'Anillo Clásico Timeless',
    'Anillo Contemporáneo',
    'Anillo Bohemio',
    'Anillo Elegante Formal',
    'Anillo Casual Diario',
  ];

  ringNames.forEach((name, index) => {
    const materialKeys = Object.keys(materials);
    const material = materials[materialKeys[index % materialKeys.length] as keyof typeof materials];
    const gemKeys = Object.keys(gemstones);
    const gem = gemstones[gemKeys[index % gemKeys.length] as keyof typeof gemstones];
    
    // Variar los labels y características según el producto
    const sizeLabel = index % 3 === 0 ? 'Número' : index % 3 === 1 ? 'Talla' : 'Medida';
    const hasGemstone = index % 4 !== 0; // 75% tienen gema, 25% no
    
    const attributes: ProductAttribute[] = [
      {
        id: 'size',
        name: sizeLabel,
        type: 'size',
        required: true,
        variants: ringSizes.map(s => ({ ...s, sku: `RING-${String(id - 1).padStart(3, '0')}-${s.id}` })),
      },
      {
        id: 'material',
        name: 'Material',
        type: 'select',
        required: true,
        variants: [
          { id: 'gold', name: material.name, value: material.value, price: material.price, stock: 20 },
          { id: 'silver', name: materials.silver.name, value: materials.silver.value, price: materials.silver.price, stock: 25 },
          { id: 'roseGold', name: materials.roseGold.name, value: materials.roseGold.value, price: materials.roseGold.price, stock: 18 },
        ],
      },
    ];
    
    // Solo agregar gema si corresponde
    if (hasGemstone) {
      attributes.push({
        id: 'gemstone',
        name: 'Gema',
        type: 'select',
        required: false,
        variants: [
          { id: 'diamond', name: gemstones.diamond.name, value: gemstones.diamond.value, price: gemstones.diamond.price, stock: 15 },
          { id: 'none', name: gemstones.none.name, value: gemstones.none.value, price: 0, stock: 30 },
          { id: 'sapphire', name: gemstones.sapphire.name, value: gemstones.sapphire.value, price: gemstones.sapphire.price, stock: 12 },
        ],
      });
    }
    
    products.push({
      id: String(id++),
      name,
      description: `Hermoso anillo de ${material.name.toLowerCase()}${gem.price > 0 && hasGemstone ? ` con ${gem.name.toLowerCase()}` : ''}. Diseño elegante y atemporal, perfecto para cualquier ocasión.`,
      images: jewelryImages.ring(index),
      basePrice: 199.99 + (index * 15),
      currency: 'USD',
      stock: 30 + (index % 20),
      sku: `RING-${String(id - 1).padStart(3, '0')}`,
      category: 'rings',
      attributes,
      rating: 4.0 + (index % 10) * 0.1,
      reviewCount: 50 + (index * 7),
      tags: ['anillo', 'joyería', material.value.toLowerCase(), gem.value.toLowerCase()],
    });
  });

  // COLLARES (25 productos)
  const necklaceNames = [
    'Collar Perlas Cultivadas',
    'Collar Oro Cadena',
    'Collar Colgante Diamante',
    'Collar Vintage Largo',
    'Collar Minimalista Delgado',
    'Collar Choker Moderno',
    'Collar Esmeralda Verde',
    'Collar Zafiro Azul',
    'Collar Rubí Rojo',
    'Collar Perlas Múltiples',
    'Collar Oro Rosa',
    'Collar Platino Elegante',
    'Collar Acero Inoxidable',
    'Collar Titanio Ligero',
    'Collar Bohemio Largo',
    'Collar Clásico Timeless',
    'Collar Contemporáneo',
    'Collar Colgante Grande',
    'Collar Delicado Fino',
    'Collar Statement',
    'Collar Y Necklace',
    'Collar Lariat',
    'Collar Opera',
    'Collar Princesa',
    'Collar Collar',
  ];

  necklaceNames.forEach((name, index) => {
    const materialKeys = Object.keys(materials);
    const material = materials[materialKeys[index % materialKeys.length] as keyof typeof materials];
    
    // Variar los labels y características según el producto
    const lengthLabel = index % 3 === 0 ? 'Longitud' : index % 3 === 1 ? 'Tamaño' : 'Medida';
    const hasLength = index % 5 !== 0; // 80% tienen longitud, 20% no
    
    const attributes: ProductAttribute[] = [
      {
        id: 'material',
        name: 'Material',
        type: 'select',
        required: true,
        variants: [
          { id: 'gold', name: materials.gold.name, value: materials.gold.value, price: materials.gold.price, stock: 15 },
          { id: 'silver', name: materials.silver.name, value: materials.silver.value, price: materials.silver.price, stock: 20 },
          { id: 'roseGold', name: materials.roseGold.name, value: materials.roseGold.value, price: materials.roseGold.price, stock: 18 },
          { id: 'whiteGold', name: materials.whiteGold.name, value: materials.whiteGold.value, price: materials.whiteGold.price, stock: 12 },
        ],
      },
    ];
    
    // Solo agregar longitud si corresponde
    if (hasLength) {
      attributes.push({
        id: 'length',
        name: lengthLabel,
        type: 'select',
        required: false,
        variants: [
          { id: 'short', name: 'Corto (40cm)', value: '40cm', stock: 20 },
          { id: 'medium', name: 'Mediano (50cm)', value: '50cm', stock: 25 },
          { id: 'long', name: 'Largo (60cm)', value: '60cm', stock: 15 },
        ],
      });
    }
    
    products.push({
      id: String(id++),
      name,
      description: `Elegante collar de ${material.name.toLowerCase()}. Diseño sofisticado que complementa cualquier outfit.`,
      images: jewelryImages.necklace(index),
      basePrice: 249.99 + (index * 20),
      currency: 'USD',
      stock: 25 + (index % 15),
      sku: `NECK-${String(id - 1).padStart(3, '0')}`,
      category: 'necklaces',
      attributes,
      rating: 4.2 + (index % 8) * 0.1,
      reviewCount: 40 + (index * 6),
      tags: ['collar', 'joyería', material.value.toLowerCase()],
    });
  });

  // PULSERAS (20 productos)
  const braceletNames = [
    'Pulsera Oro Banda',
    'Pulsera Perlas Elegante',
    'Pulsera Charm Personalizada',
    'Pulsera Tennis Diamantes',
    'Pulsera Eslabones Oro',
    'Pulsera Delicada Fina',
    'Pulsera Ancha Statement',
    'Pulsera Acero Inoxidable',
    'Pulsera Titanio Moderna',
    'Pulsera Bohemia',
    'Pulsera Vintage',
    'Pulsera Minimalista',
    'Pulsera Gemas Múltiples',
    'Pulsera Oro Rosa',
    'Pulsera Platino',
    'Pulsera Cuff',
    'Pulsera Bangle',
    'Pulsera Link',
    'Pulsera Chain',
    'Pulsera Wrap',
  ];

  braceletNames.forEach((name, index) => {
    const materialKeys = Object.keys(materials);
    const material = materials[materialKeys[index % materialKeys.length] as keyof typeof materials];
    
    // Variar los labels y características según el producto
    const sizeLabel = index % 3 === 0 ? 'Talla' : index % 3 === 1 ? 'Tamaño' : 'Medida';
    const hasSize = index % 4 !== 0; // 75% tienen talla, 25% no (pulseras ajustables)
    
    const attributes: ProductAttribute[] = [
      {
        id: 'material',
        name: 'Material',
        type: 'select',
        required: true,
        variants: [
          { id: 'gold', name: materials.gold.name, value: materials.gold.value, price: materials.gold.price, stock: 15 },
          { id: 'silver', name: materials.silver.name, value: materials.silver.value, price: materials.silver.price, stock: 20 },
          { id: 'steel', name: materials.steel.name, value: materials.steel.value, price: materials.steel.price, stock: 25 },
        ],
      },
    ];
    
    // Solo agregar talla si corresponde
    if (hasSize) {
      attributes.unshift({
        id: 'size',
        name: sizeLabel,
        type: 'size',
        required: true,
        variants: braceletSizes.map(s => ({ ...s, sku: `BRAC-${String(id - 1).padStart(3, '0')}-${s.id}` })),
      });
    }
    
    products.push({
      id: String(id++),
      name,
      description: `Hermosa pulsera de ${material.name.toLowerCase()}. Diseño versátil para uso diario o ocasiones especiales.`,
      images: jewelryImages.bracelet(index),
      basePrice: 179.99 + (index * 18),
      currency: 'USD',
      stock: 28 + (index % 12),
      sku: `BRAC-${String(id - 1).padStart(3, '0')}`,
      category: 'bracelets',
      attributes,
      rating: 4.1 + (index % 9) * 0.1,
      reviewCount: 35 + (index * 5),
      tags: ['pulsera', 'joyería', material.value.toLowerCase()],
    });
  });

  // ARETES (15 productos)
  const earringNames = [
    'Aretes Perlas Clásicos',
    'Aretes Diamante Solitario',
    'Aretes Colgantes Largos',
    'Aretes Stud Oro',
    'Aretes Hoops Dorados',
    'Aretes Esmeralda Verde',
    'Aretes Zafiro Azul',
    'Aretes Rubí Rojo',
    'Aretes Vintage Retro',
    'Aretes Minimalistas',
    'Aretes Statement',
    'Aretes Chandelier',
    'Aretes Drop Elegantes',
    'Aretes Huggie',
    'Aretes Cluster',
  ];

  earringNames.forEach((name, index) => {
    const materialKeys = Object.keys(materials);
    const material = materials[materialKeys[index % materialKeys.length] as keyof typeof materials];
    const gemKeys = Object.keys(gemstones);
    const gem = gemstones[gemKeys[index % gemKeys.length] as keyof typeof gemstones];
    
    // Variar los labels y características según el producto
    const gemstoneLabel = index % 3 === 0 ? 'Gema' : index % 3 === 1 ? 'Piedra' : 'Acento';
    const hasGemstone = index % 5 !== 0; // 80% tienen gema, 20% no
    
    const attributes: ProductAttribute[] = [
      {
        id: 'material',
        name: 'Material',
        type: 'select',
        required: true,
        variants: [
          { id: 'gold', name: materials.gold.name, value: materials.gold.value, price: materials.gold.price, stock: 18 },
          { id: 'silver', name: materials.silver.name, value: materials.silver.value, price: materials.silver.price, stock: 22 },
          { id: 'roseGold', name: materials.roseGold.name, value: materials.roseGold.value, price: materials.roseGold.price, stock: 20 },
        ],
      },
    ];
    
    // Solo agregar gema si corresponde
    if (hasGemstone) {
      attributes.push({
        id: 'gemstone',
        name: gemstoneLabel,
        type: 'select',
        required: false,
        variants: [
          { id: 'diamond', name: gemstones.diamond.name, value: gemstones.diamond.value, price: gemstones.diamond.price, stock: 12 },
          { id: 'pearl', name: gemstones.pearl.name, value: gemstones.pearl.value, price: gemstones.pearl.price, stock: 15 },
          { id: 'none', name: gemstones.none.name, value: gemstones.none.value, price: 0, stock: 30 },
        ],
      });
    }
    
    products.push({
      id: String(id++),
      name,
      description: `Elegantes aretes de ${material.name.toLowerCase()}${gem.price > 0 && hasGemstone ? ` con ${gem.name.toLowerCase()}` : ''}. Diseño sofisticado que realza tu belleza natural.`,
      images: jewelryImages.earring(index),
      basePrice: 149.99 + (index * 22),
      currency: 'USD',
      stock: 32 + (index % 18),
      sku: `EARR-${String(id - 1).padStart(3, '0')}`,
      category: 'earrings',
      attributes,
      rating: 4.3 + (index % 7) * 0.1,
      reviewCount: 45 + (index * 4),
      tags: ['aretes', 'joyería', material.value.toLowerCase(), gem.value.toLowerCase()],
    });
  });

  // RELOJES (10 productos)
  const watchNames = [
    'Reloj Oro Clásico',
    'Reloj Deportivo Acero',
    'Reloj Elegante Formal',
    'Reloj Vintage Retro',
    'Reloj Minimalista Moderno',
    'Reloj Diamante Lujo',
    'Reloj Smartwatch',
    'Reloj Cronógrafo',
    'Reloj Esqueleto',
    'Reloj Diver Profesional',
  ];

  watchNames.forEach((name, index) => {
    const materialKeys = ['steel', 'gold', 'titanium', 'steel', 'steel'];
    const material = materials[materialKeys[index % materialKeys.length] as keyof typeof materials];
    
    // Variar los labels y características según el producto
    const bandLabel = index % 3 === 0 ? 'Correa' : index % 3 === 1 ? 'Banda' : 'Pulsera';
    const hasBand = index % 4 !== 0; // 75% tienen correa, 25% no (relojes con correa fija)
    
    const attributes: ProductAttribute[] = [
      {
        id: 'material',
        name: 'Material',
        type: 'select',
        required: true,
        variants: [
          { id: 'steel', name: materials.steel.name, value: materials.steel.value, price: materials.steel.price, stock: 20 },
          { id: 'gold', name: materials.gold.name, value: materials.gold.value, price: materials.gold.price, stock: 10 },
          { id: 'titanium', name: materials.titanium.name, value: materials.titanium.value, price: materials.titanium.price, stock: 15 },
        ],
      },
    ];
    
    // Solo agregar correa si corresponde
    if (hasBand) {
      attributes.push({
        id: 'band',
        name: bandLabel,
        type: 'select',
        required: true,
        variants: [
          { id: 'leather', name: 'Cuero', value: 'Leather', stock: 15 },
          { id: 'metal', name: 'Metal', value: 'Metal', price: 30, stock: 12 },
          { id: 'silicone', name: 'Silicone', value: 'Silicone', stock: 18 },
        ],
      });
    }
    
    products.push({
      id: String(id++),
      name,
      description: `Reloj elegante de ${material.name.toLowerCase()}. Precisión suiza y diseño atemporal.`,
      images: jewelryImages.watch(index),
      basePrice: 299.99 + (index * 50),
      currency: 'USD',
      stock: 20 + (index % 10),
      sku: `WATCH-${String(id - 1).padStart(3, '0')}`,
      category: 'watches',
      attributes,
      rating: 4.5 + (index % 5) * 0.1,
      reviewCount: 60 + (index * 8),
      tags: ['reloj', 'joyería', material.value.toLowerCase()],
    });
  });

  return products;
};

export const mockProducts: Product[] = generateJewelryProducts();

export function getProductById(id: string): Product | undefined {
  return mockProducts.find((product) => product.id === id);
}

export function getProductsByCategory(category: string): Product[] {
  return mockProducts.filter((product) => product.category === category);
}

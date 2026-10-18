export interface PresetTheme {
  id: string;
  name: string;
  badge: string;
  description: string;
  primary: string;
  primaryHover: string;
  accent: string;
  gradientFrom: string;
  gradientTo: string;
  background: string;
  card: string;
  sidebar: string;
}

export const PRESET_THEMES: PresetTheme[] = [
  {
    id: 'azul',
    name: 'Azul',
    badge: 'Padrão',
    description: 'Azul clássico e profissional.',
    primary: '#009EF7',
    primaryHover: '#0086D1',
    accent: '#00E5FF',
    gradientFrom: '#009EF7',
    gradientTo: '#7239EA',
    background: '#0B0E14',
    card: '#121722',
    sidebar: '#0F131C'
  },
  {
    id: 'verde',
    name: 'Verde',
    badge: 'Vibrante',
    description: 'Verde esmeralda dinâmico.',
    primary: '#10B981',
    primaryHover: '#059669',
    accent: '#34D399',
    gradientFrom: '#10B981',
    gradientTo: '#06B6D4',
    background: '#0B120F',
    card: '#111C18',
    sidebar: '#0E1713'
  },
  {
    id: 'vermelho',
    name: 'Vermelho',
    badge: 'Destaque',
    description: 'Vermelho estilo streaming.',
    primary: '#EF4444',
    primaryHover: '#DC2626',
    accent: '#F87171',
    gradientFrom: '#EF4444',
    gradientTo: '#B91C1C',
    background: '#12090A',
    card: '#1C1012',
    sidebar: '#170D0E'
  },
  {
    id: 'laranja',
    name: 'Laranja',
    badge: 'Quente',
    description: 'Laranja quente e chamativo.',
    primary: '#F97316',
    primaryHover: '#EA580C',
    accent: '#FBBF24',
    gradientFrom: '#F97316',
    gradientTo: '#EF4444',
    background: '#140C08',
    card: '#1F130D',
    sidebar: '#1A100B'
  },
  {
    id: 'roxo',
    name: 'Roxo',
    badge: 'Moderno',
    description: 'Roxo violeta moderno.',
    primary: '#8B5CF6',
    primaryHover: '#7C3AED',
    accent: '#06B6D4',
    gradientFrom: '#8B5CF6',
    gradientTo: '#D946EF',
    background: '#0D0B14',
    card: '#171322',
    sidebar: '#130F1C'
  },
  {
    id: 'dourado',
    name: 'Dourado',
    badge: 'VIP',
    description: 'Amarelo dourado elegante.',
    primary: '#F59E0B',
    primaryHover: '#D97706',
    accent: '#FCD34D',
    gradientFrom: '#F59E0B',
    gradientTo: '#EF4444',
    background: '#120E08',
    card: '#1C170E',
    sidebar: '#16120B'
  },
  {
    id: 'ciano',
    name: 'Ciano',
    badge: 'Claro',
    description: 'Azul claro / turquesa.',
    primary: '#06B6D4',
    primaryHover: '#0891B2',
    accent: '#22D3EE',
    gradientFrom: '#06B6D4',
    gradientTo: '#3B82F6',
    background: '#081014',
    card: '#0E181F',
    sidebar: '#0B141A'
  },
  {
    id: 'rosa',
    name: 'Rosa',
    badge: 'Marcante',
    description: 'Rosa vivo e marcante.',
    primary: '#EC4899',
    primaryHover: '#DB2777',
    accent: '#F472B6',
    gradientFrom: '#EC4899',
    gradientTo: '#8B5CF6',
    background: '#140A12',
    card: '#20101D',
    sidebar: '#1A0D17'
  },
  {
    id: 'preto',
    name: 'Preto (AMOLED)',
    badge: 'Escuro',
    description: 'Fundo 100% preto absoluto.',
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    accent: '#60A5FA',
    gradientFrom: '#3B82F6',
    gradientTo: '#1D4ED8',
    background: '#000000',
    card: '#0D0D0D',
    sidebar: '#080808'
  },
  {
    id: 'cinza',
    name: 'Cinza',
    badge: 'Discreto',
    description: 'Cinza sóbrio e discreto.',
    primary: '#94A3B8',
    primaryHover: '#64748B',
    accent: '#CBD5E1',
    gradientFrom: '#64748B',
    gradientTo: '#334155',
    background: '#0F1115',
    card: '#181B20',
    sidebar: '#131519'
  },
  {
    id: 'verde-limao',
    name: 'Verde Limão',
    badge: 'Chamativo',
    description: 'Verde limão de alta visibilidade.',
    primary: '#84CC16',
    primaryHover: '#65A30D',
    accent: '#A3E635',
    gradientFrom: '#84CC16',
    gradientTo: '#10B981',
    background: '#0C1208',
    card: '#131C0D',
    sidebar: '#10170A'
  },
  {
    id: 'azul-escuro',
    name: 'Azul Escuro',
    badge: 'Sóbrio',
    description: 'Azul escuro / índigo profundo.',
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    accent: '#818CF8',
    gradientFrom: '#6366F1',
    gradientTo: '#A855F7',
    background: '#0B0C16',
    card: '#121422',
    sidebar: '#0E101B'
  }
];

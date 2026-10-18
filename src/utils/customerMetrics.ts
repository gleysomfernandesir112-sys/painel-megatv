import { Customer, Reseller, UserProfile, PartnerAppItemDetail, ResellerRankingItem, PanelGamificationRanking, RankingBadge } from '../types';
import { getSavedCustomerPrice } from '../store/SigmaStore';
import { isPanelMaster } from './panelAuth';

/**
 * Determina com precisão se um cliente é DIRETO do usuário logado ou se pertence a uma revenda da rede.
 * Funciona tanto para Admin Master quanto para Revendedores / Sub-revendedores em qualquer nível hierárquico.
 */
export const isDirectCustomer = (c: Customer, profile?: UserProfile | null): boolean => {
  const sessionUser = typeof window !== 'undefined'
    ? (localStorage.getItem('sigma_session_user') || '').toLowerCase().trim()
    : '';

  const profileUser = (profile?.username || sessionUser || '').toLowerCase().trim();
  const isRootAdmin =
    profileUser === 'admin' ||
    profileUser === 'andre2056' ||
    profile?.role === 'admin' ||
    (profile as any)?.is_admin === true ||
    (profile as any)?.is_franchise_master === true ||
    (profile as any)?.is_master === true ||
    isPanelMaster(profileUser, profile);

  const rawDono = (c.dono || '').trim().toLowerCase();
  const resellerUsername = (c.reseller_username || '').trim().toLowerCase();

  if (isRootAdmin) {
    // Para o Administrador Master Raiz (admin):
    // Clientes diretos são aqueles criados pelo próprio admin ou marcados explicitamente como direto
    if (resellerUsername === 'admin (direto)' || resellerUsername === 'direto' || resellerUsername === 'andre2056') return true;
    if (c.reseller_id === 'master' || c.reseller_id === 'admin') return true;
    if (rawDono === 'andre2056' || resellerUsername === 'andre2056') return true;
    if (profileUser && (rawDono === profileUser || resellerUsername === profileUser)) return true;
    
    // Se não tiver dono ou for admin/master/revendedor genérico
    if (!rawDono || rawDono === 'admin' || rawDono === 'master' || rawDono === 'revendedor') {
      // Confere se o resellerUsername não aponta para uma sub-revenda específica
      if (!resellerUsername || resellerUsername === 'admin' || resellerUsername === 'master' || resellerUsername.includes('admin') || resellerUsername.includes('direto')) {
        return true;
      }
    }
    return false;
  }

  // Para Franquias e Revendedores (ex: Anderson):
  // Clientes diretos são ESTRITAMENTE os criados por ele mesmo
  if (profileUser) {
    if (rawDono === profileUser) return true;
    if (resellerUsername === profileUser) return true;
    if (c.reseller_id && profile?.id && c.reseller_id === profile.id) return true;
  }

  return false;
};

/**
 * Extrai valor monetário descrito nas notas/observações do cliente, se houver.
 * Exemplos aceitos: "[Valor: R$ 35,00]", "R$ 30", "valor: 25", "mensalidade: 40".
 */
export const extractPriceFromNotes = (notes?: string): number | null => {
  if (!notes || typeof notes !== 'string') return null;
  const str = notes.trim();
  if (!str) return null;

  const explicitMatch = str.match(/\[Valor:\s*(?:R\$\s*)?([\d.,]+)\]/i);
  if (explicitMatch) {
    const num = parseFloat(explicitMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) return num;
  }

  const rsMatch = str.match(/R\$\s*([\d]+(?:[.,]\d{1,2})?)/i);
  if (rsMatch) {
    const num = parseFloat(rsMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) return num;
  }

  const labelMatch = str.match(/(?:valor|mensalidade|plano|preco|preço)\s*[:=]?\s*(?:R\$\s*)?([\d]+(?:[.,]\d{1,2})?)/i);
  if (labelMatch) {
    const num = parseFloat(labelMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) return num;
  }

  return null;
};

/**
 * Obtém o valor mensal de assinatura cobrado ao cliente final (R$).
 * Contabiliza estritamente o valor descrito pelo usuário para o cliente:
 * 1. subscription_value (definido na criação ou edição)
 * 2. Preço persistido no servidor/storage para este usuário
 * 3. Preço descrito nas notas internas do cliente
 * 4. Fallback 0 caso o usuário não tenha descrito valor ainda
 */
export const getCustomerPrice = (c: Customer): number => {
  const subVal = Number(c.subscription_value);
  if (!isNaN(subVal) && subVal > 0) return subVal;

  const saved = getSavedCustomerPrice(c.username);
  if (saved > 0) return saved;

  const fromNotes = extractPriceFromNotes(c.notes);
  if (fromNotes && fromNotes > 0) return fromNotes;

  return 0;
};

/**
 * Converte a data de expiração do cliente em objeto Date com segurança.
 */
export const parseExpiryDate = (c: Customer | any): Date | null => {
  if (!c) return null;
  if (c.expiresAt) {
    const d = new Date(c.expiresAt);
    if (!isNaN(d.getTime())) return d;
  }

  const raw = c.expires_at || c.vencimento || c.exp_date || c.expiration;
  if (!raw || raw === '-' || raw === 'Ilimitado') {
    return null;
  }

  const rawStr = String(raw).trim();

  // Se for timestamp numérico Unix (segundos ou ms)
  if (/^\d{10,13}$/.test(rawStr)) {
    const num = parseInt(rawStr, 10);
    const ts = rawStr.length === 10 ? num * 1000 : num;
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
  }

  // Se vier no formato ISO YYYY-MM-DD
  if (rawStr.includes('-') && !rawStr.includes('/')) {
    const d = new Date(rawStr);
    if (!isNaN(d.getTime())) return d;
  }

  // Se vier no formato pt-BR DD/MM/YYYY ou DD/MM/YYYY HH:mm
  const parts = rawStr.split(/[\/\s:]+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const hours = parts[3] ? parseInt(parts[3], 10) : 23;
      const mins = parts[4] ? parseInt(parts[4], 10) : 59;
      const d = new Date(year, month, day, hours, mins, 59);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const fallback = new Date(rawStr);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
};

/**
 * Verifica se um cliente vence dentro de até `days` dias a partir de hoje.
 */
export const isExpiringSoon = (c: Customer, days: number = 7): boolean => {
  // Clientes já vencidos também entram na lista de renovação imediata
  if (c.status === 'EXPIRED') return true;

  const expDate = parseExpiryDate(c);
  if (!expDate) return false;

  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Vence entre -2 dias (recém-vencido) e `days` dias no futuro
  return diffDays >= -2 && diffDays <= days;
};

/**
 * Gera mensagem rápida de aviso/lembrete de vencimento personalizada para o cliente:
 * Exemplo 1: "Olá, {NOME}! 👋\n\n🔔 Sua assinatura vence hoje às 19h.\n\nQuer continuar com o acesso? É só chamar para fazer a renovação. 😉"
 * Exemplo 2: "Olá, {NOME}! 👋\n\n🔔 Sua assinatura vence em 3 dias.\n\nQuer continuar com o acesso? É só chamar para fazer a renovação. 😉"
 * Exemplo 3: "Olá, {NOME}! 👋\n\n🔔 Sua assinatura vence em 60 dias.\n\nQuer continuar com o acesso? É só chamar para fazer a renovação. 😉"
 */
export const generateExpiryReminderMessage = (c: Customer | any): string => {
  const rawName = (c?.name || '').trim();
  const rawUsername = (c?.username || '').trim();
  const nome = (rawName && rawName.toLowerCase() !== 'usuário teste' && rawName.toLowerCase() !== 'desconhecido')
    ? rawName
    : (rawUsername || 'Cliente');

  const expDate = parseExpiryDate(c);
  let tempoTexto = 'está próxima do vencimento.';

  if (expDate) {
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const rawStr = String(c?.expires_at || c?.vencimento || c?.expiresAt || '').trim();
    const hasExplicitTime = rawStr.includes(':');

    const isToday =
      expDate.getDate() === now.getDate() &&
      expDate.getMonth() === now.getMonth() &&
      expDate.getFullYear() === now.getFullYear();

    if (diffMs > 0) {
      if (isToday) {
        if (hasExplicitTime) {
          const hours = expDate.getHours();
          const minutes = expDate.getMinutes();
          const horaFmt = minutes > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`;
          tempoTexto = `vence hoje às ${horaFmt}.`;
        } else {
          tempoTexto = 'vence hoje.';
        }
      } else {
        const oneDayMs = 1000 * 60 * 60 * 24;
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfExp = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
        const diffDays = Math.round((startOfExp - startOfToday) / oneDayMs);

        if (diffDays <= 1) {
          tempoTexto = 'vence em 1 dia.';
        } else {
          tempoTexto = `vence em ${diffDays} dias.`;
        }
      }
    } else {
      // Vencido
      const oneDayMs = 1000 * 60 * 60 * 24;
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfExp = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
      const diasVencido = Math.round((startOfToday - startOfExp) / oneDayMs);

      if (diasVencido <= 0) {
        tempoTexto = 'venceu hoje.';
      } else if (diasVencido === 1) {
        tempoTexto = 'venceu ontem.';
      } else {
        tempoTexto = `venceu há ${diasVencido} dias.`;
      }
    }
  }

  return `Olá, ${nome}! 👋\n\n🔔 Sua assinatura ${tempoTexto}\n\nQuer continuar com o acesso? É só chamar para fazer a renovação. 😉`;
};

/**
 * Retorna contagem regressiva amigável para exibição em badges e lembretes.
 */
export const getExpiryCountdown = (c: Customer | any): { label: string; tone: 'danger' | 'warning' | 'success' } | null => {
  const expDate = parseExpiryDate(c);
  if (!expDate) return null;
  const now = Date.now();
  const diffMs = expDate.getTime() - now;
  const isExp = c?.status === 'EXPIRED' || diffMs <= 0;

  if (isExp) {
    return { label: 'Vencido', tone: 'danger' };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours <= 12) {
    return { label: `${Math.max(1, diffHours)}h restantes`, tone: 'danger' };
  }
  if (diffHours <= 24) {
    return { label: 'Vence hoje', tone: 'warning' };
  }
  if (diffDays <= 2) {
    return { label: '1 dia restante', tone: 'warning' };
  }
  if (diffDays <= 5) {
    return { label: `${diffDays} dias`, tone: 'warning' };
  }

  return { label: `${diffDays} dias restantes`, tone: 'success' };
};

export interface ConsolidatedCustomerMetrics {
  totalClients: number;
  activeClients: number;
  expiredClients: number;
  trialClients: number;
  retentionRate: number;

  // Segmentação Carteira Direta
  directTotal: number;
  directActive: number;
  directExpired: number;
  directTrials: number;
  directCustomers: Customer[];
  directActiveMRR: number;
  directTicketMedio: number;
  directWithPriceCount: number;
  directWithoutPriceCount: number;
  directExpiringSoon: Customer[];
  directExpiringAmount: number;

  // Segmentação Rede de Revendas
  resellerClientsTotal: number;
  resellerClientsActive: number;
  resellerClientsExpired: number;
  resellerClientsTrials: number;
  resellerCustomers: Customer[];
  totalSubresellers: number;
  activeResellers: number;
  blockedResellers: number;
  totalResellerCredits: number;
}

/**
 * Determina se o cliente é ATIVO (não vencido e não bloqueado).
 * Clientes com status 'EXPIRED', 'BLOCKED', ou cuja data de vencimento já expirou (< Date.now()),
 * NUNCA são contabilizados como ativos.
 */
export const isCustomerActive = (c: Customer): boolean => {
  if (c.status === 'EXPIRED' || c.status === 'BLOCKED') return false;
  const exp = parseExpiryDate(c);
  if (exp && exp.getTime() < Date.now()) return false;
  return c.status === 'ACTIVE' || c.status === 'TRIAL' || Boolean(c.is_trial);
};

/**
 * Determina se o cliente deve contabilizar como ativo para a COBRANÇA dos revendedores.
 * Conforme a regra de negócio: todo cliente vencido, bloqueado ou em teste (TRIAL)
 * NÃO deve contabilizar como ativo para a cobrança das revendas.
 */
export const isCustomerActiveForBilling = (c: Customer): boolean => {
  if (c.status === 'EXPIRED' || c.status === 'BLOCKED') return false;
  if (c.status === 'TRIAL' || c.is_trial) return false;
  if (c.status !== 'ACTIVE') return false;

  const exp = parseExpiryDate(c);
  if (exp && exp.getTime() < Date.now()) {
    return false; // Venceu pela data
  }
  return true;
};

export const isRealCustomer = (c: any): boolean => {
  if (!c) return false;
  const role = String(c.role || c.tipo || '').toLowerCase();
  if (role === 'reseller' || role === 'subreseller' || role === 'admin') return false;
  if (c.is_reseller || c.isReseller) return false;
  return true;
};

/**
 * Consolida todas as métricas do painel com segregação estrita entre Carteira Direta e Rede de Revendas.
 */
export const calculateCustomerMetrics = (
  customers: Customer[],
  resellers: Reseller[],
  profile?: UserProfile | null
): ConsolidatedCustomerMetrics => {
  // Garantir que revendedores e administradores jamais entrem no cômputo de clientes
  const validCustomers = (customers || []).filter(isRealCustomer);
  const totalClients = validCustomers.length;
  const activeClients = validCustomers.filter(c => isCustomerActive(c) && !c.is_trial).length;
  const expiredClients = validCustomers.filter(c => !isCustomerActive(c) && c.status !== 'BLOCKED').length;
  const trialClients = validCustomers.filter(c => Boolean(c.is_trial) && isCustomerActive(c)).length;
  const retentionRate = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 100;

  // Separação dos clientes
  const directCustomers: Customer[] = [];
  const resellerCustomers: Customer[] = [];

  validCustomers.forEach(c => {
    if (isDirectCustomer(c, profile)) {
      directCustomers.push(c);
    } else {
      resellerCustomers.push(c);
    }
  });

  const directTotal = directCustomers.length;
  const directActiveCusts = directCustomers.filter(c => isCustomerActive(c) && !c.is_trial);
  const directActive = directActiveCusts.length;
  const directExpired = directCustomers.filter(c => !isCustomerActive(c) && c.status !== 'BLOCKED').length;
  const directTrials = directCustomers.filter(c => Boolean(c.is_trial) && isCustomerActive(c)).length;

  // MRR Real da Carteira Direta (somente assinaturas diretas ativas com valores descritos pelo usuário)
  // Clientes com valor indefinido tem valor mensal fixo de R$ 0,00
  const directActiveMRR = directActiveCusts.reduce((acc, c) => acc + getCustomerPrice(c), 0);
  const directWithPrice = directActiveCusts.filter(c => getCustomerPrice(c) > 0);
  const directTicketMedio = directWithPrice.length > 0 ? directActiveMRR / directWithPrice.length : 0;
  const directWithPriceCount = directWithPrice.length;
  const directWithoutPriceCount = Math.max(0, directTotal - directWithPriceCount);

  // Clientes diretos com vencimento próximo (7 dias)
  const directExpiringSoon = directCustomers.filter(c => isExpiringSoon(c, 7));
  const directExpiringAmount = directExpiringSoon.reduce((acc, c) => acc + getCustomerPrice(c), 0);

  // Clientes em Revendas
  const resellerClientsTotal = resellerCustomers.length;
  const resellerClientsActive = resellerCustomers.filter(c => isCustomerActive(c) && !c.is_trial).length;
  const resellerClientsExpired = resellerCustomers.filter(c => !isCustomerActive(c) && c.status !== 'BLOCKED').length;
  const resellerClientsTrials = resellerCustomers.filter(c => Boolean(c.is_trial) && isCustomerActive(c)).length;

  // Revendas
  const totalSubresellers = resellers.length;
  const activeResellers = resellers.filter(r => r.status === 'ACTIVE').length;
  const blockedResellers = resellers.filter(r => r.status === 'BLOCKED').length;
  const totalResellerCredits = resellers.reduce((acc, r) => acc + (r.credits || 0), 0);

  return {
    totalClients,
    activeClients,
    expiredClients,
    trialClients,
    retentionRate,

    directTotal,
    directActive,
    directExpired,
    directTrials,
    directCustomers,
    directActiveMRR,
    directTicketMedio,
    directWithPriceCount,
    directWithoutPriceCount,
    directExpiringSoon,
    directExpiringAmount,

    resellerClientsTotal,
    resellerClientsActive,
    resellerClientsExpired,
    resellerClientsTrials,
    resellerCustomers,
    totalSubresellers,
    activeResellers,
    blockedResellers,
    totalResellerCredits
  };
};

/**
 * Determina se um revendedor é DIRETO (Nível 1) do usuário logado.
 * Sub-revendas de nível 2, 3, 4 etc. subordinadas a outros revendedores são excluídas.
 */
export const isDirectReseller = (r: Reseller, profile?: UserProfile | null): boolean => {
  const sessionUser = typeof window !== 'undefined'
    ? (localStorage.getItem('sigma_session_user') || '').toLowerCase().trim()
    : '';
  const profileUser = (profile?.username || sessionUser || 'admin').toLowerCase().trim();
  const isRootAdmin =
    profileUser === 'admin' ||
    profileUser === 'andre2056' ||
    profile?.role === 'admin' ||
    (profile as any)?.is_admin === true ||
    (profile as any)?.is_franchise_master === true ||
    (profile as any)?.is_master === true ||
    isPanelMaster(profileUser, profile);

  // Se direto for explicitamente definido:
  if ((r as any).direto === false) return false;
  if ((r as any).direto === true) return true;

  const pai = (r.pai_username || '').toLowerCase().trim();

  if (isRootAdmin) {
    // Se o nível for explicitamente definido para o Root Admin:
    if (r.nivel !== undefined) {
      return r.nivel === 1;
    }
    // Para Master / Admin: revendedores diretos são aqueles de nível 1 cujo pai é admin/master ou não possuem revendedor pai
    if (!pai || pai === 'admin' || pai === 'master' || pai === profileUser) {
      return r.nivel === undefined || r.nivel === 1;
    }
    return false;
  }

  // Para Franquias e Revendedores:
  // Seus revendedores diretos de nível 1 são ESTRITAMENTE aqueles cujo pai é ele mesmo
  if (pai === profileUser || (r.pai_id && profile?.id && r.pai_id === profile.id)) {
    return true;
  }

  return false;
};

export type DashboardPeriod = 'mes_atual' | 'ultimos_30' | 'mes_passado' | 'personalizado';

export interface PeriodRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

/**
 * Converte qualquer representação de data com tolerância a múltiplos formatos.
 */
export const parseDateSafe = (raw: any, defaultEndOfDay: boolean = false): Date | null => {
  if (!raw || raw === '-' || raw === 'Ilimitado') return null;

  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }

  const rawStr = String(raw).trim();
  if (!rawStr) return null;

  // Timestamp numérico Unix (segundos ou ms)
  if (/^\d{10,13}$/.test(rawStr)) {
    const num = parseInt(rawStr, 10);
    const ts = rawStr.length === 10 ? num * 1000 : num;
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
  }

  // ISO YYYY-MM-DD ou ISO com T/Z
  if (rawStr.includes('-') && !rawStr.includes('/')) {
    const d = new Date(rawStr);
    if (!isNaN(d.getTime())) return d;
  }

  // pt-BR DD/MM/YYYY ou DD/MM/YYYY HH:mm(:ss)
  const parts = rawStr.split(/[\/\s:]+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const hours = parts[3] ? parseInt(parts[3], 10) : (defaultEndOfDay ? 23 : 0);
      const mins = parts[4] ? parseInt(parts[4], 10) : (defaultEndOfDay ? 59 : 0);
      const secs = parts[5] ? parseInt(parts[5], 10) : (defaultEndOfDay ? 59 : 0);
      const d = new Date(year, month, day, hours, mins, secs);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const fallback = new Date(rawStr);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
};

/**
 * Converte a data de criação do cliente em objeto Date com segurança.
 */
export const parseCreationDate = (c: Customer | any): Date | null => {
  if (!c) return null;
  const raw = c.created_at || c.criado_em || c.createdAt || c.data_cadastro;
  return parseDateSafe(raw, false);
};

/**
 * Retorna as datas de início e fim para cada período selecionado no Dashboard.
 */
export const getPeriodDateRange = (
  period: DashboardPeriod,
  customStart?: string,
  customEnd?: string
): PeriodRange => {
  const now = new Date();

  if (period === 'mes_atual') {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthName = startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return {
      startDate,
      endDate,
      label: monthName.charAt(0).toUpperCase() + monthName.slice(1)
    };
  }

  if (period === 'ultimos_30') {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    return {
      startDate,
      endDate,
      label: 'Últimos 30 dias'
    };
  }

  if (period === 'mes_passado') {
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const monthName = startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return {
      startDate,
      endDate,
      label: monthName.charAt(0).toUpperCase() + monthName.slice(1)
    };
  }

  // personalizado
  const startDate = customStart
    ? new Date(customStart + 'T00:00:00')
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = customEnd
    ? new Date(customEnd + 'T23:59:59.999')
    : new Date();

  return {
    startDate,
    endDate,
    label: `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`
  };
};

/**
 * Filtra clientes relevantes para o período selecionado:
 * - Clientes criados durante o período
 * - Clientes que venceram durante o período
 * - Clientes ativos cuja vigência cobre o período
 * - Exclui clientes criados após o período ou que já estavam expirados antes do início do período
 */
export const filterCustomersByPeriod = (
  customers: Customer[],
  range: PeriodRange
): Customer[] => {
  const { startDate, endDate } = range;
  const startTs = startDate.getTime();
  const endTs = endDate.getTime();

  return (customers || []).filter(c => {
    const createdDate = parseCreationDate(c);
    const expiryDate = parseExpiryDate(c);

    // Se o cliente foi criado após o fim do período, ele ainda não existia
    if (createdDate && createdDate.getTime() > endTs) {
      return false;
    }

    // Se o cliente venceu antes do início do período
    if (expiryDate && expiryDate.getTime() < startTs) {
      // Se tiver data de criação e ela também foi antes do início, o cliente já estava inativo no período
      if (createdDate && createdDate.getTime() < startTs) {
        return false;
      }
      if (!createdDate) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Filtra revendedores relevantes para o período (cadastrados até a data final do período).
 */
export const filterResellersByPeriod = (
  resellers: Reseller[],
  range: PeriodRange
): Reseller[] => {
  const { endDate } = range;
  const endTs = endDate.getTime();

  return (resellers || []).filter(r => {
    const createdDate = parseDateSafe(r.created_at, false);
    if (createdDate && createdDate.getTime() > endTs) {
      return false;
    }
    return true;
  });
};

/**
 * Data de corte para cobrança de aplicativos parceiros (apenas futuras a partir de 03/10/2026).
 * Ativações anteriores são desconsideradas para fins de cobrança do revendedor.
 */
export const PARTNER_APPS_BILLING_CUTOFF_DATE = '2026-10-03T00:00:00.000Z';

export const getCustomerPartnerApps = (c: Customer, ownerUsername?: string): PartnerAppItemDetail[] => {
  if (!c) return [];

  const isClientExpired = c.status === 'EXPIRED' || (parseExpiryDate(c) ? parseExpiryDate(c)!.getTime() < Date.now() : false);
  const results: PartnerAppItemDetail[] = [];
  const addedMacs = new Set<string>();

  // 1. Dispositivos múltiplos GerenciaApp (se houver)
  const devices = (c as any).partnerDevices || [];
  if (Array.isArray(devices) && devices.length > 0) {
    devices.forEach((d: any) => {
      const cleanMac = String(d.mac || '').trim().toUpperCase();
      const actTime = d.createdAt || d.activatedAt || '';
      const expTime = d.expiresAt || '';
      const isAppExpired = expTime ? (!isNaN(new Date(expTime).getTime()) && new Date(expTime).getTime() < Date.now()) : false;

      if (cleanMac) addedMacs.add(cleanMac);
      results.push({
        app_name: d.appName || 'GerenciaApp',
        customer_username: c.username || c.id || 'cliente',
        customer_name: c.name || undefined,
        customer_id: c.id,
        reseller_username: ownerUsername || c.reseller_username || c.dono || '',
        mac: cleanMac || undefined,
        app_user: d.clientUsername || c.username,
        activated_at: actTime || undefined,
        expires_at: expTime || undefined,
        is_client_active: !isClientExpired,
        is_app_expired: isAppExpired
      });
    });
  }

  // 2. Aplicativo primário (partnerApp / partner_app)
  const p = (c as any).partnerApp || (c as any).partner_app || (c as any).partner;
  if (p) {
    const appName = p.appName || p.app_name || (p.appId ? `App #${p.appId}` : 'App Parceiro');
    const isMax = appName.toLowerCase().includes('max') || (p.appUser && !p.mac);
    const cleanMac = String(p.mac || '').trim().toUpperCase();

    // Se for GerenciaApp e esse MAC já foi incluído via partnerDevices, não duplica
    if (!isMax && cleanMac && addedMacs.has(cleanMac)) {
      // Já adicionado
    } else {
      const actTime = p.activatedAt || p.activated_at || p.created_at || '';
      const expTime = p.expiresAt || p.expires_at || '';
      const appUser = p.appUser || p.username || '';
      const isAppExpired = expTime ? (!isNaN(new Date(expTime).getTime()) && new Date(expTime).getTime() < Date.now()) : false;

      const rawStatus = String(p.status || '').toLowerCase();
      // Se expiração passou de 3 dias no passado, considera inativo
      let isOverThreeDays = false;
      if (expTime) {
        const expMs = new Date(expTime).getTime();
        if (!isNaN(expMs) && (Date.now() - expMs >= 3 * 24 * 3600 * 1000)) {
          isOverThreeDays = true;
        }
      } else if (isClientExpired) {
        const clientExp = parseExpiryDate(c);
        if (clientExp && (Date.now() - clientExp.getTime() >= 3 * 24 * 3600 * 1000)) {
          isOverThreeDays = true;
        }
      }

      const isInactive = rawStatus === 'inactive' || rawStatus === 'deactivated' || Boolean(p.deactivatedAt) || (isMax && isOverThreeDays);
      const finalStatus = isInactive ? 'inactive' : (rawStatus || (isAppExpired ? 'expired' : 'active'));

      results.push({
        app_name: appName,
        customer_username: c.username || c.id || 'cliente',
        customer_name: c.name || undefined,
        customer_id: c.id,
        reseller_username: ownerUsername || c.reseller_username || c.dono || '',
        mac: cleanMac || appUser || undefined,
        app_user: appUser || undefined,
        activated_at: actTime || undefined,
        expires_at: expTime || undefined,
        is_client_active: !isClientExpired,
        is_app_expired: isAppExpired,
        status: finalStatus,
        is_inactive: isInactive,
        is_deactivated: isInactive,
        deactivated_at: p.deactivatedAt,
        deactivation_reason: p.deactivationReason || (isInactive ? 'Inativo há mais de 3 dias' : undefined)
      });
    }
  }

  return results;
};

export const getCustomerPartnerApp = (c: Customer, ownerUsername?: string): PartnerAppItemDetail | null => {
  const apps = getCustomerPartnerApps(c, ownerUsername);
  return apps.length > 0 ? apps[0] : null;
};

/**
 * Calcula o Ranking Mensal de Gamificação dos Revendedores isolado para o painel atual.
 */
export const calculatePanelGamificationRanking = (
  customers: Customer[],
  resellers: Reseller[],
  profile?: UserProfile | null,
  panelName: string = 'Painel',
  panelSlug: string = 'default'
): PanelGamificationRanking => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthLabel = `${monthNames[now.getMonth()]}/${now.getFullYear()}`;

  const currentUsername = (profile?.username || '').toLowerCase().trim();

  // 1. Filtrar revendedores válidos para o painel
  const validResellers = (resellers || []).filter(r => {
    if (!r || !r.username) return false;
    const uName = r.username.toLowerCase();
    if (uName === 'admin' && (r.customers_count || 0) === 0) return false;
    return true;
  });

  // 2. Calcular estatísticas de cada revendedor
  const rankingItems: ResellerRankingItem[] = validResellers.map(r => {
    const rUser = (r.username || '').toLowerCase();
    const rId = r.id;

    const myClients = (customers || []).filter(c => {
      const cOwner = (c.reseller_username || c.dono || '').toLowerCase();
      const cResellerId = c.reseller_id || (c as any).resellerId;
      return cOwner === rUser || (rId && cResellerId === rId);
    });

    const totalClients = myClients.length;
    let activeClients = 0;
    let expiredClients = 0;
    let trialClients = 0;
    let newClientsThisMonth = 0;
    let renewalsThisMonth = 0;

    myClients.forEach(c => {
      const isTrial = Boolean(c.is_trial || c.status === 'TRIAL');
      const isActive = isCustomerActive(c);

      if (isTrial) {
        trialClients++;
      } else if (isActive) {
        activeClients++;
      } else {
        expiredClients++;
      }

      const createdDate = parseDateSafe(c.created_at || (c as any).createdAt, false);
      if (createdDate && createdDate.getTime() >= startOfMonth.getTime() && createdDate.getTime() <= endOfMonth.getTime()) {
        newClientsThisMonth++;
      }

      const updatedDate = parseDateSafe((c as any).updatedAt || (c as any).updated_at, false);
      if (updatedDate && updatedDate.getTime() >= startOfMonth.getTime() && updatedDate.getTime() <= endOfMonth.getTime() && isActive) {
        renewalsThisMonth++;
      }
    });

    const retentionRate = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 100;

    // Patente / Nível
    let tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'master' = 'bronze';
    let tierName = 'Bronze';
    let nextTierName: string | null = 'Prata';
    let nextTierTarget = 20;

    if (activeClients >= 250) {
      tier = 'master';
      tierName = 'Master';
      nextTierName = null;
      nextTierTarget = 250;
    } else if (activeClients >= 100) {
      tier = 'diamond';
      tierName = 'Diamante';
      nextTierName = 'Master';
      nextTierTarget = 250;
    } else if (activeClients >= 50) {
      tier = 'gold';
      tierName = 'Ouro';
      nextTierName = 'Diamante';
      nextTierTarget = 100;
    } else if (activeClients >= 20) {
      tier = 'silver';
      tierName = 'Prata';
      nextTierName = 'Ouro';
      nextTierTarget = 50;
    }

    const prevTierFloor = tier === 'master' ? 250 : tier === 'diamond' ? 100 : tier === 'gold' ? 50 : tier === 'silver' ? 20 : 0;
    const tierProgress = nextTierName
      ? Math.min(100, Math.max(0, Math.round(((activeClients - prevTierFloor) / (nextTierTarget - prevTierFloor)) * 100)))
      : 100;

    const retentionBonus = (retentionRate >= 80 && totalClients >= 5) ? 50 : 0;
    const xp = (newClientsThisMonth * 10) + (renewalsThisMonth * 5) + (activeClients * 1) + retentionBonus;

    const badges: RankingBadge[] = [
      { id: 'first_sale', name: 'Primeira Venda', description: 'Cadastrou seu primeiro cliente', icon: 'Rocket', unlocked: totalClients >= 1 },
      { id: 'on_fire', name: 'Em Chamas', description: '5 ou mais novas ativações no mês', icon: 'Flame', unlocked: newClientsThisMonth >= 5 },
      { id: 'retention_master', name: 'Fidelizador', description: 'Taxa de retenção superior a 80%', icon: 'ShieldCheck', unlocked: retentionRate >= 80 && totalClients >= 5 },
      { id: 'centurion', name: 'Clube dos 100', description: 'Atingiu 100 clientes ativos', icon: 'Crown', unlocked: activeClients >= 100 },
      { id: 'fast_grower', name: 'Crescimento Veloz', description: '10 ou mais ativações no mês', icon: 'Zap', unlocked: newClientsThisMonth >= 10 }
    ];

    return {
      id: r.id,
      username: r.username,
      displayName: r.name && r.name !== r.username ? r.name : r.username,
      whatsapp: r.whatsapp || '',
      rank: 0,
      activeClients,
      expiredClients,
      trialClients,
      totalClients,
      newClientsThisMonth,
      renewalsThisMonth,
      retentionRate,
      tier,
      tierName,
      nextTierName,
      nextTierTarget,
      tierProgress,
      xp,
      badges
    };
  });

  // Ordenar por XP decrescente (desempate por clientes ativos)
  rankingItems.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    return b.activeClients - a.activeClients;
  });

  // Atribuir Rank
  rankingItems.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const currentUserRank = rankingItems.find(i => (i.username || '').toLowerCase() === currentUsername) || null;

  return {
    panelName,
    panelSlug,
    month: monthLabel,
    totalParticipants: rankingItems.length,
    ranking: rankingItems,
    currentUserRank
  };
};



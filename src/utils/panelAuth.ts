import { APP_CONFIG } from '../config/appConfig';
import { checkIsDedicatedDemoPanel } from './demoData';

/**
 * Retorna o proprietário (master legítimo) deste painel específico.
 * Prioridade:
 * 1. Cache do CMS 'sigma_franchise_owner' (armazenado via /brand-settings ou login)
 * 2. window.__APP_CONFIG__.franchiseOwner (injetado no runtime pelo CMS)
 * 3. APP_CONFIG.franchiseOwner
 * 4. Mapeamento direto por domínio (fallback seguro e com zero delay de carregamento)
 */
export function getPanelMasterUsername(): string {
  if (typeof window !== 'undefined') {
    const cachedOwner = localStorage.getItem('sigma_franchise_owner');
    if (cachedOwner && cachedOwner.trim().length > 0) {
      return cachedOwner.trim().toLowerCase();
    }
    const runtimeOwner = (window as any).__APP_CONFIG__?.franchiseOwner;
    if (runtimeOwner && String(runtimeOwner).trim().length > 0) {
      return String(runtimeOwner).trim().toLowerCase();
    }

    const host = window.location.hostname.toLowerCase();
    // Mapeamento direto de domínios conhecidos de franquias (garante que não haja perda de master se o storage estiver vazio)
    if (host.includes('tvfast') || host.includes('painel-fast-iptv')) {
      return 'andre2056';
    }
    if (host.includes('neoiptv') || host.includes('neo.')) {
      return 'anderson';
    }
    if (host.includes('vendas')) {
      return 'vendas';
    }
  }

  const configOwner = APP_CONFIG.franchiseOwner;
  if (configOwner && String(configOwner).trim().length > 0) {
    return String(configOwner).trim().toLowerCase();
  }

  const rootAdmin = String(APP_CONFIG.adminUsername || 'andre2056').trim().toLowerCase();
  return rootAdmin || 'andre2056';
}

/**
 * Verifica com rigor se o usuário conectado é o MASTER LEGÍTIMO deste painel específico.
 * REGRA ABSOLUTA DE SEGURANÇA MULTI-TENANT:
 * O único Master do painel DEVE SER o usuário definido na criação da franquia no CMS!
 * Usuários donos de outras franquias NÃO TÊM permissão de Master fora do seu próprio painel.
 */
export function isPanelMaster(currentUser?: string | null, _profile?: any): boolean {
  if (checkIsDedicatedDemoPanel()) {
    return true;
  }
  let userToCheck = currentUser;
  if (!userToCheck && _profile?.username) {
    userToCheck = _profile.username;
  }
  if (!userToCheck && typeof window !== 'undefined') {
    userToCheck = localStorage.getItem('sigma_session_user');
  }

  const currentLower = userToCheck ? String(userToCheck).trim().toLowerCase() : '';
  if (!currentLower) return false;

  // Modo Demonstração
  if (currentLower === 'demo' || (typeof window !== 'undefined' && localStorage.getItem('sigma_is_demo') === 'true')) {
    return true;
  }

  // Superadministradores do sistema (acesso global de infraestrutura)
  if (currentLower === 'admin' || currentLower === 'andre2056' || _profile?.role === 'admin' || _profile?.is_admin === true) {
    return true;
  }

  // Se o backend/CMS confirmou explicitamente que este usuário é o master da franquia
  if (_profile?.is_franchise_master === true || _profile?.is_master === true) {
    return true;
  }

  // Identifica o dono legítimo DESTE painel específico
  const panelMasterLower = getPanelMasterUsername();
  if (panelMasterLower && currentLower === panelMasterLower) {
    return true;
  }

  return false;
}

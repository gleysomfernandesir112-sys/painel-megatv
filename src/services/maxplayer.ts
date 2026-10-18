/**
 * MaxPlayer Integration Service
 *
 * SEGURANÇA: A chave API do MaxPlayer fica armazenada SOMENTE no servidor
 * (cms.json no VPS). O frontend nunca recebe nem conhece a chave real.
 * Todas as chamadas são feitas via proxy no backend CMS.
 *
 * Endpoints do proxy (requerem autenticação FastCDN):
 *   GET  /api/v1/integrations/maxplayer         → lê status/config (chave mascarada)
 *   POST /api/v1/integrations/maxplayer         → salva chave/toggle (somente master)
 *   GET  /api/v1/integrations/maxplayer/test    → testa conexão
 *   POST /api/v1/integrations/maxplayer/users   → cria usuário no MaxPlayer
 */

import { APP_CONFIG, isHostedOnGithub, getFranchiseDomain } from '../config/appConfig';

function getEndpoints(path: string): string[] {
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const base = (APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit').replace(/\/+$/, '');
  const endpoints: string[] = [];

  if (isHostedOnGithub()) {
    endpoints.push(`${base}/api/v1/integrations/maxplayer${cleanPath}`);
    endpoints.push(`https://fastcdn.fit/api/v1/integrations/maxplayer${cleanPath}`);
    endpoints.push(`${base}/api/v1/partner-apps/maxplayer${cleanPath}`);
    endpoints.push(`https://fastcdn.fit/api/v1/partner-apps/maxplayer${cleanPath}`);
  } else {
    endpoints.push(`/api/v1/integrations/maxplayer${cleanPath}`);
    endpoints.push(`${base}/api/v1/integrations/maxplayer${cleanPath}`);
  }

  return Array.from(new Set(endpoints));
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const domain = getFranchiseDomain();
  if (domain) {
    headers['X-Franchise-Domain'] = domain;
  }

  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('sigma_session_token') || sessionStorage.getItem('sigma_session_token'))
    : null;

  const apiKey = typeof window !== 'undefined'
    ? (localStorage.getItem('sigma_active_key') ||
       localStorage.getItem('sigma_reseller_key') ||
       sessionStorage.getItem('fastcdn_api_key') ||
       localStorage.getItem('fastcdn_api_key') ||
       APP_CONFIG.defaultApiKey ||
       '')
    : (APP_CONFIG.defaultApiKey || '');

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  return headers;
}

async function proxyGet(path: string): Promise<any> {
  const endpoints = getEndpoints(path);
  let lastError: any = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        return await res.json();
      }
      const data = await res.json().catch(() => null);
      if (data) return data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Falha ao conectar com o serviço MaxPlayer.');
}

async function proxyPost(path: string, body: object): Promise<any> {
  const endpoints = getEndpoints(path);
  let lastError: any = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => null);
      if (data) return data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Falha ao comunicar com o serviço MaxPlayer.');
}

export interface MaxPlayerStatus {
  enabled: boolean;
  hasKey: boolean;
  keyPreview: string | null;
}

export interface MaxPlayerCreateResult {
  success: boolean;
  user_id?: string;
  error?: string;
}

export interface MaxPlayerAccountInfo {
  name: string;
  users: number;
  max_users: number;
}

class MaxPlayerService {
  /**
   * Retorna o status da integração sem expor a chave real.
   */
  public async getStatus(): Promise<MaxPlayerStatus> {
    try {
      const data = await proxyGet('');
      return {
        enabled: data.enabled === true,
        hasKey: data.hasKey === true,
        keyPreview: data.keyPreview || null
      };
    } catch {
      return { enabled: false, hasKey: false, keyPreview: null };
    }
  }

  /**
   * Salva a chave MaxPlayer no servidor (somente master admin).
   * A chave nunca trafega de volta para o browser.
   */
  public async saveConfig(apiKey: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await proxyPost('', { apiKey, enabled });
      return { success: data.success === true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de rede' };
    }
  }

  /**
   * Testa a conexão com o MaxPlayer usando a chave armazenada no servidor.
   */
  public async testConnection(): Promise<MaxPlayerAccountInfo> {
    const data = await proxyGet('/test');
    if (!data.success) {
      throw new Error(data.error || 'Falha ao conectar com MaxPlayer');
    }
    return { name: data.name, users: data.users, max_users: data.max_users };
  }

  /**
   * Cria um usuário no MaxPlayer via proxy do servidor.
   * A chave nunca é exposta ao browser.
   * Retorna { success: false, error } em caso de falha — nunca lança exceção.
   */
  public async createUser(params: {
    username: string;
    password: string;
    iptvUser?: string;
    iptvPass?: string;
    maxConnections: number;
    durationDays: number;
  }): Promise<MaxPlayerCreateResult> {
    try {
      const data = await proxyPost('/users', {
        username: params.username,
        password: params.password,
        iptv_user: params.iptvUser || params.username,
        iptv_pass: params.iptvPass || params.password,
        max_connections: params.maxConnections,
        duration_days: Math.max(1, Math.round(params.durationDays))
      });
      if (data && data.success) {
        return { success: true, user_id: String(data.user_id || '') };
      }
      return { success: false, error: (data && data.error) || 'Erro desconhecido' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de rede' };
    }
  }

  /**
   * Verifica se a integração está ativa (consulta o servidor).
   * Para uso no fluxo de criação de clientes.
   */
  public async isEnabled(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.enabled && status.hasKey;
    } catch {
      return false;
    }
  }
}

export const maxPlayerApi = new MaxPlayerService();

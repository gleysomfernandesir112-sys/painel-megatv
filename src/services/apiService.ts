import { APP_CONFIG, isHostedOnGithub } from '../config/appConfig';

/** Tipagens da API de Streaming */
export interface ResellerProfile {
  id: string;
  username: string;
  name?: string;
  role: 'admin' | 'reseller' | 'subreseller';
  status: 'active' | 'suspended' | 'blocked';
  nivel: number;
  creditos: number;
  creditos_ilimitados: boolean;
  pai_username?: string;
  linhagem: string[];
  total_clientes: number;
  clientes_ativos: number;
  total_sub_revendas: number;
  botAccess?: boolean;
  bot_access?: boolean;
  botMonthlyCredits?: number;
  bot_monthly_credits?: number;
}

export interface AuthLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  token_expires_at?: string;
  api_key?: string;
  reseller?: ResellerProfile;
}

export interface HierarchyNode {
  id: string;
  username: string;
  name?: string;
  role: string;
  nivel: number;
  status: string;
  creditos: number | string;
  creditos_ilimitados?: boolean;
  whatsapp?: string;
  pai_username?: string;
  linhagem: string[];
  total_clientes_diretos: number;
  clientes_ativos_diretos?: number;
  total_sub_revendas: number;
  clientes_diretos?: any[];
  sub_revendas?: HierarchyNode[];
  botAccess?: boolean;
  bot_access?: boolean;
  botMonthlyCredits?: number;
  bot_monthly_credits?: number;
}

export interface HierarchyResponse {
  ator: {
    id?: string;
    username: string;
    name?: string;
    role: string;
    nivel: number;
    linhagem: string[];
  };
  stats_globais?: {
    total_revendas: number;
    total_clientes: number;
    clientes_ativos: number;
  };
  arvore: HierarchyNode;
}

export interface SubresellerApiKey {
  id: string;
  key: string;
  name: string;
  created_at: string;
  last_used_at?: string;
  allowed_ips?: string[];
  status: 'active' | 'revoked';
}

export function normalizeHierarchyResponse(raw: any, fallbackUser = 'admin'): HierarchyResponse {
  if (!raw) {
    return {
      ator: { id: 'admin', username: fallbackUser, name: fallbackUser, role: 'admin', nivel: 0, linhagem: [fallbackUser] },
      stats_globais: { total_revendas: 0, total_clientes: 0, clientes_ativos: 0 },
      arvore: {
        id: 'admin',
        username: fallbackUser,
        name: fallbackUser,
        role: 'admin',
        nivel: 0,
        status: 'active',
        creditos: 999999,
        creditos_ilimitados: true,
        linhagem: [fallbackUser],
        total_clientes_diretos: 0,
        clientes_ativos_diretos: 0,
        total_sub_revendas: 0,
        sub_revendas: []
      }
    };
  }

  const h = raw.hierarquia || raw;
  const ator = h.ator || {
    id: 'admin',
    username: fallbackUser,
    name: fallbackUser,
    role: 'admin',
    nivel: 0,
    linhagem: [fallbackUser]
  };

  const rawChildren = Array.isArray(h.arvore)
    ? h.arvore
    : Array.isArray(h.revendas)
    ? h.revendas
    : Array.isArray(raw.subrevendas)
    ? raw.subrevendas
    : [];

  const mapNode = (item: any, defaultLevel = 1): HierarchyNode => {
    const username = item.username || item.login_usuario || item.id || 'revenda';
    const children = Array.isArray(item.sub_revendas)
      ? item.sub_revendas.map((c: any) => mapNode(c, (item.nivel || defaultLevel) + 1))
      : Array.isArray(item.filhos)
      ? item.filhos.map((c: any) => mapNode(c, (item.nivel || defaultLevel) + 1))
      : [];

    const totalClients = item.stats?.total_clientes ?? item.total_clientes ?? item.clientes_diretos?.length ?? item.clientes_count ?? 0;
    const activeClients = item.stats?.clientes_ativos ?? item.clientes_ativos ?? 0;
    const totalSubs = item.stats?.total_sub_revendas ?? item.total_sub_revendas ?? item.sub_revendas_filhas ?? children.length;

    return {
      id: item.id || `usr_${username}`,
      username,
      name: item.name || item.nome_usuario || username,
      role: item.role || 'reseller',
      status: (item.status === 'blocked' || item.status === 'suspended') ? 'suspended' : 'active',
      nivel: item.nivel !== undefined ? item.nivel : defaultLevel,
      creditos: item.creditos !== undefined ? item.creditos : (item.credits || 0),
      creditos_ilimitados: !!item.creditos_ilimitados,
      whatsapp: item.whatsapp || '',
      linhagem: Array.isArray(item.linhagem) ? item.linhagem : [ator.username, username],
      pai_username: item.pai_username || ator.username,
      total_clientes_diretos: totalClients,
      clientes_ativos_diretos: activeClients,
      total_sub_revendas: totalSubs,
      clientes_diretos: item.clientes_diretos || [],
      sub_revendas: children
    };
  };

  if (h.minha_estrutura && (h.minha_estrutura.username || h.minha_estrutura.id)) {
    const root = mapNode(h.minha_estrutura, 0);
    return {
      ator: {
        id: root.id,
        username: root.username,
        name: root.name,
        role: root.role,
        nivel: 0,
        linhagem: root.linhagem
      },
      stats_globais: {
        total_revendas: (root.sub_revendas || []).length,
        total_clientes: root.total_clientes_diretos || 0,
        clientes_ativos: root.clientes_ativos_diretos || 0
      },
      arvore: root
    };
  }

  if (rawChildren.length === 1 && (rawChildren[0].username || '').toLowerCase() === (ator.username || fallbackUser).toLowerCase()) {
    const root = mapNode(rawChildren[0], 0);
    return {
      ator: {
        id: root.id,
        username: root.username,
        name: root.name,
        role: root.role,
        nivel: 0,
        linhagem: root.linhagem
      },
      stats_globais: {
        total_revendas: (root.sub_revendas || []).length,
        total_clientes: root.total_clientes_diretos || 0,
        clientes_ativos: root.clientes_ativos_diretos || 0
      },
      arvore: root
    };
  }

  if (h.arvore && !Array.isArray(h.arvore) && (h.arvore.username || h.arvore.ator)) {
    return {
      ator: {
        id: ator.id || 'admin',
        username: ator.username || fallbackUser,
        name: ator.name || ator.username || fallbackUser,
        role: ator.role || 'admin',
        nivel: 0,
        linhagem: ator.linhagem || [ator.username || fallbackUser]
      },
      stats_globais: {
        total_revendas: h.stats_globais?.total_revendas_geral ?? h.stats_globais?.total_revendas_diretas ?? rawChildren.length,
        total_clientes: h.stats_globais?.total_clientes_geral ?? 0,
        clientes_ativos: h.stats_globais?.clientes_ativos_admin ?? 0
      },
      arvore: mapNode(h.arvore, 0)
    };
  }

  const childrenNodes = rawChildren.map((c: any) => mapNode(c, 1));
  const totalClientsAdmin = h.stats_globais?.clientes_diretos_admin ?? (h.clientes_diretos_admin?.length || 0);
  const activeClientsAdmin = h.stats_globais?.clientes_ativos_admin ?? 0;

  const rootNode: HierarchyNode = {
    id: ator.id || 'admin',
    username: ator.username || fallbackUser,
    name: ator.name || ator.username || fallbackUser,
    role: ator.role || 'admin',
    nivel: 0,
    status: 'active',
    creditos: ator.creditos !== undefined ? ator.creditos : 999999,
    creditos_ilimitados: ator.creditos_ilimitados !== undefined ? ator.creditos_ilimitados : true,
    linhagem: [ator.username || fallbackUser],
    total_clientes_diretos: totalClientsAdmin,
    clientes_ativos_diretos: activeClientsAdmin,
    total_sub_revendas: childrenNodes.length,
    clientes_diretos: h.clientes_diretos_admin || [],
    sub_revendas: childrenNodes
  };

  return {
    ator: {
      id: ator.id || 'admin',
      username: ator.username || fallbackUser,
      name: ator.name || ator.username || fallbackUser,
      role: ator.role || 'admin',
      nivel: 0,
      linhagem: [ator.username || fallbackUser]
    },
    stats_globais: {
      total_revendas: h.stats_globais?.total_revendas_geral ?? childrenNodes.length,
      total_clientes: h.stats_globais?.total_clientes_geral ?? 0,
      clientes_ativos: h.stats_globais?.clientes_ativos_admin ?? 0
    },
    arvore: rootNode
  };
}

class ApiService {
  private masterApiKey: string;
  private sessionToken: string | null = null;
  private currentApiKey: string | null = null;

  constructor() {
    this.masterApiKey = import.meta.env.VITE_DEFAULT_API_KEY || APP_CONFIG.defaultApiKey || '';
    if (typeof window !== 'undefined') {
      this.sessionToken = localStorage.getItem('sigma_session_token');
      this.currentApiKey = localStorage.getItem('sigma_active_key') || this.masterApiKey;
    }
  }

  // ==========================================
  // Gerenciamento de Credenciais e Headers
  // ==========================================

  public getMasterKey(): string {
    const configuredKey = import.meta.env.VITE_DEFAULT_API_KEY || APP_CONFIG.defaultApiKey || '';
    if (configuredKey && configuredKey.length > 5) {
      return configuredKey;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sigma_master_api_key') || localStorage.getItem('fastcdn_api_key');
      if (stored && stored.length > 5) return stored;
    }
    return '';
  }

  public setSession(token: string, apiKey?: string) {
    this.sessionToken = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('sigma_session_token', token);
      if (apiKey) {
        this.currentApiKey = apiKey;
        localStorage.setItem('sigma_active_key', apiKey);
        localStorage.setItem('sigma_reseller_key', apiKey);
      }
    }
  }

  public clearSession() {
    this.sessionToken = null;
    this.currentApiKey = this.masterApiKey;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sigma_session_token');
      localStorage.removeItem('sigma_active_key');
      localStorage.removeItem('sigma_reseller_key');
      localStorage.removeItem('sigma_session_user');
      localStorage.removeItem('sigma_session_role');
    }
  }

  public getAuthHeaders(useMasterKey = false): Record<string, string> {
    const master = this.getMasterKey();
    let keyToUse = this.currentApiKey || master;

    if (typeof window !== 'undefined') {
      const isResellerSession = localStorage.getItem('sigma_session_role') === 'reseller';
      const storedResellerKey = localStorage.getItem('sigma_reseller_key') || localStorage.getItem('sigma_active_key');
      if (isResellerSession && storedResellerKey && !useMasterKey) {
        keyToUse = storedResellerKey;
      }
    }

    if (useMasterKey) {
      keyToUse = master;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const token = this.sessionToken || (typeof window !== 'undefined'
      ? (localStorage.getItem('sigma_session_token') ||
         localStorage.getItem('sigma_token') ||
         localStorage.getItem('mediacms_session_token'))
      : null);

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (keyToUse) {
      headers['Authorization'] = `Bearer ${keyToUse}`;
    }

    if (keyToUse) {
      headers['X-API-Key'] = keyToUse;
    }

    return headers;
  }

  private getBaseUrl(): string {
    return APP_CONFIG.apiBaseUrl || '';
  }

  public getEndpoints(path: string): string[] {
    const isGithub = isHostedOnGithub();
    const base = (this.getBaseUrl() || 'https://fastcdn.fit').replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (isGithub) {
      return [`${base}${cleanPath}`];
    }
    return [`/fastcdn-api${cleanPath}`, `${base}${cleanPath}`];
  }

  // ==========================================
  // Despachador Universal de Ações (POST /user.php)
  // ==========================================

  public async postAction<T = any>(action: string, payload: Record<string, any> = {}): Promise<T> {
    const endpoints = this.getEndpoints('/api/v1/user.php');

    const body = JSON.stringify({ action, ...payload });
    let lastError: any = null;

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body
        });

        if (response.status === 401) {
          this.clearSession();
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        if (response.status === 403) {
          throw new Error('Acesso negado: você não possui permissão para gerenciar este registro na hierarquia.');
        }

        const data = await response.json().catch(() => null);
        if (response.ok) {
          if (data && data.status !== 'error') {
            return data;
          } else if (data && data.message) {
            throw new Error(data.message);
          }
          if (data) return data;
        } else {
          if (data && data.message) {
            throw new Error(data.message);
          }
          throw new Error(`Erro do servidor (HTTP ${response.status}).`);
        }
      } catch (err: any) {
        lastError = err;
        if (err.message.includes('Sessão expirada') || err.message.includes('Acesso negado')) {
          throw err;
        }
      }
    }

    throw lastError || new Error(`Falha na ação ${action}.`);
  }

  // ==========================================
  // 1. Módulo de Autenticação Desacoplada
  // ==========================================

  public async loginReseller(username: string, password: string): Promise<AuthLoginResponse> {
    const endpoints = this.getEndpoints('/api/v1/auth/reseller-login');

    const body = JSON.stringify({ username, password });

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(true), // Utiliza a Chave Mestre para validar o revendedor
          body
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (data.token) {
            this.setSession(data.token, data.api_key);
          }
          return data;
        } else if (data && data.message) {
          return { success: false, message: data.message };
        }
      } catch {
        // Fallback para action "validar_revenda"
      }
    }

    // Fallback: POST /api/v1/user.php com action "validar_revenda"
    try {
      const fallbackData = await this.postAction('validar_revenda', {
        login_usuario: username,
        senha_usuario: password
      });

      if (fallbackData && (fallbackData.status === 'success' || fallbackData.success)) {
        const token = fallbackData.token || `cms_sess_${Date.now()}`;
        const apiKey = fallbackData.api_key || fallbackData.chave_api;
        this.setSession(token, apiKey);
        return {
          success: true,
          message: fallbackData.message || 'Autenticado com sucesso!',
          token,
          api_key: apiKey,
          reseller: fallbackData.reseller || fallbackData.revendedor
        };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Credenciais inválidas ou conta suspensa.' };
    }

    return { success: false, message: 'Não foi possível autenticar o revendedor.' };
  }

  // ==========================================
  // 2. Módulo de Resumo da Conta & Hierarquia
  // ==========================================

  public async getResumo() {
    return await this.postAction('resumo');
  }

  public async getHierarchy(): Promise<HierarchyResponse> {
    const endpoints = this.getEndpoints('/api/v1/hierarchy');

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.hierarquia || data.arvore || data.ator || data.success)) {
            return normalizeHierarchyResponse(data);
          }
        }
      } catch {
        // Fallback
      }
    }

    const sessionUser = typeof window !== 'undefined' ? (localStorage.getItem('sigma_session_user') || 'admin') : 'admin';
    try {
      const postData = await this.postAction('hierarquia');
      if (postData && (postData.hierarquia || postData.arvore || postData.ator || postData.status === 'success')) {
        return normalizeHierarchyResponse(postData, sessionUser);
      }
    } catch {
      // Fallback
    }

    // Fallback: consulta estruturada via listar_subrevendas
    try {
      const subRes = await this.postAction('listar_subrevendas');
      return normalizeHierarchyResponse({
        hierarquia: {
          ator: { id: sessionUser, username: sessionUser, role: 'master', nivel: 0, linhagem: [sessionUser] },
          revendas: subRes.subrevendas || subRes.sub_revendas || (Array.isArray(subRes) ? subRes : [])
        }
      }, sessionUser);
    } catch {
      return normalizeHierarchyResponse(null, sessionUser);
    }
  }

  // ==========================================
  // 3. Módulo de Gestão de Sub-Revendas
  // ==========================================

  public async listSubresellers(directOnly = false) {
    const res = await this.postAction('listar_subrevendas', { direto_apenas: directOnly });
    return res.subrevendas || res.sub_revendas || (Array.isArray(res) ? res : []);
  }

  public async findSubreseller(loginOrId: string) {
    const res = await this.postAction('buscar_subrevenda', { login_usuario: loginOrId });
    return res.subrevenda || res.usuario || res;
  }

  public async createSubreseller(params: {
    login_usuario: string;
    senha_usuario: string;
    nome_usuario: string;
    creditos?: number;
    whatsapp?: string;
  }) {
    return await this.postAction('criar_subrevenda', params);
  }

  /**
   * Transfere (>0) ou estorna/recolhe (<0) créditos da sub-revenda
   */
  public async transferCredits(loginOrId: string, quantidade: number) {
    return await this.postAction('creditos_subrevenda', {
      login_usuario: loginOrId,
      quantidade
    });
  }

  public async blockSubreseller(loginOrId: string) {
    return await this.postAction('bloquear_subrevenda', { login_usuario: loginOrId });
  }

  public async unblockSubreseller(loginOrId: string) {
    return await this.postAction('desbloquear_subrevenda', { login_usuario: loginOrId });
  }

  public async deleteSubreseller(loginOrId: string) {
    try {
      const res = await this.postAction('deletar_subrevenda', { login_usuario: loginOrId });
      if (res && (res.status === 'success' || res.success)) return res;
    } catch {}

    const endpoints = this.getEndpoints(`/api/users/${encodeURIComponent(loginOrId)}`);
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }
    return await this.postAction('deletar', { login_usuario: loginOrId });
  }

  public async setResellerBotAccess(loginOrId: string, enabled: boolean, monthlyCredits = 0) {
    const endpoints = this.getEndpoints(`/api/v1/subresellers/${encodeURIComponent(loginOrId)}/bot-access`);
    const altEndpoints = this.getEndpoints(`/api/users/${encodeURIComponent(loginOrId)}/bot-access`);
    const allUrls = Array.from(new Set([...endpoints, ...altEndpoints]));
    const headers = this.getAuthHeaders();

    let lastError = 'Falha de comunicação com o servidor';
    for (const url of allUrls) {
      try {
        const res = await fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ enabled, monthlyCredits })
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          return data || { success: true };
        }
        if (data && data.error) {
          lastError = data.error;
        }
      } catch (err: any) {
        lastError = err?.message || lastError;
      }
    }
    return { success: false, error: lastError };
  }

  /**
   * Consulta os slots e status de conexão do WhatsApp Bot
   */
  public async getWhatsAppSlots(): Promise<{ success: boolean; slots: any[]; hasConnectedSlot: boolean }> {
    const endpoints = this.getEndpoints('/api/v1/whatsapp/slots');
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: this.getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.slots)
            ? data.slots
            : (Array.isArray(data?.slots?.slots) ? data.slots.slots : (Array.isArray(data?.data?.slots) ? data.data.slots : []));
          const hasConnected = Array.isArray(list) && list.some((s: any) => s.connected === true || s.status === 'open' || s.status === 'connected');
          return { success: true, slots: list, hasConnectedSlot: hasConnected };
        }
      } catch {}
    }
    return { success: false, slots: [], hasConnectedSlot: false };
  }

  /**
   * Envia mensagem direta pelo WhatsApp Bot via Evolution API / Round-Robin
   */
  public async sendWhatsAppMessage(phone: string, message: string): Promise<{ success: boolean; message?: string; error?: string; slotUsed?: number }> {
    const endpoints = this.getEndpoints('/api/v1/whatsapp/send');
    const headers = this.getAuthHeaders();
    let lastError = 'Falha ao conectar com o serviço do WhatsApp Bot';

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone, message })
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success !== false) {
          return { success: true, ...data };
        }
        if (data && data.error) {
          lastError = data.error;
        }
      } catch (err: any) {
        lastError = err?.message || lastError;
      }
    }
    return { success: false, error: lastError };
  }

  // ==========================================
  // 4. Módulo de Chaves de API para Bots
  // ==========================================

  public async generateSubresellerApiKey(loginOrId: string, nomeChave?: string) {
    return await this.postAction('gerar_chave_subrevenda', {
      login_usuario: loginOrId,
      nome_chave: nomeChave || 'Chave WhatsApp Bot'
    });
  }

  public async listSubresellerApiKeys(loginOrId?: string): Promise<SubresellerApiKey[]> {
    const res = await this.postAction('listar_chaves_subrevenda', loginOrId ? { login_usuario: loginOrId } : {});
    return res.chaves || res.api_keys || [];
  }

  public async revokeSubresellerApiKey(idChave: string) {
    return await this.postAction('revogar_chave_subrevenda', { id_chave: idChave });
  }

  // ==========================================
  // 5. Módulo de Clientes & Testes Rápidos
  // ==========================================

  public async listClients() {
    const res = await this.postAction('listar');
    return res.usuarios || res.clientes || (Array.isArray(res) ? res : []);
  }

  public async findClient(loginOrId: string) {
    const res = await this.postAction('buscar', { login_usuario: loginOrId });
    return res.usuario || res.cliente || res;
  }

  public async createClient(params: {
    login_usuario: string;
    senha_usuario: string;
    nome_usuario?: string;
    meses?: number;
    dias?: number;
    conectado?: number;
    whatsapp?: string;
    notas?: string;
    bouquet_id?: string;
    id_lista?: string;
  }) {
    const bouquet = params.bouquet_id || params.id_lista || 'bq_completo';
    const payload: any = {
      conectado: 1,
      ...params,
      bouquet_id: bouquet,
      id_lista: bouquet
    };
    if (!payload.dias && !payload.meses) {
      payload.meses = 1;
    }
    return await this.postAction('criar', payload);
  }

  /**
   * Gera teste gratuito instantâneo (0 créditos deduzidos)
   */
  public async createQuickTest(params: {
    horas?: number;
    nome_usuario?: string;
    whatsapp?: string;
    bouquet_id?: string;
    id_lista?: string;
  }) {
    const bouquet = params.bouquet_id || params.id_lista || 'bq_completo';
    return await this.postAction('teste', {
      horas: params.horas || 4,
      nome_usuario: params.nome_usuario || 'Lead Teste Rápido',
      whatsapp: params.whatsapp,
      bouquet_id: bouquet,
      id_lista: bouquet
    });
  }

  public async renewClient(loginOrId: string, meses = 1, conectado = 1, dias?: number) {
    const payload: any = {
      login_usuario: loginOrId,
      conectado
    };
    if (dias && dias > 0) {
      payload.dias = dias;
    } else {
      payload.meses = meses;
    }
    return await this.postAction('renovar', payload);
  }

  public async blockClient(loginOrId: string) {
    return await this.postAction('bloquear', { login_usuario: loginOrId });
  }

  public async unblockClient(loginOrId: string) {
    return await this.postAction('desbloquear', { login_usuario: loginOrId });
  }

  public async updateClient(params: {
    login_usuario: string;
    nome_usuario?: string;
    senha_usuario?: string;
    conectado?: number;
    whatsapp?: string;
    notas?: string;
    bouquet_id?: string;
    id_lista?: string;
  }) {
    return await this.postAction('editar', params);
  }

  public async deleteClient(loginOrId: string) {
    return await this.postAction('deletar', { login_usuario: loginOrId });
  }

  public async listBouquets() {
    const res = await this.postAction('listar_listas');
    return res.listas || res.bouquets || [];
  }

  public async getMe() {
    try {
      const endpoints = this.getEndpoints('/api/v1/me');
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers: this.getAuthHeaders() });
          if (res.ok) {
            const data = await res.json();
            if (data && data.success) return data;
          }
        } catch { /* fallback */ }
      }
    } catch { /* fallback */ }
    return await this.getResumo();
  }

  public async getAiSpec(format: 'json' | 'text' | 'markdown' = 'json') {
    const endpoints = this.getEndpoints(`/api/v1/ai-spec?format=${format}`);
    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          return format === 'json' ? await res.json() : await res.text();
        }
      } catch { /* fallback */ }
    }
    return null;
  }

  /**
   * Consulta conexões e telas ativas da rede do revendedor
   */
  public async getLiveConnections(): Promise<any[]> {
    try {
      const endpoints = this.getEndpoints('/api/v1/live-connections');
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers: this.getAuthHeaders() });
          if (res.ok) {
            const data = await res.json();
            if (data && (data.conexoes || data.active_connections)) {
              return data.conexoes || data.active_connections || [];
            }
          }
        } catch {}
      }
    } catch {}

    try {
      const postData = await this.postAction('conexoes');
      return postData.conexoes || postData.active_connections || (Array.isArray(postData) ? postData : []);
    } catch {
      return [];
    }
  }

  /**
   * Encerra (derruba) uma conexão ativa de cliente
   */
  public async disconnectConnection(idOrUsername: string): Promise<any> {
    return await this.postAction('derrubar_conexao', {
      id: idOrUsername,
      login_usuario: idOrUsername
    });
  }

  /**
   * Consulta os aplicativos parceiros disponíveis no GerenciaApp (exclusivo tvfast.lat)
   */
  public async getPartnerApps(forceRefresh = false): Promise<Array<{ id: string; name: string }>> {
    try {
      const endpoints = this.getEndpoints(`/api/v1/partner-apps${forceRefresh ? '?refresh=true' : ''}`);
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers: this.getAuthHeaders() });
          if (res.ok) {
            const data = await res.json();
            if (data && (data.apps || Array.isArray(data))) {
              return data.apps || data;
            }
          }
        } catch {}
      }
    } catch {}

    const postData = await this.postAction('listar_apps_parceiros', { refresh: forceRefresh });
    return postData.apps || (Array.isArray(postData) ? postData : []);
  }

  /**
   * Ativa um aplicativo parceiro no GerenciaApp vinculando o MAC do dispositivo ao cliente
   */
  public async activatePartnerApp(params: {
    login_usuario?: string;
    username?: string;
    customerId?: string;
    mac: string;
    appId: string;
    mode?: 'xteam' | 'm3u8';
    expiresAt?: string;
  }): Promise<any> {
    try {
      const endpoints = this.getEndpoints('/api/v1/partner-apps/activate');
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(params)
          });
          const data = await res.json();
          if (res.ok) {
            return data;
          }
          if (data && data.error) {
            throw new Error(data.error);
          }
        } catch (fetchErr: any) {
          if (fetchErr.message && !fetchErr.message.includes('fetch')) {
            throw fetchErr;
          }
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
    }

    return await this.postAction('ativar_app_parceiro', params);
  }

  /**
   * Revoga / desvincula um aplicativo parceiro de um cliente
   */
  public async revokePartnerApp(params: {
    username?: string;
    login_usuario?: string;
    customerId?: string;
    mac?: string;
    gerenciaAppId?: number | string;
    appType?: 'maxplayer' | 'gerenciaapp';
    appName?: string;
  }): Promise<any> {
    const endpoints = this.getEndpoints('/api/v1/partner-apps/revoke');
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(params)
        });
        const data = await res.json();
        if (res.ok) return data;
        if (data && data.error) throw new Error(data.error);
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch')) throw err;
      }
    }
    return await this.postAction('revogar_app_parceiro', params);
  }

  /**
   * ─── SISTEMA GLOBAL DE TICKETS (PEDIDOS E REPORTS) ───
   */
  public async getTickets(): Promise<any[]> {
    const endpoints = this.getEndpoints('/api/v1/tickets');
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: this.getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.tickets)) {
            return data.tickets;
          }
        }
      } catch {}
    }
    return [];
  }

  public async checkTicketContent(title: string, type: 'movie' | 'series' | 'channel'): Promise<{ success: boolean; exists: boolean; item?: any }> {
    const endpoints = this.getEndpoints('/api/v1/tickets/check-content');
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ title, type })
        });
        if (res.ok) {
          const data = await res.json();
          return data;
        }
      } catch {}
    }
    return { success: false, exists: false };
  }

  public async createTicket(params: {
    type: 'report' | 'request';
    contentType: 'movie' | 'series' | 'channel';
    title: string;
    description?: string;
    year?: string;
  }): Promise<{ success: boolean; alreadyAvailable?: boolean; message?: string; ticket?: any; item?: any }> {
    const endpoints = this.getEndpoints('/api/v1/tickets');
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(params)
        });
        const data = await res.json();
        return data;
      } catch {}
    }
    return { success: false, message: 'Erro ao conectar com o servidor.' };
  }

  public async updateTicket(id: string, params: { status?: string; adminReply?: string }): Promise<{ success: boolean; message?: string; ticket?: any }> {
    const endpoints = this.getEndpoints(`/api/v1/tickets/${encodeURIComponent(id)}`);
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'PATCH',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(params)
        });
        const data = await res.json();
        return data;
      } catch {}
    }
    return { success: false, message: 'Erro ao atualizar ticket.' };
  }

  public async deleteTicket(id: string): Promise<{ success: boolean; message?: string }> {
    const endpoints = this.getEndpoints(`/api/v1/tickets/${encodeURIComponent(id)}`);
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        });
        const data = await res.json();
        return data;
      } catch {}
    }
    return { success: false, message: 'Erro ao excluir ticket.' };
  }

  public async getAnnouncements(): Promise<any[]> {
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
    const qs = currentDomain ? `?domain=${encodeURIComponent(currentDomain)}` : '';
    const endpoints = this.getEndpoints(`/api/v1/announcements${qs}`);
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            'x-franchise-domain': currentDomain,
            ...this.getAuthHeaders()
          }
        });
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data) ? data : (data.announcements || []);
        }
      } catch {}
    }
    return [];
  }

  /**
   * ─── CONTA & PERFIL (SELF PROFILE & PASSWORD) ───
   */
  public async getAccount(): Promise<any> {
    const endpoints = this.getEndpoints('/api/v1/account');
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: this.getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data && data.profile) return data.profile;
        }
      } catch {}
    }
    return null;
  }

  public async updateAccount(params: {
    name?: string;
    whatsapp?: string;
    notes?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<{ success: boolean; message: string; profile?: any }> {
    const endpoints = this.getEndpoints('/api/v1/account');
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(params)
        });
        const data = await res.json();
        if (res.ok && data && data.success) {
          return data;
        }
        if (data && data.error) {
          return { success: false, message: data.error };
        }
      } catch {}
    }

    // Fallback: POST user.php com action 'editar_perfil'
    try {
      const resAction = await this.postAction('editar_perfil', {
        nome: params.name,
        whatsapp: params.whatsapp,
        notas: params.notes,
        senha_atual: params.currentPassword,
        nova_senha: params.newPassword
      });
      if (resAction && (resAction.status === 'success' || resAction.success)) {
        return {
          success: true,
          message: resAction.message || 'Dados atualizados com sucesso!',
          profile: resAction.usuario || resAction.profile
        };
      }
      if (resAction && (resAction.message || resAction.error)) {
        return { success: false, message: resAction.message || resAction.error };
      }
    } catch {}

    return { success: false, message: 'Não foi possível atualizar os dados da conta no servidor.' };
  }

  /**
   * ─── UPSTREAM DNS & SERVIDORES DE STREAMING (MASTER ADMIN) ───
   */
  public async getUpstreamDns(): Promise<{ success: boolean; providers: any[] }> {
    const endpoints = this.getEndpoints('/api/admin/upstream-dns');
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: this.getAuthHeaders(true) });
        if (res.ok) {
          const data = await res.json();
          if (data && data.providers) return data;
        }
      } catch {}
    }
    return { success: false, providers: [] };
  }

  public async testUpstreamDns(dns: string, endpoint?: string, providerId?: string): Promise<{ ok: boolean; status?: number; latencyMs?: number; serverMessage?: string; error?: string }> {
    const endpoints = this.getEndpoints('/api/admin/upstream-dns/test');
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(true),
          body: JSON.stringify({ dns, endpoint, providerId })
        });
        const data = await res.json();
        return data;
      } catch {}
    }
    return { ok: false, error: 'Falha ao conectar com o servidor local/VPS.' };
  }

  public async updateUpstreamDns(providerId: string, dns: string): Promise<{ success: boolean; message: string; updatedAccountsCount?: number }> {
    const endpoints = this.getEndpoints(`/api/admin/upstream-dns/${encodeURIComponent(providerId)}`);
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(true),
          body: JSON.stringify({ providerId, dns })
        });
        const data = await res.json();
        if (data && (data.success || res.ok)) {
          return {
            success: true,
            message: data.message || 'DNS atualizado com sucesso!',
            updatedAccountsCount: data.updatedAccountsCount
          };
        }
        if (data && data.error) {
          return { success: false, message: data.error };
        }
      } catch {}
    }
    return { success: false, message: 'Falha ao atualizar DNS no servidor.' };
  }
}

export const apiService = new ApiService();

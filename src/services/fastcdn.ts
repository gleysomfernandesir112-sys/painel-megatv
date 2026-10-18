import { APP_CONFIG, isHostedOnGithub } from '../config/appConfig';

export interface FastCdnResumo {
  status: string;
  revendedor?: {
    id: string;
    nome: string;
    login: string;
    creditos: number;
    clientes_ativos: number;
    total_clientes: number;
    subrevendas: number;
    criado_em?: string;
  };
  total_clientes?: number;
  clientes_ativos?: number;
  creditos?: number;
  nome?: string;
  login?: string;
  usuario?: string;
}

export interface FastCdnCliente {
  id: string;
  login_usuario: string;
  senha_usuario: string;
  nome_usuario?: string;
  conectado: number;
  telas_ativas?: number;
  vencimento: string;
  expiresAt?: string | null;
  status: 'active' | 'expired' | 'blocked' | 'disabled' | 'suspended';
  role?: string;
  is_test: boolean;
  whatsapp?: string;
  notas?: string;
  bouquet_id?: string;
  dono?: string;
  m3u_url?: string;
  epg_url?: string;
  criado_em?: string;
}

export interface FastCdnSubRevenda {
  id: string;
  login_usuario: string;
  username?: string;
  nome_usuario: string;
  name?: string;
  creditos: number;
  creditos_ilimitados?: boolean;
  unlimited_credits?: boolean;
  unlimitedCredits?: boolean;
  clientes_count?: number;
  total_clientes?: number;
  clientes_ativos_count?: number;
  clientes_ativos?: number;
  clientes_expirados?: number;
  sub_revendas_filhas?: number;
  status: 'active' | 'blocked' | 'disabled';
  whatsapp?: string;
  criado_em?: string;
  pai_id?: string;
  pai_username?: string;
  linhagem?: string[];
  direto?: boolean;
  nivel?: number;
  notas?: string;
  ultimo_acesso?: string | null;
}

export interface FastCdnLista {
  id: string;
  nome: string;
  padrao?: boolean;
}

export class FastCdnService {
  private apiKey: string;

  constructor() {
    const configuredKey = import.meta.env.VITE_DEFAULT_API_KEY || APP_CONFIG.defaultApiKey || '';
    const storedRole = typeof window !== 'undefined' ? localStorage.getItem('sigma_session_role') : null;
    const storedKey = typeof window !== 'undefined'
      ? (sessionStorage.getItem('fastcdn_api_key') || localStorage.getItem('fastcdn_api_key'))
      : null;

    if (storedRole === 'reseller' && storedKey) {
      this.apiKey = storedKey;
    } else {
      this.apiKey = configuredKey || storedKey || '';
    }
  }

  public setApiKey(key: string, persist = true) {
    this.apiKey = key.trim();
    if (typeof window !== 'undefined') {
      if (persist) {
        localStorage.setItem('fastcdn_api_key', this.apiKey);
      } else {
        sessionStorage.setItem('fastcdn_api_key', this.apiKey);
      }
    }
  }

  public clearApiKey() {
    const envDefaultKey = import.meta.env.VITE_DEFAULT_API_KEY || APP_CONFIG.defaultApiKey || '';
    this.apiKey = envDefaultKey;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fastcdn_api_key');
      sessionStorage.removeItem('fastcdn_api_key');
      localStorage.removeItem('sigma_session_user');
      localStorage.removeItem('sigma_session_role');
      localStorage.removeItem('sigma_profile');
      localStorage.removeItem('sigma_customers');
      localStorage.removeItem('sigma_resellers');
    }
  }

  public getApiKey() {
    return this.apiKey;
  }

  public hasApiKey() {
    return !!this.apiKey && this.apiKey.length > 5;
  }

  public getEndpoints(path: string): string[] {
    const isGithub = isHostedOnGithub();
    const base = (APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit').replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (isGithub) {
      return [`${base}${cleanPath}`];
    }
    return [`/fastcdn-api${cleanPath}`, `${base}${cleanPath}`];
  }

  public async postAction(action: string, payload: Record<string, any> = {}) {
    if (!this.apiKey) {
      throw new Error('Chave de API não informada. Faça login para continuar.');
    }

    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
    const body = JSON.stringify({ action, domain: currentDomain, ...payload });
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      'X-Franchise-Domain': currentDomain
    };

    const endpoints = this.getEndpoints('/api/v1/user.php');
    let lastError: any = null;

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body
        });

        const data = await res.json().catch(() => null);
        if (res.ok) {
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
          throw new Error(`Erro do servidor (HTTP ${res.status}).`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Não foi possível comunicar com o servidor de streaming.');
  }

  /** Valida a chave de API e retorna o perfil do revendedor */
  public async getResumo(): Promise<FastCdnResumo> {
    return await this.postAction('resumo');
  }

  /** Lista todos os pacotes / bouquets disponíveis */
  public async getListas(): Promise<FastCdnLista[]> {
    const res = await this.postAction('listar_listas');
    return res.listas || res.bouquets || [];
  }

  /** Lista todos os clientes e testes do revendedor com suporte a filtros */
  public async getClientes(filters?: {
    scope?: 'direct' | 'reseller' | 'all';
    search?: string;
    reseller_username?: string;
    reseller_id?: string;
    status?: string;
    bouquet_id?: string;
  }): Promise<FastCdnCliente[]> {
    const res = await this.postAction('listar', filters || {});
    // API returns { status: 'success', total: X, usuarios: [...] }
    return res.usuarios || res.clientes || (Array.isArray(res) ? res : []);
  }

  /** Busca detalhes de um cliente específico */
  public async buscarCliente(loginOrId: string): Promise<FastCdnCliente> {
    const res = await this.postAction('buscar', { login_usuario: loginOrId });
    return res.usuario || res.cliente || res;
  }

  /** Cria novo cliente oficial (debita telas * meses) */
  public async criarCliente(params: {
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
    reseller_username?: string;
    revendedor?: string;
    reseller_id?: string;
    subscription_value?: number;
    subscriptionValue?: number;
  }) {
    const bouquet = params.bouquet_id || params.id_lista || APP_CONFIG.defaultBouquetId;
    const sessionUser = typeof window !== 'undefined' ? localStorage.getItem('sigma_session_user') : null;
    const subVal = params.subscription_value !== undefined ? params.subscription_value : params.subscriptionValue;
    const payload: any = {
      login_usuario: params.login_usuario,
      senha_usuario: params.senha_usuario,
      nome_usuario: params.nome_usuario || params.login_usuario,
      conectado: params.conectado || 1,
      whatsapp: params.whatsapp,
      notas: params.notas,
      bouquet_id: bouquet,
      id_lista: bouquet,
      reseller_username: params.reseller_username || params.revendedor || sessionUser || undefined,
      revendedor: params.revendedor || params.reseller_username || sessionUser || undefined,
      reseller_id: params.reseller_id || undefined,
      subscription_value: subVal !== undefined ? Number(subVal) : undefined,
      subscriptionValue: subVal !== undefined ? Number(subVal) : undefined
    };
    if (params.dias && params.dias > 0) {
      payload.dias = params.dias;
    } else {
      payload.meses = params.meses || 1;
    }
    return await this.postAction('criar', payload);
  }

  /** Gera teste rápido gratuito (suporta Teste Padrão e Teste Grátis Max Player 3 Dias) */
  public async criarTeste(params: {
    horas?: number;
    dias?: number;
    tipo_teste?: 'padrao' | 'maxplayer';
    is_maxplayer?: boolean;
    login_usuario?: string;
    senha_usuario?: string;
    nome_usuario?: string;
    whatsapp?: string;
    bouquet_id?: string;
    id_lista?: string;
    reseller_username?: string;
    revendedor?: string;
    reseller_id?: string;
  }) {
    const bouquet = params.bouquet_id || params.id_lista || APP_CONFIG.defaultBouquetId;
    const sessionUser = typeof window !== 'undefined' ? localStorage.getItem('sigma_session_user') : null;
    const isMax = params.tipo_teste === 'maxplayer' || params.is_maxplayer === true;
    return await this.postAction('teste', {
      horas: isMax ? 72 : (params.horas || APP_CONFIG.defaultTestHours),
      tipo_teste: isMax ? 'maxplayer' : 'padrao',
      is_maxplayer: isMax,
      login_usuario: params.login_usuario || undefined,
      senha_usuario: params.senha_usuario || undefined,
      nome_usuario: params.nome_usuario || (isMax ? 'Teste Max Player (3 Dias)' : 'Cliente Teste'),
      whatsapp: params.whatsapp,
      bouquet_id: bouquet,
      id_lista: bouquet,
      reseller_username: params.reseller_username || params.revendedor || sessionUser || undefined,
      revendedor: params.revendedor || params.reseller_username || sessionUser || undefined,
      reseller_id: params.reseller_id || undefined
    });
  }

  /** Reativa aplicativo MaxPlayer para um cliente */
  public async reativarMaxPlayer(loginOrId: string, dias = 30) {
    return await this.postAction('reativar_maxplayer', {
      login_usuario: loginOrId,
      username: loginOrId,
      dias,
      duration_days: dias
    });
  }

  /** Renova cliente existente (suporta meses ou dias) */
  public async renovarCliente(loginOrId: string, meses = 1, conectado = 1, dias?: number) {
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

  /** Edita os dados cadastrais de um cliente */
  public async editarCliente(params: {
    login_usuario: string;
    nome_usuario?: string;
    senha_usuario?: string;
    conectado?: number;
    whatsapp?: string;
    notas?: string;
    bouquet_id?: string;
    id_lista?: string;
    subscription_value?: number;
    subscriptionValue?: number;
  }) {
    const payload: any = { ...params };
    if (params.subscription_value !== undefined || params.subscriptionValue !== undefined) {
      payload.subscription_value = params.subscription_value !== undefined ? params.subscription_value : params.subscriptionValue;
      payload.subscriptionValue = payload.subscription_value;
    }
    return await this.postAction('editar', payload);
  }

  /** Bloqueia cliente */
  public async bloquearCliente(loginOrId: string) {
    return await this.postAction('bloquear', { login_usuario: loginOrId });
  }

  /** Desbloqueia cliente */
  public async desbloquearCliente(loginOrId: string) {
    return await this.postAction('desbloquear', { login_usuario: loginOrId });
  }

  /** Exclui cliente */
  public async deletarCliente(loginOrId: string) {
    return await this.postAction('deletar', { login_usuario: loginOrId });
  }

  /** Lista sub-revendas com suporte a hierarquia expandida */
  public async getSubRevendas(diretoApenas = false): Promise<FastCdnSubRevenda[]> {
    const res = await this.postAction('listar_subrevendas', { direto_apenas: diretoApenas });
    return res.subrevendas || res.sub_revendas || (Array.isArray(res) ? res : []);
  }

  /** Cria sub-revenda */
  public async criarSubRevenda(params: {
    login_usuario: string;
    senha_usuario: string;
    nome_usuario: string;
    creditos?: number;
    whatsapp?: string;
    notas?: string;
    notes?: string;
  }) {
    return await this.postAction('criar_subrevenda', {
      login_usuario: params.login_usuario,
      senha_usuario: params.senha_usuario,
      nome_usuario: params.nome_usuario,
      creditos: params.creditos || 0,
      whatsapp: params.whatsapp,
      notas: params.notas || params.notes
    });
  }

  /** Transfere ou recolhe créditos de sub-revenda */
  public async transferirCreditosSubRevenda(loginOrId: string, quantidade: number) {
    return await this.postAction('creditos_subrevenda', {
      login_usuario: loginOrId,
      quantidade
    });
  }

  /** Bloqueia sub-revenda */
  public async bloquearSubRevenda(loginOrId: string) {
    return await this.postAction('bloquear_subrevenda', { login_usuario: loginOrId });
  }

  /** Desbloqueia sub-revenda */
  public async desbloquearSubRevenda(loginOrId: string) {
    return await this.postAction('desbloquear_subrevenda', { login_usuario: loginOrId });
  }

  /** Exclui sub-revenda permanentemente */
  public async deletarSubRevenda(loginOrId: string) {
    return await this.postAction('deletar_subrevenda', { login_usuario: loginOrId });
  }

  /** Gera chave de API para sub-revenda */
  public async gerarChaveSubRevenda(loginOrId: string, nomeChave?: string) {
    return await this.postAction('gerar_chave_subrevenda', {
      login_usuario: loginOrId,
      nome_chave: nomeChave || 'Chave API Bot'
    });
  }

  /** Lista chaves de API ativas de uma sub-revenda */
  public async listarChavesSubRevenda(loginOrId?: string) {
    return await this.postAction('listar_chaves_subrevenda', loginOrId ? { login_usuario: loginOrId } : {});
  }

  /** Revoga e destrói uma chave de API */
  public async revogarChaveSubRevenda(idChave: string) {
    return await this.postAction('revogar_chave_subrevenda', { id_chave: idChave });
  }

  /** Busca estatísticas detalhadas de uma sub-revenda específica */
  public async buscarSubRevenda(loginOrId: string) {
    return await this.postAction('buscar_subrevenda', { login_usuario: loginOrId });
  }

  /** Obtém a árvore hierárquica multi-nível completa */
  public async getHierarchy() {
    try {
      const endpoints = this.getEndpoints('/api/v1/hierarchy');
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'X-API-Key': this.apiKey,
              'Content-Type': 'application/json'
            }
          });
          if (res.ok) {
            return await res.json();
          }
        } catch { /* fallback */ }
      }
    } catch { /* fallback to postAction */ }

    return await this.postAction('hierarquia');
  }

  /** Autentica revendedor/sub-revendedor em frontend desacoplado usando X-API-Key master */
  public async autenticarRevenda(username: string, password: string): Promise<{
    success: boolean;
    message?: string;
    token?: string;
    api_key?: string;
    reseller?: any;
    is_master?: boolean;
    is_franchise_master?: boolean;
    franchise_owner?: string;
  }> {
    const endpoints = this.getEndpoints('/api/v1/auth/reseller-login');

    for (const url of endpoints) {
      try {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Franchise-Domain': currentDomain
        };
        if (this.apiKey) {
          headers['X-API-Key'] = this.apiKey;
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ username, password, domain: currentDomain })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.success || data.token)) {
            return data;
          }
        }
      } catch { /* fallback */ }
    }

    // Fallback: POST user.php com action 'validar_revenda'
    try {
      const resAction = await this.postAction('validar_revenda', {
        login_usuario: username,
        senha_usuario: password
      });
      if (resAction && (resAction.status === 'success' || resAction.success)) {
        return {
          success: true,
          message: resAction.message || 'Revendedor autenticado com sucesso!',
          token: resAction.token,
          api_key: resAction.api_key || resAction.chave_api,
          reseller: resAction.reseller || resAction.revendedor || resAction
        };
      }
    } catch { /* fallback */ }

    return { success: false, message: 'Usuário ou senha inválidos.' };
  }

  /** Obtém perfil do usuário e contadores via REST /api/v1/me com fallback para action resumo */
  public async getMe(): Promise<any> {
    try {
      const endpoints = this.getEndpoints('/api/v1/me');
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'X-API-Key': this.apiKey
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.success) return data;
          }
        } catch { /* fallback */ }
      }
    } catch { /* fallback */ }
    return await this.getResumo();
  }

  /** Obtém especificação AI da API de Streaming */
  public async getAiSpec(format: 'json' | 'text' | 'markdown' = 'json'): Promise<any> {
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

  /** Altera status de sub-revenda (ativação ou suspensão) */
  public async toggleSubresellerStatus(loginOrId: string, activate: boolean) {
    if (activate) {
      return await this.desbloquearSubRevenda(loginOrId);
    } else {
      return await this.bloquearSubRevenda(loginOrId);
    }
  }

  /** Consulta conexões e telas ativas da rede do revendedor */
  public async getLiveConnections(): Promise<any[]> {
    try {
      const res = await this.postAction('conexoes');
      return res.conexoes || res.active_connections || (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  }

  /** Encerra (derruba) uma conexão ativa */
  public async derrubarConexao(connectionIdOrUsername: string): Promise<any> {
    return await this.postAction('derrubar_conexao', {
      id: connectionIdOrUsername,
      login_usuario: connectionIdOrUsername
    });
  }
}

export const fastCdnApi = new FastCdnService();


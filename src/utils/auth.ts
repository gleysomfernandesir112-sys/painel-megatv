/**
 * Utilitários de Autenticação
 * Hash seguro de senha com SHA-256 via Web Crypto API
 */

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'sigma_iptv_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

import { APP_CONFIG } from '../config/appConfig';

/** Chave master da API (persistida no localStorage) */
const MASTER_KEY_STORE = 'sigma_master_api_key';
const MASTER_USERNAME_STORE = 'sigma_master_username';
const MASTER_PASS_HASH_STORE = 'sigma_master_pass_hash';
const RESELLER_PASSES_STORE = 'sigma_reseller_passwords';

export const MasterKeyStore = {
  get(): string {
    const envKey = (import.meta as any).env?.VITE_DEFAULT_API_KEY || APP_CONFIG.defaultApiKey || '';
    if (envKey && envKey.trim().length > 5) {
      return envKey.trim();
    }
    return localStorage.getItem(MASTER_KEY_STORE) || '';
  },
  set(key: string) {
    localStorage.setItem(MASTER_KEY_STORE, key.trim());
  },
  clear() {
    localStorage.removeItem(MASTER_KEY_STORE);
    localStorage.removeItem(MASTER_USERNAME_STORE);
    localStorage.removeItem(MASTER_PASS_HASH_STORE);
  },
  has(): boolean {
    const k = this.get();
    return k.length > 5;
  },
  isConfiguredViaEnv(): boolean {
    const envKey = (import.meta as any).env?.VITE_DEFAULT_API_KEY || APP_CONFIG.defaultApiKey || '';
    return envKey.trim().length > 5;
  },
  getMasterUsername(): string {
    return localStorage.getItem(MASTER_USERNAME_STORE) || 'admin';
  },
  setMasterUsername(username: string) {
    localStorage.setItem(MASTER_USERNAME_STORE, username);
  },
  async setMasterPassword(password: string) {
    const hash = await hashPassword(password);
    localStorage.setItem(MASTER_PASS_HASH_STORE, hash);
  },
  async verifyMasterPassword(password: string): Promise<boolean> {
    const hash = localStorage.getItem(MASTER_PASS_HASH_STORE) || '';
    if (!hash) return true; // sem senha definida, libera
    return verifyPassword(password, hash);
  }
};

/** Armazena/recupera senhas de revendedores (hash SHA-256) */
export const ResellerPassStore = {
  _getAll(): Record<string, string> {
    const raw = localStorage.getItem(RESELLER_PASSES_STORE);
    return raw ? JSON.parse(raw) : {};
  },
  async set(username: string, password: string) {
    const all = this._getAll();
    all[username.toLowerCase()] = await hashPassword(password);
    localStorage.setItem(RESELLER_PASSES_STORE, JSON.stringify(all));
  },
  async verify(username: string, password: string): Promise<boolean> {
    const all = this._getAll();
    const hash = all[username.toLowerCase()];
    if (!hash) return false;
    return verifyPassword(password, hash);
  },
  remove(username: string) {
    const all = this._getAll();
    delete all[username.toLowerCase()];
    localStorage.setItem(RESELLER_PASSES_STORE, JSON.stringify(all));
  },
  has(username: string): boolean {
    const all = this._getAll();
    return !!all[username.toLowerCase()];
  }
};

/**
 * Utilitário de normalização automática de números de telefone e WhatsApp.
 * Converte qualquer formato colado ou digitado para o formato padrão do sistema (apenas dígitos com DDI 55 quando aplicável).
 *
 * Exemplos:
 *  - "+55 51 9336-1718"    -> "555193361718"
 *  - "+55 51 99336-1718"   -> "5551993361718"
 *  - "+55 (51) 99336-1718" -> "5551993361718"
 *  - "(51) 99336-1718"     -> "5551993361718"
 *  - "51 9336-1718"        -> "555193361718"
 *  - "51993361718"         -> "5551993361718"
 *  - "051 99336-1718"      -> "5551993361718"
 *  - "55519999999"         -> "55519999999"
 */

export function normalizePhoneNumber(value: string | number | null | undefined): string {
  if (!value) return '';
  const str = String(value).trim();
  if (!str) return '';

  // Remove todos os caracteres não-dígitos
  let digits = str.replace(/\D/g, '');
  if (!digits) return '';

  // Se começar com prefixo internacional 00, remove
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Se começar com zero antes do DDD (ex: 051 99336-1718 -> 11 ou 12 dígitos com zero)
  if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1);
  }

  // Se não começa com 55 e tem tamanho de número brasileiro com DDD (10 ou 11 dígitos), adiciona DDI 55
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }

  return digits;
}

/**
 * Handler helper para inputs de telefone / WhatsApp em React.
 * Se o usuário colar algo com símbolos (+, espaços, hífens), normaliza imediatamente.
 */
export function handlePhoneInputChange(
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (val: string) => void
): void {
  const val = e.target.value;
  if (/\D/.test(val)) {
    setter(normalizePhoneNumber(val));
  } else {
    setter(val.slice(0, 15));
  }
}

/**
 * Handler helper para evento onPaste de inputs em React.
 */
export function handlePhoneInputPaste(
  e: React.ClipboardEvent<HTMLInputElement>,
  setter: (val: string) => void
): void {
  e.preventDefault();
  const text = e.clipboardData.getData('text');
  setter(normalizePhoneNumber(text));
}

/**
 * Handler helper para evento onBlur de inputs em React.
 */
export function handlePhoneInputBlur(
  currentVal: string,
  setter: (val: string) => void
): void {
  setter(normalizePhoneNumber(currentVal));
}

import { supabase } from './supabaseClient';

/**
 * Utilitário centralizado para resolução de IDs de utilizador.
 * Resolve a inconsistência entre UUID (Auth) e BigInt (Base de Dados).
 */

// Cache com TTL (tempo de vida) para evitar cache desatualizado
interface CacheEntry {
  id: number;
  timestamp: number;
}

const idCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Verifica se um valor é um UUID válido.
 */
export function isUUID(id: string | number): boolean {
  if (typeof id === 'number') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Resolve o ID numérico (BigInt) de um utilizador a partir do seu e-mail ou UUID.
 * @param identifier O ID (número ou UUID) ou o email
 * @param email O email do utilizador (opcional, mas recomendado se o identifier for um UUID)
 */
export async function resolveNumericUserId(identifier: string | number, email?: string): Promise<number | null> {
  if (typeof identifier === 'number') return identifier;
  
  const idStr = String(identifier).trim();
  if (!idStr) return null;

  // 1. Se for um número em string, converter
  if (/^\d+$/.test(idStr)) {
    const num = Number(idStr);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
  }

  // 2. Verificar cache com TTL
  const cached = idCache.get(idStr);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[ID Resolver] Cache hit for: ${idStr}`);
    return cached.id;
  }

  try {
    // 3. Procurar na tabela users pelo email
    let query = supabase.from('users').select('id');
    
    if (idStr.includes('@')) {
      query = query.eq('email', idStr.toLowerCase());
    } else if (isUUID(idStr)) {
      // Se for UUID, precisamos do email para mapear na tabela de perfis (users)
      if (email) {
        query = query.eq('email', email.toLowerCase());
      } else {
        console.warn(`[ID Resolver] UUID detected "${idStr}" but no email provided for resolution.`);
        return null;
      }
    } else {
      // Tentar por e-mail de qualquer forma se não for número nem UUID
      query = query.eq('email', idStr.toLowerCase());
    }

    const { data, error } = await query.single();

    if (error || !data) {
      console.warn(`[ID Resolver] Não foi possível resolver o ID para: "${idStr}" (email: ${email}). Erro:`, error?.message || 'Não encontrado');
      return null;
    }

    const numericId = Number(data.id);
    
    if (isNaN(numericId)) {
      console.error(`[ID Resolver] ID resolvido não é um número válido:`, data.id);
      return null;
    }

    // 4. Guardar em cache com timestamp
    const cacheEntry: CacheEntry = {
      id: numericId,
      timestamp: Date.now()
    };
    idCache.set(idStr, cacheEntry);
    if (email) idCache.set(email.toLowerCase(), cacheEntry);
    
    console.log(`[ID Resolver] ✅ Resolved numeric ID: ${numericId} (Type: ${typeof numericId}) for identifier: "${idStr}"`);
    return numericId;
  } catch (err) {
    console.error(`[ID Resolver] ❌ Critical error resolving ID for "${identifier}":`, err);
    return null;
  }
}

/**
 * Garante que o ID fornecido é numérico. Se for UUID, tenta resolver.
 * Lança erro se não conseguir resolver.
 */
export async function ensureNumericId(id: string | number, email?: string): Promise<number> {
  const resolved = await resolveNumericUserId(id, email);
  if (resolved === null) {
    throw new Error(`CRITICAL: ID do utilizador '${id}' (email: ${email}) não pôde ser resolvido para um valor numérico.`);
  }
  return resolved;
}

/**
 * Limpa o cache de IDs. Útil para chamar no logout ou quando
 * houver mudanças significativas nos dados de utilizadores.
 */
export function clearIdCache(): void {
  idCache.clear();
  console.log('[ID Resolver] Cache limpo');
}

/**
 * Limpa entrada específica do cache
 */
export function clearIdCacheEntry(identifier: string): void {
  idCache.delete(identifier);
  console.log(`[ID Resolver] Cache entry limpo para: ${identifier}`);
}

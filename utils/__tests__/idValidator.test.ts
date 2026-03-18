/**
 * Testes automatizados para garantir que IDs NUNCA mais quebrem
 * Execute com: npm test idValidator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IdValidator,
  isUUID,
  isValidBigInt,
  ensureNumericId,
  isValidId
} from '../idValidator';

describe('IdValidator - Proteção contra UUID/BigInt', () => {

  beforeEach(() => {
    IdValidator.clearErrors();
  });

  describe('isUUID', () => {
    it('deve identificar UUIDs válidos', () => {
      expect(isUUID('86b1e930-e1de-4516-b86e-b666c9874803')).toBe(true);
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('deve rejeitar não-UUIDs', () => {
      expect(isUUID('123')).toBe(false);
      expect(isUUID(123)).toBe(false);
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID(null)).toBe(false);
    });
  });

  describe('isValidBigInt', () => {
    it('deve aceitar números inteiros válidos', () => {
      expect(isValidBigInt(1)).toBe(true);
      expect(isValidBigInt(123)).toBe(true);
      expect(isValidBigInt(999999)).toBe(true);
    });

    it('deve aceitar strings numéricas', () => {
      expect(isValidBigInt('123')).toBe(true);
      expect(isValidBigInt('999')).toBe(true);
    });

    it('deve rejeitar valores inválidos', () => {
      expect(isValidBigInt(0)).toBe(false);
      expect(isValidBigInt(-1)).toBe(false);
      expect(isValidBigInt(1.5)).toBe(false);
      expect(isValidBigInt('abc')).toBe(false);
      expect(isValidBigInt(null)).toBe(false);
    });
  });

  describe('validateUserId - CRÍTICO', () => {
    it('deve aceitar IDs numéricos válidos', () => {
      expect(IdValidator.validateUserId(123)).toBe(123);
      expect(IdValidator.validateUserId(1)).toBe(1);
      expect(IdValidator.validateUserId('456')).toBe(456);
    });

    it('deve FALHAR com UUID - TESTE MAIS IMPORTANTE', () => {
      const uuid = '86b1e930-e1de-4516-b86e-b666c9874803';
      expect(() => IdValidator.validateUserId(uuid)).toThrowError(/UUID/);
      expect(() => IdValidator.validateUserId(uuid)).toThrowError(/CRITICAL/);
    });

    it('deve FALHAR com null/undefined', () => {
      expect(() => IdValidator.validateUserId(null)).toThrowError(/CRITICAL/);
      expect(() => IdValidator.validateUserId(undefined)).toThrowError(/CRITICAL/);
    });

    it('deve FALHAR com strings não numéricas', () => {
      expect(() => IdValidator.validateUserId('abc')).toThrowError(/CRITICAL/);
      expect(() => IdValidator.validateUserId('user-123')).toThrowError(/CRITICAL/);
    });

    it('deve FALHAR com números inválidos', () => {
      expect(() => IdValidator.validateUserId(0)).toThrowError(/inteiro válido/);
      expect(() => IdValidator.validateUserId(-1)).toThrowError(/inteiro válido/);
      expect(() => IdValidator.validateUserId(1.5)).toThrowError(/inteiro válido/);
    });

    it('deve incluir contexto na mensagem de erro', () => {
      const uuid = '86b1e930-e1de-4516-b86e-b666c9874803';
      expect(() =>
        IdValidator.validateUserId(uuid, 'login')
      ).toThrowError(/login/);
    });
  });

  describe('validateUser', () => {
    it('deve aceitar user válido', () => {
      const user = {
        id: 123,
        name: 'Test User',
        email: 'test@example.com'
      };
      expect(() => IdValidator.validateUser(user)).not.toThrow();
    });

    it('deve FALHAR se user.id for UUID', () => {
      const user = {
        id: '86b1e930-e1de-4516-b86e-b666c9874803',
        name: 'Test User'
      };
      expect(() => IdValidator.validateUser(user)).toThrowError(/UUID/);
    });

    it('deve FALHAR se user for null', () => {
      expect(() => IdValidator.validateUser(null)).toThrowError(/null/);
    });
  });

  describe('validateTimeLog', () => {
    it('deve aceitar time_log válido', () => {
      const log = {
        id: 456,
        user_id: 123,
        check_in: '09:00'
      };
      expect(() => IdValidator.validateTimeLog(log)).not.toThrow();
    });

    it('deve FALHAR se IDs forem UUID', () => {
      const log = {
        id: '86b1e930-e1de-4516-b86e-b666c9874803',
        user_id: 123
      };
      expect(() => IdValidator.validateTimeLog(log)).toThrowError(/TimeLog.id inválido/);
    });

    it('deve FALHAR se user_id for UUID', () => {
      const log = {
        id: 456,
        user_id: '86b1e930-e1de-4516-b86e-b666c9874803'
      };
      expect(() => IdValidator.validateTimeLog(log)).toThrowError(/UUID/);
    });
  });

  describe('validateAnomaly', () => {
    it('deve aceitar anomaly válida', () => {
      const anomaly = {
        id: 789,
        user_id: 123,
        time_log_id: 456,
        type: 'LATE_ENTRY'
      };
      expect(() => IdValidator.validateAnomaly(anomaly)).not.toThrow();
    });

    it('deve FALHAR com IDs UUID', () => {
      const anomaly = {
        id: 789,
        user_id: '86b1e930-e1de-4516-b86e-b666c9874803',
        time_log_id: 456
      };
      expect(() => IdValidator.validateAnomaly(anomaly)).toThrowError(/UUID/);
    });
  });

  describe('healthCheck', () => {
    it('deve reportar saúde quando sem erros', () => {
      const health = IdValidator.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.errors).toBe(0);
    });

    it('deve reportar problemas após erros', () => {
      try {
        IdValidator.validateUserId('86b1e930-e1de-4516-b86e-b666c9874803');
      } catch {}

      const health = IdValidator.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.errors).toBeGreaterThan(0);
      expect(health.lastError).toContain('UUID');
    });
  });

  describe('ensureNumericId helper', () => {
    it('deve converter string numérica para número', () => {
      expect(ensureNumericId('123')).toBe(123);
      expect(ensureNumericId('999')).toBe(999);
    });

    it('deve EXPLODIR com UUID', () => {
      expect(() =>
        ensureNumericId('86b1e930-e1de-4516-b86e-b666c9874803')
      ).toThrowError(/CRITICAL/);
    });
  });

  describe('isValidId type guard', () => {
    it('deve retornar true para IDs válidos', () => {
      expect(isValidId(123)).toBe(true);
      expect(isValidId('456')).toBe(true);
    });

    it('deve retornar false para IDs inválidos', () => {
      expect(isValidId('86b1e930-e1de-4516-b86e-b666c9874803')).toBe(false);
      expect(isValidId(null)).toBe(false);
      expect(isValidId('abc')).toBe(false);
    });
  });

  /**
   * TESTE CRÍTICO: Simular cenários reais que quebraram antes
   */
  describe('Cenários Reais de Produção', () => {
    it('deve prevenir o bug de login que tivemos', () => {
      // Simular retorno do Supabase Auth
      const authUser = {
        id: '86b1e930-e1de-4516-b86e-b666c9874803', // UUID do Auth
        email: 'user@example.com'
      };

      // Isto DEVE falhar
      expect(() =>
        IdValidator.validateUserId(authUser.id, 'login')
      ).toThrowError(/UUID/);
    });

    it('deve prevenir o bug de time_logs', () => {
      // Simular tentativa de inserir com UUID
      const timeLogData = {
        user_id: '86b1e930-e1de-4516-b86e-b666c9874803', // ERRO!
        check_in: '09:00'
      };

      expect(() =>
        IdValidator.validateTimeLog(timeLogData, 'clock-in')
      ).toThrowError(/UUID/);
    });

    it('deve aceitar fluxo correto', () => {
      // Fluxo correto após correção
      const dbUser = {
        id: 123, // Número do DB
        email: 'user@example.com',
        authUuid: '86b1e930-e1de-4516-b86e-b666c9874803' // UUID guardado separadamente
      };

      expect(() => IdValidator.validateUser(dbUser)).not.toThrow();
      expect(IdValidator.validateUserId(dbUser.id)).toBe(123);
    });
  });
});

/**
 * Testes de Integração - Garantir que nunca quebre
 */
describe('Testes de Integração - Proteção Total', () => {

  it('deve validar pipeline completo de login', () => {
    // 1. Auth retorna UUID
    const authResponse = {
      user: {
        id: '86b1e930-e1de-4516-b86e-b666c9874803',
        email: 'test@example.com'
      }
    };

    // 2. Buscar user do DB deve ter ID numérico
    const dbUser = {
      id: 123, // DEVE ser número
      email: 'test@example.com',
      name: 'Test User'
    };

    // 3. Validar que está correto
    expect(() => IdValidator.validateUser(dbUser)).not.toThrow();

    // 4. Se alguém tentar usar UUID, DEVE falhar
    const wrongUser = { ...dbUser, id: authResponse.user.id };
    expect(() => IdValidator.validateUser(wrongUser)).toThrowError(/UUID/);
  });

  it('deve validar pipeline de picagem', () => {
    const user = { id: 123, name: 'Test' };

    // Validar antes de enviar para DB
    const validatedId = IdValidator.validateUserId(user.id, 'clock-in');

    const timeLogInsert = {
      user_id: validatedId,
      check_in: '09:00',
      date: '2024-03-18'
    };

    // Isto deve passar
    expect(() => IdValidator.validateTimeLog(timeLogInsert)).not.toThrow();
  });

  it('deve validar pipeline de anomalias', () => {
    const anomalyInsert = {
      user_id: 123,
      time_log_id: 456,
      type: 'LATE_ENTRY'
    };

    // Deve passar
    expect(() => IdValidator.validateAnomaly(anomalyInsert)).not.toThrow();

    // Com UUID deve falhar
    const wrongAnomaly = { ...anomalyInsert, user_id: 'uuid-here' };
    expect(() => IdValidator.validateAnomaly(wrongAnomaly)).toThrowError();
  });
});

// Exportar para uso em CI/CD
export const criticalTests = {
  mustPass: [
    'deve FALHAR com UUID - TESTE MAIS IMPORTANTE',
    'deve prevenir o bug de login que tivemos',
    'deve prevenir o bug de time_logs'
  ]
};
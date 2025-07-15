interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

interface RetryableError extends Error {
  status?: number;
  code?: string;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  backoffMultiplier: 2,
  retryableErrors: [
    'over_request_rate_limit',
    'NETWORK_ERROR',
    'TIMEOUT',
    'CONNECTION_ERROR',
    'PGRST301', // Supabase timeout
    'PGRST302', // Supabase connection error
  ],
};

/**
 * Verifica se um erro é passível de repetição
 */
const isRetryableError = (error: any, retryableErrors: string[]): boolean => {
  if (!error) return false;

  // Verificar status HTTP
  if (error.status === 429 || error.status === 502 || error.status === 503 || error.status === 504) {
    return true;
  }

  // Verificar códigos de erro específicos
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  // Verificar mensagens de erro
  if (error.message) {
    const message = error.message.toLowerCase();
    if (message.includes('rate limit') || 
        message.includes('timeout') || 
        message.includes('network') ||
        message.includes('connection')) {
      return true;
    }
  }

  return false;
};

/**
 * Implementa delay com jitter para evitar thundering herd
 */
const delay = (ms: number): Promise<void> => {
  // Adicionar jitter de ±25% para evitar que todas as requisições sejam feitas ao mesmo tempo
  const jitter = ms * 0.25 * (Math.random() - 0.5);
  const delayWithJitter = Math.max(100, ms + jitter);
  
  return new Promise(resolve => setTimeout(resolve, delayWithJitter));
};

/**
 * Wrapper para chamadas do Supabase com backoff exponencial e repetição
 */
export const withSupabaseRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: RetryableError;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt}/${config.maxAttempts} da operação Supabase`);
      
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`✅ Operação Supabase bem-sucedida na tentativa ${attempt}`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      console.warn(`⚠️ Tentativa ${attempt} falhou:`, {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        details: error?.details
      });

      // Se não é um erro passível de repetição, falhar imediatamente
      if (!isRetryableError(error, config.retryableErrors)) {
        console.error('❌ Erro não é passível de repetição, falhando imediatamente');
        throw error;
      }

      // Se é a última tentativa, falhar
      if (attempt === config.maxAttempts) {
        console.error(`❌ Todas as ${config.maxAttempts} tentativas falharam`);
        break;
      }

      // Calcular delay com backoff exponencial
      const baseDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
      const delayMs = Math.min(baseDelay, config.maxDelay);
      
      console.log(`⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`);
      await delay(delayMs);
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  throw new Error(
    `Operação Supabase falhou após ${config.maxAttempts} tentativas. Último erro: ${lastError?.message || 'Erro desconhecido'}`
  );
};

/**
 * Wrapper específico para operações de autenticação (com configurações mais conservadoras)
 */
export const withAuthRetry = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return withSupabaseRetry(operation, {
    maxAttempts: 2, // Menos tentativas para auth
    initialDelay: 5000, // Delay muito maior para auth (5 segundos)
    maxDelay: 15000, // Delay máximo aumentado para 15 segundos
    backoffMultiplier: 2,
  });
};

/**
 * Wrapper específico para operações de sincronização (com configurações mais agressivas)
 */
export const withSyncRetry = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return withSupabaseRetry(operation, {
    maxAttempts: 5, // Mais tentativas para sync
    initialDelay: 500, // Delay menor para sync
    maxDelay: 8000,
    backoffMultiplier: 1.5,
  });
};
/**
 * Date utility functions for handling date formatting
 */

/**
 * Get current date formatted for HTML date input (YYYY-MM-DD)
 */
export const getCurrentDateForInput = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Format a date string for HTML date input (YYYY-MM-DD)
 * @param date - Date string in any format
 */
export const formatDateForInput = (date: string): string => {
  try {
    if (!date) return getCurrentDateForInput();
    
    // Se já está no formato YYYY-MM-DD, retorna como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Data inválida fornecida:', date);
      return getCurrentDateForInput();
    }
    
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao formatar data para input:', error, date);
    return getCurrentDateForInput();
  }
};

/**
 * Format a date string for storage (YYYY-MM-DD)
 * @param date - Date string from HTML date input
 */
export const formatDateForStorage = (date: string): string => {
  try {
    if (!date) {
      console.warn('Data vazia fornecida para armazenamento');
      return getCurrentDateForInput();
    }
    
    // Se já está no formato correto, retorna como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // Tenta converter para o formato correto
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Data inválida fornecida para armazenamento:', date);
      return getCurrentDateForInput();
    }
    
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao formatar data para armazenamento:', error, date);
    return getCurrentDateForInput();
  }
};
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
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Format a date string for storage (YYYY-MM-DD)
 * @param date - Date string from HTML date input
 */
export const formatDateForStorage = (date: string): string => {
  return date; // HTML date inputs already return YYYY-MM-DD format
};
/**
 * Utility functions for client quick contact actions:
 * - Calling via standard tel: protocol
 * - WhatsApp direct chat link (wa.me)
 * - Google Maps standard search URL
 * 
 * Uses only browser and device native protocols without any paid APIs.
 */

/**
 * Cleans phone number removing spaces, dashes, parentheses and special characters.
 */
export function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Generates a normalized tel: URL for standard device dialer.
 */
export function getTelUrl(phone?: string | null): string | null {
  const digits = cleanPhoneNumber(phone);
  if (!digits) return null;

  // If 10 digits (standard Mexican mobile/landline), prefix with +52
  if (digits.length === 10) {
    return `tel:+52${digits}`;
  }

  // If starts with 52 and has 12 digits
  if (digits.length === 12 && digits.startsWith('52')) {
    return `tel:+${digits}`;
  }

  return `tel:+${digits}`;
}

/**
 * Generates public WhatsApp wa.me URL.
 * Automatically adds Mexican country code (52) for 10-digit phone numbers.
 */
export function getWhatsAppUrl(phone?: string | null): string | null {
  const digits = cleanPhoneNumber(phone);
  if (!digits) return null;

  // If 10 digits, add country code 52
  if (digits.length === 10) {
    return `https://wa.me/52${digits}`;
  }

  // If already starts with 52 (e.g. 523111234567)
  if (digits.startsWith('52') && digits.length >= 12) {
    return `https://wa.me/${digits}`;
  }

  return `https://wa.me/${digits}`;
}

/**
 * Generates standard Google Maps search URL encoded with encodeURIComponent.
 */
export function getGoogleMapsUrl(address?: string | null): string | null {
  if (!address || !address.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

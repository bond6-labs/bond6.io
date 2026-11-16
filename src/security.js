/**
 * Security utilities for bond6.io
 * Provides sanitization, CSP headers, and CSRF token management
 */

import { CSRF_TOKEN_EXPIRY_MS } from './config.js';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes dangerous tags and encodes HTML entities
 * @param {string} value - Content to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized content
 */
export function sanitizeHTML(value, maxLength) {
  if (!value || typeof value !== 'string') return '';
  
  // Enforce maximum length to prevent DoS
  let sanitized = value.slice(0, maxLength);
  
  // Remove dangerous HTML tags (script, style, iframe, object, embed, etc.)
  sanitized = sanitized.replace(/<(script|style|iframe|object|embed|link|meta|base|form|input|button)[^>]*>[\s\S]*?<\/\1>/gi, '');
  sanitized = sanitized.replace(/<(script|style|iframe|object|embed|link|meta|base|form|input|button)[^>]*\/?>/gi, '');
  
  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']?\s*javascript:/gi, 'src="#"');
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*data:/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']?\s*data:/gi, 'src="#"');
  
  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  
  return sanitized;
}

/**
 * Get Content-Security-Policy header value
 * Returns restrictive CSP to mitigate XSS attacks
 * @returns {string} CSP header value
 */
export function getCSPHeader() {
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'"
  ].join('; ');
}

/**
 * Generate a cryptographically secure CSRF token
 * @param {Object} env - Cloudflare Workers environment with DB binding
 * @param {string} sessionId - Session identifier (from cookie or 'anonymous')
 * @returns {Promise<string>} Generated CSRF token
 */
export async function generateCSRFToken(env, sessionId) {
  const token = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY_MS;
  
  try {
    await env.DB.prepare(
      'INSERT INTO csrf_tokens (token_hash, session_id, expires_at) VALUES (?, ?, ?) ON CONFLICT(token_hash) DO UPDATE SET expires_at=excluded.expires_at'
    ).bind(tokenHash, sessionId, expiresAt).run();
  } catch (error) {
    console.error('CSRF token generation failed:', error.message);
    throw error;
  }
  
  return token;
}

/**
 * Validate a CSRF token
 * @param {Object} env - Cloudflare Workers environment with DB binding
 * @param {string} token - Token to validate
 * @param {string} sessionId - Session identifier
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
export async function validateCSRFToken(env, token, sessionId) {
  if (!token || typeof token !== 'string') return false;
  
  try {
    const tokenHash = await hashToken(token);
    const now = Date.now();
    
    // Look up token and check expiry
    const record = await env.DB.prepare(
      'SELECT expires_at FROM csrf_tokens WHERE token_hash = ? AND session_id = ?'
    ).bind(tokenHash, sessionId).first();
    
    if (!record || record.expires_at < now) {
      return false;
    }
    
    // Delete token after successful validation (one-time use)
    await env.DB.prepare(
      'DELETE FROM csrf_tokens WHERE token_hash = ?'
    ).bind(tokenHash).run();
    
    return true;
  } catch (error) {
    console.error('CSRF token validation error:', error.message);
    return false;
  }
}

/**
 * Hash a token for secure storage
 * @param {string} token - Token to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
async function hashToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Clean up expired CSRF tokens
 * Should be called periodically (e.g., in prune())
 * @param {Object} env - Cloudflare Workers environment with DB binding
 * @param {number} now - Current timestamp
 * @returns {Promise<void>}
 */
export async function cleanupExpiredTokens(env, now) {
  try {
    await env.DB.prepare(
      'DELETE FROM csrf_tokens WHERE expires_at < ?'
    ).bind(now).run();
  } catch (error) {
    console.warn('CSRF token cleanup failed:', error.message);
  }
}

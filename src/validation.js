/**
 * Shared validation utilities for bond6.io
 * Eliminates duplicate validation logic across the codebase
 */

/**
 * Validate and canonicalize a URL
 * @param {string} value - URL to validate
 * @param {number} maxLength - Maximum allowed length (default 2048)
 * @returns {string|null} Canonical URL or null if invalid
 */
export function validateURL(value, maxLength = 2048) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.href.length > maxLength) return null;
    if (url.hostname === 'localhost' || !url.hostname.includes('.') || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) || url.hostname.includes(':')) return null;
    url.hash = '';
    if (url.hostname.startsWith('www.')) url.hostname = url.hostname.slice(4);
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Detect language of text content
 * @param {string} text - Text to analyze
 * @returns {string} Language code ('en', 'zh', or 'unknown')
 */
export function validateLanguage(text) {
  const value = String(text ?? '');
  const han = (value.match(/\p{Script=Han}/gu) || []).length;
  const latin = (value.match(/[a-z]/gi) || []).length;
  return han >= 4 && han / Math.max(1, han + latin) > .15 ? 'zh' : 'en';
}

/**
 * Validate story object schema before database insertion
 * @param {Object} story - Story object to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails with detailed message
 */
export function validateStorySchema(story) {
  if (!story || typeof story !== 'object') {
    throw new Error('Story must be an object');
  }
  
  // Required fields
  const required = ['url', 'title', 'source', 'source_id', 'topic', 'published_at', 'canonical_url', 'lane', 'subject', 'content_hash'];
  for (const field of required) {
    if (story[field] === undefined || story[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // URL validation
  if (!validateURL(story.url) || !validateURL(story.canonical_url)) throw new Error('Invalid public story URL');
  
  // Title validation
  if (typeof story.title !== 'string' || story.title.length === 0 || story.title.length > 500) {
    throw new Error('Invalid title: must be non-empty string under 500 characters');
  }
  
  // Source validation
  if (typeof story.source !== 'string' || story.source.length === 0) {
    throw new Error('Invalid source: must be non-empty string');
  }
  if (typeof story.source_id !== 'string' || !/^[a-z0-9-]+$/i.test(story.source_id)) throw new Error('Invalid source_id');
  if (typeof story.topic !== 'string' || story.topic.length === 0 || story.topic.length > 120) throw new Error('Invalid topic');
  
  // Published timestamp validation
  if (typeof story.published_at !== 'number' || !Number.isFinite(story.published_at)) {
    throw new Error('Invalid published_at: must be finite number (Unix timestamp)');
  }
  
  if (!['human', 'ai'].includes(story.lane)) throw new Error('Invalid lane');
  if (!['music', 'art', 'writing', 'practice', 'digital'].includes(story.subject)) throw new Error('Invalid subject');
  
  // Excerpt length validation (if present)
  if (story.excerpt && story.excerpt.length > 2200) {
    throw new Error('Invalid excerpt: exceeds 2200 characters');
  }
  
  // Author length validation (if present)
  if (story.author && story.author.length > 160) {
    throw new Error('Invalid author: exceeds 160 characters');
  }
  
  // Content hash validation
  if (typeof story.content_hash !== 'string' || story.content_hash.length === 0) {
    throw new Error('Invalid content_hash: must be non-empty string');
  }
  
  return true;
}

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email regex (not perfect but catches most invalid formats)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate timestamp is in correct format (Unix milliseconds)
 * @param {*} timestamp - Value to validate
 * @returns {boolean} True if valid Unix timestamp in milliseconds
 */
export function validateTimestamp(timestamp) {
  if (typeof timestamp !== 'number') return false;
  if (!Number.isFinite(timestamp)) return false;
  
  // Reasonable range: between year 2000 and year 2100
  const min = Date.parse('2000-01-01T00:00:00Z');
  const max = Date.parse('2100-01-01T00:00:00Z');
  
  return timestamp >= min && timestamp <= max;
}

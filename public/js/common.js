// Shared helpers for all pages. Exposes a single global: HW.
(function () {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function prefersReducedMotion() {
    return reducedMotionQuery.matches;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchJSON(url, options) {
    const response = await fetch(url, options);
    let data = null;
    try {
      data = await response.json();
    } catch (err) {
      // non-JSON body; leave data null
    }
    if (!response.ok) {
      const error = new Error('Request failed');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // localStorage can throw (private mode, blocked storage); fall back to memory for this page view.
  const memoryStore = {};

  function storageGet(key) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? memoryStore[key] || null : value;
    } catch (err) {
      return memoryStore[key] || null;
    }
  }

  function storageSet(key, value) {
    memoryStore[key] = value;
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      // memory fallback already set
    }
  }

  // Anonymous, random, per-browser identifier. Used only so the server can ignore repeat reactions
  // to the same wish. Contains no personal information.
  function getVisitorKey() {
    let key = storageGet('hw_visitor_key');
    if (key && /^[A-Za-z0-9_-]{8,128}$/.test(key)) return key;

    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      key = window.crypto.randomUUID();
    } else {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    storageSet('hw_visitor_key', key);
    return key;
  }

  function getReactedIds() {
    try {
      const ids = JSON.parse(storageGet('hw_reacted') || '[]');
      return Array.isArray(ids) ? ids : [];
    } catch (err) {
      return [];
    }
  }

  function rememberReacted(id) {
    const ids = getReactedIds();
    if (!ids.includes(id)) {
      ids.push(id);
      storageSet('hw_reacted', JSON.stringify(ids));
    }
  }

  window.HW = {
    prefersReducedMotion,
    wait,
    fetchJSON,
    formatDate,
    getVisitorKey,
    getReactedIds,
    rememberReacted
  };
})();

(() => {
  const storageKey = 'bond6-theme';
  let theme = 'paper';
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'dark') theme = saved;
  } catch {
    // The selector still works for this page when storage is unavailable.
  }

  function applyTheme(value) {
    document.documentElement.dataset.theme = value;
    document.querySelector('meta[name="theme-color"]').content = value === 'dark' ? '#292b2e' : '#f6f3ec';
  }

  applyTheme(theme);
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.theme-toggle');
    toggle.setAttribute('aria-checked', String(theme === 'dark'));
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'paper' : 'dark';
      applyTheme(theme);
      toggle.setAttribute('aria-checked', String(theme === 'dark'));
      try {
        localStorage.setItem(storageKey, theme);
      } catch {
        // The active theme remains visible on the current page.
      }
    });
  });
})();

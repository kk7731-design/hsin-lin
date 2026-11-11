(() => {
  'use strict';
  const button = document.querySelector('#install-button');
  const help = document.querySelector('#install-help');
  let installPrompt;
  const standalone = window.matchMedia('(display-mode: standalone)');
  function updateInstalled() {
    if (standalone.matches || navigator.standalone) {
      button.hidden = true;
      help.hidden = true;
    }
  }
  updateInstalled();
  standalone.addEventListener('change', updateInstalled);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (!standalone.matches && !navigator.standalone) button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    button.hidden = true;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      help.hidden = false;
    }
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    button.hidden = true;
    help.hidden = true;
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('./sw.js', { scope: './' });
      } catch {
        const message = document.querySelector('#pwa-message');
        message.textContent = '離線功能尚未準備完成，請保持連線並稍後重新開啟。';
        message.hidden = false;
      }
    });
  }
})();

// FunTouch Extension — Host Bridge Script
// Injected into the FunTouch web app (localhost:5173 / funtouch.app)
// Automatically bridges window.postMessage events to the extension background service worker.

(() => {
  console.log('[FunTouch Extension Bridge] Connected to FunTouch Web App.');

  // Announce presence to the web page
  window.postMessage({ source: 'FUNTOUCH_EXTENSION_STATUS', installed: true, version: '1.0.0' }, '*');

  // Listen for interaction events dispatched by useRemoteInteraction hook
  window.addEventListener('message', (event) => {
    // Only process messages from the current window
    if (event.source !== window || !event.data) return;

    if (event.data.source === 'FUNTOUCH_HOST_INTERACTION') {
      const interaction = event.data.detail;
      if (!interaction) return;

      chrome.runtime.sendMessage(
        {
          type: 'EXECUTE_INTERACTION',
          detail: interaction,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            // Service worker might be sleeping; silent catch
          }
        }
      );
    } else if (event.data.source === 'FUNTOUCH_HOST_CONTROL_STATE') {
      const { action, guestName } = event.data;
      if (action === 'grant') {
        chrome.runtime.sendMessage({ type: 'START_CONTROL', guestName });
      } else if (action === 'revoke') {
        chrome.runtime.sendMessage({ type: 'STOP_CONTROL' });
      }
    }
  });

  // Relay background events (e.g. host pressed Esc) back to web page
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STOP_CONTROL_CONFIRMED') {
      window.postMessage({ source: 'FUNTOUCH_EXTENSION_STOP_CONTROL' }, '*');
    }
  });
})();


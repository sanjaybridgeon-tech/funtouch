// FunTouch Extension — Service Worker (background.js)
// Routes messages between the FunTouch Web App and the controlled tab content script.

let controlledTabId = null;
let isControlActive = false;

console.log('[FunTouch Service Worker] Loaded.');

// ── Badge Helpers ────────────────────────────────────────────────────────

function updateBadge(active) {
  isControlActive = active;
  if (active) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF7A00' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// ── Inject Content Script if needed ─────────────────────────────────────

async function ensureContentScriptInjected(tabId) {
  try {
    // Ping tab to check if content script is already alive
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => null);
    if (!response) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
      console.log(`[FunTouch] Injected content.js into tab ${tabId}`);
    }
  } catch (err) {
    console.error(`[FunTouch] Failed to inject content.js into tab ${tabId}:`, err);
  }
}

// ── External Messages from FunTouch Web App ──────────────────────────────

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('[FunTouch SW] Received external message from:', sender.url, request);

  const handleMessage = async () => {
    switch (request.type) {
      case 'PING':
        return {
          pong: true,
          version: '1.0.0',
          isControlActive,
          controlledTabId,
        };

      case 'SELECT_TARGET_TAB': {
        // Find most recent active tab in another window, or query tabs
        const tabs = await chrome.tabs.query({ active: true, currentWindow: false });
        if (tabs.length > 0 && tabs[0].id) {
          controlledTabId = tabs[0].id;
          return { success: true, tabId: controlledTabId, title: tabs[0].title };
        }
        return { success: false, message: 'No other active tab found' };
      }

      case 'START_CONTROL': {
        const targetTabId = request.tabId || controlledTabId;
        if (!targetTabId) {
          // If no tab explicitly chosen, pick the most recent active non-FunTouch tab
          const allTabs = await chrome.tabs.query({});
          const candidate = allTabs.find(
            (t) => t.id && !t.url?.includes('localhost:5173') && !t.url?.includes('funtouch.app')
          );
          if (candidate && candidate.id) {
            controlledTabId = candidate.id;
          }
        } else {
          controlledTabId = targetTabId;
        }

        if (!controlledTabId) {
          return { success: false, error: 'No shared tab selected to control' };
        }

        await ensureContentScriptInjected(controlledTabId);
        await chrome.tabs.sendMessage(controlledTabId, {
          type: 'START_CONTROL',
          guestName: request.guestName || 'Guest',
        }).catch((err) => console.warn('[FunTouch] start_control message failed:', err));

        updateBadge(true);
        return { success: true, controlledTabId };
      }

      case 'STOP_CONTROL': {
        if (controlledTabId) {
          await chrome.tabs.sendMessage(controlledTabId, { type: 'STOP_CONTROL' }).catch(() => {});
        }
        updateBadge(false);
        return { success: true };
      }

      case 'EXECUTE_INTERACTION': {
        if (!isControlActive || !controlledTabId) {
          return { success: false, error: 'Remote control is not active' };
        }

        const { detail } = request;
        if (!detail) return { success: false, error: 'Missing interaction detail' };

        if (detail.type === 'click') {
          chrome.tabs.sendMessage(controlledTabId, {
            type: 'EXECUTE_CLICK',
            x: detail.x,
            y: detail.y,
            button: detail.button || 'left',
          }).catch(() => {});
        } else if (detail.type === 'scroll') {
          chrome.tabs.sendMessage(controlledTabId, {
            type: 'EXECUTE_SCROLL',
            x: detail.x,
            y: detail.y,
            deltaX: detail.deltaX || 0,
            deltaY: detail.deltaY || 0,
          }).catch(() => {});
        } else if (detail.type === 'type') {
          chrome.tabs.sendMessage(controlledTabId, {
            type: 'EXECUTE_TYPE',
            text: detail.text || '',
          }).catch(() => {});
        }

        return { success: true };
      }

      default:
        return { error: 'Unknown request type' };
    }
  };

  handleMessage().then(sendResponse);
  return true; // Keep channel open for async response
});

// ── Internal Messages from Content Script / Popup ────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'STOP_CONTROL_CONFIRMED') {
    updateBadge(false);
    console.log('[FunTouch] Remote control stopped via host Escape key or popup.');
    sendResponse({ success: true });
  } else if (message.type === 'GET_STATUS') {
    sendResponse({
      isControlActive,
      controlledTabId,
    });
  } else if (message.type === 'MANUAL_SET_TAB') {
    controlledTabId = message.tabId;
    sendResponse({ success: true, tabId: controlledTabId });
  }
  return true;
});


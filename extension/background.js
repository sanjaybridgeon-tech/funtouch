// FunTouch Extension — Service Worker (background.js)
// Routes messages between the FunTouch Web App and the controlled tab content script.

let controlledTabId = null;
let isControlActive = false;

console.log('[FunTouch Service Worker] Loaded.');

// Restore persisted tab on startup
chrome.storage.local.get(['controlledTabId'], (result) => {
  if (result.controlledTabId) {
    controlledTabId = result.controlledTabId;
    console.log('[FunTouch SW] Restored controlledTabId:', controlledTabId);
  }
});

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

function isFunTouchUrl(url) {
  if (!url) return false;
  return (
    url.includes('localhost:') ||
    url.includes('127.0.0.1:') ||
    url.includes('funtouch.app') ||
    url.includes('vercel.app')
  );
}

// ── Unified Message Dispatcher ──────────────────────────────────────────

async function handleMessage(request) {
  switch (request.type) {
    case 'PING':
      return {
        pong: true,
        version: '1.0.0',
        isControlActive,
        controlledTabId,
      };

    case 'GET_STATUS':
      return {
        isControlActive,
        controlledTabId,
      };

    case 'MANUAL_SET_TAB':
      controlledTabId = request.tabId;
      chrome.storage.local.set({ controlledTabId: request.tabId });
      console.log('[FunTouch] Manually set controlled tab to:', controlledTabId);
      return { success: true, tabId: controlledTabId };

    case 'STOP_CONTROL_CONFIRMED':
      updateBadge(false);
      console.log('[FunTouch] Remote control stopped via host Escape key or popup.');
      return { success: true };

    case 'SELECT_TARGET_TAB': {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: false });
      if (tabs.length > 0 && tabs[0].id) {
        controlledTabId = tabs[0].id;
        chrome.storage.local.set({ controlledTabId });
        return { success: true, tabId: controlledTabId, title: tabs[0].title };
      }
      return { success: false, message: 'No other active tab found' };
    }

    case 'START_CONTROL': {
      let targetTabId = request.tabId || controlledTabId;

      if (!targetTabId) {
        const allTabs = await chrome.tabs.query({});
        const candidate = allTabs.find((t) => t.id && !isFunTouchUrl(t.url));
        if (candidate && candidate.id) {
          targetTabId = candidate.id;
          controlledTabId = targetTabId;
          chrome.storage.local.set({ controlledTabId });
        }
      } else {
        controlledTabId = targetTabId;
      }

      if (!controlledTabId) {
        console.warn('[FunTouch] No target tab found to control');
        return { success: false, error: 'No shared tab selected to control' };
      }

      console.log(`[FunTouch] Starting remote control on tab ${controlledTabId}`);
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

      console.log(`[FunTouch SW] Relaying ${detail.type} to tab ${controlledTabId}:`, detail);

      if (detail.type === 'click') {
        chrome.tabs.sendMessage(controlledTabId, {
          type: 'EXECUTE_CLICK',
          x: detail.x,
          y: detail.y,
          button: detail.button || 'left',
        }).catch((err) => console.warn('[FunTouch SW] Click delivery error:', err));
      } else if (detail.type === 'scroll') {
        chrome.tabs.sendMessage(controlledTabId, {
          type: 'EXECUTE_SCROLL',
          x: detail.x,
          y: detail.y,
          deltaX: detail.deltaX || 0,
          deltaY: detail.deltaY || 0,
        }).catch((err) => console.warn('[FunTouch SW] Scroll delivery error:', err));
      } else if (detail.type === 'type') {
        chrome.tabs.sendMessage(controlledTabId, {
          type: 'EXECUTE_TYPE',
          text: detail.text || '',
        }).catch((err) => console.warn('[FunTouch SW] Type delivery error:', err));
      }

      return { success: true };
    }

    default:
      return { error: 'Unknown request type: ' + request.type };
  }
}

// ── Listen for messages from Content Scripts (host-bridge.js) & Popup ────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request).then(sendResponse);
  return true; // Keep channel open for async response
});

// ── Listen for messages from External Web Pages ─────────────────────────
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  handleMessage(request).then(sendResponse);
  return true; // Keep channel open for async response
});

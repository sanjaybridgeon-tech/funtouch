// FunTouch Extension — Content Script
// Injected into the controlled browser tab to execute remote guest interactions.

(() => {
  if (window.__FUNTOUCH_CONTENT_INJECTED__) {
    return;
  }
  window.__FUNTOUCH_CONTENT_INJECTED__ = true;

  console.log('[FunTouch Content Script] Active and ready for remote interactions.');

  let bannerElement = null;

  // ── 1. Security & Consent Floating Banner ──────────────────────────────

  function injectBanner(guestName = 'Guest') {
    if (bannerElement) return;

    bannerElement = document.createElement('div');
    bannerElement.id = 'funtouch-security-banner';
    bannerElement.style.cssText = `
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 122, 0, 0.5);
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 122, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 12px;
      user-select: none;
      backdrop-filter: blur(8px);
    `;

    bannerElement.innerHTML = `
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #FF7A00; box-shadow: 0 0 8px #FF7A00;"></div>
      <span><strong>FunTouch:</strong> ${guestName} is controlling this tab</span>
      <button id="funtouch-stop-btn" style="
        background: #DC2626;
        color: #FFFFFF;
        border: none;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease;
      ">Stop (Esc)</button>
    `;

    document.documentElement.appendChild(bannerElement);

    const stopBtn = bannerElement.querySelector('#funtouch-stop-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', stopControl);
      stopBtn.addEventListener('mouseenter', () => (stopBtn.style.background = '#B91C1C'));
      stopBtn.addEventListener('mouseleave', () => (stopBtn.style.background = '#DC2626'));
    }
  }

  function removeBanner() {
    if (bannerElement && bannerElement.parentNode) {
      bannerElement.parentNode.removeChild(bannerElement);
      bannerElement = null;
    }
  }

  function stopControl() {
    console.log('[FunTouch] Emergency stop initiated by host.');
    removeBanner();
    chrome.runtime.sendMessage({ type: 'STOP_CONTROL_CONFIRMED' });
  }

  // Pressing Esc in the controlled tab immediately stops control
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bannerElement) {
      stopControl();
    }
  }, true);

  // ── 2. Click Feedback Ripple ───────────────────────────────────────────

  function showClickPulse(x, y) {
    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 24px;
      height: 24px;
      margin-left: -12px;
      margin-top: -12px;
      border: 2px solid #FF7A00;
      background: rgba(255, 122, 0, 0.25);
      border-radius: 50%;
      pointer-events: none;
      z-index: 2147483646;
      animation: funtouch-ping 0.6s cubic-bezier(0, 0, 0.2, 1) forwards;
    `;

    // Inject CSS animation if needed
    if (!document.getElementById('funtouch-animation-style')) {
      const style = document.createElement('style');
      style.id = 'funtouch-animation-style';
      style.textContent = `
        @keyframes funtouch-ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.documentElement.appendChild(pulse);
    setTimeout(() => {
      if (pulse.parentNode) pulse.parentNode.removeChild(pulse);
    }, 600);
  }

  // ── 3. Simulated Event Dispatchers ─────────────────────────────────────

  function executeClick(xRatio, yRatio, button = 'left') {
    const targetX = Math.round(window.innerWidth * xRatio);
    const targetY = Math.round(window.innerHeight * yRatio);

    showClickPulse(targetX, targetY);

    const targetElement = document.elementFromPoint(targetX, targetY);
    if (!targetElement) {
      console.warn('[FunTouch] No DOM element found at coordinates:', targetX, targetY);
      return;
    }

    console.log('[FunTouch] Executing click on:', targetElement, `(${targetX}, ${targetY})`);

    const buttonCode = button === 'right' ? 2 : button === 'middle' ? 1 : 0;
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: targetX,
      clientY: targetY,
      screenX: targetX,
      screenY: targetY,
      button: buttonCode,
      buttons: 1,
    };

    // Full DOM Pointer & Mouse Event sequence
    targetElement.dispatchEvent(new PointerEvent('pointerdown', eventInit));
    targetElement.dispatchEvent(new MouseEvent('mousedown', eventInit));

    // Focus input or editable element if clickable
    if (typeof targetElement.focus === 'function') {
      targetElement.focus();
    }

    targetElement.dispatchEvent(new PointerEvent('pointerup', eventInit));
    targetElement.dispatchEvent(new MouseEvent('mouseup', eventInit));
    targetElement.dispatchEvent(new MouseEvent('click', eventInit));

    // Fallback: If clicked element is or is inside an anchor link or button, trigger click()
    const clickable = targetElement.closest('a, button, [role="button"], input[type="submit"]');
    if (clickable && typeof clickable.click === 'function') {
      clickable.click();
    }

    // Special handler: If clicked element is a video (e.g. YouTube player), toggle playback
    const video = targetElement.closest('video') || document.querySelector('video');
    if (video && targetElement.tagName === 'VIDEO') {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }

  function executeScroll(xRatio, yRatio, deltaX, deltaY) {
    const targetX = Math.round(window.innerWidth * xRatio);
    const targetY = Math.round(window.innerHeight * yRatio);

    const targetElement = document.elementFromPoint(targetX, targetY);
    if (targetElement && typeof targetElement.scrollBy === 'function') {
      targetElement.scrollBy({ left: deltaX, top: deltaY, behavior: 'smooth' });
    } else {
      window.scrollBy({ left: deltaX, top: deltaY, behavior: 'smooth' });
    }
  }

  function executeType(text) {
    const active = document.activeElement;
    if (!active) return;

    if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
      const input = active;
      const start = input.selectionStart || input.value.length;
      const end = input.selectionEnd || input.value.length;
      input.value = input.value.substring(0, start) + text + input.value.substring(end);
      input.selectionStart = input.selectionEnd = start + text.length;

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (active.isContentEditable) {
      document.execCommand('insertText', false, text);
    }
  }

  // ── 4. Message Listener from Background Worker ────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'START_CONTROL':
        injectBanner(message.guestName || 'Guest');
        sendResponse({ success: true, status: 'CONTROL_STARTED' });
        break;

      case 'STOP_CONTROL':
        removeBanner();
        sendResponse({ success: true, status: 'CONTROL_STOPPED' });
        break;

      case 'EXECUTE_CLICK':
        executeClick(message.x, message.y, message.button);
        sendResponse({ success: true });
        break;

      case 'EXECUTE_SCROLL':
        executeScroll(message.x, message.y, message.deltaX, message.deltaY);
        sendResponse({ success: true });
        break;

      case 'EXECUTE_TYPE':
        executeType(message.text);
        sendResponse({ success: true });
        break;
    }
    return true; // Keep channel open for async response
  });
})();


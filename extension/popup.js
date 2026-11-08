// FunTouch Extension — Popup Controller

document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const tabTitle = document.getElementById('tab-title');
  const setTargetBtn = document.getElementById('set-target-btn');
  const stopControlBtn = document.getElementById('stop-control-btn');

  // Query current active tab
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Update UI with status from background worker
  function updateUI(status) {
    if (status && status.isControlActive) {
      statusBadge.className = 'badge badge-active';
      statusText.textContent = 'Active';
      stopControlBtn.style.display = 'block';
    } else {
      statusBadge.className = 'badge badge-idle';
      statusText.textContent = 'Standby';
      stopControlBtn.style.display = 'none';
    }

    if (status && status.controlledTabId) {
      chrome.tabs.get(status.controlledTabId).then((tab) => {
        tabTitle.textContent = `Linked Tab: ${tab.title || tab.url || status.controlledTabId}`;
      }).catch(() => {
        tabTitle.textContent = `Linked Tab ID: ${status.controlledTabId}`;
      });
    } else if (currentTab) {
      tabTitle.textContent = `Current Tab: ${currentTab.title || 'Untitled'}`;
    }
  }

  // Fetch initial status
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    updateUI(res);
  });

  // Set current tab as target
  setTargetBtn.addEventListener('click', async () => {
    if (!currentTab || !currentTab.id) return;

    chrome.runtime.sendMessage(
      { type: 'MANUAL_SET_TAB', tabId: currentTab.id },
      (res) => {
        if (res && res.success) {
          tabTitle.textContent = `Linked Tab: ${currentTab.title}`;
          setTargetBtn.textContent = '✓ Tab Linked Successfully!';
          setTimeout(() => {
            setTargetBtn.innerHTML = '<span>🎯 Set Current Tab as Controlled Tab</span>';
          }, 1500);
        }
      }
    );
  });

  // Stop control
  stopControlBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_CONTROL_CONFIRMED' }, () => {
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, updateUI);
    });
  });
});


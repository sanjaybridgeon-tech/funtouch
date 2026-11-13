// FunTouch Extension — Popup Controller

document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const tabTitle = document.getElementById('tab-title');
  const tabSelect = document.getElementById('tab-select');
  const setTargetBtn = document.getElementById('set-target-btn');
  const setCurrentBtn = document.getElementById('set-current-btn');
  const stopControlBtn = document.getElementById('stop-control-btn');

  // Query current active tab and all open tabs
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const allTabs = await chrome.tabs.query({});

  // Filter out internal system tabs
  const availableTabs = allTabs.filter(
    (t) => t.id && t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://')
  );

  // Populate tab select dropdown
  tabSelect.innerHTML = '';
  if (availableTabs.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No open webpage tabs found';
    tabSelect.appendChild(opt);
  } else {
    availableTabs.forEach((tab) => {
      const opt = document.createElement('option');
      opt.value = String(tab.id);
      const isCurrent = currentTab && currentTab.id === tab.id;
      opt.textContent = `${isCurrent ? '★ (Current) ' : ''}${tab.title || tab.url || `Tab ${tab.id}`}`;
      if (isCurrent) {
        opt.selected = true;
      }
      tabSelect.appendChild(opt);
    });
  }

  // Update UI with status from background worker
  function updateUI(status) {
    if (status && status.isControlActive) {
      statusBadge.className = 'badge badge-active';
      statusText.textContent = 'Active (Touch Enabled)';
      stopControlBtn.style.display = 'block';
    } else {
      statusBadge.className = 'badge badge-idle';
      statusText.textContent = 'Standby';
      stopControlBtn.style.display = 'none';
    }

    if (status && status.controlledTabId) {
      chrome.tabs.get(status.controlledTabId).then((tab) => {
        tabTitle.textContent = `Linked Tab: ${tab.title || tab.url || status.controlledTabId}`;
        tabSelect.value = String(status.controlledTabId);
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

  // Link selected tab from dropdown
  setTargetBtn.addEventListener('click', () => {
    const selectedTabId = parseInt(tabSelect.value, 10);
    if (!selectedTabId || isNaN(selectedTabId)) return;

    chrome.runtime.sendMessage(
      { type: 'MANUAL_SET_TAB', tabId: selectedTabId },
      (res) => {
        if (res && res.success) {
          const selectedOption = tabSelect.options[tabSelect.selectedIndex];
          tabTitle.textContent = `Linked Tab: ${selectedOption.text}`;
          setTargetBtn.textContent = '✓ Tab Linked Successfully!';
          setTimeout(() => {
            setTargetBtn.innerHTML = '<span>🎯 Link Selected Tab</span>';
          }, 1500);
        }
      }
    );
  });

  // Quick link current active tab
  setCurrentBtn.addEventListener('click', () => {
    if (!currentTab || !currentTab.id) return;

    chrome.runtime.sendMessage(
      { type: 'MANUAL_SET_TAB', tabId: currentTab.id },
      (res) => {
        if (res && res.success) {
          tabTitle.textContent = `Linked Tab: ${currentTab.title}`;
          tabSelect.value = String(currentTab.id);
          setCurrentBtn.textContent = '✓ Current Tab Linked!';
          setTimeout(() => {
            setCurrentBtn.innerHTML = '<span>📌 Link Current Active Tab</span>';
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

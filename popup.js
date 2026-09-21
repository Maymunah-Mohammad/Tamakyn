/**
 * طمأنينة | Tamanina - Popup Logic
 * Renders detected issues list and triggers spotlight focus mode on host page.
 */

const I18N = {
  ar: {
    appTitle: "طمأنينة",
    appSub: "مساعد التصفح الآمن والمريح",
    langBtn: "English",
    dir: "rtl",
    safeModeLabel: "نمط الأمان البسيط",
    safeModeDesc: "تكبير الخطوط، إخفاء الإعلانات، وتوضيح الأزرار.",
    issuesTitle: "المخاطر المكتشفة على هذه الصفحة",
    noIssues: "✅ لم يتم كشف أي مخاطر مضللة على هذه الصفحة.",
    clickToFocus: "🎯 اضغط للتمركز وإبراز العنصر بالمصلاط البصري",
    btnScan: "إعادة فحص الصفحة الآن",
    btnReader: "تفعيل دليل القراءة الأفقي",
    btnReaderActive: "إلغاء دليل القراءة الأفقي"
  },
  en: {
    appTitle: "Tamanina",
    appSub: "Cognitive Shield & Accessible Browsing",
    langBtn: "عربي",
    dir: "ltr",
    safeModeLabel: "Simplified Safe Mode",
    safeModeDesc: "Enlarge fonts, hide ads, and highlight action buttons.",
    issuesTitle: "Detected Issues on Current Page",
    noIssues: "✅ No deceptive patterns detected on this page.",
    clickToFocus: "🎯 Click to scroll & spotlight focus this element",
    btnScan: "Re-scan Active Page Now",
    btnReader: "Toggle Reading Line Guide",
    btnReaderActive: "Disable Reading Line Guide"
  }
};

let currentLang = 'ar';
let isReaderActive = false;

document.addEventListener('DOMContentLoaded', async () => {
  const chkSafeMode = document.getElementById('chk-safe-mode');
  const btnLangToggle = document.getElementById('btn-lang-toggle');
  const btnScanPage = document.getElementById('btn-scan-page');
  const btnToggleReader = document.getElementById('btn-toggle-reader');

  const stored = await chrome.storage.local.get(['tamaninaLang', 'safeModeEnabled', 'readerActive']);
  if (stored.tamaninaLang) currentLang = stored.tamaninaLang;
  
  chkSafeMode.checked = !!stored.safeModeEnabled;
  isReaderActive = !!stored.readerActive;

  applyLanguage(currentLang);
  fetchAndRenderIssues();

  chkSafeMode.addEventListener('change', async () => {
    const enabled = chkSafeMode.checked;
    await chrome.storage.local.set({ safeModeEnabled: enabled });
    sendMessageToActiveTab({ action: 'TOGGLE_SAFE_MODE', enabled: enabled });
  });

  btnLangToggle.addEventListener('click', async () => {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    await chrome.storage.local.set({ tamaninaLang: currentLang });
    applyLanguage(currentLang);
    fetchAndRenderIssues();
    sendMessageToActiveTab({ action: 'SET_LANGUAGE', lang: currentLang });
  });

  btnScanPage.addEventListener('click', () => {
    sendMessageToActiveTab({ action: 'SCAN_PAGE' });
    setTimeout(fetchAndRenderIssues, 300);
  });

  btnToggleReader.addEventListener('click', async () => {
    isReaderActive = !isReaderActive;
    await chrome.storage.local.set({ readerActive: isReaderActive });
    updateReaderButtonUI();
    sendMessageToActiveTab({ action: 'TOGGLE_READER_LINE', enabled: isReaderActive });
  });
});

function applyLanguage(lang) {
  const dict = I18N[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = dict.dir;

  document.getElementById('txt-app-title').textContent = dict.appTitle;
  document.getElementById('txt-app-sub').textContent = dict.appSub;
  document.getElementById('btn-lang-toggle').textContent = dict.langBtn;
  document.getElementById('txt-safe-mode-label').textContent = dict.safeModeLabel;
  document.getElementById('txt-safe-mode-desc').textContent = dict.safeModeDesc;
  document.getElementById('txt-issues-title').textContent = dict.issuesTitle;
  document.getElementById('txt-btn-scan').textContent = dict.btnScan;

  updateReaderButtonUI();
}

function updateReaderButtonUI() {
  const dict = I18N[currentLang];
  const txtReader = document.getElementById('txt-btn-reader');
  if (txtReader) {
    txtReader.textContent = isReaderActive ? dict.btnReaderActive : dict.btnReader;
  }
}

async function fetchAndRenderIssues() {
  const container = document.getElementById('issue-list-container');
  if (!container) return;

  const response = await sendMessageToActiveTab({ action: 'GET_DETAILED_ISSUES' });
  const issues = (response && response.issues) ? response.issues : [];

  container.innerHTML = '';

  if (issues.length === 0) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'no-issues-card';
    emptyCard.textContent = I18N[currentLang].noIssues;
    container.appendChild(emptyCard);
    return;
  }

  issues.forEach(issue => {
    const card = document.createElement('div');
    card.className = 'issue-card';
    card.tabIndex = 0;

    const iconMap = {
      timer: '⏳',
      deceptive: '⚠️',
      prechecked: '☑️',
      flashing: '⚡',
      complexForm: '📝'
    };

    const icon = iconMap[issue.type] || '⚠️';

    card.innerHTML = `
      <div class="issue-header">
        <span class="issue-icon">${icon}</span>
        <span class="issue-title">${issue.title}</span>
      </div>
      ${issue.snippet ? `<div class="issue-snippet">${escapeHtml(issue.snippet)}</div>` : ''}
      <div class="issue-action-hint">${I18N[currentLang].clickToFocus}</div>
    `;

    card.addEventListener('click', () => {
      sendMessageToActiveTab({ action: 'HIGHLIGHT_ISSUE', issueId: issue.id });
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        sendMessageToActiveTab({ action: 'HIGHLIGHT_ISSUE', issueId: issue.id });
      }
    });

    container.appendChild(card);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function sendMessageToActiveTab(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      return await chrome.tabs.sendMessage(tab.id, message);
    }
  } catch (err) {
    console.log('Tamanina popup message warning:', err.message);
  }
  return null;
}

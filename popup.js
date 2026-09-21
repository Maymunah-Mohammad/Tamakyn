/**
 * طمأنينة | Tamanina - Popup Logic
 * Language support: Arabic & English
 * Controls state synchronization with background/content script.
 */

// Localized UI Dictionary
const I18N = {
  ar: {
    appTitle: "طمأنينة",
    appSub: "مساعد التصفح الآمن والمريح",
    langBtn: "English",
    dir: "rtl",
    safeModeLabel: "نمط الأمان البسيط",
    safeModeDesc: "تكبير الخطوط، إخفاء الإعلانات والمشتتات، وتوضيح الأزرار.",
    auditTitle: "تقرير فحص الصفحة الحالية",
    lblTimers: "عدادات الضغط الزمني",
    lblDeceptive: "خيارات مضللة / مخفية",
    lblFlashing: "عناصر ومشتتات متوهجة",
    lblComplex: "نماذج معقدة غير واضحة",
    btnScan: "إعادة فحص الصفحة الآن",
    btnReader: "تفعيل دليل القراءة الأفقي",
    btnReaderActive: "إلغاء دليل القراءة الأفقي",
    footerNote: "طمأنينة يعمل محلياً لحماية خصوصيتك التامة V1.0.0"
  },
  en: {
    appTitle: "Tamanina",
    appSub: "Cognitive Shield & Accessible Browsing",
    langBtn: "عربي",
    dir: "ltr",
    safeModeLabel: "Simplified Safe Mode",
    safeModeDesc: "Enlarge fonts, remove ad clutter, and highlight clear actions.",
    auditTitle: "Current Page Audit Report",
    lblTimers: "Urgency / Countdown Timers",
    lblDeceptive: "Hidden / Deceptive Triggers",
    lblFlashing: "Flashing / Distracting Elements",
    lblComplex: "Dense / Complex Forms",
    btnScan: "Re-scan Active Page Now",
    btnReader: "Toggle Reading Line Guide",
    btnReaderActive: "Disable Reading Line Guide",
    footerNote: "Tamanina operates locally to respect your full privacy V1.0.0"
  }
};

let currentLang = 'ar';
let isReaderActive = false;

document.addEventListener('DOMContentLoaded', async () => {
  const chkSafeMode = document.getElementById('chk-safe-mode');
  const btnLangToggle = document.getElementById('btn-lang-toggle');
  const btnScanPage = document.getElementById('btn-scan-page');
  const btnToggleReader = document.getElementById('btn-toggle-reader');

  // Restore stored preferences
  const stored = await chrome.storage.local.get(['tamaninaLang', 'safeModeEnabled', 'readerActive']);
  if (stored.tamaninaLang) {
    currentLang = stored.tamaninaLang;
  }
  
  chkSafeMode.checked = !!stored.safeModeEnabled;
  isReaderActive = !!stored.readerActive;

  applyLanguage(currentLang);
  updateReaderButtonUI();

  // Fetch initial audit report from active tab content script
  requestAuditFromActiveTab();

  // Handle Safe Mode Switch
  chkSafeMode.addEventListener('change', async () => {
    const enabled = chkSafeMode.checked;
    await chrome.storage.local.set({ safeModeEnabled: enabled });
    sendMessageToActiveTab({ action: 'TOGGLE_SAFE_MODE', enabled: enabled });
  });

  // Handle Language Toggle Switch
  btnLangToggle.addEventListener('click', async () => {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    await chrome.storage.local.set({ tamaninaLang: currentLang });
    applyLanguage(currentLang);
    sendMessageToActiveTab({ action: 'SET_LANGUAGE', lang: currentLang });
  });

  // Handle Manual Re-scan
  btnScanPage.addEventListener('click', () => {
    sendMessageToActiveTab({ action: 'SCAN_PAGE' });
    requestAuditFromActiveTab();
  });

  // Handle Reading Guide Toggle
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
  document.getElementById('txt-audit-title').textContent = dict.auditTitle;
  document.getElementById('lbl-timers').textContent = dict.lblTimers;
  document.getElementById('lbl-deceptive').textContent = dict.lblDeceptive;
  document.getElementById('lbl-flashing').textContent = dict.lblFlashing;
  document.getElementById('lbl-complex').textContent = dict.lblComplex;
  document.getElementById('txt-btn-scan').textContent = dict.btnScan;
  document.getElementById('txt-footer-note').textContent = dict.footerNote;

  updateReaderButtonUI();
}

function updateReaderButtonUI() {
  const dict = I18N[currentLang];
  const txtReader = document.getElementById('txt-btn-reader');
  if (txtReader) {
    txtReader.textContent = isReaderActive ? dict.btnReaderActive : dict.btnReader;
  }
}

async function requestAuditFromActiveTab() {
  const response = await sendMessageToActiveTab({ action: 'GET_AUDIT' });
  if (response && response.audit) {
    updateAuditCounts(response.audit);
  }
}

function updateAuditCounts(audit) {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = val || 0;
      if (val > 0) {
        el.classList.add('has-threats');
      } else {
        el.classList.remove('has-threats');
      }
    }
  };

  setVal('cnt-timers', audit.timers);
  setVal('cnt-deceptive', audit.deceptive);
  setVal('cnt-flashing', audit.flashing);
  setVal('cnt-complex-forms', audit.complexForms);
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

/**
 * طمأنينة | Tamanina - Content Script Engine
 * Performs Cognitive Load Audit, Dark Pattern Scanning, Safe Mode Injection,
 * and Accessibility Overlays.
 */

(function () {
  if (window.hasTamaninaInjected) return;
  window.hasTamaninaInjected = true;

  let currentLang = 'ar';
  let isSafeMode = false;
  let isReaderLineActive = false;
  let readerLineEl = null;
  let floatingBadgeEl = null;

  let auditResults = {
    timers: 0,
    deceptive: 0,
    flashing: 0,
    complexForms: 0
  };

  const TEXTS = {
    ar: {
      badgeTitle: "طمأنينة: تم فحص الصفحة",
      safeModeOn: "نمط الأمان: مفعّل",
      safeModeOff: "تفعيل نمط الأمان البسيط",
      threatsFound: "تنبيهات مكتشفة:",
      timerWarning: "⚠️ تنبيه طمأنينة: عنصر ضغط زمني / عداد تنازلي",
      deceptiveWarning: "⚠️ تنبيه طمأنينة: خيار مضلل أو زر إلغاء مخفي",
      precheckedWarning: "⚠️ خيار مسبق التحديد لحفظ بيانات أو اشتراك إضافي",
      confirmHighlight: "زر تأكيد رئيسي",
      backHighlight: "زر العودة / إلغاء"
    },
    en: {
      badgeTitle: "Tamanina: Page Audited",
      safeModeOn: "Safe Mode: Active",
      safeModeOff: "Enable Safe Mode",
      threatsFound: "Detected Warnings:",
      timerWarning: "⚠️ Tamanina Notice: Artificial urgency / countdown timer",
      deceptiveWarning: "⚠️ Tamanina Notice: Deceptive pattern or hidden opt-out",
      precheckedWarning: "⚠️ Pre-checked subscription/option detected",
      confirmHighlight: "Primary Action",
      backHighlight: "Back / Cancel"
    }
  };

  // Initialize Extension State
  chrome.storage.local.get(['safeModeEnabled', 'tamaninaLang', 'readerActive'], (res) => {
    if (res.tamaninaLang) currentLang = res.tamaninaLang;
    if (res.safeModeEnabled) setSafeMode(true);
    if (res.readerActive) setReaderLine(true);

    runAudit();
    createFloatingBadge();
  });

  // Message Listener from Popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'TOGGLE_SAFE_MODE') {
      setSafeMode(msg.enabled);
      sendResponse({ status: 'ok', safeMode: isSafeMode });
    } else if (msg.action === 'SET_LANGUAGE') {
      currentLang = msg.lang || 'ar';
      updateFloatingBadgeText();
      sendResponse({ status: 'ok' });
    } else if (msg.action === 'SCAN_PAGE') {
      runAudit();
      sendResponse({ status: 'ok', audit: auditResults });
    } else if (msg.action === 'TOGGLE_READER_LINE') {
      setReaderLine(msg.enabled);
      sendResponse({ status: 'ok' });
    } else if (msg.action === 'GET_AUDIT') {
      sendResponse({ audit: auditResults });
    }
    return true;
  });

  // Safe Mode Toggle Implementation
  function setSafeMode(enable) {
    isSafeMode = enable;
    if (enable) {
      document.body.classList.add('tamanina-safe-mode-active');
      enhanceActionButtons();
    } else {
      document.body.classList.remove('tamanina-safe-mode-active');
    }
    updateFloatingBadgeText();
  }

  // Reading Guide Line Implementation
  function setReaderLine(enable) {
    isReaderLineActive = enable;
    if (enable) {
      if (!readerLineEl) {
        readerLineEl = document.createElement('div');
        readerLineEl.id = 'tamanina-reader-guide';
        readerLineEl.style.cssText = `
          position: fixed;
          left: 0;
          right: 0;
          height: 8px;
          background: rgba(13, 148, 136, 0.4);
          border-top: 2px solid #0D9488;
          border-bottom: 2px solid #0D9488;
          pointer-events: none;
          z-index: 999999;
          transition: top 0.05s ease-out;
        `;
        document.body.appendChild(readerLineEl);
        window.addEventListener('mousemove', handleMouseMove);
      }
      readerLineEl.style.display = 'block';
    } else {
      if (readerLineEl) {
        readerLineEl.style.display = 'none';
      }
      window.removeEventListener('mousemove', handleMouseMove);
    }
  }

  function handleMouseMove(e) {
    if (readerLineEl && isReaderLineActive) {
      readerLineEl.style.top = (e.clientY - 4) + 'px';
    }
  }

  // Dark Pattern & Cognitive Load Audit
  function runAudit() {
    auditResults = { timers: 0, deceptive: 0, flashing: 0, complexForms: 0 };

    // Explicit Urgency & Pressure Keywords
    const timerKeywords = [
      'ينتهي الخصم', 'عرض محدود', 'ينتهي خلال', 'سارع قبل', 'ينتهي العرض',
      'offer expires', 'hurry up', 'limited time', 'ends in', 'countdown', 'only left',
      'last chance', 'فرصة أخيرة', 'سارع الآن'
    ];

    // Legitimate Article Reading Time Exclusions (e.g., "7 min read", "5 min read")
    const readingTimeExclusions = [
      'min read', 'mins read', 'minute read', 'minutes read',
      'وقت القراءة', 'دقيقة قراءة', 'دقائق قراءة', 'read time'
    ];

    const allElements = document.querySelectorAll('div, span, p, h1, h2, h3, section, header, label');
    allElements.forEach(el => {
      const text = (el.textContent || '').trim().toLowerCase();

      // Skip elements containing legitimate article reading duration tags
      if (readingTimeExclusions.some(ex => text.includes(ex))) return;

      const hasUrgencyText = timerKeywords.some(kw => text.includes(kw));
      // Strict clock pattern (e.g. 04:59 or 00:15:30)
      const hasClockPattern = /\b\d{1,2}:\d{2}(:\d{2})?\b/.test(text);

      if ((hasUrgencyText || (hasClockPattern && el.children.length === 0)) && !el.dataset.tamaninaFlagged) {
        if (text.length < 150) { // Limit false positives on large body paragraphs
          el.dataset.tamaninaFlagged = "true";
          el.classList.add('tamanina-dark-pattern-flag');
          auditResults.timers++;

          injectWarningAnnotation(el, TEXTS[currentLang].timerWarning);
        }
      }
    });

    // 2. Audit Deceptive & Hidden Opt-Out Buttons / Pre-Checked Traps
    const deceptiveKeywords = [
      'لا شكراً', 'إلغاء الاشتراك', 'لا أستفيد', 'تجاهل',
      'no thanks', 'skip offer', 'decline discount', 'i prefer paying'
    ];

    const linksAndBtns = document.querySelectorAll('a, button, span[role="button"], input[type="checkbox"]');
    linksAndBtns.forEach(item => {
      // Pre-checked hidden checkboxes for extras/newsletters
      if (item.tagName === 'INPUT' && item.type === 'checkbox' && item.checked && !item.dataset.tamaninaFlagged) {
        item.dataset.tamaninaFlagged = "true";
        auditResults.deceptive++;
        injectWarningAnnotation(item.parentElement || item, TEXTS[currentLang].precheckedWarning);
      }

      // Hidden low-contrast or shamed opt-out links
      const text = (item.textContent || '').trim().toLowerCase();
      const isDeceptiveText = deceptiveKeywords.some(kw => text.includes(kw));
      const style = window.getComputedStyle(item);
      const isTinyOrFaded = parseFloat(style.fontSize) <= 12 || parseFloat(style.opacity) < 0.6;

      if (isDeceptiveText && isTinyOrFaded && !item.dataset.tamaninaFlagged) {
        item.dataset.tamaninaFlagged = "true";
        item.classList.add('tamanina-dark-pattern-flag');
        auditResults.deceptive++;
        injectWarningAnnotation(item, TEXTS[currentLang].deceptiveWarning);
      }
    });

    // 3. Audit Flashing / Excessive Distracting Animations
    const animatedElements = document.querySelectorAll('*');
    animatedElements.forEach(el => {
      const style = window.getComputedStyle(el);
      const animation = style.animationName;
      if (animation && animation !== 'none' && !el.dataset.tamaninaFlagged) {
        const duration = parseFloat(style.animationDuration) || 0;
        if (duration < 1.0 && duration > 0) { // Rapid flashing (< 1s)
          el.dataset.tamaninaFlagged = "true";
          auditResults.flashing++;
          if (isSafeMode) {
            el.style.animation = 'none';
          }
        }
      }
    });

    // 4. Audit Dense / Complex Forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
      if (inputs.length > 5 && !form.dataset.tamaninaFlagged) {
        form.dataset.tamaninaFlagged = "true";
        auditResults.complexForms++;
      }
    });

    updateFloatingBadgeText();
  }

  function injectWarningAnnotation(element, message) {
    if (element.querySelector('.tamanina-warning-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'tamanina-warning-badge';
    badge.textContent = message;
    
    if (element.nextSibling) {
      element.parentNode.insertBefore(badge, element.nextSibling);
    } else {
      element.parentNode.appendChild(badge);
    }
  }

  // Highlight key action buttons for elderly & cognitive impaired users
  function enhanceActionButtons() {
    const buttons = document.querySelectorAll('button, input[type="submit"], .btn, a.button');
    const confirmWords = ['تأكيد', 'موافقة', 'حفظ', 'إرسال', 'استمرار', 'متابعة', 'confirm', 'submit', 'save', 'continue', 'agree', 'pay'];
    const backWords = ['رجوع', 'إلغاء', 'السابق', 'تراجع', 'back', 'cancel', 'previous'];

    buttons.forEach(btn => {
      const text = (btn.textContent || btn.value || '').trim().toLowerCase();
      if (confirmWords.some(w => text.includes(w))) {
        btn.classList.add('tamanina-btn-primary');
        btn.title = TEXTS[currentLang].confirmHighlight;
      } else if (backWords.some(w => text.includes(w))) {
        btn.style.borderColor = '#64748B';
        btn.title = TEXTS[currentLang].backHighlight;
      }
    });
  }

  // Floating Tamanina Accessibility Badge
  function createFloatingBadge() {
    if (document.getElementById('tamanina-floating-badge')) return;

    floatingBadgeEl = document.createElement('div');
    floatingBadgeEl.id = 'tamanina-floating-badge';
    floatingBadgeEl.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 999990;
      background: #FFFFFF;
      color: #0F172A;
      border: 2px solid #0D9488;
      border-radius: 30px;
      padding: 8px 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      font-family: 'Segoe UI', Tahoma, 'Cairo', sans-serif;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      transition: all 0.3s ease;
    `;

    document.body.appendChild(floatingBadgeEl);
    updateFloatingBadgeText();

    floatingBadgeEl.addEventListener('click', () => {
      const newState = !isSafeMode;
      setSafeMode(newState);
      chrome.storage.local.set({ safeModeEnabled: newState });
    });
  }

  function updateFloatingBadgeText() {
    if (!floatingBadgeEl) return;
    const langDict = TEXTS[currentLang];
    const totalThreats = auditResults.timers + auditResults.deceptive + auditResults.flashing;
    
    floatingBadgeEl.innerHTML = `
      <span style="font-size: 18px;">🛡️</span>
      <span>${isSafeMode ? langDict.safeModeOn : langDict.safeModeOff}</span>
      ${totalThreats > 0 ? `<span style="background: #EF4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${totalThreats}</span>` : ''}
    `;
  }

  // Observe Dynamic DOM changes (for React/Angular SPAs)
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      debounce(runAudit, 1000)();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
})();

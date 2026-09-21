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
      timerWarning: "⚠️ تنبيه طمأنينة: عنصر ضغط زمني / عداد تنازلي مضلل",
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
      timerWarning: "⚠️ Tamanina Notice: Artificial pressure / deceptive countdown",
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
      runAudit(); // Ensure fresh recalculation on popup request
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

    // 1. Audit Artificial Urgency & Deceptive Pressure ONLY
    const urgencyKeywords = [
      'ينتهي الخصم', 'عرض محدود', 'ينتهي خلال', 'سارع قبل', 'ينتهي العرض',
      'فرصة أخيرة', 'سارع الآن', 'باقي على العرض', 'ينتهي في', 'خصم ينتهي',
      'offer expires', 'hurry up', 'limited time', 'ends in', 'countdown', 
      'only left', 'last chance', 'order within', 'deal expires', 'sale ends'
    ];

    const helpfulDurationContexts = [
      'read', 'reading', 'watch', 'video', 'duration', 'length', 'course', 'listen', 'audio',
      'قراءة', 'مشاهدة', 'فيديو', 'مدة', 'دورة', 'استماع', 'صوت'
    ];

    const allElements = document.querySelectorAll('div, span, p, h1, h2, h3, section, header, label');
    allElements.forEach(el => {
      // Retain counts for previously flagged elements
      if (el.dataset.tamaninaType === 'timer') {
        auditResults.timers++;
        return;
      }

      const text = (el.textContent || '').trim().toLowerCase();

      // NEVER flag helpful informative reading/video time metrics
      if (helpfulDurationContexts.some(ctx => text.includes(ctx))) return;

      const hasUrgencyText = urgencyKeywords.some(kw => text.includes(kw));

      if (hasUrgencyText && text.length < 150) {
        el.dataset.tamaninaFlagged = "true";
        el.dataset.tamaninaType = "timer";
        el.classList.add('tamanina-dark-pattern-flag');
        auditResults.timers++;

        injectWarningAnnotation(el, TEXTS[currentLang].timerWarning);
      }
    });

    // 2. Audit Deceptive & Hidden Opt-Out Buttons / Pre-Checked Traps
    const deceptiveKeywords = [
      'لا شكراً', 'إلغاء الاشتراك', 'لا أستفيد', 'تجاهل',
      'no thanks', 'skip offer', 'decline discount', 'i prefer paying'
    ];

    const linksAndBtns = document.querySelectorAll('a, button, span[role="button"], input[type="checkbox"]');
    linksAndBtns.forEach(item => {
      if (item.dataset.tamaninaType === 'deceptive') {
        auditResults.deceptive++;
        return;
      }

      // Pre-checked hidden checkboxes for extras/newsletters
      if (item.tagName === 'INPUT' && item.type === 'checkbox' && item.checked) {
        item.dataset.tamaninaFlagged = "true";
        item.dataset.tamaninaType = "deceptive";
        auditResults.deceptive++;
        injectWarningAnnotation(item.parentElement || item, TEXTS[currentLang].precheckedWarning);
        return;
      }

      // Hidden low-contrast or shamed opt-out links
      const text = (item.textContent || '').trim().toLowerCase();
      const isDeceptiveText = deceptiveKeywords.some(kw => text.includes(kw));
      const style = window.getComputedStyle(item);
      const isTinyOrFaded = parseFloat(style.fontSize) <= 12 || parseFloat(style.opacity) < 0.6;

      if (isDeceptiveText && isTinyOrFaded) {
        item.dataset.tamaninaFlagged = "true";
        item.dataset.tamaninaType = "deceptive";
        item.classList.add('tamanina-dark-pattern-flag');
        auditResults.deceptive++;
        injectWarningAnnotation(item, TEXTS[currentLang].deceptiveWarning);
      }
    });

    // 3. Audit Flashing / Excessive Distracting Animations
    const animatedElements = document.querySelectorAll('*');
    animatedElements.forEach(el => {
      if (el.dataset.tamaninaType === 'flashing') {
        auditResults.flashing++;
        return;
      }

      const style = window.getComputedStyle(el);
      const animation = style.animationName;
      if (animation && animation !== 'none') {
        const duration = parseFloat(style.animationDuration) || 0;
        if (duration < 1.0 && duration > 0) { // Rapid flashing (< 1s)
          el.dataset.tamaninaFlagged = "true";
          el.dataset.tamaninaType = "flashing";
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
      if (form.dataset.tamaninaType === 'complexForm') {
        auditResults.complexForms++;
        return;
      }

      const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
      if (inputs.length > 5) {
        form.dataset.tamaninaFlagged = "true";
        form.dataset.tamaninaType = "complexForm";
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

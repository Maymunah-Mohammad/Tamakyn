/**
 * طمأنينة | Tamanina - Content Script Engine
 * Performs Cognitive Load Audit, Dark Pattern Scanning, Safe Mode Injection,
 * and Spotlight Focus Overlay.
 */

(function () {
  if (window.hasTamaninaInjected) return;
  window.hasTamaninaInjected = true;

  let currentLang = 'ar';
  let isSafeMode = false;
  let isReaderLineActive = false;
  let readerLineEl = null;
  let floatingBadgeEl = null;

  let detailedIssues = [];

  const ISSUE_TITLES = {
    ar: {
      timer: "عنصر ضغط زمني / عداد تنازلي مضلل",
      deceptive: "خيار مضلل / زر إلغاء مخفي",
      prechecked: "مربع اختيار اشتراك مسبق التحديد",
      flashing: "عنصر ميتوهج أو حركة متسارعة مزعجة",
      complexForm: "نموذج معقد عالي الكثافة"
    },
    en: {
      timer: "Artificial Urgency / Deceptive Countdown",
      deceptive: "Deceptive Pattern / Hidden Opt-Out Link",
      prechecked: "Pre-Checked Subscription Checkbox",
      flashing: "Flashing / Rapid Motion Distraction",
      complexForm: "High Density / Complex Form"
    }
  };

  const TEXTS = {
    ar: {
      badgeTitle: "طمأنينة: تم فحص الصفحة",
      safeModeOn: "نمط الأمان: مفعّل",
      safeModeOff: "تفعيل نمط الأمان البسيط",
      confirmHighlight: "زر تأكيد رئيسي",
      backHighlight: "زر العودة / إلغاء"
    },
    en: {
      badgeTitle: "Tamanina: Page Audited",
      safeModeOn: "Safe Mode: Active",
      safeModeOff: "Enable Safe Mode",
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
      sendResponse({ status: 'ok', issueCount: detailedIssues.length });
    } else if (msg.action === 'TOGGLE_READER_LINE') {
      setReaderLine(msg.enabled);
      sendResponse({ status: 'ok' });
    } else if (msg.action === 'GET_DETAILED_ISSUES') {
      runAudit();
      const serializableIssues = detailedIssues.map(item => ({
        id: item.id,
        type: item.type,
        title: ISSUE_TITLES[currentLang][item.type] || item.type,
        snippet: item.snippet
      }));
      sendResponse({ issues: serializableIssues });
    } else if (msg.action === 'HIGHLIGHT_ISSUE') {
      spotlightIssue(msg.issueId);
      sendResponse({ status: 'ok' });
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
    detailedIssues = [];
    let issueCounter = 1;

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

    // 1. Audit Urgency Elements (Deduplicate nested parent DOM containers)
    const rawUrgencyCandidates = [];
    const allElements = document.querySelectorAll('div, span, p, h1, h2, h3, section, header, label');
    
    allElements.forEach(el => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (helpfulDurationContexts.some(ctx => text.includes(ctx))) return;

      const hasUrgencyText = urgencyKeywords.some(kw => text.includes(kw));

      if (hasUrgencyText && text.length < 150) {
        rawUrgencyCandidates.push(el);
      }
    });

    // Keep ONLY innermost leaf elements (remove outer parent wrappers)
    const leafUrgencyElements = rawUrgencyCandidates.filter(parentEl => {
      return !rawUrgencyCandidates.some(childEl => childEl !== parentEl && parentEl.contains(childEl));
    });

    leafUrgencyElements.forEach(el => {
      const id = 'tamanina_issue_' + (issueCounter++);
      el.dataset.tamaninaIssueId = id;
      detailedIssues.push({
        id: id,
        type: 'timer',
        snippet: (el.textContent || '').trim().substring(0, 70),
        element: el
      });
    });

    // 2. Audit Deceptive / Hidden Opt-Outs & Prechecked Checkboxes
    const linksAndBtns = document.querySelectorAll('a, button, span[role="button"], input[type="checkbox"]');
    linksAndBtns.forEach(item => {
      if (item.tagName === 'INPUT' && item.type === 'checkbox' && item.checked) {
        const id = 'tamanina_issue_' + (issueCounter++);
        item.dataset.tamaninaIssueId = id;
        const parentText = (item.parentElement ? item.parentElement.textContent : item.value || '').trim();
        detailedIssues.push({
          id: id,
          type: 'prechecked',
          snippet: parentText.substring(0, 70),
          element: item.parentElement || item
        });
        return;
      }

      const deceptiveKeywords = ['لا شكراً', 'إلغاء الاشتراك', 'لا أستفيد', 'تجاهل', 'no thanks', 'skip offer', 'decline discount', 'i prefer paying'];
      const text = (item.textContent || '').trim().toLowerCase();
      const isDeceptiveText = deceptiveKeywords.some(kw => text.includes(kw));
      const style = window.getComputedStyle(item);
      const isTinyOrFaded = parseFloat(style.fontSize) <= 12 || parseFloat(style.opacity) < 0.6;

      if (isDeceptiveText && isTinyOrFaded) {
        const id = 'tamanina_issue_' + (issueCounter++);
        item.dataset.tamaninaIssueId = id;
        detailedIssues.push({
          id: id,
          type: 'deceptive',
          snippet: text.substring(0, 70),
          element: item
        });
      }
    });

    // 3. Audit Flashing Animations (Deduplicated)
    const animatedElements = document.querySelectorAll('*');
    const rawFlashingCandidates = [];
    animatedElements.forEach(el => {
      const style = window.getComputedStyle(el);
      const animation = style.animationName;
      if (animation && animation !== 'none') {
        const duration = parseFloat(style.animationDuration) || 0;
        if (duration < 1.0 && duration > 0) {
          rawFlashingCandidates.push(el);
        }
      }
    });

    const leafFlashing = rawFlashingCandidates.filter(parentEl => {
      return !rawFlashingCandidates.some(childEl => childEl !== parentEl && parentEl.contains(childEl));
    });

    leafFlashing.forEach(el => {
      const id = 'tamanina_issue_' + (issueCounter++);
      el.dataset.tamaninaIssueId = id;
      detailedIssues.push({
        id: id,
        type: 'flashing',
        snippet: (el.textContent || 'عنصر حركة').trim().substring(0, 50),
        element: el
      });
      if (isSafeMode) {
        el.style.animation = 'none';
      }
    });

    updateFloatingBadgeText();
  }

  // SPOTLIGHT MODE: Scrolls to element, dims host page with white backdrop, adds glowing pulse
  function spotlightIssue(issueId) {
    dismissSpotlight();

    const targetObj = detailedIssues.find(item => item.id === issueId);
    if (!targetObj || !targetObj.element) return;

    const el = targetObj.element;

    // Create semi-transparent white backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'tamanina-spotlight-backdrop';
    document.body.appendChild(backdrop);

    // Apply glowing focus class to element
    el.classList.add('tamanina-spotlight-glowing');

    // Scroll element smoothly into center of viewport
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Dismiss spotlight when clicking backdrop overlay or ESC key
    backdrop.addEventListener('click', dismissSpotlight);
    window.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') {
        dismissSpotlight();
        window.removeEventListener('keydown', escListener);
      }
    });
  }

  function dismissSpotlight() {
    const backdrop = document.getElementById('tamanina-spotlight-backdrop');
    if (backdrop) backdrop.remove();

    document.querySelectorAll('.tamanina-spotlight-glowing').forEach(el => {
      el.classList.remove('tamanina-spotlight-glowing');
    });
  }

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
    const totalThreats = detailedIssues.length;
    
    floatingBadgeEl.innerHTML = `
      <span style="font-size: 18px;">🛡️</span>
      <span>${isSafeMode ? langDict.safeModeOn : langDict.safeModeOff}</span>
      ${totalThreats > 0 ? `<span style="background: #EF4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${totalThreats}</span>` : ''}
    `;
  }

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

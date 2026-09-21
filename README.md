# 🛡️ طمأنينة | Tamanina

**ملحق متصفح جوجل كروم (Manifest V3) للحماية من التشتت والأنماط المضللة والضغط الذهني على الويب.**  
*A Manifest V3 Chrome Extension designed to protect cognitive-impaired users and elderly people from digital confusion, dark patterns, and cognitive overload.*

---

## 🇸🇦 العربية

### 🌟 حول المشروع
**طمأنينة (Tamanina)** هو ملحق متصفح مخصص لكبار السن والأشخاص الذين يعانون من تشتت الانتباه أو الإجهاد الذهني. يعمل الملحق كدرع حماية ذكي يحلل عناصر صفحات الويب في الوقت الفعلي لتخفيف التعقيد البصري والتحذير من الخدع الرقمية.

### ✨ الميزات الرئيسية
1. **نمط الأمان البسيط (Safe Mode)**:
   - تكبير الخطوط وتحسين المسافات بين السطور لجعل القراءة مريحة.
   - تباين عالي للأزرار الرئيسية ("تأكيد"، "حفظ"، "موافقة"، "رجوع").
   - إخفاء تلقائي للإعلانات المشتتة والمربكات البصرية والنوافذ الترويجية.
2. **مكافحة الأنماط المضللة (Dark Pattern Shield)**:
   - الكشف عن عدادات الضغط الزمني الاستعجالية الكاذبة.
   - إبراز خيارات الإلغاء والاشتراكات المخفية والمضللة.
   - التحذير من مربع الاختيار مسبق التحديد (Pre-checked Subscriptions).
3. **دليل القراءة الأفقي (Reading Line Guide)**:
   - مسار بصري مرن يتتبع حركة الماوس لمساعدة المستخدم على التركيز أثناء قراءة النصوص الطويلة.
4. **دعم كامل للغتين العربية (RTL) والإنجليزية (LTR)**:
   - واجهة مستخدم سلسة وعالية التباين وتدعم التبديل السريع بين اللغات.

---

## 🇬🇧 English

### 🌟 Overview
**Tamanina (طمأنينة)** is a Google Chrome Extension tailored for senior citizens, dyslexic users, and individuals with cognitive impairments. It automatically simplifies complex web layouts, highlights key interactive targets, and alerts users against aggressive digital manipulation.

### ✨ Key Capabilities
1. **Simplified Safe Mode**:
   - Enlarges core text typography and optimizes line spacing.
   - Applies WCAG-compliant high-contrast styling to primary buttons ("Confirm", "Submit", "Back").
   - Filters out non-essential advertising clutter, floating banners, and popups.
2. **Cognitive Load Audit & Dark Pattern Shield**:
   - Detects artificial urgency countdown timers.
   - Highlights tricky opt-out links and hidden cancellation buttons.
   - Flags pre-checked recurring billing or newsletter checkboxes.
3. **Reading Line Guide**:
   - Follows the user's cursor with a subtle highlight band to assist reading comprehension.
4. **Bilingual UI (Arabic RTL & English LTR)**:
   - Seamless language toggle inside the control popup.

---

## 🚀 طريقة التثبيت والاستخدام | How to Install & Use

1. افتح متصفح **Google Chrome**.
2. اذهب إلى صفحة الإضافات: `chrome://extensions/`
3. قم بتفعيل **وضع المطور (Developer mode)** في أعلى اليمين/اليسار.
4. انقر على **تحميل إضافة غير محزمة (Load unpacked)**.
5. اختر المجلد الخاص بالمشروع:  
   `C:\Users\Slnee\.gemini\antigravity\scratch\Tamakyn`
6. سيظهر رمز **طمأنينة** في شريط أدوات المتصفح، يمكنك الآن النقر عليه للتحكم بنمط الأمان وفحص الصفحات!

---

## 📁 هيكل المشروع | Project Structure

```
Tamakyn/
├── manifest.json         # Chrome Extension Manifest V3
├── popup.html            # Control panel popup UI (RTL & LTR)
├── popup.js              # Popup state logic & language management
├── content.js            # Injected script: Dark pattern scanner & Safe Mode engine
├── safe-mode.css         # High contrast, accessible typography stylesheet
├── create-icons.ps1      # PowerShell icon generator script
├── icons/                # Extension icon assets (16x16, 48x48, 128x128)
└── README.md             # Documentation
```

---
*صُنِع بحب وعناية لتعزيز تصفح ويب أكثر أماناً وإنسانية.*  
*Built with care to foster a safer, more humane, and accessible web for everyone.*

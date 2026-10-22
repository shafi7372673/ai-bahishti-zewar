/**
 * AI بہشتی زیور - کلائنٹ جاوا اسکرپٹ
 * Interactive Frontend logic with RTL, Voice, Audio, Browse, Ingestion & Copy
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM عناصر
  const searchForm = document.getElementById('searchForm');
  const queryInput = document.getElementById('queryInput');
  const volumeSelect = document.getElementById('volumeSelect');
  const btnVoice = document.getElementById('btnVoice');
  const loadingState = document.getElementById('loadingState');
  const resultContainer = document.getElementById('resultContainer');
  const refusalCard = document.getElementById('refusalCard');
  const refusalMessage = document.getElementById('refusalMessage');
  const answerCard = document.getElementById('answerCard');
  
  // نتیجہ کارڈ کے عناصر
  const resTitle = document.getElementById('resTitle');
  const resVolume = document.getElementById('resVolume');
  const resChapter = document.getElementById('resChapter');
  const resMasala = document.getElementById('resMasala');
  const resPage = document.getElementById('resPage');
  const resOriginalText = document.getElementById('resOriginalText');
  const resEasyExplanation = document.getElementById('resEasyExplanation');
  const citVolume = document.getElementById('citVolume');
  const citChapter = document.getElementById('citChapter');
  const citPage = document.getElementById('citPage');
  const citMasala = document.getElementById('citMasala');
  const relatedSection = document.getElementById('relatedSection');
  const relatedCards = document.getElementById('relatedCards');
  
  const btnSpeak = document.getElementById('btnSpeak');
  const btnCopy = document.getElementById('btnCopy');
  
  let currentResult = null;
  let isSpeaking = false;

  // 1. فارم جمع کروانا اور سوال پوچھنا
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = queryInput.value.trim();
    if (!query) return;

    await executeSearch(query, volumeSelect.value);
  });

  // تلاش انجام دینے کا بنیادی فنکشن
  async function executeSearch(question, volumeFilter = '') {
    // UI کی ابتدائی حالت
    loadingState.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    refusalCard.classList.add('hidden');
    answerCard.classList.add('hidden');
    if (speechSynthesis.speaking) speechSynthesis.cancel();

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          volumeFilter: volumeFilter || null
        })
      });

      const data = await response.json();
      loadingState.classList.add('hidden');
      resultContainer.classList.remove('hidden');

      if (!data.found) {
        // انکار کا کارڈ دکھائیں
        refusalMessage.textContent = data.refusal || "معذرت، فراہم کردہ کتاب بہشتی زیور میں اس سوال کا متعلقہ جواب نہیں مل سکا۔ یہ ٹول صرف اسی کتاب کی بنیاد پر جواب دیتا ہے۔";
        refusalCard.classList.remove('hidden');
        answerCard.classList.add('hidden');
        currentResult = null;
      } else {
        // تصدیق شدہ جواب کا کارڈ دکھائیں
        currentResult = data;
        displayAnswer(data);
      }

      // اسکرول کریں تاکہ صارف کو نتیجہ فوراً نظر آئے
      resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      loadingState.classList.add('hidden');
      resultContainer.classList.remove('hidden');
      refusalMessage.textContent = "سرور سے رابطہ قائم نہ ہو سکا۔ براہ کرم انٹرنیٹ یا لوکل سرور کنکشن چیک فرمائیں۔";
      refusalCard.classList.remove('hidden');
      answerCard.classList.add('hidden');
      console.error('Search error:', err);
    }
  }

  // جواب کارڈ میں ڈیٹا درج کرنا
  function displayAnswer(data) {
    resTitle.textContent = data.title;
    resVolume.textContent = data.reference.volume;
    resChapter.textContent = data.reference.chapter;
    resMasala.textContent = data.reference.masala_no;
    resPage.textContent = data.reference.page;

    resOriginalText.textContent = data.original_text;
    resEasyExplanation.textContent = data.easy_explanation;

    citVolume.textContent = data.reference.volume;
    citChapter.textContent = `${data.reference.chapter} (${data.reference.section || ''})`;
    citPage.textContent = data.reference.page;
    citMasala.textContent = data.reference.masala_no;

    // متعلقہ مسائل
    if (data.related_rulings && data.related_rulings.length > 0) {
      relatedCards.innerHTML = '';
      data.related_rulings.forEach(rel => {
        const card = document.createElement('div');
        card.className = 'related-card';
        card.innerHTML = `
          <h5><i class="fa-solid fa-angle-left"></i> ${rel.title}</h5>
          <div class="rel-meta">
            <span>${rel.volume}</span> • <span>${rel.page}</span>
          </div>
        `;
        card.addEventListener('click', () => {
          queryInput.value = rel.title;
          executeSearch(rel.title);
        });
        relatedCards.appendChild(card);
      });
      relatedSection.classList.remove('hidden');
    } else {
      relatedSection.classList.add('hidden');
    }

    refusalCard.classList.add('hidden');
    answerCard.classList.remove('hidden');
  }

  // 2. عام سوالات کے چپس پر کلک
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q');
      queryInput.value = q;
      executeSearch(q, volumeSelect.value);
    });
  });

  // 3. آواز سے سوال پوچھنا (Urdu Speech Recognition)
  let recognition = null;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ur-PK';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      btnVoice.classList.add('listening');
      queryInput.placeholder = "بولیں، سن رہا ہے...";
    };

    recognition.onresult = (event) => {
      const speechText = event.results[0][0].transcript;
      queryInput.value = speechText;
      executeSearch(speechText, volumeSelect.value);
    };

    recognition.onerror = (event) => {
      console.warn('Speech error:', event.error);
      btnVoice.classList.remove('listening');
      queryInput.placeholder = "مثال: وضو کے فرائض کیا ہیں؟";
    };

    recognition.onend = () => {
      btnVoice.classList.remove('listening');
      queryInput.placeholder = "مثال: وضو کے فرائض کیا ہیں؟";
    };

    btnVoice.addEventListener('click', () => {
      try {
        recognition.start();
      } catch (e) {
        recognition.stop();
      }
    });
  } else {
    btnVoice.style.display = 'none';
  }

  // 4. آڈیو میں سننا (Text to Speech)
  btnSpeak.addEventListener('click', () => {
    if (!currentResult) return;

    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>سنیں</span>';
      isSpeaking = false;
      return;
    }

    const textToRead = `${currentResult.title}۔ آسان تشریح: ${currentResult.easy_explanation}۔ حوالہ: کتاب بہشتی زیور، ${currentResult.reference.volume}، ${currentResult.reference.page}۔`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ur';
    utterance.rate = 0.9;

    utterance.onend = () => {
      btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>سنیں</span>';
      isSpeaking = false;
    };

    speechSynthesis.speak(utterance);
    btnSpeak.innerHTML = '<i class="fa-solid fa-stop"></i> <span>روکیں</span>';
    isSpeaking = true;
  });

  // 5. حوالے سمیت کاپی کرنا (Copy with citation)
  btnCopy.addEventListener('click', () => {
    if (!currentResult) return;

    const copyText = `
*${currentResult.title}*

[۱۔ کتاب بہشتی زیور کی اصل عبارت]:
${currentResult.original_text}

[۲۔ آسان تشریح]:
${currentResult.easy_explanation}

[۳۔ تصدیق شدہ حوالہ]:
ماخذ: کتاب بہشتی زیور (تالیف: حکیم الامت مولانا اشرف علی تھانویؒ)
جلد: ${currentResult.reference.volume}
باب: ${currentResult.reference.chapter}
صفحہ: ${currentResult.reference.page}
مسئلہ نمبر: ${currentResult.reference.masala_no}
---------------------------------
نقل کردہ از: AI بہشتی زیور
    `.trim();

    navigator.clipboard.writeText(copyText).then(() => {
      const orig = btnCopy.innerHTML;
      btnCopy.innerHTML = '<i class="fa-solid fa-check"></i> <span>کاپی ہو گیا!</span>';
      setTimeout(() => {
        btnCopy.innerHTML = orig;
      }, 2500);
    });
  });

  // 6. ماڈلز کو کھولنے اور بند کرنے کے ایونٹس
  window.openModal = function(id) {
    document.getElementById(id).classList.remove('hidden');
  };

  window.closeModal = function(id) {
    document.getElementById(id).classList.add('hidden');
  };

  document.getElementById('btnBrowseModal').addEventListener('click', () => {
    openModal('browseModal');
    loadBrowseList();
  });

  document.getElementById('btnUploadModal').addEventListener('click', () => {
    openModal('uploadModal');
  });

  document.getElementById('btnSettingsModal').addEventListener('click', () => {
    openModal('settingsModal');
    checkConfigStatus();
  });

  // ماڈل کے باہر کلک کرنے پر بند ہونا
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m.id);
    });
  });

  // 7. کتاب کی ورق گردانی / براؤزنگ (Browse List)
  let allBrowseItems = [];

  async function loadBrowseList() {
    const listEl = document.getElementById('browseList');
    listEl.innerHTML = '<p class="text-center" style="padding: 20px;">فہرست لوڈ ہو رہی ہے...</p>';

    try {
      const res = await fetch('/api/browse');
      const data = await res.json();
      allBrowseItems = data.items || [];
      renderBrowseItems(allBrowseItems);
    } catch (e) {
      listEl.innerHTML = '<p class="text-danger">فہرست لوڈ کرنے میں خرابی پیش آگئی۔</p>';
    }
  }

  function renderBrowseItems(items) {
    const listEl = document.getElementById('browseList');
    listEl.innerHTML = '';

    if (items.length === 0) {
      listEl.innerHTML = '<p class="text-muted" style="padding: 20px; text-align: center;">کوئی مسئلہ نہیں ملا۔</p>';
      return;
    }

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'browse-item';
      div.innerHTML = `
        <div class="browse-item-header">
          <h4>${item.title}</h4>
          <span class="browse-tags">${item.volume} | ${item.page}</span>
        </div>
        <p>${item.original_text.slice(0, 150)}...</p>
      `;
      div.addEventListener('click', () => {
        closeModal('browseModal');
        queryInput.value = item.title;
        executeSearch(item.title);
      });
      listEl.appendChild(div);
    });
  }

  window.filterBrowseList = function() {
    const searchVal = document.getElementById('browseSearchInput').value.toLowerCase().trim();
    const volVal = document.getElementById('browseVolumeFilter').value;

    const filtered = allBrowseItems.filter(item => {
      const matchSearch = !searchVal || 
        item.title.toLowerCase().includes(searchVal) || 
        item.original_text.toLowerCase().includes(searchVal) ||
        item.chapter.toLowerCase().includes(searchVal);

      const matchVol = !volVal || item.volume_num === parseInt(volVal);
      return matchSearch && matchVol;
    });

    renderBrowseItems(filtered);
  };

  // جلدوں کے کارڈ پر کلک
  window.filterByVolume = function(volNum) {
    volumeSelect.value = volNum;
    openModal('browseModal');
    document.getElementById('browseVolumeFilter').value = volNum;
    loadBrowseList().then(() => {
      filterBrowseList();
    });
  };

  // 8. اپلوڈ ٹیبز سوئچ کرنا
  window.switchUploadTab = function(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    if (tabId === 'pdfTab') {
      document.querySelectorAll('.tab-btn')[0].classList.add('active');
      document.getElementById('pdfTab').classList.add('active');
    } else {
      document.querySelectorAll('.tab-btn')[1].classList.add('active');
      document.getElementById('manualTab').classList.add('active');
    }
  };

  // PDF اپلوڈ فارم
  const pdfUploadForm = document.getElementById('pdfUploadForm');
  const pdfUploadStatus = document.getElementById('pdfUploadStatus');

  pdfUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(pdfUploadForm);
    const btnSubmit = document.getElementById('btnSubmitPdf');
    
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> پی ڈی ایف پروسیس ہو رہی ہے...';
    pdfUploadStatus.className = 'upload-status hidden';

    try {
      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> پی ڈی ایف اپلوڈ اور محفوظ کریں';

      if (data.success) {
        pdfUploadStatus.className = 'upload-status success';
        pdfUploadStatus.textContent = `کامیابی: پی ڈی ایف کے ${data.result.pagesIndexed} صفحات کامیابی سے انڈیکس اور محفوظ کر لیے گئے۔`;
        pdfUploadForm.reset();
        loadStats();
      } else {
        pdfUploadStatus.className = 'upload-status error';
        pdfUploadStatus.textContent = data.message || data.error || 'خرابی پیش آگئی۔';
      }
    } catch (err) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> پی ڈی ایف اپلوڈ اور محفوظ کریں';
      pdfUploadStatus.className = 'upload-status error';
      pdfUploadStatus.textContent = 'اپلوڈ کے دوران نیٹ ورک کی خرابی واقع ہوئی۔';
    }
  });

  // دستی اندراج فارم
  const manualEntryForm = document.getElementById('manualEntryForm');
  const manualUploadStatus = document.getElementById('manualUploadStatus');

  manualEntryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('manTitle').value.trim(),
      volume: document.getElementById('manVolume').value.trim(),
      volume_num: 2,
      page: document.getElementById('manPage').value.trim(),
      chapter: document.getElementById('manChapter').value.trim(),
      masala_no: document.getElementById('manMasala').value.trim(),
      original_text: document.getElementById('manOriginalText').value.trim(),
      easy_explanation: document.getElementById('manEasyExplanation').value.trim(),
      keywords: document.getElementById('manKeywords').value.trim()
    };

    try {
      const res = await fetch('/api/add-ruling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        manualUploadStatus.className = 'upload-status success';
        manualUploadStatus.textContent = 'مسئلہ کامیابی سے بہشتی زیور کے ڈیٹا بیس میں شامل ہو گیا۔';
        manualEntryForm.reset();
        loadStats();
      } else {
        manualUploadStatus.className = 'upload-status error';
        manualUploadStatus.textContent = data.message || 'مسئلہ محفوظ نہ ہو سکا۔';
      }
    } catch (err) {
      manualUploadStatus.className = 'upload-status error';
      manualUploadStatus.textContent = 'سرور سے رابطہ نہ ہو سکا۔';
    }
  });

  // 9. ترتیبات اور API کلید کی جانچ
  async function checkConfigStatus() {
    const badge = document.getElementById('cfgActiveBadge');
    try {
      const res = await fetch('/api/config-status');
      const data = await res.json();

      if (data.gemini_active) {
        badge.className = 'badge-success';
        badge.innerHTML = '<i class="fa-solid fa-check"></i> فعال (جیمینائی AI + گراؤنڈنگ)';
      } else {
        badge.className = 'badge-gold';
        badge.innerHTML = '<i class="fa-solid fa-bolt"></i> فعال (مستند آف لائن بک سرچ)';
      }
    } catch (e) {
      badge.textContent = 'غیر دستیاب';
    }
  }

  // API کی محفوظ کرنا
  const apiKeyForm = document.getElementById('apiKeyForm');
  const apiKeyStatus = document.getElementById('apiKeyStatus');

  apiKeyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const apiKey = document.getElementById('inputApiKey').value.trim();
    if (!apiKey) return;

    try {
      const res = await fetch('/api/save-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });
      const data = await res.json();

      if (data.success) {
        apiKeyStatus.className = 'upload-status success';
        apiKeyStatus.textContent = 'API Key سرور سائیڈ پر کامیابی سے محفوظ ہو گئی۔';
        document.getElementById('inputApiKey').value = '';
        checkConfigStatus();
      } else {
        apiKeyStatus.className = 'upload-status error';
        apiKeyStatus.textContent = data.message || 'خرابی پیش آگئی۔';
      }
    } catch (err) {
      apiKeyStatus.className = 'upload-status error';
      apiKeyStatus.textContent = 'سرور سے رابطہ نہ ہو سکا۔';
    }
  });

  // 10. اعداد و شمار لوڈ کرنا (Stats)
  async function loadStats() {
    try {
      const res = await fetch('/api/volumes');
      const stats = await res.json();
      const footerStats = document.getElementById('footerStats');
      if (stats && stats.totalMasails) {
        footerStats.innerHTML = `
          <span><i class="fa-solid fa-book"></i> کل محفوظ شدہ مسائل: <strong>${stats.totalMasails}</strong></span>
          • <span>جلدیں: <strong>${stats.totalVolumes}</strong></span>
          • <span>ابواب: <strong>${stats.totalChapters}</strong></span>
        `;
      }
    } catch (e) {
      console.warn('Stats loading error:', e);
    }
  }

  // 11. PWA سروس ورکر رجسٹریشن (Service Worker Registration)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('✅ PWA سروس ورکر کامیابی سے رجسٹر ہو گیا:', reg.scope);
      }).catch((err) => {
        console.warn('PWA سروس ورکر رجسٹریشن میں رکاوٹ:', err);
      });
    });
  }

  // 12. PWA موبائل ایپ انسٹالیشن پرومپٹ (App Install Logic)
  let deferredPrompt = null;
  const pwaInstallBanner = document.getElementById('pwaInstallBanner');
  const btnPwaInstall = document.getElementById('btnPwaInstall');
  const btnPwaDismiss = document.getElementById('btnPwaDismiss');
  const btnHeaderInstall = document.getElementById('btnHeaderInstall');
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  // اگر ایپ پہلے سے انسٹال نہ ہو
  if (!isStandalone) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (pwaInstallBanner) pwaInstallBanner.classList.remove('hidden');
      if (btnHeaderInstall) btnHeaderInstall.classList.remove('hidden');
    });

    // آئی فون صارفین کے لیے ہیڈر میں انسٹال بٹن دکھائیں
    if (isIos && btnHeaderInstall) {
      btnHeaderInstall.classList.remove('hidden');
    }
  }

  if (btnPwaInstall) {
    btnPwaInstall.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          if (pwaInstallBanner) pwaInstallBanner.classList.add('hidden');
          if (btnHeaderInstall) btnHeaderInstall.classList.add('hidden');
        }
        deferredPrompt = null;
      }
    });
  }

  if (btnHeaderInstall) {
    btnHeaderInstall.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
      } else if (isIos) {
        openModal('iosInstallModal');
      } else {
        alert('ایپ انسٹال کرنے کے لیے اپنے براؤزر کے مینیو (تین نقطوں) پر کلک کر کے "Install App" یا "Add to Home screen" منتخب فرمائیں۔');
      }
    });
  }

  if (btnPwaDismiss) {
    btnPwaDismiss.addEventListener('click', () => {
      if (pwaInstallBanner) pwaInstallBanner.classList.add('hidden');
    });
  }

  // 13. موبائل باٹم نیویگیشن ہیلپر (Mobile Bottom Nav Helper)
  window.scrollToSearch = function(btn) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const searchSec = document.querySelector('.search-section');
    if (searchSec) {
      searchSec.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        const input = document.getElementById('queryInput');
        if (input) input.focus();
      }, 300);
    }
  };

  // ابتدائی جانچ اور کالز
  loadStats();
  checkConfigStatus();
});


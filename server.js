/**
 * AI بہشتی زیور - سرور
 * Main Backend Server with strict grounding and verified fiqh retrieval
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { searchBahishtiZewar, EXACT_REFUSAL_MESSAGE } = require('./engine/search');
const { generateGroundedResponse } = require('./engine/gemini');
const { 
  getCorpus, 
  getCorpusStats, 
  addManualEntry, 
  processUploadedPDF, 
  UPLOAD_DIR 
} = require('./engine/corpus_manager');

const app = express();
const PORT = process.env.PORT || 3000;

// مڈل ویئر
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// روٹ پاتھ ہینڈلر
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// فائل اپلوڈ کنفیگریشن
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bz-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// API ہیلتھ چیک
app.get('/api', (req, res) => {
  res.json({ status: 'ok', service: 'AI Bahishti Zewar API', version: '1.0.0' });
});

/**
 * 1. سوال پوچھنے کا بنیادی اینڈ پوائنٹ (Core Ask Endpoint)
 * سخت شرعی شرط: اگر کتاب میں جواب نہ ملے تو قطعی طور پر انکار کیا جائے گا
 */
app.post('/api/ask', async (req, res) => {
  try {
    const { question, volumeFilter } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        found: false,
        refusal: "برائے مہربانی اپنا سوال درج کریں۔"
      });
    }

    // مرحلہ 1 اور 2: کتاب بہشتی زیور میں متعلقہ مسئلہ تلاش کریں
    const searchResult = searchBahishtiZewar(question, volumeFilter);

    // مرحلہ 3: اگر واضح متعلقہ عبارت نہ ملے تو فوری انکار
    if (!searchResult.found) {
      return res.json({
        found: false,
        question: question,
        refusal: EXACT_REFUSAL_MESSAGE,
        reason: searchResult.reason
      });
    }

    // مرحلہ 4 اور 5: تصدیق شدہ کتابی عبارت سے جواب اور آسان تشریح کی تیاری
    const matchedItem = searchResult.matchedItem;
    const groundedResponse = await generateGroundedResponse(question, matchedItem);

    if (!groundedResponse.success) {
      return res.json({
        found: false,
        question: question,
        refusal: EXACT_REFUSAL_MESSAGE,
        reason: 'ai_refusal'
      });
    }

    // کامیابی پر مستند اور تصدیق شدہ جواب لوٹائیں
    return res.json({
      found: true,
      question: question,
      title: matchedItem.title,
      original_text: matchedItem.original_text,
      easy_explanation: matchedItem.easy_explanation,
      reference: {
        volume: matchedItem.volume,
        volume_num: matchedItem.volume_num,
        chapter: matchedItem.chapter,
        section: matchedItem.section,
        masala_no: matchedItem.masala_no,
        page: matchedItem.page
      },
      confidence_score: Math.round(searchResult.confidenceScore * 10) / 10,
      related_rulings: searchResult.relatedRulings,
      mode: groundedResponse.mode
    });

  } catch (err) {
    console.error('Error handling /api/ask:', err);
    return res.status(500).json({
      found: false,
      refusal: "سرور پر درخواست کی پروسیسنگ کے دوران عارضی خرابی پیش آگئی۔ براہ کرم دوبارہ کوشش فرمائیں۔",
      error: err.message
    });
  }
});

/**
 * 2. کتاب کی ورق گردانی / براؤزنگ (Browse Corpus)
 */
app.get('/api/browse', (req, res) => {
  try {
    const { volume, chapter, search } = req.query;
    let items = getCorpus();

    if (volume) {
      items = items.filter(i => i.volume_num === parseInt(volume) || i.volume.includes(volume));
    }
    if (chapter) {
      items = items.filter(i => i.chapter.includes(chapter));
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) || 
        i.original_text.toLowerCase().includes(q) ||
        (i.keywords && i.keywords.some(k => k.toLowerCase().includes(q)))
      );
    }

    return res.json({
      total: items.length,
      items
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 3. ابواب اور جلدوں کی فہرست (Volumes & Chapters)
 */
app.get('/api/volumes', (req, res) => {
  try {
    const stats = getCorpusStats();
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 4. پی ڈی ایف اپلوڈ اور انڈیکسنگ (PDF Ingestion)
 */
app.post('/api/upload-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "کوئی پی ڈی ایف فائل منتخب نہیں کی گئی۔" });
    }

    const metadata = {
      volume: req.body.volume || "بہشتی زیور - جدید اپلوڈ",
      volume_num: req.body.volume_num || 1,
      chapter: req.body.chapter || "اپلوڈ شدہ باب",
      startPage: req.body.startPage || 1
    };

    const result = await processUploadedPDF(req.file.path, metadata);
    return res.json({
      success: true,
      message: "پی ڈی ایف کامیابی سے شامل کر لی گئی اور متن محفوظ کر دیا گیا۔",
      result
    });
  } catch (err) {
    console.error('Error uploading PDF:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. دستی مسئلہ شامل کرنا (Manual Ingestion)
 */
app.post('/api/add-ruling', (req, res) => {
  try {
    const { title, volume, volume_num, chapter, section, masala_no, page, original_text, easy_explanation, keywords } = req.body;

    if (!title || !original_text) {
      return res.status(400).json({ success: false, message: "عنوان اور اصل عبارت لازمی ہیں۔" });
    }

    const newRecord = addManualEntry({
      title, volume, volume_num, chapter, section, masala_no, page, original_text, easy_explanation, keywords
    });

    return res.json({
      success: true,
      message: "مسئلہ کامیابی سے بہشتی زیور کے ڈیٹا بیس میں محفوظ کر دیا گیا۔",
      item: newRecord
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. جیمینائی API کی کی صورتحال (Check Config Status)
 */
app.get('/api/config-status', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_GEMINI_API_KEY_HERE');
  return res.json({
    gemini_active: isConfigured,
    model_name: "Gemini 2.5 Flash (Strict Grounding)",
    mode: isConfigured ? "AI + Book Grounding" : "Direct Book Grounding (Offline Ready)"
  });
});

/**
 * 7. سرور سائیڈ پر API کی محفوظ کرنا (Save API Key safely)
 */
app.post('/api/save-api-key', (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || apiKey.trim().length === 0) {
      return res.status(400).json({ success: false, message: "API Key درکار ہے۔" });
    }

    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    if (envContent.includes('GEMINI_API_KEY=')) {
      envContent = envContent.replace(/GEMINI_API_KEY=.*(\r?\n|$)/, `GEMINI_API_KEY=${apiKey.trim()}\n`);
    } else {
      envContent += `\nGEMINI_API_KEY=${apiKey.trim()}\n`;
    }

    try {
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    } catch (writeErr) {
      console.warn('Filesystem is read-only (Vercel environment):', writeErr.message);
    }
    process.env.GEMINI_API_KEY = apiKey.trim();

    return res.json({
      success: true,
      message: "API Key کامیابی سے فعال کر دی گئی ہے۔"
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// سرور کا آغاز (اگر ورسل سرورلیس نہ ہو)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  AI بہشتی زیور - سرور کامیابی سے چالو ہو گیا ہے`);
    console.log(`  پورٹ: http://localhost:${PORT}`);
    console.log(`  علمی ماخذ: کتاب بہشتی زیور (مکمل تصدیق شدہ)`);
    console.log(`===============================================`);
  });
}

// ورسل سرورلیس کے لیے ایپ ایکسپورٹ کریں
module.exports = app;


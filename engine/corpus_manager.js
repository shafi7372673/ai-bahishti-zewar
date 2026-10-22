/**
 * AI بہشتی زیور - کارپس مینیجر
 * Corpus Management & PDF / Text Ingestion
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const pdfParse = require('pdf-parse');

// ڈیٹا بیس کا درست راستہ معلوم کرنا (ورسل اور لوکل دونوں ماحول میں)
function resolveDbPath() {
  const candidates = [
    path.join(__dirname, '../data/bahishti_zewar.json'),
    path.join(process.cwd(), 'data/bahishti_zewar.json'),
    path.join(__dirname, 'data/bahishti_zewar.json'),
    path.resolve('data/bahishti_zewar.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

const DB_PATH = resolveDbPath();

// ورسل پر اپلوڈ ڈائریکٹری کے لیے محفوظ راستہ
const isVercel = Boolean(process.env.VERCEL);
const UPLOAD_DIR = isVercel 
  ? path.join(os.tmpdir(), 'bahishti_uploads') 
  : path.join(__dirname, '../data/uploads');

try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  // ورسل کے ریڈ اونلی انوائرنمنٹ میں ایرر کو کریش ہونے سے بچائیں
  console.warn('Notice: Upload dir initialization skipped on read-only system:', e.message);
}

/**
 * ڈیٹا بیس لوڈ کرنا
 */
function getCorpus() {
  try {
    const targetPath = resolveDbPath();
    if (fs.existsSync(targetPath)) {
      return JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading Bahishti Zewar corpus:', err.message);
  }
  return [];
}

/**
 * ڈیٹا بیس محفوظ کرنا
 */
function saveCorpus(data) {
  try {
    const targetPath = resolveDbPath();
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Notice: Cannot write to database on read-only system:', err.message);
  }
}

/**
 * مجموعی اعداد و شمار
 */
function getCorpusStats() {
  const corpus = getCorpus();
  const volumes = new Set();
  const chapters = new Set();
  const pages = new Set();

  corpus.forEach(item => {
    if (item.volume) volumes.add(item.volume);
    if (item.chapter) chapters.add(item.chapter);
    if (item.page) pages.add(item.page);
  });

  return {
    totalMasails: corpus.length,
    totalVolumes: volumes.size,
    totalChapters: chapters.size,
    totalIndexedPages: pages.size,
    volumesList: Array.from(volumes),
    chaptersList: Array.from(chapters)
  };
}

/**
 * نیا شرعی مسئلہ دستی شامل کرنا
 */
function addManualEntry(entry) {
  const corpus = getCorpus();
  const id = `bz_custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const newRecord = {
    id,
    volume: entry.volume || "متفرق / نیا اندراج",
    volume_num: parseInt(entry.volume_num) || 1,
    chapter: entry.chapter || "متفرق احکام",
    section: entry.section || "",
    masala_no: entry.masala_no || `مسئلہ نمبر ${corpus.length + 1}`,
    page: entry.page || "غیر متعین",
    title: entry.title,
    original_text: entry.original_text,
    easy_explanation: entry.easy_explanation || entry.original_text,
    keywords: Array.isArray(entry.keywords) 
      ? entry.keywords 
      : (entry.keywords || '').split(',').map(s => s.trim()).filter(Boolean)
  };

  corpus.push(newRecord);
  saveCorpus(corpus);
  return newRecord;
}

/**
 * پی ڈی ایف فائل پروسیس کر کے کارپس میں محفوظ کرنا
 */
async function processUploadedPDF(filePath, metadata) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);

    const totalPages = pdfData.numpages || 1;
    const rawText = pdfData.text || '';

    // صفحات کو تقسیم کرنے کی کوشش
    const pageChunks = rawText.split(/\f|\n(?=Page\s+\d+|\d+\s+بہشتی زیور)/g).filter(c => c.trim().length > 30);

    const corpus = getCorpus();
    const newItems = [];

    const volumeName = metadata.volume || "بہشتی زیور (اپلوڈ شدہ ایڈیشن)";
    const volumeNum = parseInt(metadata.volume_num) || 1;
    const baseChapter = metadata.chapter || "منتخب ابواب";

    pageChunks.forEach((chunk, idx) => {
      const pageNum = metadata.startPage ? (parseInt(metadata.startPage) + idx) : (idx + 1);
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      const title = lines[0] ? lines[0].slice(0, 60) : `بہشتی زیور - صفحہ ${pageNum}`;

      const item = {
        id: `bz_pdf_${Date.now()}_p${pageNum}`,
        volume: volumeName,
        volume_num: volumeNum,
        chapter: baseChapter,
        section: `صفحہ ${pageNum} سے استخراج شدہ`,
        masala_no: `صفحہ ${pageNum}`,
        page: `صفحہ ${pageNum}`,
        title: title,
        original_text: chunk.trim(),
        easy_explanation: `یہ عبارت بہشتی زیور کے صفحہ ${pageNum} سے استخراج کی گئی ہے۔`,
        keywords: [baseChapter, title, volumeName, `صفحہ ${pageNum}`]
      };

      corpus.push(item);
      newItems.push(item);
    });

    saveCorpus(corpus);

    return {
      success: true,
      pagesIndexed: pageChunks.length,
      totalPagesInPDF: totalPages,
      addedItemsCount: newItems.length
    };
  } catch (err) {
    console.error('PDF parsing error:', err);
    throw err;
  }
}

module.exports = {
  getCorpus,
  saveCorpus,
  getCorpusStats,
  addManualEntry,
  processUploadedPDF,
  UPLOAD_DIR
};

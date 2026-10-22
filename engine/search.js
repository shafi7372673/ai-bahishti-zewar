/**
 * AI بہشتی زیور - سرچ انجن (سخت گراؤنڈنگ اور تصدیق شدہ اسکورنگ)
 * Search & Retrieval Engine with strict book grounding and relevance scoring
 */

const fs = require('fs');
const path = require('path');
const { normalizeUrdu, tokenizeUrdu, expandQuery, STOPWORDS } = require('./normalizer');

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

// سخت تصدیقی حد
const STRICT_MIN_SCORE = 8.0;

// سوال کا جواب نہ ملنے پر لازمی جملہ
const EXACT_REFUSAL_MESSAGE = "معذرت، فراہم کردہ کتاب بہشتی زیور میں اس سوال کا متعلقہ جواب نہیں مل سکا۔ یہ ٹول صرف اسی کتاب کی بنیاد پر جواب دیتا ہے۔";

/**
 * ڈیٹا بیس لوڈ کرنا
 */
function loadDatabase() {
  try {
    const targetPath = resolveDbPath();
    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error loading Bahishti Zewar database:', err.message);
  }
  return [];
}

/**
 * بہشتی زیور میں مسئلہ تلاش کرنا
 */
function searchBahishtiZewar(rawQuery, volumeFilter = null) {
  if (!rawQuery || typeof rawQuery !== 'string' || rawQuery.trim().length === 0) {
    return {
      found: false,
      refusal: EXACT_REFUSAL_MESSAGE,
      reason: 'empty_query'
    };
  }

  const database = loadDatabase();
  const queryAnalysis = expandQuery(rawQuery);
  const normQuery = queryAnalysis.normalized;
  const sigTokens = queryAnalysis.significantTokens;
  const expandedTerms = queryAnalysis.expandedTerms;

  // اگر سوال میں کوئی اہم شرعی یا بامعنی لفظ ہی نہ ہو
  if (sigTokens.length === 0 && expandedTerms.length === 0) {
    return {
      found: false,
      refusal: EXACT_REFUSAL_MESSAGE,
      reason: 'no_significant_tokens'
    };
  }

  const scoredResults = [];

  for (const item of database) {
    // اگر مخصوص جلد کا فلٹر لگایا گیا ہو
    if (volumeFilter && item.volume_num !== parseInt(volumeFilter)) {
      continue;
    }

    let score = 0;
    const normTitle = normalizeUrdu(item.title);
    const normChapter = normalizeUrdu(item.chapter);
    const normSection = normalizeUrdu(item.section);
    const normText = normalizeUrdu(item.original_text);
    const normKeywords = (item.keywords || []).map(k => normalizeUrdu(k));

    // ۱۔ ہو بہو مکمل سوال یا فقرہ متن یا عنوان میں ملنا
    if (normTitle.includes(normQuery)) {
      score += 25.0;
    }
    if (normText.includes(normQuery)) {
      score += 20.0;
    }

    // ۲۔ اہم کلیدی الفاظ کا عنوان اور باب میں ہونا
    let titleTokenMatches = 0;
    let sectionTokenMatches = 0;
    let textTokenMatches = 0;

    sigTokens.forEach(tok => {
      let matchedInItem = false;

      if (normTitle.includes(tok)) {
        score += 8.0;
        titleTokenMatches++;
        matchedInItem = true;
      }
      if (normSection.includes(tok)) {
        score += 6.0;
        sectionTokenMatches++;
        matchedInItem = true;
      }
      if (normChapter.includes(tok)) {
        score += 5.0;
        matchedInItem = true;
      }
      if (normKeywords.some(k => k.includes(tok) || tok.includes(k))) {
        score += 6.0;
        matchedInItem = true;
      }
      if (normText.includes(tok)) {
        score += 2.5;
        textTokenMatches++;
        matchedInItem = true;
      }
    });

    // ۳۔ مترادفات و تصوراتی الفاظ کی جانچ (Concept & Synonym Matching)
    expandedTerms.forEach(concept => {
      const conceptTokens = tokenizeUrdu(concept);
      let conceptMatch = false;

      if (normTitle.includes(concept) || normKeywords.some(k => k.includes(concept))) {
        score += 7.0;
        conceptMatch = true;
      } else if (normSection.includes(concept) || normChapter.includes(concept)) {
        score += 5.0;
        conceptMatch = true;
      } else if (conceptTokens.length > 1 && conceptTokens.every(ct => normText.includes(ct))) {
        score += 3.5;
        conceptMatch = true;
      }
    });

    // ۴۔ بنیادی الفاظ کی شمولیت کا تناسب (Coverage Ratio)
    // سوال کے کتنے فیصد اہم الفاظ اس کتابی اندراج میں موجود ہیں
    const matchedTokensCount = sigTokens.filter(tok => 
      normTitle.includes(tok) || 
      normSection.includes(tok) || 
      normKeywords.some(k => k.includes(tok)) || 
      normText.includes(tok)
    ).length;

    const coverageRatio = sigTokens.length > 0 ? (matchedTokensCount / sigTokens.length) : 0;

    // ۵۔ کوریج بونص اور جرمانہ (Coverage Penalty for irrelevant queries)
    if (coverageRatio >= 0.75) {
      score *= 1.5; // بہت زیادہ مطابقت
    } else if (coverageRatio < 0.4 && sigTokens.length >= 2) {
      score *= 0.2; // اگر سوال کے زیادہ تر الفاظ کتاب میں ہیں ہی نہیں (مثلاً کمپیوٹر، پائتھون) تو اسکور کم کر دیں
    }

    // اضافی بونص اگر عنوان میں سوال کا سب سے اہم لفظ شامل ہو (مثلاً وضو کے سوال میں وضو کا عنوان)
    if (sigTokens.length > 0 && normTitle.includes(sigTokens[0])) {
      score += 6.0;
    }

    if (score > 0 && coverageRatio >= 0.35) {
      scoredResults.push({
        item,
        score,
        coverageRatio,
        matchedTokensCount
      });
    }
  }

  // نتائج کو سب سے زیادہ اسکور کی بنیاد پر ترتیب دینا
  scoredResults.sort((a, b) => b.score - a.score);

  // سخت تصدیق: اگر کوئی نتیجہ مطلوبہ معیار پر پورا نہ اترے تو صاف انکار
  if (scoredResults.length === 0 || scoredResults[0].score < STRICT_MIN_SCORE || scoredResults[0].coverageRatio < 0.4) {
    return {
      found: false,
      refusal: EXACT_REFUSAL_MESSAGE,
      reason: 'not_found_in_book',
      bestScore: scoredResults.length > 0 ? scoredResults[0].score : 0
    };
  }

  const bestMatch = scoredResults[0];

  // متعلقہ ذیلی مسائل (Related Rulings)
  const relatedRulings = scoredResults.slice(1, 4).map(r => ({
    id: r.item.id,
    title: r.item.title,
    chapter: r.item.chapter,
    section: r.item.section,
    page: r.item.page,
    volume: r.item.volume,
    masala_no: r.item.masala_no,
    score: Math.round(r.score * 10) / 10
  }));

  return {
    found: true,
    matchedItem: bestMatch.item,
    confidenceScore: Math.round(bestMatch.score * 10) / 10,
    coverageRatio: Math.round(bestMatch.coverageRatio * 100) / 100,
    relatedRulings,
    queryAnalysis
  };
}

module.exports = {
  searchBahishtiZewar,
  loadDatabase,
  EXACT_REFUSAL_MESSAGE,
  STRICT_MIN_SCORE
};

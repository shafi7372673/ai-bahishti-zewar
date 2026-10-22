/**
 * Vercel Serverless Function: /api/ask
 * سوال پوچھنے کا شرعی تصدیق شدہ اینڈ پوائنٹ
 */

const { searchBahishtiZewar, EXACT_REFUSAL_MESSAGE } = require('../engine/search');
const { generateGroundedResponse } = require('../engine/gemini');

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  // CORS ہیڈرز
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = await parseBody(req);
    const question = body.question;
    const volumeFilter = body.volumeFilter;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return sendJson(res, 400, {
        found: false,
        refusal: "برائے مہربانی اپنا سوال درج کریں۔"
      });
    }

    // ۱۔ کتاب بہشتی زیور میں مسئلہ تلاش کریں
    const searchResult = searchBahishtiZewar(question, volumeFilter);

    // ۲۔ اگر کتاب میں نہ ملے تو قطعی انکار
    if (!searchResult.found) {
      return sendJson(res, 200, {
        found: false,
        refusal: searchResult.refusal || EXACT_REFUSAL_MESSAGE,
        reason: searchResult.reason
      });
    }

    // ۳۔ اصل کتابی عبارت کی بنیاد پر تصدیق شدہ گراؤنڈنگ
    const aiResponse = await generateGroundedResponse(question, searchResult.item);

    return sendJson(res, 200, {
      found: true,
      score: searchResult.score,
      matchedItem: searchResult.item,
      aiResponse: aiResponse
    });
  } catch (err) {
    console.error('Error handling /api/ask:', err);
    return sendJson(res, 200, {
      found: false,
      refusal: EXACT_REFUSAL_MESSAGE,
      error: err.message
    });
  }
};

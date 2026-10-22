/**
 * Vercel Serverless Function: /api/browse
 * بہشتی زیور کے مسائل کی براؤزنگ اور فلٹرنگ
 */

const { getCorpus } = require('../engine/corpus_manager');

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  try {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const query = req.query || Object.fromEntries(parsedUrl.searchParams.entries()) || {};
    const { volume, chapter, search } = query;
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

    return sendJson(res, 200, {
      total: items.length,
      items
    });
  } catch (err) {
    console.error('Error in /api/browse:', err);
    return sendJson(res, 500, { error: err.message });
  }
};

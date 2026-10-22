/**
 * Vercel Serverless Function: /api/volumes
 * بہشتی زیور کے ابواب اور شماریات
 */

const { getCorpusStats } = require('../engine/corpus_manager');

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
    const stats = getCorpusStats();
    return sendJson(res, 200, stats);
  } catch (err) {
    console.error('Error in /api/volumes:', err);
    return sendJson(res, 500, { error: err.message });
  }
};

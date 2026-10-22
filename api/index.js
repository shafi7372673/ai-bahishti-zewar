/**
 * Vercel Serverless Function: /api
 * بنیادی API ہیلتھ چیک
 */

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

  return sendJson(res, 200, {
    status: 'ok',
    service: 'AI Bahishti Zewar API',
    version: '1.0.0',
    source: 'کتاب بہشتی زیور (مولانا اشرف علی تھانویؒ)',
    timestamp: new Date().toISOString()
  });
};

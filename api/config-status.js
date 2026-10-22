/**
 * Vercel Serverless Function: /api/config-status
 * جیمینائی API کی صورتحال چیک کرنا
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

  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_GEMINI_API_KEY_HERE');

  return sendJson(res, 200, {
    gemini_active: isConfigured,
    mode: isConfigured ? 'gemini_grounded' : 'deterministic_grounded',
    message: isConfigured 
      ? 'Google Gemini API فعال ہے اور سخت شرعی گراؤنڈنگ کے ساتھ منسلک ہے۔' 
      : 'آف لائن گراؤنڈڈ انجن فعال ہے۔ (کتاب بہشتی زیور کے اصل ڈیٹا بیس سے جواب دیا جا رہا ہے)'
  });
};

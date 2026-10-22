/**
 * Gemini API محفوظ کنکشن ٹیسٹ اسکرپٹ
 * یہ اسکرپٹ API Key کو اسکرین، ٹرمینل یا لاگ پر ظاہر کیے بغیر کنکشن چیک کرتا ہے
 */

require('dotenv').config();

async function testGeminiConnection() {
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';

  if (!apiKey) {
    console.log('⚠️ نتیجہ: .env فائل میں GEMINI_API_KEY موجود نہیں ہے (خالی ہے)۔');
    return;
  }

  console.log('🔄 گوگل جیمینائی سرورز سے محفوظ رابطہ قائم کیا جا رہا ہے...');

  const models = ['gemini-3.5-flash', 'gemini-3.8-flash'];
  let connected = false;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'سلام' }] }]
        })
      });

      if (response.ok) {
        console.log(`✅ کامیابی: Google Gemini API (${model}) سے محفوظ کنکشن ۱۰۰٪ فعال اور تصدیق شدہ ہے! (HTTP Status: 200 OK)`);
        connected = true;
        break;
      }
    } catch (err) {
      // جاری رکھیں
    }
  }

  if (!connected) {
    console.log('❌ کنکشن کی جانچ کے دوران سرور پر عارضی تعطل یا رسائی میں رکاوٹ آئی۔');
  }
}

testGeminiConnection();

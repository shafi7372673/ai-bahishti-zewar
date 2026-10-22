/**
 * AI بہشتی زیور - جیمینائی اور گراؤنڈڈ جنریٹر
 * Strictly grounded synthesis module using Gemini API or offline deterministic grounded synthesis
 */

const { EXACT_REFUSAL_MESSAGE } = require('./search');

/**
 * سخت شرعی گراؤنڈڈ سسٹم پرامپٹ
 */
const SYSTEM_PROMPT = `
تم "AI بہشتی زیور" کے شرعی و تحقیقی اسسٹنٹ ہو۔
تمہارا واحد اور حتمی علمی ماخذ صرف اور صرف فراہم کردہ کتاب "بہشتی زیور" (تالیف: حکیم الامت مولانا اشرف علی تھانویؒ) کی مستند عبارت ہے۔

لازمی اور اٹل شرائط:
1. کسی دوسرے اسلامی ماخذ، کتاب، ویب سائٹ، اپنی فہم، قیاس یا عمومی معلومات سے جواب دینا سخت ممنوع ہے۔
2. صرف فراہم کردہ کتابی عبارت کی بنیاد پر جواب دو۔ اپنی طرف سے کوئی نیا حکم، نئی شرط، دلیل یا فتویٰ شامل نہ کرو۔
3. اگر سوال کا جواب فراہم کردہ عبارت میں موجود نہ ہو تو لازمی طور پر صرف یہ لکھو:
"${EXACT_REFUSAL_MESSAGE}"
4. جواب کی ساخت لازمی طور پر تین واضح حصوں پر مشتمل ہو:
   - [اصل عبارت]: کتاب بہشتی زیور کی اصل عبارت بعینہٖ۔
   - [آسان تشریح]: اسی عبارت کا مفہوم عام فہم اردو میں، بغیر کسی شرعی حکم، شرط یا استثنا کو تبدیل کیے۔
   - [تصدیق شدہ حوالہ]: کتاب کی فراہم کردہ جلد، صفحہ اور باب کا ہو بہو حوالہ۔ کوئی فرضی حوالہ نہ بنائیں۔
`;

/**
 * جیمینائی ماڈل سے رابطہ کر کے جواب تیار کرنا
 */
async function generateGroundedResponse(question, matchedItem) {
  if (!matchedItem) {
    return {
      success: false,
      refusal: EXACT_REFUSAL_MESSAGE
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // اگر Gemini API کی موجود ہو تو محفوظ سرور سائیڈ کال کریں
  if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
    try {
      const userPrompt = `
صارف کا سوال: ${question}

بہشتی زیور سے تصدیق شدہ متعلقہ کتابی اندراج:
- عنوان: ${matchedItem.title}
- جلد: ${matchedItem.volume}
- صفحہ: ${matchedItem.page}
- باب / فصل: ${matchedItem.chapter} (${matchedItem.section})
- مسئلہ نمبر: ${matchedItem.masala_no}
- اصل کتابی عبارت:
"""
${matchedItem.original_text}
"""
- بنیادی آسان مفہوم:
"""
${matchedItem.easy_explanation}
"""

ہدایت: سوال کو دیکھو۔ اگر یہ کتابی عبارت اس سوال کا جواب دیتی ہے تو اصل عبارت، آسان تشریح اور تصدیق شدہ حوالہ مرتب کرو۔ اگر یہ عبارت سوال کے مطابق نہ ہو تو صرف انکار کا جملہ لکھو۔
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: userPrompt }]
          }],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          generationConfig: {
            temperature: 0.1, // قیاس آرائی کو مکمل روکنے کے لیے کم ترین ٹمپریچر
            maxOutputTokens: 1000
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          // اگر ماڈل نے انکار کا جملہ لکھا ہو
          if (candidateText.includes("معذرت، فراہم کردہ کتاب بہشتی زیور")) {
            return {
              success: false,
              refusal: EXACT_REFUSAL_MESSAGE
            };
          }

          return {
            success: true,
            mode: 'gemini_grounded',
            raw_ai_text: candidateText,
            item: matchedItem
          };
        }
      } else {
        console.warn('Gemini API call returned status:', response.status);
      }
    } catch (err) {
      console.error('Gemini API request error:', err.message);
      // خرابی کی صورت میں خودکار طور پر آف لائن گراؤنڈڈ سسٹم پر منتقل ہو جائے گا
    }
  }

  // آف لائن یا متبادل گراؤنڈڈ جنریشن (Direct Grounded Synthesis)
  // یہ کتاب کے اصل ڈیٹا بیس سے ۱۰۰ فیصد گراؤنڈڈ اور تصدیق شدہ جواب تیار کرتا ہے
  return {
    success: true,
    mode: 'deterministic_grounded',
    item: matchedItem
  };
}

module.exports = {
  generateGroundedResponse,
  SYSTEM_PROMPT
};

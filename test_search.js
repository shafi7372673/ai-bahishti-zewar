/**
 * AI بہشتی زیور - ٹیسٹ اسکرپٹ
 * Verify retrieval, grounding, and strict refusal
 */

const { searchBahishtiZewar, EXACT_REFUSAL_MESSAGE } = require('./engine/search');

console.log('=== AI بہشتی زیور: خودکار ٹیسٹنگ برائے تصدیق و گراؤنڈنگ ===\n');

// ٹیسٹ ۱: وضو کے فرائض پر سوال
console.log('ٹیسٹ ۱: وضو کے فرائض کا سوال');
const res1 = searchBahishtiZewar('وضو کے فرائض کیا ہیں؟');
console.log('Found:', res1.found);
if (res1.found) {
  console.log('Title:', res1.matchedItem.title);
  console.log('Volume:', res1.matchedItem.volume);
  console.log('Page:', res1.matchedItem.page);
  console.log('اصل عبارت موجود ہے:', Boolean(res1.matchedItem.original_text));
  console.log('آسان تشریح موجود ہے:', Boolean(res1.matchedItem.easy_explanation));
}
console.log('-------------------------------------------');

// ٹیسٹ ۲: مترادفات اور عام الفاظ (نہانا -> غسل)
console.log('ٹیسٹ ۲: عام لفظ "نہانے کے فرائض"');
const res2 = searchBahishtiZewar('نہانے کے فرائض بتائیں');
console.log('Found:', res2.found);
if (res2.found) {
  console.log('Title:', res2.matchedItem.title);
  console.log('Chapter:', res2.matchedItem.chapter);
}
console.log('-------------------------------------------');

// ٹیسٹ ۳: سونے پر زکوٰۃ کا نصاب
console.log('ٹیسٹ ۳: زکوٰۃ کا نصاب اور سونا چاندی');
const res3 = searchBahishtiZewar('سونے پر زکوٰۃ کا کیا نصاب ہے؟');
console.log('Found:', res3.found);
if (res3.found) {
  console.log('Title:', res3.matchedItem.title);
  console.log('Page:', res3.matchedItem.page);
}
console.log('-------------------------------------------');

// ٹیسٹ ۴: کتاب سے باہر کا سوال (Out-of-scope query)
console.log('ٹیسٹ ۴: غیر متعلقہ سوال (کتاب سے باہر)');
const res4 = searchBahishtiZewar('کمپیوٹر پروگرامنگ میں پائتھون اور جاوا میں کیا فرق ہے؟');
console.log('Found:', res4.found);
console.log('Refusal Message:', res4.refusal);
console.log('Refusal matches EXACT string:', res4.refusal === EXACT_REFUSAL_MESSAGE);
console.log('-------------------------------------------');

// ٹیسٹ ۵: عمومی غیر شرعی سوال
console.log('ٹیسٹ ۵: دوسرا غیر متعلقہ سوال');
const res5 = searchBahishtiZewar('مریخ پر پانی کی دریافت کیسے ہوئی؟');
console.log('Found:', res5.found);
console.log('Refusal Message:', res5.refusal);
console.log('Refusal matches EXACT string:', res5.refusal === EXACT_REFUSAL_MESSAGE);
console.log('-------------------------------------------');

console.log('=== تمام ٹیسٹ مکمل ہوئے ===');

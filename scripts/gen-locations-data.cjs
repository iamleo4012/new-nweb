/* One-off generator: builds assets/js/nassim-locations-data.js from the
   website-reference Governorate → Area list (196 areas / 6 governorates). */
const fs = require("fs");
const D = {
  "al-asimah": ["Al Asimah", "محافظة العاصمة", [
    [2,"Dasman","دسمان"],[3,"Mansouriya","المنصورية"],[4,"Faiha","الفيحاء"],
    [5,"Bnaid Al-Qar","بنيد القار"],[6,"Qadsiya","القادسية"],[7,"Dasma","الدسمة"],
    [8,"Mirqab","المرقاب"],[9,"Shamiya","الشامية"],[10,"Shuwaikh Industrial-3","الشويخ الصناعية 3"],
    [11,"Abdullah Al-Salem","ضاحية عبدالله السالم"],[12,"Khaldiya","الخالدية"],[13,"Shuwaikh Industrial-2","الشويخ الصناعية 2"],
    [14,"Sharq","الشرق"],[15,"Qibla","القبلة"],[16,"Qortuba","قرطبة"],
    [17,"Kaifan","كيفان"],[18,"Sulaibikhat","الصليبيخات"],[19,"Rai","الري"],
    [20,"The Sea Front","الواجهة البحرية"],[21,"Shuwaikh Educational","الشويخ التعليمية"],[22,"Northwest Sulaibikhat","شمال غرب الصليبيخات"],
    [23,"Doha Residential","الدوحة السكنية"],[24,"Rawda","الروضة"],[25,"Al-Sour Gardens","حدائق السور"],
    [26,"Mubarakiya Camps","معسكرات المباركية"],[27,"Jaber Al-Ahmad","جابر الأحمد"],[28,"Shuwaikh Industrial-1","الشويخ الصناعية 1"],
    [29,"Shuwaikh Health","الشويخ الصحية"],[30,"Nuzha","النزهة"],[31,"Daiya","الدعية"],
    [32,"Yarmouk","اليرموك"],[33,"Adailiya","العديلية"],[34,"Surra","السرة"],
    [35,"Ghernata","غرناطة"],[36,"Shuwaikh","الشويخ"],[37,"Free Trade Zone","المنطقة الحرة"],
    [38,"Doha Port","ميناء الدوحة"]
  ]],
  "hawalli": ["Hawalli", "محافظة حولي", [
    [39,"Al Bida'a","البدع"],[40,"Ministries Area","منطقة الوزارات"],[41,"Shuhada","الشهداء"],
    [42,"Shaab","الشعب"],[43,"Hitteen","حطين"],[44,"Al-Siddiq","الصديق"],
    [45,"Jabriya","الجابرية"],[46,"Bayan","بيان"],[47,"Rumaithiya","الرميثية"],
    [48,"Hawalli","حولي"],[49,"Salmiya","السالمية"],[50,"Mishrif","مشرف"],
    [51,"Salwa","سلوى"],[52,"Mubarakyia","المباركية"],[53,"Mubarak Al-Abdullah","مبارك العبدالله"],
    [54,"Salam","السلام"],[55,"Zahra","الزهراء"]
  ]],
  "jahra": ["Jahra", "محافظة الجهراء", [
    [56,"Jawakher Al-Jahra","جواخير الجهراء"],[57,"Sulaibiya Industrial 1","الصليبية الصناعية 1"],[58,"Oyoun","العيون"],
    [59,"Al-Mutlaa Residential 8","المطلاع السكنية 8"],[60,"Al-Mutlaa Residential 3","المطلاع السكنية 3"],[61,"Al-Mutlaa Residential 2","المطلاع السكنية 2"],
    [62,"Qasr","القصر"],[63,"Al-Mutlaa Residential 1","المطلاع السكنية 1"],[64,"Sulaibiya Residential","الصليبية السكنية"],
    [65,"North West Jahra","شمال غرب الجهراء"],[66,"South Saad Al-Abdulla 2","جنوب سعد العبدالله 2"],[67,"Al-Mutlaa","المطلاع"],
    [68,"Kaerawan","القيروان"],[69,"Al-Mutlaa Residential 7","المطلاع السكنية 7"],[70,"Sulaibikhat Cemetery","مقبرة الصليبيخات"],
    [71,"Sulaibiya Agricultural","الصليبية الزراعية"],[72,"South Saad Al-Abdulla 5","جنوب سعد العبدالله 5"],[73,"South Saad Al-Abdulla 1","جنوب سعد العبدالله 1"],
    [74,"South Saad Al-Abdulla 6","جنوب سعد العبدالله 6"],[75,"South Saad Al-Abdulla 3","جنوب سعد العبدالله 3"],[76,"South Saad Al-Abdulla 4","جنوب سعد العبدالله 4"],
    [77,"Al-Mutlaa Residential 4","المطلاع السكنية 4"],[78,"Salmy","السالمي"],[79,"Al-Mutlaa Residential 10","المطلاع السكنية 10"],
    [80,"Saad Al-Abdulla","سعد العبدالله"],[81,"Al-Mutlaa Residential 11","المطلاع السكنية 11"],[82,"South Amghara","جنوب أمغره"],
    [83,"Kabd","كبد"],[84,"Amghara Industrial","أمغرة الصناعية"],[85,"Taima","تيماء"],
    [86,"Al-Mutlaa Residential 6","المطلاع السكنية 6"],[87,"Al-Mutlaa Residential 5","المطلاع السكنية 5"],[88,"Naayem Industrial","النعايم الصناعية"],
    [89,"Sulaibiya Industrial 2","الصليبية الصناعية 2"],[90,"Abdally","العبدلي"],[91,"Nahda","النهضة"],
    [92,"Waha","الواحة"],[93,"Naeem","النعيم"],[94,"Al-Mutlaa Residential 12","المطلاع السكنية 12"],
    [95,"Jahra","الجهراء"],[96,"Al-Mutlaa Residential 9","المطلاع السكنية 9"],[97,"Nasseem","النسيم"],
    [98,"Jahra Industrial Herafiya 1","الجهراء الصناعية الحرفية 1"],[99,"Jahra Camps","معسكرات الجهراء"],[100,"Shalehat Kazima","شاليهات كاظمة"]
  ]],
  "mubarak-al-kabeer": ["Mubarak Al-Kabeer", "محافظة مبارك الكبير", [
    [101,"West Abu Ftaira Herafiya","غرب أبو فطيرة الحرفية"],[102,"Al-Qusour","القصور"],[103,"Abu Ftaira","ضاحية أبو فطيرة"],
    [104,"Al-Fnaitees","الفنيطيس"],[105,"Mubarak Al-Kabeer","مبارك الكبير"],[106,"Al-Adan","العدان"],
    [107,"Subhan Industrial","صبحان الصناعية"],[108,"Sabah Al-Salem","صباح السالم"],[109,"Al-Masayel","المسايل"],
    [110,"Wista","المنطقة الوسطى"]
  ]],
  "ahmadi": ["Ahmadi", "محافظة الأحمدي", [
    [111,"Fahad Al-Ahmad","فهد الأحمد"],[112,"Riqqa","الرقة"],[113,"Hadiya","هدية"],
    [114,"Egaila","العقيلة"],[115,"Sabah Al-Ahmad 5","صباح الأحمد 5"],[116,"Shadadiya Industrial","الشدادية الصناعية"],
    [117,"South Al-Jawakhair","الجنوبية الجواخير"],[118,"Sabahiya","الصباحية"],[119,"Mahboula","المهبولة"],
    [120,"Rajim Khashman","رجم خشمان"],[121,"Zoor","الزور"],[122,"Shalehat Al-Khiran","شاليهات الخيران"],
    [123,"Sabah Al-Ahmad 3","صباح الأحمد 3"],[124,"Wafra Residential","الوفرة السكنية"],[125,"South Sabah Al-Ahmad 8","جنوب صباح الأحمد 8"],
    [126,"South Sabah Al-Ahmad Services","جنوب صباح الأحمد خدمات"],[127,"South Sabah Al-Ahmad 7","جنوب صباح الأحمد 7"],[128,"South Sabah Al-Ahmad","جنوب صباح الأحمد"],
    [129,"South Sabah Al-Ahmad 11","جنوب صباح الأحمد 11"],[130,"South Sabah Al-Ahmad 5","جنوب صباح الأحمد 5"],[131,"South Sabah Al-Ahmad 1","جنوب صباح الأحمد 1"],
    [132,"South Sabah Al-Ahmad 3","جنوب صباح الأحمد 3"],[133,"North Ahmadi","شمال الأحمدي"],[134,"East Ahmadi","شرق الأحمدي"],
    [135,"South Ahmadi","جنوب الأحمدي"],[136,"Wafra","الوفرة"],[137,"Sabah Al-Ahmad 4","صباح الأحمد 4"],
    [138,"Sabah Al-Ahmad Investment","صباح الأحمد استثمارية"],[139,"Fahaheel","الفحيحيل"],[140,"Sabah Al-Ahmad 1","صباح الأحمد 1"],
    [141,"Sabah Al-Ahmad 2","صباح الأحمد 2"],[142,"Shalehat Al-Nuwaiseeb","شاليهات النويصيب"],[143,"Sabah Al-Ahmad Al-Marine","صباح الاحمد البحرية"],
    [144,"Shalehat Zoor","شاليهات الزور"],[145,"Al-Nuwaiseeb","النويصيب"],[146,"East Sabah Al-Ahmad","شرق صباح الاحمد"],
    [147,"South Sabah Al-Ahmad 4","جنوب صباح الأحمد 4"],[148,"South Sabah Al-Ahmad 2","جنوب صباح الأحمد 2"],[149,"South Sabah Al-Ahmad 10","جنوب صباح الأحمد 10"],
    [150,"South Sabah Al-Ahmad 9","جنوب صباح الأحمد 9"],[151,"Middle Ahmadi","وسط الأحمدي"],[152,"Khiran Residential","الخيران السكنية"],
    [153,"Jaber Al-Ali","جابر العلي"],[154,"South Sabahiya","جنوب الصباحية"],[155,"Abu Halifa","أبو حليفة"],
    [156,"Ali Sabah Al-Salem","علي صباح السالم"],[157,"Mina Abdullah Refinery","مصفاة ميناء عبدالله"],[158,"Shalehat Dba'ayeh","شاليهات الضباعية"],
    [159,"Mina Abdullah","ميناء عبدالله"],[160,"Shuaiba Industrial - Western","الشعيبه الصناعيه الغربيه"],[161,"Mina Al-Ahmadi Refinery","مصفاة ميناء الأحمدي"],
    [162,"Kabd Agricultural","كبد الزراعية"],[163,"Shalehat Mina Abdullah","شاليهات ميناء عبدالله"],[164,"Shuaiba Industrial - Eastern","الشعيبة الصناعية الشرقية"],
    [165,"Sabah Al-Ahmad 6","صباح الأحمد 6"],[166,"Mangaf","المنقف"],[167,"Sabah Al-Ahmad Services","صباح الأحمد الخدمية"],
    [168,"South Sabah Al-Ahmad 6","جنوب صباح الأحمد 6"],[169,"Dhaher","الظهر"],[170,"Shalehat Jle'a","شاليهات الجليعة"],
    [171,"Wafra Farms","مزارع الوفرة"],[172,"Al-Fintas","الفنطاس"],[173,"Shalehat Bneder","شاليهات بنيدر"]
  ]],
  "farwaniya": ["Farwaniya", "محافظة الفروانية", [
    [174,"Ardhiya Stores","العارضية مخازن"],[175,"Dajeej","الضجيج"],[176,"Omariya","العمرية"],
    [177,"Rabiya","الرابية"],[178,"Riggai","الرقعي"],[179,"Ashbeliah","أشبيلية"],
    [180,"Farwaniya","الفروانية"],[181,"Andalus","الأندلس"],[182,"Khaitan","خيطان"],
    [183,"Sulaibiya Industrial 3","الصليبية الصناعية 3"],[184,"West Abdullah Al-Mubarak","غرب عبدالله المبارك"],[185,"Shadadiya","الشدادية"],
    [186,"South Abdullah Al-Mubarak","جنوب عبدالله المبارك"],[187,"Sabah Al-Nasser","صباح الناصر"],[188,"Sayhad Al-Awazim","صيهد العوازم"],
    [189,"Ferdous","الفردوس"],[190,"South Khaitan Shows","معارض جنوب خيطان"],[191,"Jleeb Al-Shiyoukh","جليب الشيوخ"],
    [192,"Abdullah Mubarak Al-Sabah","عبدالله مبارك الصباح"],[193,"Airport","المطار"],[194,"Ardhiya Herafiya","العارضية الحرفية"],
    [195,"Rehab","الرحاب"],[196,"Ardiya Government","العارضية حكومي"],[197,"Ardhiya","العارضية"]
  ]]
};
const governorates = Object.entries(D).map(([id, [en, ar, areas]]) => ({
  id, en, ar,
  areas: areas.map(([value, e, a]) => ({ id: String(value), en: e, ar: a }))
}));
const total = governorates.reduce((s, g) => s + g.areas.length, 0);
const counts = governorates.map(g => g.id + ':' + g.areas.length).join(', ');
const allVals = governorates.flatMap(g => g.areas.map(a => Number(a.id)));
const dupes = allVals.filter((v, i) => allVals.indexOf(v) !== i);
const gaps = [];
for (let v = 2; v <= 197; v++) if (!allVals.includes(v)) gaps.push(v);
console.log('total areas:', total, '| per gov:', counts);
console.log('duplicate values:', dupes.length ? dupes : 'none', '| missing in 2..197:', gaps.length ? gaps : 'none');
const body = JSON.stringify({ governorates }, null, 2)
  .split('\n').map((l, i) => (i === 0 ? l : '    ' + l)).join('\n');
const out = `/* ========================================================================
   NASSIM Checkout — Kuwait Governorate → Area reference data
   ------------------------------------------------------------------------
   196 areas across 6 governorates, exactly as provided by the website
   reference (do NOT rename, merge, add, or remove entries here).
     • id   — the original website value (stable internal ID submitted with
              the order; never the displayed text).
     • en/ar — display labels, chosen by the site language.
   Consumed by assets/js/checkout.js (NASSIM_CHECKOUT_LOCATIONS).
   ======================================================================== */
(function () {
  window.NASSIM_CHECKOUT_LOCATIONS = ${body};
})();
`;
fs.writeFileSync(__dirname + '/../public/assets/js/nassim-locations-data.js', out);
console.log('written public/assets/js/nassim-locations-data.js');

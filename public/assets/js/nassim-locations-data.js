/* ========================================================================
   NASSIM Checkout — Kuwait Governorate → Area reference data
   ------------------------------------------------------------------------
   Imported verbatim from "governorate and area to put on site.xlsx"
   (6 governorates, 134 areas — do NOT rename, merge, add, or
   remove entries here; the Excel file is the only source of truth).
     • id   — stable internal ID (slug) submitted with the order; never
              the displayed text.
     • en/ar — display labels, chosen by the site language. The governorate
              row in the Excel has one Latin name, so ar mirrors en there;
              each area carries its own Arabic name from the Excel.
   Consumed by assets/js/checkout.js (NASSIM_CHECKOUT_LOCATIONS).
   ======================================================================== */
(function () {
  window.NASSIM_CHECKOUT_LOCATIONS = {
  governorates: [
    {
      id: "jahra",
      en: "Jahra",
      ar: "الجهراء",
      areas: [
        {
          id: "jahra-1",
          en: "Abdali",
          ar: "العبدلي"
        },
        {
          id: "jahra-2",
          en: "Al-Mutlaa",
          ar: "المطلاع"
        },
        {
          id: "jahra-3",
          en: "Kazma",
          ar: "كاظمة"
        },
        {
          id: "jahra-4",
          en: "Bahra",
          ar: "بحرة"
        },
        {
          id: "jahra-5",
          en: "Kabd",
          ar: "كبد"
        },
        {
          id: "jahra-6",
          en: "Al-Sheqaya",
          ar: "الشقايه"
        },
        {
          id: "jahra-7",
          en: "Al-Nahda",
          ar: "النهضة"
        },
        {
          id: "jahra-8",
          en: "Amghara Industrial",
          ar: "أمغرة"
        },
        {
          id: "jahra-9",
          en: "Bar Al-Jahra",
          ar: "بر الجهراء"
        },
        {
          id: "jahra-10",
          en: "Jahra",
          ar: "الجهراء"
        },
        {
          id: "jahra-11",
          en: "Jahra Industrial Herafiya",
          ar: "الجهراء الصناعية الحرفية"
        },
        {
          id: "jahra-12",
          en: "Naeem",
          ar: "النعيم"
        },
        {
          id: "jahra-13",
          en: "Nasseem",
          ar: "النسيم"
        },
        {
          id: "jahra-14",
          en: "Oyoun",
          ar: "العيون"
        },
        {
          id: "jahra-15",
          en: "Qasr",
          ar: "القصر"
        },
        {
          id: "jahra-16",
          en: "Jaber Al-Ahmad",
          ar: "جابر الأحمد"
        },
        {
          id: "jahra-17",
          en: "Saad Al Abdullah",
          ar: "سعد العبدالله"
        },
        {
          id: "jahra-18",
          en: "Salmi",
          ar: "السالمي"
        },
        {
          id: "jahra-19",
          en: "Subiya",
          ar: "الصبية"
        },
        {
          id: "jahra-20",
          en: "Sulaibiya",
          ar: "الصليبية"
        },
        {
          id: "jahra-21",
          en: "Sulaibiya Agricultural Area",
          ar: "الصليبية الزراعية"
        },
        {
          id: "jahra-22",
          en: "Sulaibiya Residential",
          ar: "الصليبية السكنية"
        },
        {
          id: "jahra-23",
          en: "Taima",
          ar: "تيماء"
        },
        {
          id: "jahra-24",
          en: "Waha",
          ar: "الواحة"
        }
      ]
    },
    {
      id: "farwaniya",
      en: "Farwaniya",
      ar: "الفروانية",
      areas: [
        {
          id: "farwaniya-1",
          en: "Abdullah Al-Mubarak",
          ar: "عبدالله المبارك"
        },
        {
          id: "farwaniya-2",
          en: "Airport District",
          ar: "منطقة المطار"
        },
        {
          id: "farwaniya-3",
          en: "Andalus",
          ar: "الأندلس"
        },
        {
          id: "farwaniya-4",
          en: "Ardiya",
          ar: "العارضية"
        },
        {
          id: "farwaniya-5",
          en: "Ardiya Herafiya",
          ar: "العارضية حرفية"
        },
        {
          id: "farwaniya-6",
          en: "Ishbiliya",
          ar: "اشبيلية"
        },
        {
          id: "farwaniya-7",
          en: "Al-Dajeej",
          ar: "الضجيج"
        },
        {
          id: "farwaniya-8",
          en: "Farwaniya",
          ar: "الفروانية"
        },
        {
          id: "farwaniya-9",
          en: "Ferdous",
          ar: "الفردوس"
        },
        {
          id: "farwaniya-10",
          en: "Jleeb Al-Shuyoukh",
          ar: "جليب الشيوخ"
        },
        {
          id: "farwaniya-11",
          en: "Khaitan",
          ar: "خيطان"
        },
        {
          id: "farwaniya-12",
          en: "Omariya",
          ar: "العمرية"
        },
        {
          id: "farwaniya-13",
          en: "Rabiya",
          ar: "الرابية"
        },
        {
          id: "farwaniya-14",
          en: "Al-Rai",
          ar: "الري"
        },
        {
          id: "farwaniya-15",
          en: "Al-Riggai",
          ar: "الرقعي"
        },
        {
          id: "farwaniya-16",
          en: "Rehab",
          ar: "الرحاب"
        },
        {
          id: "farwaniya-17",
          en: "Sabah Al-Nasser",
          ar: "صباح الناصر"
        },
        {
          id: "farwaniya-18",
          en: "Sabah Al-Salem University",
          ar: "جامعة صباح السالم"
        },
        {
          id: "farwaniya-19",
          en: "West Abdullah Al-Mubarak",
          ar: "غرب عبدالله المبارك"
        },
        {
          id: "farwaniya-20",
          en: "South Abdullah Al-Mubarak",
          ar: "جنوب عبدالله المبارك"
        },
        {
          id: "farwaniya-21",
          en: "Sulaibiya Industrial",
          ar: "الصليبية الصناعية"
        }
      ]
    },
    {
      id: "ahmadi",
      en: "Ahmadi",
      ar: "الأحمدي",
      areas: [
        {
          id: "ahmadi-1",
          en: "Abu Halifa",
          ar: "أبو حليفة"
        },
        {
          id: "ahmadi-2",
          en: "Mina Abdulla",
          ar: "ميناء عبد الله"
        },
        {
          id: "ahmadi-3",
          en: "Ahmadi",
          ar: "الأحمدي"
        },
        {
          id: "ahmadi-4",
          en: "Ali Sabah Al-Salem",
          ar: "علي صباح السالم"
        },
        {
          id: "ahmadi-5",
          en: "Egaila",
          ar: "العقيلة"
        },
        {
          id: "ahmadi-6",
          en: "Bar Al-Ahmadi",
          ar: "بر الأحمدي"
        },
        {
          id: "ahmadi-7",
          en: "Bnaider",
          ar: "بنيدر"
        },
        {
          id: "ahmadi-8",
          en: "Dhaher",
          ar: "الظهر"
        },
        {
          id: "ahmadi-9",
          en: "Fahaheel",
          ar: "الفحيحيل"
        },
        {
          id: "ahmadi-10",
          en: "Fahad Al-Ahmad",
          ar: "فهد الأحمد"
        },
        {
          id: "ahmadi-11",
          en: "Hadiya",
          ar: "هدية"
        },
        {
          id: "ahmadi-12",
          en: "Jaber Al-Ali",
          ar: "جابر العلي"
        },
        {
          id: "ahmadi-13",
          en: "Al-Julaia'a",
          ar: "الجليعة"
        },
        {
          id: "ahmadi-14",
          en: "Khairan",
          ar: "الخيران"
        },
        {
          id: "ahmadi-15",
          en: "Mahboula",
          ar: "المهبولة"
        },
        {
          id: "ahmadi-16",
          en: "Mangaf",
          ar: "المنقف"
        },
        {
          id: "ahmadi-17",
          en: "Magwa",
          ar: "المقوع"
        },
        {
          id: "ahmadi-18",
          en: "Wafra Residential",
          ar: "وفرة السكنية"
        },
        {
          id: "ahmadi-19",
          en: "Al-Nuwaiseeb",
          ar: "النويصيب"
        },
        {
          id: "ahmadi-20",
          en: "Riqqa",
          ar: "الرقة"
        },
        {
          id: "ahmadi-21",
          en: "Sabah Al Ahmad",
          ar: "صباح الاحمد"
        },
        {
          id: "ahmadi-22",
          en: "Sabah Al Ahmad Sea City",
          ar: "مدينة صباح الأحمد البحرية"
        },
        {
          id: "ahmadi-23",
          en: "Sabahiya",
          ar: "الصباحية"
        },
        {
          id: "ahmadi-24",
          en: "Shuaiba Industrial",
          ar: "الشعيبة"
        },
        {
          id: "ahmadi-25",
          en: "South Sabahiya",
          ar: "جنوب الصباحية"
        },
        {
          id: "ahmadi-26",
          en: "Wafra",
          ar: "الوفرة"
        },
        {
          id: "ahmadi-27",
          en: "Zoor",
          ar: "الزور"
        },
        {
          id: "ahmadi-28",
          en: "Fintas",
          ar: "الفنطاس"
        },
        {
          id: "ahmadi-29",
          en: "Al Shadadiya Industrial",
          ar: "الشدادية الصناعية"
        }
      ]
    },
    {
      id: "mubarak-al-kabeer",
      en: "Mubarak Al-Kabeer",
      ar: "مبارك الكبير",
      areas: [
        {
          id: "mubarak-al-kabeer-1",
          en: "Abu Al Hasaniya",
          ar: "أبو الحصانية"
        },
        {
          id: "mubarak-al-kabeer-2",
          en: "Abu Ftaira",
          ar: "أبو فطيرة"
        },
        {
          id: "mubarak-al-kabeer-3",
          en: "Al-Adan",
          ar: "العدان"
        },
        {
          id: "mubarak-al-kabeer-4",
          en: "Al Qurain",
          ar: "القرين"
        },
        {
          id: "mubarak-al-kabeer-5",
          en: "Al-Qusour",
          ar: "القصور"
        },
        {
          id: "mubarak-al-kabeer-6",
          en: "Al-Fnaitees",
          ar: "الفنيطيس"
        },
        {
          id: "mubarak-al-kabeer-7",
          en: "Messila",
          ar: "المسيلة"
        },
        {
          id: "mubarak-al-kabeer-8",
          en: "Al-Masayel",
          ar: "المسايل"
        },
        {
          id: "mubarak-al-kabeer-9",
          en: "Mubarak Al-Kabeer",
          ar: "مبارك الكبير"
        },
        {
          id: "mubarak-al-kabeer-10",
          en: "Sabah Al-Salem",
          ar: "صباح السالم"
        },
        {
          id: "mubarak-al-kabeer-11",
          en: "Subhan Industrial",
          ar: "صبحان"
        },
        {
          id: "mubarak-al-kabeer-12",
          en: "Wista",
          ar: "الوسطى"
        },
        {
          id: "mubarak-al-kabeer-13",
          en: "West Abu Ftaira Herafiya",
          ar: "غرب ابو فطيرة حرفية"
        }
      ]
    },
    {
      id: "hawalli",
      en: "Hawalli",
      ar: "حولي",
      areas: [
        {
          id: "hawalli-1",
          en: "Bayan",
          ar: "بيان"
        },
        {
          id: "hawalli-2",
          en: "Jabriya",
          ar: "الجابرية"
        },
        {
          id: "hawalli-3",
          en: "Rumaithiya",
          ar: "الرميثية"
        },
        {
          id: "hawalli-4",
          en: "Salam",
          ar: "سلام"
        },
        {
          id: "hawalli-5",
          en: "Salwa",
          ar: "سلوى"
        },
        {
          id: "hawalli-6",
          en: "Al- Bida'a",
          ar: "البدع"
        },
        {
          id: "hawalli-7",
          en: "Anjafa",
          ar: "أنجفة"
        },
        {
          id: "hawalli-8",
          en: "Hawally",
          ar: "حولي"
        },
        {
          id: "hawalli-9",
          en: "Hitteen",
          ar: "حطين"
        },
        {
          id: "hawalli-10",
          en: "Mishrif",
          ar: "مشرف"
        },
        {
          id: "hawalli-11",
          en: "Mubarak Al-Abdullah",
          ar: "مبارك العبدالله"
        },
        {
          id: "hawalli-12",
          en: "Salmiya",
          ar: "السالمية"
        },
        {
          id: "hawalli-13",
          en: "Shaab",
          ar: "الشعب"
        },
        {
          id: "hawalli-14",
          en: "Shuhada",
          ar: "الشهداء"
        },
        {
          id: "hawalli-15",
          en: "Al-Siddiq",
          ar: "الصديق"
        },
        {
          id: "hawalli-16",
          en: "Ministries Area",
          ar: "منطقة الوزارات"
        },
        {
          id: "hawalli-17",
          en: "Zahra",
          ar: "الزهراء"
        }
      ]
    },
    {
      id: "capital",
      en: "Asimah",
      ar: "العاصمة",
      areas: [
        {
          id: "capital-1",
          en: "Abdullah Al-Salem",
          ar: "ضاحية عبد الله السالم"
        },
        {
          id: "capital-2",
          en: "Adailiya",
          ar: "العديلية"
        },
        {
          id: "capital-3",
          en: "Al-Sour Gardens",
          ar: "حدائق السور"
        },
        {
          id: "capital-4",
          en: "Bneid Al-Gar",
          ar: "بنيد القار"
        },
        {
          id: "capital-5",
          en: "Daiya",
          ar: "الدعية"
        },
        {
          id: "capital-6",
          en: "Dasma",
          ar: "الدسمة"
        },
        {
          id: "capital-7",
          en: "Doha",
          ar: "الدوحة"
        },
        {
          id: "capital-8",
          en: "Doha Port",
          ar: "ميناء الدوحة"
        },
        {
          id: "capital-9",
          en: "Faiha",
          ar: "الفيحاء"
        },
        {
          id: "capital-10",
          en: "Granada",
          ar: "غرناطة"
        },
        {
          id: "capital-11",
          en: "Jibla",
          ar: "جِبْلَة"
        },
        {
          id: "capital-12",
          en: "Kaifan",
          ar: "كيفان"
        },
        {
          id: "capital-13",
          en: "Khaldiya",
          ar: "الخالدية"
        },
        {
          id: "capital-14",
          en: "Mansouriya",
          ar: "المنصورية"
        },
        {
          id: "capital-15",
          en: "Mirqab",
          ar: "المرقاب"
        },
        {
          id: "capital-16",
          en: "Nahdha",
          ar: "النهضة"
        },
        {
          id: "capital-17",
          en: "North West Sulaibikhat",
          ar: "شمال غرب الصليبيخات"
        },
        {
          id: "capital-18",
          en: "Nuzha",
          ar: "النزهة"
        },
        {
          id: "capital-19",
          en: "Qadsiya",
          ar: "القادسية"
        },
        {
          id: "capital-20",
          en: "Qortuba",
          ar: "قرطبة"
        },
        {
          id: "capital-21",
          en: "Rawda",
          ar: "الروضة"
        },
        {
          id: "capital-22",
          en: "Shamiya",
          ar: "الشامية"
        },
        {
          id: "capital-23",
          en: "Sharq",
          ar: "شرق"
        },
        {
          id: "capital-24",
          en: "Shuwaikh",
          ar: "الشويخ"
        },
        {
          id: "capital-25",
          en: "Shuwaikh Industrial Area",
          ar: "الشويخ الصناعية"
        },
        {
          id: "capital-26",
          en: "Shuwaikh Port",
          ar: "ميناء الشويخ"
        },
        {
          id: "capital-27",
          en: "Sulaibikhat",
          ar: "الصليبخات"
        },
        {
          id: "capital-28",
          en: "Qairawan",
          ar: "القيروان"
        },
        {
          id: "capital-29",
          en: "Surra",
          ar: "السرة"
        },
        {
          id: "capital-30",
          en: "Yarmouk",
          ar: "اليرموك"
        }
      ]
    }
  ]
};
})();

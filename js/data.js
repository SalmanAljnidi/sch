
const STAGES = [
  { id:"prim_general", name:"الابتدائي (تعليم عام)" },
  { id:"prim_tahfeez", name:"الابتدائي (تحفيظ قرآن)" },
  { id:"mid_general", name:"المتوسطة (تعليم عام)" },
  { id:"mid_tahfeez", name:"المتوسطة (تحفيظ قرآن)" },
];

const SPEC_OPTIONS = [
  "تربية إسلامية/قرآن",
  "لغة عربية",
  "رياضيات",
  "علوم",
  "لغة إنجليزية",
  "دراسات اجتماعية",
  "مهارات رقمية",
  "تربية فنية",
  "تربية بدنية",
  "مهارات حياتية",
  "تفكير ناقد"
];

const DAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس"];

function dayLengthsForTotal(total){
  if(total===33) return [7,7,7,6,6];
  return [7,7,7,7,7];
}

const SUBJECTS = {
  ISLAMIC:"القرآن والدراسات الإسلامية",
  TAJWEED:"التجويد",
  ARABIC:"اللغة العربية",
  MATH:"الرياضيات",
  SCIENCE:"العلوم",
  ENGLISH:"اللغة الإنجليزية",
  SOCIAL:"الدراسات الاجتماعية",
  DIGITAL:"المهارات الرقمية",
  ART:"التربية الفنية",
  PE:"التربية البدنية",
  LIFE:"المهارات الحياتية",
  CRIT:"التفكير الناقد",
  ACTIVITY:"النشاط",
	STANDBY:"انتظار",
	FILLER:"نشاط/مراجعة"
};

const CURRICULUM = {
  prim_general: {
    "1": { total:33, hours:{ [SUBJECTS.ISLAMIC]:5, [SUBJECTS.ARABIC]:8, [SUBJECTS.MATH]:5, [SUBJECTS.SCIENCE]:3, [SUBJECTS.ENGLISH]:3, [SUBJECTS.ART]:2, [SUBJECTS.PE]:3, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:3 } },
    "2": { total:33, hours:{ [SUBJECTS.ISLAMIC]:5, [SUBJECTS.ARABIC]:7, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:3, [SUBJECTS.ENGLISH]:3, [SUBJECTS.ART]:2, [SUBJECTS.PE]:3, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:3 } },
    "3": { total:33, hours:{ [SUBJECTS.ISLAMIC]:5, [SUBJECTS.ARABIC]:6, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:3, [SUBJECTS.ART]:2, [SUBJECTS.PE]:3, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:3 } },
    "4": { total:33, hours:{ [SUBJECTS.ISLAMIC]:5, [SUBJECTS.ARABIC]:5, [SUBJECTS.SOCIAL]:2, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:3, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:1, [SUBJECTS.PE]:2, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:2 } },
    "5": { total:33, hours:{ [SUBJECTS.ISLAMIC]:5, [SUBJECTS.ARABIC]:5, [SUBJECTS.SOCIAL]:2, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:3, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:1, [SUBJECTS.PE]:2, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:2 } },
    "6": { total:33, hours:{ [SUBJECTS.ISLAMIC]:5, [SUBJECTS.ARABIC]:5, [SUBJECTS.SOCIAL]:2, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:3, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:1, [SUBJECTS.PE]:2, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:2 } },
  },
  prim_tahfeez: {
    "1": { total:35, hours:{ [SUBJECTS.ISLAMIC]:9, [SUBJECTS.ARABIC]:8, [SUBJECTS.MATH]:5, [SUBJECTS.SCIENCE]:3, [SUBJECTS.ENGLISH]:3, [SUBJECTS.ART]:2, [SUBJECTS.PE]:3, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:1 } },
    "2": { total:35, hours:{ [SUBJECTS.ISLAMIC]:9, [SUBJECTS.ARABIC]:7, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:3, [SUBJECTS.ENGLISH]:3, [SUBJECTS.ART]:2, [SUBJECTS.PE]:3, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:1 } },
    "3": { total:35, hours:{ [SUBJECTS.ISLAMIC]:9, [SUBJECTS.ARABIC]:6, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:3, [SUBJECTS.ART]:2, [SUBJECTS.PE]:3, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:1 } },
    "4": { total:35, hours:{ [SUBJECTS.ISLAMIC]:8, [SUBJECTS.TAJWEED]:1, [SUBJECTS.ARABIC]:5, [SUBJECTS.SOCIAL]:2, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:3, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:1, [SUBJECTS.PE]:2, [SUBJECTS.LIFE]:1 } },
    "5": { total:35, hours:{ [SUBJECTS.ISLAMIC]:8, [SUBJECTS.TAJWEED]:1, [SUBJECTS.ARABIC]:5, [SUBJECTS.SOCIAL]:2, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:3, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:1, [SUBJECTS.PE]:2, [SUBJECTS.LIFE]:1 } },
    "6": { total:35, hours:{ [SUBJECTS.ISLAMIC]:8, [SUBJECTS.TAJWEED]:1, [SUBJECTS.ARABIC]:5, [SUBJECTS.SOCIAL]:2, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:3, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:1, [SUBJECTS.PE]:2, [SUBJECTS.LIFE]:1 } },
  },
  mid_general: {
    "1": { total:35, hours:{ [SUBJECTS.ISLAMIC]:5, [SUBJECTS.ARABIC]:5, [SUBJECTS.SOCIAL]:3, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:4, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:2, [SUBJECTS.PE]:2, [SUBJECTS.LIFE]:1, [SUBJECTS.CRIT]:2, [SUBJECTS.ACTIVITY]:1 } },
    "2": { total:35, hours:{ [SUBJECTS.ISLAMIC]:5, [SUBJECTS.ARABIC]:5, [SUBJECTS.SOCIAL]:3, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:4, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:2, [SUBJECTS.PE]:2, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:1 } },
    "3": { total:35, hours:{ [SUBJECTS.ISLAMIC]:5, [SUBJECTS.ARABIC]:4, [SUBJECTS.SOCIAL]:2, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:4, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:2, [SUBJECTS.PE]:2, [SUBJECTS.LIFE]:1, [SUBJECTS.ACTIVITY]:1 } },
  },
  mid_tahfeez: {
    "1": { total:35, hours:{ [SUBJECTS.ISLAMIC]:8, [SUBJECTS.TAJWEED]:1, [SUBJECTS.ARABIC]:5, [SUBJECTS.SOCIAL]:2, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:4, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:1, [SUBJECTS.PE]:1, [SUBJECTS.LIFE]:1, [SUBJECTS.CRIT]:2 } },
    "2": { total:35, hours:{ [SUBJECTS.ISLAMIC]:8, [SUBJECTS.TAJWEED]:1, [SUBJECTS.ARABIC]:5, [SUBJECTS.SOCIAL]:2, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:4, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:1, [SUBJECTS.PE]:1, [SUBJECTS.LIFE]:1 } },
    "3": { total:35, hours:{ [SUBJECTS.ISLAMIC]:7, [SUBJECTS.TAJWEED]:1, [SUBJECTS.ARABIC]:4, [SUBJECTS.SOCIAL]:2, [SUBJECTS.MATH]:6, [SUBJECTS.SCIENCE]:4, [SUBJECTS.ENGLISH]:4, [SUBJECTS.DIGITAL]:2, [SUBJECTS.ART]:1, [SUBJECTS.PE]:1, [SUBJECTS.LIFE]:1 } },
  }
};

const SUBJECT_PREFS = {
  [SUBJECTS.ISLAMIC]: ["تربية إسلامية/قرآن"],
  [SUBJECTS.TAJWEED]: ["تربية إسلامية/قرآن"],
  [SUBJECTS.ARABIC]: ["لغة عربية"],
  [SUBJECTS.MATH]: ["رياضيات"],
  [SUBJECTS.SCIENCE]: ["علوم"],
  [SUBJECTS.ENGLISH]: ["لغة إنجليزية"],
  [SUBJECTS.SOCIAL]: ["دراسات اجتماعية"],
  [SUBJECTS.DIGITAL]: ["مهارات رقمية"],
  [SUBJECTS.ART]: ["تربية فنية"],
  [SUBJECTS.PE]: ["تربية بدنية"],
  [SUBJECTS.LIFE]: ["دراسات اجتماعية","لغة عربية","مهارات حياتية"],
  [SUBJECTS.CRIT]: ["لغة عربية","دراسات اجتماعية","تفكير ناقد"],
  [SUBJECTS.ACTIVITY]: ["تربية بدنية","تربية فنية","لغة عربية","دراسات اجتماعية"]
};

const CONSTRAINTS = {
  noConsecutive: new Set([SUBJECTS.MATH]),
  maxConsecutive2: new Set([SUBJECTS.ISLAMIC, SUBJECTS.DIGITAL]),
  noRepeatIfWeeklyLE5: true,
};

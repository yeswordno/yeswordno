// Uygunsuz takma ad filtresi. İki katman ("Scunthorpe" yanlış-pozitifini önler):
//   SUBSTRING → uzun/net küfür kökleri; nick'in HERHANGİ yerinde geçerse engel.
//   EXACT     → kısa kelimeler (mal, sik, got…); SADECE nick'in tamamı buysa engel
//               (yoksa normal/kemal/klasik/moda gibi masum adlar yanlışlıkla engellenir).
// Normalize: küçük harf (tr) + boşluk/işaret temizleme + basit leetspeak çözme.

const SUBSTRING = [
  // TR
  'siktir', 'sikis', 'sikeyim', 'sokeyim', 'orospu', 'oruspu', 'orospu', 'amcik', 'amcık',
  'amina', 'amına', 'yarrak', 'yarak', 'gotveren', 'götveren', 'kahpe', 'gavat', 'gavad',
  'puşt', 'pust', 'ibne', 'fahişe', 'fahise', 'kerhane', 'taşak', 'tasak', 'piçkur', 'pezeveng',
  'pezevenk', 'oçocugu', 'ananı', 'anani', 'amınak', 'aminak', 'sikik', 'sikti',
  // EN
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'asshole', 'nigger', 'nigga',
  'slut', 'whore', 'rape', 'pedo', 'porn', 'vajina', 'penis', 'nazi', 'hitler',
  'administrator', 'moderator',
];

// Tam-eşleşme (normalize edilmiş nick == bu) — kısa ve gömülü olabilecek kelimeler.
const EXACT = [
  'amk', 'amq', 'aq', 'mk', 'sik', 'sok', 'got', 'göt', 'mal', 'oç', 'oc', 'piç', 'pic',
  'ibo', 'meme', 'sex', 'seks', 'mod', 'admin', 'bok', 'am', 'sg', 'oç', 'pust', 'göt',
  'sistem', 'system', 'yetkili', 'destek', 'support',
];

function normalize(s) {
  return String(s)
    .toLocaleLowerCase('tr-TR')
    .replace(/[\s._\-*]+/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a')
    .replace(/5/g, 's').replace(/7/g, 't').replace(/@/g, 'a').replace(/\$/g, 's');
}

export function isOffensive(nick) {
  const n = normalize(nick);
  if (!n) return false;
  if (EXACT.includes(n)) return true;
  return SUBSTRING.some(w => n.includes(w));
}

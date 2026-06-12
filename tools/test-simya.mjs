// Geçici test — simyaLogic saf fonksiyon doğrulaması
import fs from 'fs';
import {
  buildIndex, matchCombo, familyOf, familyMap, rankOf, unlockedTiers,
  computeDailyScore, normalizeState,
} from '../src/utils/simyaLogic.js';

const data = JSON.parse(fs.readFileSync('./src/data/simya.json', 'utf8'));
const idx = buildIndex(data);
let pass = true;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) pass = false; };

// Sıralı eşleşme
ok(matchCombo(idx, ['ex', 'port_r'])?.en === 'EXPORT', 'EX+PORT → EXPORT');
ok(matchCombo(idx, ['port_r', 'ex']) === null, 'PORT+EX → reddedilir (sıra önemli)');
ok(matchCombo(idx, ['sun', 'flower'])?.en === 'SUNFLOWER', 'SUN+FLOWER → SUNFLOWER');
ok(matchCombo(idx, ['in_pre', 'spect', 'or'])?.en === 'INSPECTOR', '3 parça: IN+SPECT+OR → INSPECTOR');
ok(matchCombo(idx, ['sun']) === null, 'tek parça → null');

// Aile
ok(familyOf(idx, idx.comboByEn.get('EXPORT')).label === 'PORT', 'EXPORT ailesi PORT (kök)');
ok(familyOf(idx, idx.comboByEn.get('SUNFLOWER')).label === 'SUN', 'SUNFLOWER ailesi SUN (ilk parça)');
const fams = familyMap(data, idx);
const portFam = fams.get('port_r');
ok(portFam && portFam.combos.length >= 4, `PORT ailesi ${portFam?.combos.length} kelime`);

// Rütbe + tier kilidi
ok(rankOf(0).key === 'cirak' && rankOf(20).key === 'kalfa' && rankOf(50).key === 'usta', 'rütbe eşikleri 0/20/50');
ok(JSON.stringify(unlockedTiers(0)) === '[1]' && JSON.stringify(unlockedTiers(25)) === '[1,2]' && JSON.stringify(unlockedTiers(60)) === '[1,2,3]', 'tier kilidi');

// Skor
ok(computeDailyScore({ found: 8, total: 8, bonus: 3, hintsOpened: 0 }) === 100, 'tam: 8/8 + 3 bonus + ipucusuz = 100');
ok(computeDailyScore({ found: 4, total: 8, bonus: 0, hintsOpened: 8 }) === 35, '4/8, hepsi ipucu açık = 35');
ok(computeDailyScore({ found: 0, total: 0, bonus: 0, hintsOpened: 0 }) === 0, 'hedef yoksa 0');

// Bütünlük: tüm combo parçaları pieces'te var
const pieceIds = new Set(data.pieces.map(p => p.id));
const orphan = data.combos.filter(c => c.parts.some(p => !pieceIds.has(p)));
ok(orphan.length === 0, `tüm combo parçaları pieces'te (orphan ${orphan.length})`);

// normalizeState bozuk veriye dayanıklı
ok(normalizeState(null).discovered && normalizeState('bozuk').sfx === true, 'normalizeState bozuk veriye dayanıklı');

console.log(pass ? '\nTÜMÜ GEÇTİ' : '\nBAŞARISIZ');
process.exit(pass ? 0 : 1);

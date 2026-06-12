// ⚗️ KELİME SİMYACISI — anlam parçalarını kazanda birleştirerek kelime ÜRET.
// İki alt mod: Günlük Kazan (leaderboard'lu, cron üretimli) + Serbest Atölye
// (keşif/koleksiyon). Üç rütbe: Çırak → Kalfa → Usta. Veri: src/data/simya.json.
import { useState, useEffect, useMemo, useRef } from 'react';
import './SimyaGame.css';
import simyaData from './data/simya.json';
import { submitScore } from './utils/leaderboard';
import { bubble, poof, sfxEnabled, setSfxEnabled } from './utils/sfx';
import { Cauldron, PieceCard, DiscoveryCard, Codex } from './SimyaStage';
import {
  buildIndex, matchCombo, rankOf, unlockedTiers, computeDailyScore,
  randomQuip, loadSimya, saveSimya, discoveredCount,
} from './utils/simyaLogic';

const INTRO_KEY = 'simyaIntroSeen';
const MAX_SLOTS = 3;

const STORY = [
  { icon: '⚗️', text: 'Kelimeler harflerden yapılmaz. Anlam parçalarından yapılır.' },
  { icon: '✨', text: 'Bu atölyede onları üreteceksin. Bazen parçalar toplamından fazlasına dönüşür… (GIVE + UP → vazgeçmek!)' },
  { icon: '🔥', text: 'Çıraklıktan ustalığa: birleşikler → phrasal\'lar → kadim kökler. Kazan hazır.' },
];

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

const SimyaGame = ({ onBack } = {}) => {
  const index = useMemo(() => buildIndex(simyaData), []);
  const [state, setState] = useState(loadSimya);
  const discCount = discoveredCount(state);
  const rank = rankOf(discCount);

  const [screen, setScreen] = useState(() =>
    localStorage.getItem(INTRO_KEY) ? 'home' : 'story'
  );
  const [storyPage, setStoryPage] = useState(0);
  const [sfxOn, setSfxOn] = useState(sfxEnabled());
  const [codexOpen, setCodexOpen] = useState(false);

  // Kazan ortak durumu
  const [slots, setSlots] = useState([null, null, null]);
  const [discovery, setDiscovery] = useState(null);   // { combo, bonus, collected }
  const [shake, setShake] = useState(false);
  const [quip, setQuip] = useState('');

  // Günlük kazan durumu
  const [daily, setDaily] = useState(null);           // { id, pieces, targets }
  const [dailyErr, setDailyErr] = useState(false);
  const [found, setFound] = useState([]);             // bulunan target en[]
  const [bonusCount, setBonusCount] = useState(0);
  const [openedHints, setOpenedHints] = useState([]); // açılan hint index'leri
  const [dailyScore, setDailyScore] = useState(null);
  const foundRef = useRef([]);

  const today = todayStr();
  const alreadyDone = state.dailyDone[today];

  // Günlük puzzle'ı çek
  useEffect(() => {
    if (screen !== 'daily') return;
    setDailyErr(false);
    fetch(`/puzzles/simya/daily-${today}.json`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => fetch('/puzzles/daily-simya.json', { cache: 'no-store' }).then(r => r.json()))
      .then(p => { setDaily(p); resetCauldron(); })
      .catch(() => setDailyErr(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const resetCauldron = () => setSlots([null, null, null]);

  const persist = (next) => { setState(next); saveSimya(next); };

  // Parçayı kazana koy (ilk boş yuvaya)
  const addToSlot = (pid) => {
    setSlots(prev => {
      const i = prev.indexOf(null);
      if (i === -1) return prev;
      const next = [...prev]; next[i] = pid; return next;
    });
  };
  const clearSlot = (i) => setSlots(prev => { const n = [...prev]; n[i] = null; return n; });
  const swapSlots = () => setSlots(prev => {
    const filled = prev.filter(Boolean);
    if (filled.length < 2) return prev;
    const n = [...prev];[n[0], n[1]] = [n[1], n[0]]; return n;
  });

  const slotPartIds = slots.filter(Boolean);
  const canBoil = slotPartIds.length >= 2;

  // Kaynat → değerlendir
  const boil = (mode) => {
    const combo = matchCombo(index, slotPartIds);
    if (!combo) {
      poof(); setShake(true); setQuip(randomQuip());
      setTimeout(() => setShake(false), 500);
      return;
    }
    bubble();
    const firstTime = !state.discovered[combo.en];
    if (firstTime) persist({ ...state, discovered: { ...state.discovered, [combo.en]: today } });

    if (mode === 'daily' && daily) {
      const isTarget = daily.targets.some(t => t.en === combo.en);
      const alreadyFound = foundRef.current.includes(combo.en);
      if (isTarget && !alreadyFound) {
        foundRef.current = [...foundRef.current, combo.en];
        setFound(foundRef.current);
      } else if (!isTarget && firstTime) {
        setBonusCount(b => b + 1);
        setDiscovery({ combo, bonus: true, collected: false });
        resetCauldron();
        return;
      }
    }
    setDiscovery({ combo, bonus: false, collected: !firstTime && isInCollection(combo.en) });
    resetCauldron();
  };

  function isInCollection(en) {
    try {
      const col = JSON.parse(localStorage.getItem('wordHunter_collection') || '{}');
      return (col.known || []).some(w => w.en === en) || (col.review || []).some(w => w.en === en);
    } catch { return false; }
  }

  // Keşfi koleksiyona ekle (known)
  const collectToCollection = () => {
    if (!discovery) return;
    const combo = discovery.combo;
    try {
      const col = JSON.parse(localStorage.getItem('wordHunter_collection') || '{"known":[],"review":[]}');
      col.known = col.known || []; col.review = col.review || [];
      if (!col.known.some(w => w.en === combo.en) && !col.review.some(w => w.en === combo.en)) {
        col.known.push({ en: combo.en, tr: combo.tr });
        localStorage.setItem('wordHunter_collection', JSON.stringify(col));
      }
    } catch { /* yok say */ }
    setDiscovery(d => ({ ...d, collected: true }));
  };

  // Günlük kazanı bitir → skor
  const finishDaily = () => {
    const score = computeDailyScore({
      found: foundRef.current.length,
      total: daily.targets.length,
      bonus: bonusCount,
      hintsOpened: openedHints.length,
    });
    setDailyScore(score);
    persist({ ...state, dailyDone: { ...state.dailyDone, [today]: score } });
    submitScore('simya', 'daily', score);   // kayıtsızsa sessiz atlar
  };

  // Tüm hedefler bulununca otomatik bitir
  useEffect(() => {
    if (screen === 'daily' && daily && found.length === daily.targets.length && dailyScore === null && !alreadyDone) {
      finishDaily();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, daily]);

  const toggleHint = (i) => setOpenedHints(prev => prev.includes(i) ? prev : [...prev, i]);

  // Tezgâhtaki parçalar
  const dailyPieces = useMemo(() =>
    daily ? daily.pieces.map(id => index.pieceById.get(id)).filter(Boolean) : [],
  [daily, index]);
  const freePieces = useMemo(() => {
    const tiers = new Set(unlockedTiers(discCount));
    return simyaData.pieces.filter(p => tiers.has(p.tier));
  }, [discCount]);

  // ─────────────────────────── RENDER ───────────────────────────
  return (
    <div className="simya-root">
      <button className="simya-back" onClick={screen === 'home' ? onBack : () => setScreen('home')}>
        ← {screen === 'home' ? 'Menü' : 'Atölye'}
      </button>
      {screen !== 'story' && (
        <button className="simya-codexbtn" onClick={() => setCodexOpen(true)}>📜 Kodeks</button>
      )}

      {/* HİKÂYE GİRİŞİ */}
      {screen === 'story' && (
        <div className="simya-screen simya-story">
          <div className="simya-story-icon">{STORY[storyPage].icon}</div>
          <p className="simya-story-text">{STORY[storyPage].text}</p>
          <div className="simya-dots">{STORY.map((_, i) => <span key={i} className={i === storyPage ? 'dot active' : 'dot'} />)}</div>
          {storyPage < STORY.length - 1
            ? <button className="simya-btn" onClick={() => setStoryPage(p => p + 1)}>Devam</button>
            : <button className="simya-btn" onClick={() => { localStorage.setItem(INTRO_KEY, '1'); setScreen('home'); }}>Kazanı Yak 🔥</button>}
        </div>
      )}

      {/* ANA EKRAN */}
      {screen === 'home' && (
        <div className="simya-screen simya-home">
          <h1 className="simya-title">⚗️ Kelime Simyacısı</h1>
          <div className="simya-rank">Rütbe: <b>{rank.label}</b> · {discCount} keşif</div>
          <button className="simya-door" onClick={() => { setScreen('daily'); resetDailyRun(); }}>
            <span className="simya-door-ic">🔥</span>
            <span className="simya-door-txt"><b>Günlük Kazan</b><small>{alreadyDone != null ? `Bugün: ${alreadyDone} puan` : 'Bugünün gizli kelimelerini bul'}</small></span>
          </button>
          <button className="simya-door" onClick={() => { setScreen('free'); resetCauldron(); }}>
            <span className="simya-door-ic">🧪</span>
            <span className="simya-door-txt"><b>Serbest Atölye</b><small>Kodeksi doldur, kelime üret</small></span>
          </button>
          <button className="simya-sfxtoggle" onClick={() => { const n = !sfxOn; setSfxEnabled(n); setSfxOn(n); }}>
            {sfxOn ? '🔊 Ses açık' : '🔇 Ses kapalı'}
          </button>
          <button className="simya-storybtn" onClick={() => { setStoryPage(0); setScreen('story'); }}>📖 Hikâye</button>
        </div>
      )}

      {/* GÜNLÜK KAZAN */}
      {screen === 'daily' && (
        <div className="simya-screen simya-play">
          {dailyErr ? (
            <div className="simya-conn">📡 Günlük kazan yüklenemedi. <button className="simya-mini-btn" onClick={() => setScreen('home')}>Geri</button></div>
          ) : (alreadyDone != null && dailyScore === null) ? (
            <div className="simya-result">
              <h2>🔥 Bugünün kazanı kaynadı</h2>
              <div className="simya-score">Skor: <b>{alreadyDone}</b></div>
              <p className="simya-msg">Yarın yeni parçalar, yeni kelimeler. Serbest Atölye her zaman açık.</p>
              <button className="simya-btn" onClick={() => setScreen('free')}>🧪 Serbest Atölye</button>
            </div>
          ) : dailyScore !== null ? (
            <div className="simya-result">
              <h2>🌟 Kazan tamamlandı!</h2>
              <div className="simya-score">Skor: <b>{dailyScore}</b></div>
              <p className="simya-msg">{found.length}/{daily.targets.length} hedef{bonusCount ? ` + ${bonusCount} beklenmedik keşif` : ''}.</p>
              <button className="simya-btn" onClick={() => setScreen('home')}>Atölyeye Dön</button>
            </div>
          ) : daily ? (
            <>
              <div className="simya-daily-head">
                <span>🔥 Günlük Kazan</span>
                <span className="simya-progress">{found.length}/{daily.targets.length}</span>
              </div>
              {/* Hedef ipuçları */}
              <div className="simya-targets">
                {daily.targets.map((t, i) => {
                  const isFound = found.includes(t.en);
                  const open = openedHints.includes(i);
                  return (
                    <div key={i} className={`simya-target${isFound ? ' done' : ''}`} onClick={() => !isFound && toggleHint(i)}>
                      {isFound
                        ? <><span className="simya-target-en">{t.en}</span><span className="simya-target-tr">{index.comboByEn.get(t.en)?.tr}</span></>
                        : open
                          ? <span className="simya-target-hint">{t.tier === 3 && <em className="simya-usta">Usta</em>} {t.hint}</span>
                          : <span className="simya-target-locked">? ? ?{t.tier === 3 && <em className="simya-usta"> Usta</em>}</span>}
                    </div>
                  );
                })}
              </div>
              <Cauldron slots={slots} pieceById={index.pieceById} onSlotTap={clearSlot}
                onSwap={swapSlots} onBoil={() => boil('daily')} canBoil={canBoil} boiling={false} />
              {quip && shake && <div className="simya-quip">{quip}</div>}
              <div className={`simya-bench${shake ? ' shake' : ''}`}>
                {dailyPieces.map(p => (
                  <PieceCard key={p.id} piece={p} onClick={() => addToSlot(p.id)} disabled={slots.indexOf(null) === -1} />
                ))}
              </div>
              <button className="simya-finish" onClick={finishDaily}>Bitir & Puanı Gör</button>
            </>
          ) : <div className="simya-conn">Kazan ısınıyor…</div>}
        </div>
      )}

      {/* SERBEST ATÖLYE */}
      {screen === 'free' && (
        <div className="simya-screen simya-play">
          <div className="simya-daily-head">
            <span>🧪 Serbest Atölye</span>
            <span className="simya-progress">{discCount} keşif · {rank.label}</span>
          </div>
          <Cauldron slots={slots} pieceById={index.pieceById} onSlotTap={clearSlot}
            onSwap={swapSlots} onBoil={() => boil('free')} canBoil={canBoil} boiling={false} />
          {quip && shake && <div className="simya-quip">{quip}</div>}
          <div className={`simya-bench${shake ? ' shake' : ''}`}>
            {freePieces.map(p => (
              <PieceCard key={p.id} piece={p} onClick={() => addToSlot(p.id)} disabled={slots.indexOf(null) === -1} />
            ))}
          </div>
          <p className="simya-lockhint">
            {rank.key === 'cirak' && 'Kalfa parçaları (phrasal) 20 keşifte açılır.'}
            {rank.key === 'kalfa' && 'Usta parçaları (kökler) 50 keşifte açılır.'}
            {rank.key === 'usta' && 'Tüm parçalar açık — usta simyacı!'}
          </p>
        </div>
      )}

      {/* Keşif kartı + Kodeks overlay'leri */}
      <DiscoveryCard combo={discovery?.combo} pieceById={index.pieceById}
        bonus={discovery?.bonus} collected={discovery?.collected}
        onClose={() => setDiscovery(null)} onCollect={collectToCollection} />
      {codexOpen && <Codex data={simyaData} index={index} discovered={state.discovered} onClose={() => setCodexOpen(false)} />}
    </div>
  );

  // günlük kazan oturumunu sıfırla (yeni giriş)
  function resetDailyRun() {
    foundRef.current = [];
    setFound([]); setBonusCount(0); setOpenedHints([]); setDailyScore(null);
    resetCauldron();
  }
};

export default SimyaGame;

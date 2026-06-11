// 🏰 KÂBUS MODU v2 — "ÜÇ KAPI" (Kelime Zindanı, Leitner sistemi)
//
// NEDEN v2: Eski tasarımda kurtarma yalnızca zafer anında oluyor, tek doğru
// cevap "öğrenildi" sayılıyor ve kaybedince ilerleme yanıyordu. v2'de kelime
// 3 kanıt etabını (TANI → HATIRLA → YAZ) geçerse kurtulur; ilerleme oturumlar
// arası KALICIDIR (localStorage wordHunter_kabusStages); kısmi başarı yanmaz.
// Can/HP/combo KALDIRILDI — tekrar modunda ceza, kelimenin başa dönmesidir.
import { useState, useEffect, useRef } from 'react';
import './KabusGame.css';
import { speakText, ttsSupported } from './utils/tts';
import { submitScore } from './utils/leaderboard';
import { GhostIcon } from './utils/MenuIcons';
import { Warden, CellDoor, CellBlock } from './KabusStage';
import { clang, snap, whoosh, sfxEnabled, setSfxEnabled } from './utils/sfx';
import {
  loadStages, saveStages, syncStagesWithReview, stageOf,
  pickSessionWords, questionFor, isOptionCorrect, isTypedCorrect,
  applyAnswer, computeScore, shuffle,
  WAVES, MIN_REVIEW, STAGE_NAMES, FREED_STAGE,
} from './utils/kabusLogic';
import a1_a2 from './data/a1_a2.json';
import b1_b2 from './data/b1_b2.json';

// Distractor (yanlış şık) havuzu — iki sözlük birleşik.
const DISTRACTOR_POOL = [...a1_a2, ...b1_b2];
const TTS_OK = ttsSupported();
const INTRO_SEEN_KEY = 'kabusIntroSeen';

// Gardiyan replikleri — dalga aralarında rastgele biri (2 sn ara kart).
const WARDEN_QUIPS = [
  '“Şanslıydın... ama kapılar daralıyor.”',
  '“Bu zindandan kimse kolay çıkamaz.”',
  '“Zincirlerim daha bitmedi, küçük avcı.”',
  '“Bir kapı daha... cesaretin varsa.”',
  '“Hatırladıklarını yarın da hatırlayacak mısın?”',
];

// Hikâye panelleri (ilk açılışta bir kez; 📜 Hikâye ile tekrar açılır)
const STORY_PANELS = [
  { icon: '👻', text: 'Yanlış yaptığın her kelime, Gardiyan Hayalet\'in zindanına düşer.' },
  { icon: '🚪', text: 'Bir kelimenin kurtulması için 3 kapıdan geçmesi gerekir: TANI → HATIRLA → YAZ.' },
  { icon: '⛓️', text: 'Kapıları geçen kelime zincirlerini kırar. Yanılırsan... gardiyan onu en dibe geri atar.' },
];

function loadCollection() {
  try {
    const saved = localStorage.getItem('wordHunter_collection');
    return saved ? JSON.parse(saved) : { known: [], review: [] };
  } catch {
    return { known: [], review: [] };
  }
}

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

// Kurtulan kelimeyi ANINDA review→known taşı (duplicate kontrollü).
function moveToKnown(word) {
  const col = loadCollection();
  const newReview = col.review.filter(w => w.en !== word.en);
  const newKnown = col.known.some(k => k.en === word.en) ? col.known : [...col.known, word];
  localStorage.setItem('wordHunter_collection', JSON.stringify({ known: newKnown, review: newReview }));
}

const KabusGame = ({ onBack } = {}) => {
  const [reviewList, setReviewList] = useState(() => loadCollection().review || []);

  // phase: 'intro' | 'story' | 'play' | 'feedback' | 'interlude' | 'over'
  const [phase, setPhase] = useState(() =>
    localStorage.getItem(INTRO_SEEN_KEY) ? 'intro' : 'story'
  );
  const [storyPage, setStoryPage] = useState(0);
  const [silentMode, setSilentMode] = useState(!TTS_OK);
  const useSilent = silentMode || !TTS_OK;
  const [sfxOn, setSfxOn] = useState(sfxEnabled());
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [revealedTr, setRevealedTr] = useState(null);   // defterde TR'si açılan kelime

  // Leitner etapları (kalıcı). Oturum başında review ile senkronize edilir.
  const [stages, setStages] = useState(() => {
    const synced = syncStagesWithReview(loadStages(), loadCollection().review || []);
    saveStages(synced);   // klasik modda öğrenilenlerin kaydı temizlendi (sızıntı yok)
    return synced;
  });
  const stagesRef = useRef(stages);
  useEffect(() => { stagesRef.current = stages; }, [stages]);

  // Gece (oturum) durumu
  const [sessionWords, setSessionWords] = useState([]);
  const [waveNo, setWaveNo] = useState(1);
  const [queue, setQueue] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [question, setQuestion] = useState(null);
  const [typed, setTyped] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [feedback, setFeedback] = useState(null);     // { correct, word, freed }
  const [quip, setQuip] = useState('');
  const [freedTonight, setFreedTonight] = useState([]);
  const [failedTonight, setFailedTonight] = useState([]);  // en[] — kızıl hücre + bu gece sorulmaz
  const [finalScore, setFinalScore] = useState(0);
  const [sceneFx, setSceneFx] = useState('');          // '' | 'shake' (kapı çarpması)

  const timerRef = useRef(null);
  const ledgerOpenRef = useRef(false);
  useEffect(() => { ledgerOpenRef.current = ledgerOpen; }, [ledgerOpen]);
  const nextWaveRef = useRef([]);     // bu dalgada doğru bilinen (kurtulmamış) kelimeler
  const freedRef = useRef([]);
  const correctRef = useRef(0);
  const totalRef = useRef(0);

  const currentWord = queue[qIdx] || null;

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const flashShake = () => {
    setSceneFx('shake');
    setTimeout(() => setSceneFx(c => (c === 'shake' ? '' : c)), 450);
  };

  // ── Oyunu başlat: oturum kelimeleri + 1. dalga ──
  const startGame = () => {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
    const session = pickSessionWords(reviewList, stagesRef.current);
    setSessionWords(session);
    nextWaveRef.current = [];
    freedRef.current = [];
    correctRef.current = 0;
    totalRef.current = 0;
    setFreedTonight([]);
    setFailedTonight([]);
    waveRefNo.current = 1;
    qIdxRef.current = 0;
    queueRefLen.current = session.length;
    setWaveNo(1);
    setQueue(shuffle(session));
    setQIdx(0);
    setPhase('play');
  };

  // ── Soru kurulumu (dalga/sıra değişince) ──
  useEffect(() => {
    if (phase !== 'play' || !currentWord) return;
    const stage = stageOf(stagesRef.current, currentWord.en);
    const q = questionFor(currentWord, stage, DISTRACTOR_POOL);
    setQuestion(q);
    setTyped('');
    setTimeLeft(q.seconds);

    // TTS yalnız Etap 1'de (TANI): EN sesli sorulur. Etap 2-3'te TR yazılıdır;
    // EN dinletmek kopya olur (spec 2.1).
    if (stage === 0 && !useSilent) {
      const t = setTimeout(() => speakText(currentWord.en), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, waveNo, qIdx]);

  // ── Süre (100ms tick; Zindan Defteri açıkken DURUR — kabul kriteri 4) ──
  useEffect(() => {
    if (phase !== 'play') return;
    clearTimer();
    timerRef.current = setInterval(() => {
      if (ledgerOpenRef.current) return;     // defter açık → süre akmaz
      setTimeLeft(prev => {
        const next = prev - 0.1;
        if (next <= 0) {
          clearTimer();
          handleTimeout();
          return 0;
        }
        return next;
      });
    }, 100);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, waveNo, qIdx]);

  // Unmount → temizlik (timer + TTS)
  useEffect(() => () => { clearTimer(); if (window.speechSynthesis) window.speechSynthesis.cancel(); }, []);

  // ── Cevap işle ──
  const resolveTurn = (correct) => {
    if (phase !== 'play' || !currentWord) return;
    clearTimer();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    totalRef.current += 1;

    const res = applyAnswer(stagesRef.current, currentWord, correct, todayStr());
    setStages(res.stages);
    stagesRef.current = res.stages;
    saveStages(res.stages);

    if (correct) {
      correctRef.current += 1;
      if (res.freed) {
        whoosh();                                   // kurtuluş sesi
        moveToKnown(currentWord);                   // ANINDA review→known (kalıcı)
        freedRef.current = [...freedRef.current, currentWord];
        setFreedTonight(freedRef.current);
        setReviewList(l => l.filter(w => w.en !== currentWord.en));
      } else {
        snap();                                     // bir zincir koptu
        nextWaveRef.current.push(currentWord);      // sonraki dalgada yeni etabıyla sorulur
      }
    } else {
      clang();                                      // kapı çarptı
      flashShake();
      setFailedTonight(f => [...f, currentWord.en]); // bu gece bir daha sorulmaz
    }

    setFeedback({ correct, word: currentWord, freed: res.freed });
    setPhase('feedback');
    setTimeout(() => { setFeedback(null); advance(); }, res.freed ? 2000 : 1600);
  };

  const handleTimeout = () => resolveTurn(false);
  const handleOption = (opt) => resolveTurn(isOptionCorrect(question, opt));
  const handleTyped = () => resolveTurn(isTypedCorrect(typed, currentWord));

  // ── Sıradaki soru / dalga / bitiş ──
  // NOT: tamamı ref üzerinden ilerler (setState updater içinde yan etki YASAK —
  // StrictMode updater'ı iki kez koşturur ve dalga geçişi kilitlenirdi).
  const qIdxRef = useRef(0);
  const queueRefLen = useRef(0);
  const waveRefNo = useRef(1);

  const advance = () => {
    const nextIdx = qIdxRef.current + 1;
    if (nextIdx < queueRefLen.current) {
      qIdxRef.current = nextIdx;
      setQIdx(nextIdx);
      setPhase('play');
      return;
    }
    // Dalga bitti → doğru bilinenler (kurtulmamışlar) yeni etabıyla sonraki dalgada
    if (waveRefNo.current < WAVES && nextWaveRef.current.length > 0) {
      const nextQueue = shuffle(nextWaveRef.current);
      nextWaveRef.current = [];
      setQuip(WARDEN_QUIPS[Math.floor(Math.random() * WARDEN_QUIPS.length)]);
      setPhase('interlude');
      setTimeout(() => {
        queueRefLen.current = nextQueue.length;
        waveRefNo.current += 1;
        qIdxRef.current = 0;
        setQueue(nextQueue);
        setWaveNo(waveRefNo.current);
        setQIdx(0);
        setPhase('play');
      }, 2000);
      return;
    }
    endGame();
  };

  // ── Gece bitti: skor BİR kez gönderilir ──
  const endGame = () => {
    clearTimer();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const score = computeScore({
      correct: correctRef.current,
      total: totalRef.current,
      freedCount: freedRef.current.length,
    });
    setFinalScore(score);
    if (totalRef.current > 0) submitScore('kabus', 'standard', score);  // kayıtsızsa sessiz atlar
    setPhase('over');
  };

  // ── Paylaş ──
  const handleShare = () => {
    const lastDoor = reviewList.filter(w => stageOf(stages, w.en) === 2).length;
    const text = `Bu gece ${freedTonight.length} kelime zincirlerini kırdı 🕯️${lastDoor ? ` (${lastDoor} tanesi son kapıda!)` : ''} Skor: ${finalScore}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  };

  // ── Defter / özet gruplamaları ──
  const groupByStage = (s) => reviewList.filter(w => stageOf(stages, w.en) === s);
  const sessionStageOf = (en) =>
    freedTonight.some(w => w.en === en) ? FREED_STAGE : stageOf(stages, en);

  const rootCls = [
    'kabus-root',
    sceneFx === 'shake' ? 'screen-shake' : '',
    phase === 'over' ? (freedTonight.length > 0 ? 'scene-dawn' : 'scene-dark') : '',
  ].filter(Boolean).join(' ');

  // ─────────────────────────── RENDER ───────────────────────────
  return (
    <div className={rootCls}>
      <button className="kabus-back" onClick={onBack}>← Menü</button>
      {(phase === 'intro' || phase === 'play' || phase === 'feedback') && reviewList.length > 0 && (
        <button className="kabus-ledgerbtn" onClick={() => setLedgerOpen(true)}>📖 Zindan Defteri</button>
      )}

      {/* HİKÂYE GİRİŞİ (ilk açılışta bir kez; 📜 ile tekrar) */}
      {phase === 'story' && (
        <div className="kabus-screen kabus-story">
          <div className="kabus-story-icon">{STORY_PANELS[storyPage].icon}</div>
          <p className="kabus-story-text">{STORY_PANELS[storyPage].text}</p>
          <div className="kabus-story-dots">
            {STORY_PANELS.map((_, i) => (
              <span key={i} className={i === storyPage ? 'dot active' : 'dot'} />
            ))}
          </div>
          {storyPage < STORY_PANELS.length - 1 ? (
            <button className="kabus-btn" onClick={() => setStoryPage(p => p + 1)}>Devam</button>
          ) : (
            <button className="kabus-btn" onClick={() => {
              localStorage.setItem(INTRO_SEEN_KEY, '1');
              setStoryPage(0);
              setPhase('intro');
            }}>Zindana Gir</button>
          )}
        </div>
      )}

      {/* GİRİŞ EKRANI */}
      {phase === 'intro' && (
        reviewList.length < MIN_REVIEW ? (
          <div className="kabus-screen kabus-locked">
            <div className="kabus-ghost weak"><GhostIcon size={110} color="#a29bfe" /></div>
            <p className="kabus-msg">
              Hayalet henüz çok zayıf 👻<br />
              Önce klasik modda oyna, zorlandığın kelimeler buraya gelecek.
            </p>
            <button className="kabus-btn" onClick={onBack}>Klasik Moda Git</button>
          </div>
        ) : (
          <div className="kabus-screen">
            <div className="kabus-ghost float"><GhostIcon size={120} color="#a29bfe" /></div>
            <h1 className="kabus-title">Kâbus Modu</h1>
            <p className="kabus-msg">
              Zindanda <b>{reviewList.length}</b> kelime var — bu gece{' '}
              <b>{Math.min(10, reviewList.length)}</b> tanesi kapılara çıkacak.
            </p>
            {TTS_OK && (
              <div className="kabus-modepick">
                <button
                  className={`kabus-modebtn${!silentMode ? ' active' : ''}`}
                  onClick={() => setSilentMode(false)}
                >🔊 Sesli</button>
                <button
                  className={`kabus-modebtn${silentMode ? ' active' : ''}`}
                  onClick={() => setSilentMode(true)}
                >🔇 Sessiz (yazılı)</button>
              </div>
            )}
            <button
              className={`kabus-sfxtoggle${sfxOn ? ' active' : ''}`}
              onClick={() => { const n = !sfxOn; setSfxEnabled(n); setSfxOn(n); }}
            >{sfxOn ? '🔊 Ses efektleri açık' : '🔇 Ses efektleri kapalı'}</button>
            <button className="kabus-btn" onClick={startGame}>BAŞLA</button>
            <button className="kabus-storybtn" onClick={() => { setStoryPage(0); setPhase('story'); }}>
              📜 Hikâye
            </button>
          </div>
        )
      )}

      {/* OYUN + GERİ BİLDİRİM — Üç Kapı sahnesi */}
      {(phase === 'play' || phase === 'feedback') && currentWord && question && (
        <div className="kabus-screen kabus-play">
          <Warden weak={false} hit={feedback?.correct === true} />

          {/* Dalga + etap rozeti */}
          <div className="kabus-wavebadge">
            🌊 Dalga {waveNo}/{WAVES} · 🚪 {STAGE_NAMES[Math.min(question.stage, 2)]} Kapısı
          </div>

          {/* SPOT ALANI: kapanan kapı (süre) + soru içeriği */}
          <div className="kabus-spot">
            {phase === 'play' && <CellDoor timeLeft={timeLeft} total={question.seconds} />}
            <div className="kabus-mist" key={`${waveNo}-${qIdx}`} aria-hidden="true" />
            <div className="kabus-audio">
              {question.mode === 'tr-options' ? (
                !useSilent ? (
                  <>
                    <div className="kabus-speaker" aria-hidden="true">🔊</div>
                    <button className="kabus-replay" onClick={() => speakText(currentWord.en)}>
                      🔊 Tekrar dinle
                    </button>
                  </>
                ) : (
                  <div className="kabus-silent">{currentWord.en}</div>
                )
              ) : (
                // Etap 2-3: TR yazılı sorulur (ters yön / aktif üretim)
                <div className="kabus-silent kabus-tr-prompt">{currentWord.tr}</div>
              )}
            </div>
          </div>

          {/* Şıklar (Etap 1: TR, Etap 2: EN) ya da yazma (Etap 3) */}
          {phase === 'play' && question.mode !== 'type-en' && (
            <div className="kabus-options">
              {question.options.map((opt, i) => (
                <button key={i} className="kabus-opt" onClick={() => handleOption(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {phase === 'play' && question.mode === 'type-en' && (
            <form className="kabus-type" onSubmit={(e) => { e.preventDefault(); handleTyped(); }}>
              <div className="kabus-crithint">🚪 Son kapı! Kelimenin İngilizcesini yaz:</div>
              <input
                className="kabus-input" value={typed} autoFocus autoComplete="off"
                onChange={(e) => setTyped(e.target.value.toUpperCase())}
                placeholder="..."
              />
              <button type="submit" className="kabus-btn">KAPIYI AÇ 🗝️</button>
            </form>
          )}

          {/* Geri bildirim */}
          {phase === 'feedback' && feedback && (
            <div className={`kabus-feedback ${feedback.correct ? 'good' : 'bad'}${feedback.freed ? ' freed' : ''}`}>
              {feedback.correct && <div className="kabus-chain" aria-hidden="true"><span>⛓</span><span>⛓</span></div>}
              <div className="kabus-fb-head">
                {feedback.freed
                  ? '🕯️ KURTULDU! Üç kapı da geçildi'
                  : feedback.correct
                    ? '⛓ Bir zincir koptu!'
                    : '✗ Gardiyan onu en dibe attı'}
              </div>
              <div className="kabus-fb-word">{feedback.word.en}</div>
              <div className="kabus-fb-tr">{feedback.word.tr}</div>
              {feedback.word.visual && (
                <img className="kabus-fb-img" src={`/assets/${feedback.word.visual}`} alt="" />
              )}
            </div>
          )}

          {/* HÜCRE BLOĞU — zincir sayısı = kalan kapı */}
          <CellBlock
            words={sessionWords}
            stageOfEn={sessionStageOf}
            failedSet={new Set(failedTonight)}
            currentEn={phase === 'play' ? currentWord.en : null}
          />
        </div>
      )}

      {/* DALGA ARASI — gardiyan repliği (2 sn) */}
      {phase === 'interlude' && (
        <div className="kabus-screen kabus-interlude">
          <div className="kabus-ghost float"><GhostIcon size={90} color="#a29bfe" /></div>
          <p className="kabus-quip">{quip}</p>
          <p className="kabus-msg">Dalga {waveNo + 1} geliyor…</p>
        </div>
      )}

      {/* GECE SONU ÖZETİ */}
      {phase === 'over' && (
        <div className="kabus-screen kabus-over">
          <div className={`kabus-ghost ${freedTonight.length ? 'defeated' : 'float'}`}>
            <GhostIcon size={100} color={freedTonight.length ? '#636e72' : '#a29bfe'} />
          </div>
          <h2 className="kabus-title">
            {freedTonight.length
              ? `🕯️ Müjde! Bu gece ${freedTonight.length} kelime kurtuldu`
              : 'Bu gece kurtulan olmadı… ama zincirler gevşedi 🌙'}
          </h2>
          <div className="kabus-score">Skor: <b>{finalScore}</b></div>

          <div className="kabus-summary">
            {freedTonight.length > 0 && (
              <LedgerSection title="🕯️ Kurtarılanlar" words={freedTonight}
                revealedTr={revealedTr} onReveal={setRevealedTr} alwaysShowTr />
            )}
            {groupByStage(2).length > 0 && (
              <LedgerSection title="⛓️ Son Kapıda" words={groupByStage(2)}
                revealedTr={revealedTr} onReveal={setRevealedTr} />
            )}
            {groupByStage(1).length > 0 && (
              <LedgerSection title="🚪 2. Kapıya ulaştı" words={groupByStage(1)}
                revealedTr={revealedTr} onReveal={setRevealedTr} />
            )}
            {groupByStage(0).length > 0 && (
              <LedgerSection title="🌑 Zindanın dibinde" words={groupByStage(0)}
                revealedTr={revealedTr} onReveal={setRevealedTr} />
            )}
          </div>

          <div className="kabus-over-actions">
            <button className="kabus-btn" onClick={handleShare}>Paylaş</button>
            <button className="kabus-btn ghost" onClick={onBack}>Menüye Dön</button>
          </div>
        </div>
      )}

      {/* 📖 ZİNDAN DEFTERİ — overlay; açıkken süre DURUR */}
      {ledgerOpen && (
        <div className="kabus-ledger-backdrop" onClick={() => setLedgerOpen(false)}>
          <div className="kabus-ledger" onClick={(e) => e.stopPropagation()}>
            <div className="kabus-ledger-head">
              <h3>📖 Zindan Defteri</h3>
              <button className="kabus-ledger-close" onClick={() => setLedgerOpen(false)}>✕</button>
            </div>
            {freedTonight.length > 0 && (
              <LedgerSection title="🕯️ Kurtarılanlar (bu gece)" words={freedTonight}
                revealedTr={revealedTr} onReveal={setRevealedTr} alwaysShowTr />
            )}
            <LedgerSection title="⛓️ Son Kapıda" words={groupByStage(2)}
              revealedTr={revealedTr} onReveal={setRevealedTr} emptyText="Henüz yok" />
            <LedgerSection title="🚪 2. Kapıya ulaştı" words={groupByStage(1)}
              revealedTr={revealedTr} onReveal={setRevealedTr} emptyText="Henüz yok" />
            <LedgerSection title="🌑 Zindanın dibinde" words={groupByStage(0)}
              revealedTr={revealedTr} onReveal={setRevealedTr} emptyText="Bomboş — harika!" />
          </div>
        </div>
      )}
    </div>
  );
};

// Defter/özet bölümü: kelimeler EN yazar, TR GİZLİDİR — dokununca açılır
// (kopya değil, merak). Kurtarılanlarda TR her zaman görünür.
function LedgerSection({ title, words, revealedTr, onReveal, alwaysShowTr = false, emptyText }) {
  if (!words.length && !emptyText) return null;
  return (
    <div className="kabus-ledger-section">
      <h4>{title} <span className="kabus-ledger-count">{words.length}</span></h4>
      {words.length === 0 ? (
        <p className="kabus-ledger-empty">{emptyText}</p>
      ) : (
        <ul className="kabus-wordlist">
          {words.map((w, i) => (
            <li key={i} onClick={() => onReveal(revealedTr === w.en ? null : w.en)}>
              <b>{w.en}</b>
              {(alwaysShowTr || revealedTr === w.en)
                ? <span className="kabus-tr-revealed"> — {w.tr}</span>
                : <span className="kabus-tr-hidden"> · dokun</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default KabusGame;

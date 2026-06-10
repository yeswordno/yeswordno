// 👻 KÂBUS MODU — "Geliştirilecek" (review) kelimeler bir Kelime Hayaleti olarak
// geri döner. Hayalet kelimeleri sesli (TTS) sorar; oyuncu 4 Türkçe seçenekten
// doğrusunu süre dolmadan seçer. Doğru → hayalete vurur, yanlış → oyuncuya vurur.
// Yenilen hayaletin kelimeleri review → known'a taşınır (aralıklı tekrar).
import { useState, useEffect, useRef, useCallback } from 'react';
import './KabusGame.css';
import { speakText, ttsSupported } from './utils/tts';
import { submitScore } from './utils/leaderboard';
import { GhostIcon } from './utils/MenuIcons';
import { Warden, CellDoor, CellBlock } from './KabusStage';
import { clang, snap, whoosh, sfxEnabled, setSfxEnabled } from './utils/sfx';
import {
  pickSessionWords, buildOptions, computeScore, isTypedCorrect,
  GHOST_HP_PER_WORD, PLAYER_LIVES, NORMAL_DAMAGE, CRIT_DAMAGE,
  TURN_SECONDS, COMBO_FOR_CRIT,
} from './utils/kabusLogic';
import a1_a2 from './data/a1_a2.json';
import b1_b2 from './data/b1_b2.json';

// Distractor (yanlış şık) havuzu — iki sözlük birleşik.
const DISTRACTOR_POOL = [...a1_a2, ...b1_b2];
const TTS_OK = ttsSupported();

function loadCollection() {
  try {
    const saved = localStorage.getItem('wordHunter_collection');
    return saved ? JSON.parse(saved) : { known: [], review: [] };
  } catch {
    return { known: [], review: [] };
  }
}

const KabusGame = ({ onBack } = {}) => {
  const [collection] = useState(loadCollection);
  const review = collection.review || [];

  // phase: 'intro' | 'play' | 'feedback' | 'over'
  const [phase, setPhase] = useState('intro');
  // Sessiz mod: kullanıcı seçer (ör. sesli dinleyemediği ortamda) → kelime YAZIYLA sorulur.
  // TTS hiç desteklenmiyorsa zaten zorunlu sessiz. Varsayılan: TTS varsa sesli.
  const [silentMode, setSilentMode] = useState(!TTS_OK);
  const useSilent = silentMode || !TTS_OK;   // efektif sessiz mi
  const [words, setWords] = useState([]);          // oturum kelimeleri
  const [turnIdx, setTurnIdx] = useState(0);
  const [options, setOptions] = useState([]);
  const [ghostHp, setGhostHp] = useState(0);
  const [ghostMaxHp, setGhostMaxHp] = useState(0);
  const [lives, setLives] = useState(PLAYER_LIVES);
  const [combo, setCombo] = useState(0);
  const [isTyping, setIsTyping] = useState(false);  // combo yazma sorusu mu
  const [typed, setTyped] = useState('');
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const [feedback, setFeedback] = useState(null);   // { correct, word, crit }
  const [hitFx, setHitFx] = useState(null);         // 'ghost' | 'player'
  const [rescued, setRescued] = useState([]);       // kurtarılan kelimeler
  const [wrongWords, setWrongWords] = useState([]); // yanılınan kelimeler
  const [finalScore, setFinalScore] = useState(0);
  const [won, setWon] = useState(false);
  // Sinematik koreografi (SADECE görsel): '' | 'crack' (kritik vuruş) | 'shake' (kapı çarpması)
  const [sceneFx, setSceneFx] = useState('');
  const [sfxOn, setSfxOn] = useState(sfxEnabled());   // ses efektleri açık mı (intro toggle)
  const flashFx = (fx, ms = 450) => {
    setSceneFx(fx);
    setTimeout(() => setSceneFx(c => (c === fx ? '' : c)), ms);
  };

  const timerRef = useRef(null);
  const livesRef = useRef(PLAYER_LIVES);
  const rescuedRef = useRef([]);
  const wrongRef = useRef([]);
  const correctRef = useRef(0);
  const critRef = useRef(0);

  const current = words[turnIdx] || null;

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // --- Oyunu başlat ---
  const startGame = () => {
    const session = pickSessionWords(review);
    setWords(session);
    setGhostMaxHp(session.length * GHOST_HP_PER_WORD);
    setGhostHp(session.length * GHOST_HP_PER_WORD);
    setLives(PLAYER_LIVES); livesRef.current = PLAYER_LIVES;
    setCombo(0);
    setRescued([]); rescuedRef.current = [];
    setWrongWords([]); wrongRef.current = [];
    correctRef.current = 0;
    critRef.current = 0;
    setTurnIdx(0);
    setPhase('play');
  };

  // --- Tur kurulumu (turnIdx / phase değişince) ---
  useEffect(() => {
    if (phase !== 'play' || !current) return;
    const typingTurn = combo >= COMBO_FOR_CRIT;
    setIsTyping(typingTurn);
    setTyped('');
    setOptions(typingTurn ? [] : buildOptions(current, DISTRACTOR_POOL));
    setTimeLeft(TURN_SECONDS);

    // Kelimeyi seslendir (sesli moddaysa). Sesler gecikebileceği için küçük gecikme.
    if (!useSilent) {
      const t = setTimeout(() => speakText(current.en), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turnIdx]);

  // --- Süre çubuğu (100ms interval, cleanup'lı) ---
  useEffect(() => {
    if (phase !== 'play') return;
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 0.1;
        if (next <= 0) {
          clearTimer();
          // Süre doldu → yazma turunda can gitmez, normal turda yanlış say.
          handleTimeout();
          return 0;
        }
        return next;
      });
    }, 100);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turnIdx]);

  // Bileşen unmount → her şeyi temizle (state leak / konsol hatası olmasın)
  useEffect(() => () => { clearTimer(); if (window.speechSynthesis) window.speechSynthesis.cancel(); }, []);

  const ghostHpRef = useRef(0);
  useEffect(() => { ghostHpRef.current = ghostHp; }, [ghostHp]);

  const advance = useCallback(() => {
    if (livesRef.current <= 0) { endGame(false); return; }
    if (ghostHpRef.current <= 0) { endGame(true); return; }
    if (turnIdx + 1 >= words.length) { endGame(ghostHpRef.current <= 0); return; }
    setTurnIdx(i => i + 1);
    setPhase('play');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIdx, words.length]);

  // --- Cevap işle ---
  const resolveTurn = (isCorrect, { crit = false, noPenalty = false } = {}) => {
    clearTimer();
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    if (isCorrect) {
      const dmg = crit ? CRIT_DAMAGE : NORMAL_DAMAGE;
      setGhostHp(hp => Math.max(0, hp - dmg));
      setHitFx('ghost');
      setCombo(c => c + 1);
      correctRef.current += 1;
      snap();                                                 // zincir kırılışı sesi
      if (crit) { critRef.current += 1; flashFx('crack'); whoosh(); }   // kritik → çatlak + kurtuluş
      rescuedRef.current = [...rescuedRef.current, current];
      setRescued(rescuedRef.current);
    } else {
      setCombo(0);
      clang();                                                // kapı çarpması sesi
      if (!noPenalty) {
        livesRef.current = Math.max(0, livesRef.current - 1);
        setLives(livesRef.current);
        setHitFx('player');
      }
      if (!wrongRef.current.some(w => w.en === current.en)) {
        wrongRef.current = [...wrongRef.current, current];
        setWrongWords(wrongRef.current);
      }
    }

    setFeedback({ correct: isCorrect, word: current, crit });
    setPhase('feedback');
    setTimeout(() => setHitFx(null), 500);
    // Öğretici an: doğru cevabı 1.5 sn göster, sonra ilerle.
    setTimeout(() => { setFeedback(null); advance(); }, 1500);
  };

  const handleOption = (opt) => {
    if (phase !== 'play') return;
    resolveTurn(opt.trim() === (current.tr || '').trim());
  };

  const handleTyped = () => {
    if (phase !== 'play') return;
    // Yazma turunda yanlışsa CAN GİTMEZ (cesaret cezalandırılmaz).
    const ok = isTypedCorrect(typed, current);
    resolveTurn(ok, { crit: ok, noPenalty: !ok });
  };

  const handleTimeout = () => {
    flashFx('shake');   // kapı çarpması → ekran sarsıntısı (görsel)
    // Yazma turunda süre dolarsa da can gitmez.
    resolveTurn(false, { noPenalty: isTyping });
  };

  // --- Oyun bitişi ---
  const endGame = (victory) => {
    clearTimer();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setWon(victory);

    if (victory) {
      // Kurtarılan kelimeleri review → known taşı (duplicate kontrolü).
      const col = loadCollection();
      const rescuedEns = new Set(rescuedRef.current.map(w => w.en));
      const newReview = col.review.filter(w => !rescuedEns.has(w.en));
      const newKnown = [...col.known];
      rescuedRef.current.forEach(w => {
        if (!newKnown.some(k => k.en === w.en)) newKnown.push(w);
      });
      const updated = { known: newKnown, review: newReview };
      localStorage.setItem('wordHunter_collection', JSON.stringify(updated));
    }
    // Yenilgide review DEĞİŞMEZ.

    const score = computeScore({
      correct: correctRef.current,
      total: words.length,
      livesLeft: livesRef.current,
      criticals: critRef.current,
    });
    setFinalScore(score);
    submitScore('kabus', 'standard', score); // kayıtlı değilse sessiz atlar
    setPhase('over');
  };

  // --- Paylaş ---
  const handleShare = () => {
    const text = won
      ? `🕯️ Kâbus Modu: bu gece ${rescued.length} kelime kurtardım! Skor: ${finalScore}`
      : `🌙 Kâbus Modu: hayalet bu gece kazandı... Skor: ${finalScore}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  // ─────────────────────────── RENDER ───────────────────────────
  const rootCls = [
    'kabus-root',
    sceneFx === 'shake' ? 'screen-shake' : '',
    sceneFx === 'crack' ? 'wall-crack' : '',
    phase === 'over' ? (won ? 'scene-dawn' : 'scene-dark') : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rootCls}>
      <button className="kabus-back" onClick={onBack}>← Menü</button>

      {/* GİRİŞ EKRANI */}
      {phase === 'intro' && (
        review.length < 5 ? (
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
            <div className="kabus-ghost float"><GhostIcon size={130} color="#a29bfe" /></div>
            <h1 className="kabus-title">Kâbus Modu</h1>
            <p className="kabus-msg">
              Bu gece <b>{Math.min(12, review.length)}</b> kelime seni bekliyor.
            </p>
            {/* Ses / sessiz mod seçimi */}
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
            {/* Ses efektleri (WebAudio sentez) aç/kapa */}
            <button
              className={`kabus-sfxtoggle${sfxOn ? ' active' : ''}`}
              onClick={() => { const n = !sfxOn; setSfxEnabled(n); setSfxOn(n); }}
            >{sfxOn ? '🔊 Ses efektleri açık' : '🔇 Ses efektleri kapalı'}</button>
            <button className="kabus-btn" onClick={startGame}>BAŞLA</button>
          </div>
        )
      )}

      {/* OYUN + GERİ BİLDİRİM — "Kelime Zindanı" sahnesi */}
      {(phase === 'play' || phase === 'feedback') && current && (
        <div className="kabus-screen kabus-play">
          {/* Gardiyan Hayalet + HP + fener */}
          <Warden hp={ghostHp} maxHp={ghostMaxHp} hit={hitFx === 'ghost'} />

          {/* SPOT ALANI: kapanan parmaklıklı kapı (süre) + kelime + sis */}
          <div className="kabus-spot">
            {phase === 'play' && <CellDoor timeLeft={timeLeft} total={TURN_SECONDS} />}
            <div className="kabus-mist" key={turnIdx} aria-hidden="true" />
            <div className="kabus-audio">
              {!useSilent ? (
                <>
                  <div className="kabus-speaker" aria-hidden="true">🔊</div>
                  <button className="kabus-replay" onClick={() => speakText(current.en)}>
                    🔊 Tekrar dinle
                  </button>
                </>
              ) : (
                // TTS yoksa / sessiz mod: kelime yazılı gösterilir
                <div className="kabus-silent">{current.en}</div>
              )}
            </div>
          </div>

          {/* Combo göstergesi */}
          {combo > 0 && phase === 'play' && (
            <div className="kabus-combo">🔥 Combo ×{combo}</div>
          )}

          {/* Seçenekler ya da yazma kutusu */}
          {phase === 'play' && !isTyping && (
            <div className="kabus-options">
              {options.map((opt, i) => (
                <button key={i} className="kabus-opt" onClick={() => handleOption(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {phase === 'play' && isTyping && (
            <form className="kabus-type" onSubmit={(e) => { e.preventDefault(); handleTyped(); }}>
              <div className="kabus-crithint">⚡ Kritik vuruş şansı! Kelimeyi yaz:</div>
              <input
                className="kabus-input" value={typed} autoFocus autoComplete="off"
                onChange={(e) => setTyped(e.target.value.toLocaleUpperCase('tr'))}
                placeholder="..."
              />
              <button type="submit" className="kabus-btn">VUR ⚡</button>
            </form>
          )}

          {/* Geri bildirim: doğru → zincir kırılır / yanlış → kapı çarpar (kart aynı, zindan boyalı) */}
          {phase === 'feedback' && feedback && (
            <div className={`kabus-feedback ${feedback.correct ? 'good' : 'bad'}`}>
              {feedback.correct && <div className="kabus-chain" aria-hidden="true"><span>⛓</span><span>⛓</span></div>}
              <div className="kabus-fb-head">
                {feedback.correct ? (feedback.crit ? '⚡ KRİTİK VURUŞ!' : '✓ Zincir kırıldı!') : '✗ Kapı çarptı'}
              </div>
              <div className="kabus-fb-word">{feedback.word.en}</div>
              <div className="kabus-fb-tr">{feedback.word.tr}</div>
              {feedback.word.visual && (
                <img className="kabus-fb-img" src={`/assets/${feedback.word.visual}`} alt="" />
              )}
            </div>
          )}

          {/* HÜCRE BLOĞU — oturumdaki her kelime bir zindan hücresi */}
          <CellBlock words={words} rescued={rescued} wrongWords={wrongWords} currentIdx={turnIdx} phase={phase} />

          {/* Oyuncu canları */}
          <div className={`kabus-lives${hitFx === 'player' ? ' hit' : ''}`}>
            {Array.from({ length: PLAYER_LIVES }).map((_, i) => (
              <span key={i} className={i < lives ? 'heart' : 'heart lost'}>
                {i < lives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* BİTİŞ EKRANI */}
      {phase === 'over' && (
        <div className="kabus-screen kabus-over">
          {won ? (
            <>
              <div className="kabus-ghost defeated"><GhostIcon size={100} color="#636e72" /></div>
              <h2 className="kabus-title">🕯️ Bu gece {rescued.length} kelime kurtardın</h2>
              {/* Zafer finali: hücre kapıları sırayla açılır (CSS animation-delay) */}
              <div className="kabus-finale">
                <CellBlock words={words} rescued={rescued} wrongWords={wrongWords} currentIdx={-1} phase="over" />
              </div>
              <div className="kabus-score">Skor: <b>{finalScore}</b></div>
              <ul className="kabus-wordlist">
                {rescued.map((w, i) => (
                  <li key={i}><b>{w.en}</b> — {w.tr}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="kabus-ghost float"><GhostIcon size={110} color="#a29bfe" /></div>
              <h2 className="kabus-title">Hayalet bu gece kazandı… yarın daha güçlü dön 🌙</h2>
              <div className="kabus-score">Skor: <b>{finalScore}</b></div>
              {wrongWords.length > 0 && (
                <>
                  <p className="kabus-msg">Yanıldığın kelimeler:</p>
                  <ul className="kabus-wordlist">
                    {wrongWords.map((w, i) => (
                      <li key={i}><b>{w.en}</b> — {w.tr}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          <div className="kabus-over-actions">
            <button className="kabus-btn" onClick={handleShare}>Paylaş</button>
            <button className="kabus-btn ghost" onClick={onBack}>Menüye Dön</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KabusGame;

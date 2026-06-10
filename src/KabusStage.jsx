// 🏰 KÂBUS MODU — "KELİME ZİNDANI" sahne bileşenleri (SADECE sunum katmanı).
// Buradaki hiçbir şey oyun mantığını/skoru/akışı değiştirmez; KabusGame'in
// mevcut state'lerini (timeLeft, hp, rescued, wrongWords, turnIdx...) görselleştirir.
import { GhostIcon } from './utils/MenuIcons';

// Hareket azaltma tercihi (kapı yerine düz bar; keyframe'ler CSS'te zaten kapanır).
const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── 3c. Gardiyan Hayalet — HP barı + fener ışık konisi ──
export function Warden({ hp, maxHp, hit }) {
  const ratio = maxHp ? hp / maxHp : 0;
  const weak = ratio < 0.34;            // %33 altında ışık daralır, gardiyan soluklaşır
  return (
    <div className="kabus-warden">
      <div className="kabus-hpbar">
        <div className="kabus-hpfill" style={{ width: `${ratio * 100}%` }} />
        <span className="kabus-hptext">👻 {hp}/{maxHp}</span>
      </div>
      <div className={`kabus-warden-stage${weak ? ' warden-weak' : ''}`}>
        <div className="kabus-lantern" aria-hidden="true" />
        <div className={`kabus-ghost combat${hit ? ' hit' : ''}`}>
          <GhostIcon size={92} color="#a29bfe" />
        </div>
      </div>
    </div>
  );
}

// ── 3b. Kapanan parmaklıklı kapı = diegetik zamanlayıcı ──
// Görsel kapı `timeLeft`'i yansıtır; ekran okuyucuya ayrıca role="timer" ile saniye verilir.
export function CellDoor({ timeLeft, total }) {
  const elapsed = total ? 1 - timeLeft / total : 0;       // 0 → açık, 1 → tam kapalı
  const urgent = timeLeft <= 3;
  const seconds = Math.ceil(timeLeft);

  if (REDUCED_MOTION) {
    // Hareket azaltma: kapı yerine mevcut düz süre çubuğu (bilgi animasyona bağlı kalmasın).
    return (
      <>
        <div className="kabus-timer" aria-hidden="true">
          <div className="kabus-timerfill" style={{ width: `${timeLeft / total * 100}%` }} />
        </div>
        <span role="timer" className="kabus-sr">{seconds} saniye</span>
      </>
    );
  }
  return (
    <>
      <div
        className={`kabus-door${urgent ? ' door-urgent' : ''}`}
        style={{ height: `${elapsed * 100}%` }}
        aria-hidden="true"
      />
      <span role="timer" className="kabus-sr">{seconds} saniye</span>
    </>
  );
}

// ── 3a. Hücre bloğu — oturumdaki her kelime bir zindan hücresi ──
// Kelime İÇERİĞİ kilitli hücrede GÖSTERİLMEZ (sürpriz bozulmasın); kurtulanda
// yalnız İLK HARF görünür (tam liste bitiş ekranında zaten var).
export function CellBlock({ words, rescued, wrongWords, currentIdx, phase }) {
  const freedSet = new Set(rescued.map(w => w.en));
  const failedSet = new Set(wrongWords.map(w => w.en));
  return (
    <div className="kabus-cellblock" aria-hidden="true">
      {words.map((w, i) => {
        let state = 'locked';
        if (freedSet.has(w.en)) state = 'freed';
        else if (failedSet.has(w.en)) state = 'failed';
        else if (i === currentIdx && phase !== 'over') state = 'current';
        return (
          <div key={i} className={`kabus-cell cell-${state}`}>
            {state === 'freed' && <span className="cell-letter">{(w.en[0] || '').toUpperCase()}</span>}
          </div>
        );
      })}
    </div>
  );
}

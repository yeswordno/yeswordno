// 🏰 KÂBUS MODU v2 — "Kelime Zindanı" sahne bileşenleri (sunum katmanı).
// v2'de gardiyan HP'SİZDİR (anlatı öğesi); hücre bloğunda ZİNCİR SAYISI = kalan
// kapı sayısıdır (3 zincir = stage 0 … zincirsiz açık kapı = kurtuldu).
import { GhostIcon } from './utils/MenuIcons';

// Hareket azaltma tercihi (kapı yerine düz bar; keyframe'ler CSS'te zaten kapanır).
const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Gardiyan Hayalet — HP'siz, fener ışığında anlatı öğesi ──
export function Warden({ weak = false, hit = false }) {
  return (
    <div className="kabus-warden">
      <div className={`kabus-warden-stage${weak ? ' warden-weak' : ''}`}>
        <div className="kabus-lantern" aria-hidden="true" />
        <div className={`kabus-ghost combat${hit ? ' hit' : ''}`}>
          <GhostIcon size={84} color="#a29bfe" />
        </div>
      </div>
    </div>
  );
}

// ── Kapanan parmaklıklı kapı = diegetik zamanlayıcı ──
// Görsel kapı `timeLeft`'i yansıtır; ekran okuyucuya role="timer" ile saniye verilir.
export function CellDoor({ timeLeft, total }) {
  const elapsed = total ? 1 - timeLeft / total : 0;       // 0 → açık, 1 → tam kapalı
  const urgent = timeLeft <= 3;
  const seconds = Math.ceil(timeLeft);

  if (REDUCED_MOTION) {
    // Hareket azaltma: kapı yerine düz süre çubuğu (bilgi animasyona bağlı kalmasın).
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

// ── Hücre bloğu v2 — zincir sayısı = kalan kapı ──
// stageOfEn(en) → 0|1|2|3(kurtuldu). failedSet: bu gece yanılınanlar (kızıl ton).
// Kelime içeriği hücrede GÖSTERİLMEZ; kurtulanda ilk harf görünür.
export function CellBlock({ words, stageOfEn, failedSet, currentEn }) {
  return (
    <div className="kabus-cellblock" aria-hidden="true">
      {words.map((w, i) => {
        const stage = stageOfEn(w.en);
        const freed = stage >= 3;
        const failed = failedSet.has(w.en) && !freed;
        const current = w.en === currentEn && !freed;
        const cls = [
          'kabus-cell',
          `cell-stage${Math.min(stage, 3)}`,
          freed ? 'cell-freed' : '',
          failed ? 'cell-failed' : '',
          current ? 'cell-current' : '',
        ].filter(Boolean).join(' ');
        return (
          <div key={i} className={cls}>
            {freed
              ? <span className="cell-letter">{(w.en[0] || '').toUpperCase()}</span>
              : <span className="cell-chains">{'⛓'.repeat(Math.max(0, 3 - stage))}</span>}
          </div>
        );
      })}
    </div>
  );
}

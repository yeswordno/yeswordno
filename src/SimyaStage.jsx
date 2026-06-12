// ⚗️ KELİME SİMYACISI — sahne bileşenleri (sunum). Kâbus'un zıt kutbu: sıcak atölye.
// Görsel dosya YOK; kazan inline SVG + CSS alev/baloncuk. Erişilebilirlik: parça
// tipi sadece renkle değil, etiketle de belirtilir.
import { familyOf } from './utils/simyaLogic';

// Parça tipi → renk + kısa etiket (renge bel bağlama)
const TYPE_META = {
  word: { color: '#b87333', label: 'kelime' },
  particle: { color: '#27ae60', label: 'edat' },
  prefix: { color: '#8e44ad', label: 'ön ek' },
  suffix: { color: '#e67e22', label: 'son ek' },
  root: { color: '#d4a017', label: 'kök' },
};

// ── Parça kartı ──
export function PieceCard({ piece, onClick, disabled }) {
  const meta = TYPE_META[piece.type] || TYPE_META.word;
  return (
    <button
      className="simya-piece"
      style={{ '--piece-color': meta.color }}
      onClick={onClick}
      disabled={disabled}
      title={piece.tr}
    >
      <span className="simya-piece-text">{piece.text}</span>
      <span className="simya-piece-type">{meta.label}</span>
    </button>
  );
}

// ── Kazan: SVG gövde + alev + yuvalar ──
export function Cauldron({ slots, pieceById, onSlotTap, onSwap, onBoil, canBoil, boiling }) {
  return (
    <div className={`simya-cauldron${boiling ? ' boiling' : ''}`}>
      {/* Yuvalar (kazanın ağzı) */}
      <div className="simya-slots">
        {slots.map((pid, i) => {
          const piece = pid ? pieceById.get(pid) : null;
          const meta = piece ? (TYPE_META[piece.type] || TYPE_META.word) : null;
          return (
            <button
              key={i}
              className={`simya-slot${piece ? ' filled' : ''}`}
              style={meta ? { '--piece-color': meta.color } : undefined}
              onClick={() => piece && onSlotTap(i)}
            >
              {piece ? piece.text : <span className="simya-slot-empty">+</span>}
            </button>
          );
        })}
      </div>

      {/* Bakır kazan + alev (SVG/CSS) */}
      <div className="simya-pot-wrap" aria-hidden="true">
        <div className="simya-bubbles"><span /><span /><span /></div>
        <svg viewBox="0 0 200 140" className="simya-pot" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="copper" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d99a5b" />
              <stop offset="1" stopColor="#8a4f22" />
            </linearGradient>
          </defs>
          <ellipse cx="100" cy="42" rx="78" ry="20" fill="#1c0f04" />
          <path d="M22 42 Q22 120 100 124 Q178 120 178 42 Z" fill="url(#copper)" stroke="#5e3415" strokeWidth="3" />
          <ellipse cx="100" cy="42" rx="78" ry="18" fill="none" stroke="#e8b878" strokeWidth="3" />
          <rect x="60" y="118" width="80" height="10" rx="5" fill="#3a2410" />
        </svg>
        <div className="simya-flames"><span /><span /><span /></div>
      </div>

      {/* Kontroller */}
      <div className="simya-controls">
        <button className="simya-swap" onClick={onSwap} disabled={slots.filter(Boolean).length < 2}>↔ Takas</button>
        <button className="simya-boil" onClick={onBoil} disabled={!canBoil}>🔥 KAYNAT</button>
      </div>
    </div>
  );
}

// ── Keşif kartı (parşömen) ──
export function DiscoveryCard({ combo, pieceById, onClose, onCollect, collected, bonus }) {
  if (!combo) return null;
  return (
    <div className="simya-discovery-backdrop" onClick={onClose}>
      <div className="simya-scroll" onClick={(e) => e.stopPropagation()}>
        {bonus && <div className="simya-bonus-tag">✨ Beklenmedik keşif! +5</div>}
        <div className="simya-scroll-en">{combo.en}</div>
        <div className="simya-scroll-tr">{combo.tr}</div>
        <div className="simya-scroll-parts">
          {combo.parts.map((pid, i) => {
            const p = pieceById.get(pid);
            return (
              <span key={i} className="simya-part-chip">
                {p?.text} <small>{p?.tr}</small>
              </span>
            );
          })}
        </div>
        {combo.note && <p className="simya-scroll-note">📜 {combo.note}</p>}
        <div className="simya-scroll-actions">
          <button className="simya-mini-btn" onClick={onCollect} disabled={collected}>
            {collected ? '✓ Koleksiyonda' : '+ Koleksiyona ekle'}
          </button>
          <button className="simya-mini-btn primary" onClick={onClose}>Devam</button>
        </div>
      </div>
    </div>
  );
}

// ── Kodeks (parşömen defter; aileler) ──
export function Codex({ data, index, discovered, onClose }) {
  const fams = new Map();
  for (const c of data.combos) {
    const fam = familyOf(index, c);
    if (!fams.has(fam.id)) fams.set(fam.id, { ...fam, combos: [] });
    fams.get(fam.id).combos.push(c);
  }
  const famList = [...fams.values()].sort((a, b) => b.combos.length - a.combos.length);
  const total = data.combos.length;
  const found = Object.keys(discovered).length;
  return (
    <div className="simya-codex-backdrop" onClick={onClose}>
      <div className="simya-codex" onClick={(e) => e.stopPropagation()}>
        <div className="simya-codex-head">
          <h3>📜 Kodeks <span className="simya-codex-count">{found}/{total}</span></h3>
          <button className="simya-codex-close" onClick={onClose}>✕</button>
        </div>
        {famList.map(fam => {
          const got = fam.combos.filter(c => discovered[c.en]).length;
          return (
            <div key={fam.id} className="simya-fam">
              <h4>{fam.label} ailesi <small>({fam.tr})</small> <span className="simya-fam-prog">{got}/{fam.combos.length}</span></h4>
              <div className="simya-fam-words">
                {fam.combos.map(c => discovered[c.en] ? (
                  <span key={c.en} className="simya-fam-word found" title={c.tr}>{c.en}</span>
                ) : (
                  <span key={c.en} className="simya-fam-word locked">???</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

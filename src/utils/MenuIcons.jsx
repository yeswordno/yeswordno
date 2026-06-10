// Menü ikonları — emoji yerine temiz çizgi-sanat SVG'ler.
// Renk currentColor'dan gelir: mor gradyan üstünde beyaz, beyaz buton içinde koyu.

// Kelime Avcısı: çapraz bulmaca ızgarası (3×3) — bazı kareler dolu (çengel hissi)
export function PuzzleIcon({ size = 64, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* dış çerçeve */}
      <rect x="8" y="8" width="48" height="48" rx="9"
        stroke={color} strokeWidth="3.2" />
      {/* iç ızgara çizgileri */}
      <path d="M24 9 V55 M40 9 V55 M9 24 H55 M9 40 H55"
        stroke={color} strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
      {/* dolu kareler (çengel kareleri gibi, köşegen düzen) */}
      <rect x="10" y="10" width="12" height="12" rx="3" fill={color} />
      <rect x="26" y="26" width="12" height="12" rx="3" fill={color} />
      <rect x="42" y="42" width="12" height="12" rx="3" fill={color} />
    </svg>
  );
}

// Günlük Düello: çapraz kılıçlar — çizgi sanat, yuvarlak kabzalar
export function DuelIcon({ size = 64, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Kılıç 1: sol-üst uç → sağ-alt kabza */}
      <path d="M12 12 L40 40" stroke={color} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M34 42 L42 34" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="45.5" cy="45.5" r="4.2" stroke={color} strokeWidth="3" />
      {/* Kılıç 2: sağ-üst uç → sol-alt kabza */}
      <path d="M52 12 L24 40" stroke={color} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M22 34 L30 42" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="18.5" cy="45.5" r="4.2" stroke={color} strokeWidth="3" />
    </svg>
  );
}

// Kâbus Modu: klasik hayalet silüeti — dalgalı etek, iki yuvarlak göz
export function GhostIcon({ size = 64, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* gövde + dalgalı alt kenar */}
      <path d="M14 30 a18 18 0 0 1 36 0 V52
               l-5 -4 l-5 4 l-5 -4 l-5 4 l-5 -4 l-5 4 l-6 -4 Z"
        stroke={color} strokeWidth="3.2" strokeLinejoin="round" />
      {/* gözler */}
      <circle cx="25" cy="29" r="3.4" fill={color} />
      <circle cx="39" cy="29" r="3.4" fill={color} />
    </svg>
  );
}

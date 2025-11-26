// src/utils/FlagIcons.jsx

export const TrFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" className="real-flag">
    {/* Kırmızı Zemin */}
    <path fill="#E30A17" d="M0 0h1200v800H0z"/>
    {/* Beyaz Daire (Hilalin dışı) */}
    <circle cx="450" cy="400" r="200" fill="#ffffff"/>
    {/* Kırmızı Daire (Hilalin içi - kesik kısım) */}
    <circle cx="510" cy="400" r="160" fill="#E30A17"/>
    {/* Yıldız (Hassas koordinatlı) */}
    <polygon 
      fill="#ffffff" 
      points="683.4,329.6 695.7,402.4 641.4,451.7 714.2,451.7 739.1,521.9 764,451.7 836.8,451.7 782.5,402.4 794.8,329.6 739.1,364.5" 
      transform="rotate(2 739.1 400)" 
    />
  </svg>
);

export const GbFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="real-flag">
    <clipPath id="s">
      <path d="M0,0 v30 h60 v-30 z"/>
    </clipPath>
    <clipPath id="t">
      <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/>
    </clipPath>
    <g clipPath="url(#s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);
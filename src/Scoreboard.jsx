import { useState, useEffect } from 'react';
import './Scoreboard.css';
import { isRegistered, getNick, getEmoji, register, fetchLeaderboard } from './utils/leaderboard';

const EMOJIS = ['👑', '🦁', '🐯', '🐉', '🦅', '🐺', '🔥', '⚡', '🎯', '🧠', '🚀', '😎'];

const ERR_TR = {
  'nick-dolu': 'Bu takma ad alınmış, başka bir tane dene.',
  'nick-kisa': 'Takma ad en az 2 harf olmalı.',
  'nick-uygunsuz': 'Bu takma ad uygun değil, başka bir tane seç.',
  'backend-yok': 'Skor tablosu henüz hazır değil (sunucu bağlı değil).',
  'eksik': 'Bilgiler eksik.',
};

export default function Scoreboard({ onClose }) {
  // Görünüm: kayıtsızsa "onboard", kayıtlıysa "board"
  const [view, setView] = useState(isRegistered() ? 'board' : 'onboard');
  const [tab, setTab] = useState('day');           // 'day' | 'week'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Onboarding alanları
  const [nick, setNick] = useState(getNick() || '');
  const [emoji, setEmoji] = useState(getEmoji() || '👑');
  const [saving, setSaving] = useState(false);

  const load = (which) => {
    setLoading(true);
    setError('');
    fetchLeaderboard(which)
      .then(setData)
      .catch(() => setError('Tablo yüklenemedi. Bağlantını kontrol et.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (view === 'board') load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tab]);

  const doRegister = async () => {
    const n = nick.trim();
    if (n.length < 2) { setError(ERR_TR['nick-kisa']); return; }
    setSaving(true);
    setError('');
    try {
      await register(n, emoji);
      setView('board');
    } catch (e) {
      setError(ERR_TR[e.message] || 'Kayıt başarısız, tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`);

  return (
    <div className="sb-root" onClick={onClose}>
      <div className="sb-card" onClick={(e) => e.stopPropagation()}>
        <button className="sb-close" onClick={onClose}>✕</button>

        {view === 'onboard' ? (
          <div className="sb-onboard">
            <div className="sb-title">🏆 Skor Tablosuna Katıl</div>
            <p className="sb-sub">Bir takma ad ve simge seç — şifre yok, cihazın hatırlar.</p>

            <input
              className="sb-input"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Takma adın"
              maxLength={20}
              autoFocus
            />

            <div className="sb-emoji-grid">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  className={`sb-emoji${emoji === em ? ' sel' : ''}`}
                  onClick={() => setEmoji(em)}
                >
                  {em}
                </button>
              ))}
            </div>

            {error && <div className="sb-error">{error}</div>}

            <button className="sb-primary" onClick={doRegister} disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Başla'}
            </button>
            <button className="sb-skip" onClick={onClose}>Şimdilik geç</button>
          </div>
        ) : (
          <div className="sb-board">
            <div className="sb-title">🏆 Skor Tablosu</div>

            <div className="sb-tabs">
              <button className={`sb-tab${tab === 'day' ? ' on' : ''}`} onClick={() => setTab('day')}>Günlük</button>
              <button className={`sb-tab${tab === 'week' ? ' on' : ''}`} onClick={() => setTab('week')}>Haftalık</button>
            </div>

            {loading && <div className="sb-info">Yükleniyor…</div>}
            {error && <div className="sb-error">{error}</div>}

            {!loading && data && (
              <>
                {data.list.length === 0 ? (
                  <div className="sb-info">Henüz skor yok — ilk sen ol! 🎯</div>
                ) : (
                  <div className="sb-list">
                    {data.list.map((r) => (
                      <div key={r.rank} className={`sb-row${r.me ? ' me' : ''}${r.rank === 1 ? ' first' : ''}`}>
                        <span className="sb-rank">{medal(r.rank)}</span>
                        <span className="sb-nick">
                          <span className="sb-av">{r.emoji}</span>
                          {r.nick}{r.rank === 1 ? ' 👑' : ''}{r.me ? ' (sen)' : ''}
                        </span>
                        <span className="sb-score">{r.score}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* İlk 20 dışındaysan kendi sıran */}
                {data.me && (
                  <div className="sb-me-row">
                    <span className="sb-rank">{data.me.rank}</span>
                    <span className="sb-nick"><span className="sb-av">{data.me.emoji}</span>{data.me.nick} (sen)</span>
                    <span className="sb-score">{data.me.score}</span>
                  </div>
                )}
              </>
            )}

            <button className="sb-skip" onClick={() => setView('onboard')}>Takma adı/simgeyi değiştir</button>
          </div>
        )}
      </div>
    </div>
  );
}

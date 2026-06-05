import { useState, useEffect } from 'react';
import './Scoreboard.css';
import { fetchLeaderboard } from './utils/leaderboard';

// Günlük Düello ekranında gösterilen kompakt ilk-5 önizleme.
// "Tümünü Gör" tam tabloyu (modal) açar.
export default function ScoreboardPreview({ onExpand }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // 'loading' | 'ok' | 'error'

  useEffect(() => {
    let alive = true;
    fetchLeaderboard('day')
      .then((d) => { if (alive) { setData(d); setState('ok'); } })
      .catch(() => { if (alive) setState('error'); });
    return () => { alive = false; };
  }, []);

  const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `${r}`);
  const top = (data?.list || []).slice(0, 5);

  return (
    <div className="sb-preview">
      <div className="sb-preview-head">🏆 Günün Sıralaması</div>

      {state === 'loading' && <div className="sb-preview-info">Yükleniyor…</div>}
      {state === 'error' && <div className="sb-preview-info">Sıralama şu an yüklenemedi</div>}
      {state === 'ok' && (
        top.length === 0 ? (
          <div className="sb-preview-info">Henüz skor yok — ilk sen ol! 🎯</div>
        ) : (
          <div className="sb-preview-list">
            {top.map((r) => (
              <div key={r.rank} className={`sb-prow${r.me ? ' me' : ''}${r.rank === 1 ? ' first' : ''}`}>
                <span className="sb-prank">{medal(r.rank)}</span>
                <span className="sb-pnick">
                  <span className="sb-pav">{r.emoji}</span>{r.nick}{r.rank === 1 ? ' 👑' : ''}
                </span>
                <span className="sb-pscore">{r.score}</span>
              </div>
            ))}
          </div>
        )
      )}

      <button className="sb-preview-btn" onClick={onExpand}>Tümünü Gör →</button>
    </div>
  );
}

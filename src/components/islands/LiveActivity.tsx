import { useEffect, useState } from 'react';

interface GhEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload?: any;
}

function describe(e: GhEvent): string {
  switch (e.type) {
    case 'PushEvent': {
      const ref = e.payload?.ref?.replace('refs/heads/', '') ?? '';
      return `push 到 ${ref}`;
    }
    case 'CreateEvent':
      return `建立 ${e.payload?.ref_type ?? 'ref'}`;
    case 'IssuesEvent':
      return `${e.payload?.action ?? ''} issue`;
    case 'PullRequestEvent':
      return `${e.payload?.action ?? ''} PR`;
    case 'WatchEvent':
      return 'starred';
    case 'ForkEvent':
      return 'forked';
    case 'DeleteEvent':
      return `刪除 ${e.payload?.ref_type ?? 'ref'}`;
    default:
      return e.type.replace('Event', '');
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小時前`;
  const days = Math.floor(hrs / 24);
  return `${days} 天前`;
}

export default function LiveActivity() {
  const [events, setEvents] = useState<GhEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = () => {
    fetch('https://api.github.com/users/justin-cyhuang/events/public?per_page=1', {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        setEvents(data);
        setError(false);
        setLastFetch(new Date());
      })
      .catch(() => setError(true));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(id);
  }, []);

  return (
    <div className="live-activity">
      <div className="la-head">
        <span className="dot" />
        <strong>GitHub 即時動態</strong>
        <button onClick={load} className="refresh" title="重新整理">↻</button>
      </div>

      {error && <p className="muted">連不到 GitHub API（可能被 rate limit），稍後再試。</p>}
      {!error && events === null && <p className="muted">載入中…</p>}
      {!error && events?.length === 0 && <p className="muted">最近沒有公開活動。</p>}

      {!error && events && events.length > 0 && (
        <ul className="feed">
          <li key={events[0].id}>
            <span className="repo">{events[0].repo.name.replace('justin-cyhuang/', '')}</span>
            <span className="action">{describe(events[0])}</span>
            <span className="time">{timeAgo(events[0].created_at)}</span>
          </li>
        </ul>
      )}

      {lastFetch && (
        <p className="fetched-at">上次抓取：{lastFetch.toLocaleTimeString('zh-TW')}（每 5 分鐘自動更新）</p>
      )}

      <style>{`
        .live-activity {
          background: var(--bg-elevated, #181b22);
          border: 1px solid var(--border, #2a2f3a);
          border-radius: 8px;
          padding: 1rem 1.25rem;
        }
        .la-head {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 6px #4ade80;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .refresh {
          margin-left: auto;
          background: transparent;
          border: 1px solid var(--border, #2a2f3a);
          color: var(--accent, #7dd3fc);
          border-radius: 4px;
          cursor: pointer;
          padding: 0.15rem 0.5rem;
          font-size: 0.9rem;
        }
        .refresh:hover { background: var(--border, #2a2f3a); }
        .feed { list-style: none; margin: 0; padding: 0; }
        .feed li {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.4rem 0;
          border-bottom: 1px solid var(--border, #2a2f3a);
          font-size: 0.9rem;
        }
        .feed li:last-child { border-bottom: none; }
        .repo { color: var(--accent-strong, #38bdf8); font-weight: 600; }
        .action { color: var(--text, #e6e6e6); }
        .time { margin-left: auto; color: var(--text-muted, #8a909c); font-size: 0.8rem; }
        .muted { color: var(--text-muted, #8a909c); font-size: 0.9rem; }
        .fetched-at { margin: 0.5rem 0 0; font-size: 0.75rem; color: var(--text-muted, #8a909c); }
      `}</style>
    </div>
  );
}

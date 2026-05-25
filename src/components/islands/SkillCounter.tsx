import { useState } from 'react';

export default function SkillCounter({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial);
  return (
    <div className="counter">
      <p>
        我跑了 <strong>{count}</strong> 個 skill。
      </p>
      <button onClick={() => setCount(count + 1)}>跑一個 +1</button>
      <button
        onClick={() => setCount(0)}
        style={{ marginLeft: '0.5rem' }}
      >
        重置
      </button>
      <style>{`
        .counter {
          padding: 1rem 1.25rem;
          background: var(--bg-elevated, #181b22);
          border: 1px dashed var(--accent, #7dd3fc);
          border-radius: 8px;
        }
        .counter p { margin: 0 0 0.5rem; }
        .counter button {
          background: transparent;
          color: var(--accent, #7dd3fc);
          border: 1px solid var(--accent, #7dd3fc);
          border-radius: 4px;
          padding: 0.35rem 0.75rem;
          cursor: pointer;
          font: inherit;
        }
        .counter button:hover {
          background: var(--accent, #7dd3fc);
          color: var(--bg, #0f1115);
        }
      `}</style>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Stage } from '@/components/screen/Stage';
import { PLAY_SEGMENTS } from '@/lib/scoring/quiz';
import { rulesFor } from '@/lib/round-rules';

/**
 * One page of rules on the projector before a round. The prelim page also shows the four quiz
 * categories as cards in their colours, so teams recognise them when the questions start.
 */
export function RulesScreen({ phase }: { phase: string }) {
  const r = rulesFor(phase);
  const prelim = r.art === 'prelim';
  const [host, setHost] = useState('');
  useEffect(() => setHost(window.location.host), []);
  return (
    <Stage art={r.art} artOpacity={0.1}>
      <div className="flex h-full flex-col px-[6cqw] pt-[6cqh] pb-[5cqh]">
        <p className="text-[1.4cqw] font-semibold tracking-[0.35em] text-glow uppercase">{r.eyebrow}</p>
        <h1 className="display metal mt-[1cqh] text-[5.2cqw] leading-none">{r.title}</h1>

        {prelim && (
          <ol className="mt-[3.5cqh] grid grid-cols-4 gap-[1.6cqw]">
            {PLAY_SEGMENTS.map((s) => (
              <li key={s.id} className="flex flex-col rounded-[0.4cqw] border-t-[0.8cqh] bg-vault/85 px-[1.4cqw] py-[1.8cqh]" style={{ borderColor: s.color, boxShadow: `inset 0 0 0 1px ${s.color}55` }}>
                <span className="num text-[1.2cqw] font-semibold tracking-[0.25em] uppercase" style={{ color: s.color }}>
                  {s.order} · {s.colorName}
                </span>
                <span className="display mt-[1cqh] text-[2cqw] leading-tight" style={{ color: s.color }}>{s.label}</span>
                <span className="mt-[1.2cqh] text-[1.35cqw] leading-snug text-bone/90">{s.instruction}</span>
                <span className="num mt-auto pt-[1.4cqh] text-[1.2cqw] text-steel">
                  {s.timerS} s{s.weight > 1 ? ` · ×${s.weight} points` : ''} · {s.id === 'hero_business' ? 3 : 4} questions
                </span>
              </li>
            ))}
          </ol>
        )}

        <ol className={`${prelim ? 'mt-[3.5cqh] space-y-[1.4cqh] text-[1.75cqw]' : 'mt-[5cqh] space-y-[2.2cqh] text-[2.2cqw]'} leading-snug text-bone`}>
          {r.rules.map((line, i) => (
            <li key={i} className="flex gap-[1.4cqw]">
              <span className="num w-[2.4cqw] flex-none font-semibold text-glow">{i + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>

        {prelim && host && (
          <p className="mt-auto text-[1.8cqw] text-bone">
            Captains: sign in at <span className="num font-semibold text-glow">{host}/login</span>
          </p>
        )}
      </div>
    </Stage>
  );
}

import Image from 'next/image';
import ambient from '@/assets/art/ambient.jpg';
import { Scene, type SceneName } from '@/components/art/Scene';

/**
 * A 16:9 projector stage that fills the screen without stretching. Everything inside is sized
 * in container units (cqw/cqh), so the same layout reads the same on any projector. Behind it
 * sits the round's picture (or the poster's green haze), kept dark so text stays readable from
 * the back of the hall.
 */
export function Stage({
  children,
  art,
  backdrop,
  artOpacity = 0.14,
}: {
  children: React.ReactNode;
  /** The round's picture, shown dim behind everything. */
  art?: SceneName;
  /** A backdrop of the screen's own (shown as it is, in place of the dim art or haze). */
  backdrop?: React.ReactNode;
  /** How strongly the round's picture shows (0–1). */
  artOpacity?: number;
}) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-black">
      <div
        className="relative overflow-hidden bg-abyss text-bone [container-type:size]"
        style={{ width: 'min(100vw, calc(100vh * 16 / 9))', height: 'min(100vh, calc(100vw * 9 / 16))' }}
      >
        {backdrop ? (
          backdrop
        ) : art ? (
          <div className="pointer-events-none absolute inset-0" style={{ opacity: artOpacity }}>
            <Scene name={art} className="absolute inset-0" sizes="100vw" />
          </div>
        ) : (
          <Image src={ambient} alt="" fill sizes="100vw" className="pointer-events-none object-cover opacity-35" aria-hidden="true" />
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 55% at 50% -5%, rgb(169 207 110 / 0.12), transparent 70%), radial-gradient(80% 45% at 50% 115%, rgb(110 143 69 / 0.26), transparent 70%), radial-gradient(75% 75% at 50% 50%, transparent 40%, rgb(8 10 7 / 0.85))',
          }}
        />
        <div aria-hidden="true" className="streaks pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  );
}

import { notFound } from 'next/navigation';
import { SCENE_NAMES } from '@/components/art/scene-names';
import { SceneDrawing } from '@/components/art/SceneDrawing';

export const metadata = { title: 'Scene art (development only)' };

/**
 * Development only: the scene drawings at 1600 × 900, for scripts/art/render-scenes.cjs to
 * photograph into assets/art/scene-*.jpg. Not served in production.
 */
export default function SceneArtPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <div className="grid w-[1600px] gap-0">
      {/* No film grain or dev overlay in the photographs: the site adds its own grain on top. */}
      <style>{'.grain::after, nextjs-portal { display: none !important; }'}</style>
      {SCENE_NAMES.map((n) => (
        <SceneDrawing key={n} name={n} className="h-[900px] w-[1600px]" />
      ))}
    </div>
  );
}

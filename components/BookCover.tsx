import { CoverFace, COVERS } from "@/components/welcome/covers";

/**
 * A book's cover: the drawn cover of the first screen's wall (title and author across the top, one
 * picture below) for the books that have one, and a plain gradient with the title for any that do
 * not yet. It fills the width it is given; the title and author are always real text.
 */
export function BookCover({ slug, title, author, hue, className = "" }: { slug: string; title: string; author?: string; hue: number; className?: string }) {
  const cover = COVERS[slug];
  if (cover) return <CoverFace cover={cover} className={className} />;
  return (
    <div
      className={`relative flex aspect-[2/3] flex-col justify-between overflow-hidden rounded-[10px] p-3.5 text-white shadow-[0_6px_18px_-8px_rgba(29,26,22,0.55)] ${className}`}
      style={{ background: `linear-gradient(160deg, hsl(${hue} 46% 36%), hsl(${(hue + 28) % 360} 52% 24%))` }}
    >
      <div className="h-[3px] w-8 rounded-full bg-white/70" aria-hidden />
      <div>
        <p className="font-reading text-[19px] font-bold leading-[1.15] tracking-[-0.01em]">{title}</p>
        {author && <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/75">{author}</p>}
      </div>
    </div>
  );
}

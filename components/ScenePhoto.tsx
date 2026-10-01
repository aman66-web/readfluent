import { useId } from "react";

/**
 * A stand-in for a page's photograph, drawn from the scene number so every scene
 * looks different and the same scene always looks the same. TEMPORARY: the real
 * photos are generated, one pool of 200 per book (SPEC.md §7), and arrive with the
 * content pipeline (M2). The caption says so, so nobody mistakes it for the product.
 */
export function ScenePhoto({ n, hue, caption, className = "" }: { n: number; hue: number; caption: string; className?: string }) {
  const id = useId();
  // A small deterministic shuffle: no Math.random, so server and client agree.
  const r = (k: number) => ((Math.sin(n * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
  const h1 = (hue + n * 17) % 360;
  const h2 = (h1 + 38) % 360;
  const sunX = 70 + r(1) * 260;
  const sunY = 62 + r(2) * 52;
  const ridge = (base: number, amp: number, k: number) => {
    const pts = Array.from({ length: 6 }, (_, i) => `${i * 80},${base - r(k + i) * amp}`);
    return `M0,300 L0,${base - r(k) * amp} ${pts.map((p) => `L${p}`).join(" ")} L400,300 Z`;
  };
  return (
    <div className={`relative overflow-hidden ${className}`} role="img" aria-label={`Photo placeholder: ${caption}`}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`hsl(${h1} 62% 80%)`} />
            <stop offset="1" stopColor={`hsl(${h2} 70% 90%)`} />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill={`url(#${id}-sky)`} />
        <circle cx={sunX} cy={sunY} r={26 + r(3) * 14} fill={`hsl(${(h1 + 160) % 360} 80% 94%)`} opacity="0.9" />
        <path d={ridge(200, 60, 10)} fill={`hsl(${h2} 38% 62%)`} opacity="0.75" />
        <path d={ridge(235, 50, 20)} fill={`hsl(${h1} 34% 46%)`} opacity="0.85" />
        <path d={ridge(272, 36, 30)} fill={`hsl(${h1} 30% 28%)`} />
      </svg>
      <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
        Photo placeholder · {caption}
      </span>
    </div>
  );
}

/** A coin: gold, with a small star, for prices and the balance. */
export function Coin({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs><linearGradient id="coin-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE08A" /><stop offset="1" stopColor="#F2A900" /></linearGradient></defs>
      <circle cx="12" cy="12" r="10.5" fill="url(#coin-g)" stroke="#C98500" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="7.3" fill="none" stroke="#FFF3C4" strokeWidth="1.1" opacity=".8" />
      <path d="M12 7.6l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="#FFF7DA" />
    </svg>
  );
}

/**
 * Whether a classic's original is in the public domain, so that its jacket may say so (components/book/BookView.tsx).
 * A retelling of a book still in copyright somewhere must not be called public domain, whatever the shelf it is on.
 *
 * Two tests, and a book must pass both, counted from RIGHTS_YEAR:
 *  - life + 70 (the UK, the EU and most of the world): the author died 71 or more years before, so died in 1955 or
 *    earlier for 2026. A text with no named author (scripture, a tradition) counts from when it was written.
 *  - the USA: the original was first published 96 or more years before, so in 1930 or earlier for 2026.
 * The year is fixed, not read from the clock, so the label cannot change between the server's render and the
 * phone's; a year left unmoved only ever says "public domain" less often, never more.
 *
 * Every classic in the library is listed (tests/unit/content-rights.test.ts fails until a new one is); a book missing
 * from here is never called public domain. Years before Christ are negative; ancient dates are the usual estimates.
 * Only the original is judged: a retelling is written from the original, never from a modern translation of it.
 */
export const RIGHTS_YEAR = 2026;

export interface Original {
  /** The year the author died, or null for a text with no named author (scripture, a tradition). */
  died: number | null;
  /** The year the original was first published (or written down, for an ancient text). */
  published: number;
}

export const ORIGINALS: Readonly<Record<string, Original>> = {
  // Romance
  "pride-and-prejudice": { died: 1817, published: 1813 },
  "persuasion": { died: 1817, published: 1817 },
  "emma": { died: 1817, published: 1815 },
  "sense-and-sensibility": { died: 1817, published: 1811 },
  "mansfield-park": { died: 1817, published: 1814 },
  "northanger-abbey": { died: 1817, published: 1817 },
  "jane-eyre": { died: 1855, published: 1847 },
  "wuthering-heights": { died: 1848, published: 1847 },
  "north-and-south": { died: 1865, published: 1855 },
  "anne-of-green-gables": { died: 1942, published: 1908 },
  "far-from-the-madding-crowd": { died: 1928, published: 1874 },
  "the-age-of-innocence": { died: 1937, published: 1920 },
  "cyrano-de-bergerac": { died: 1918, published: 1897 },
  "little-women": { died: 1888, published: 1868 },
  "romeo-and-juliet": { died: 1616, published: 1597 },
  "the-lady-of-the-camellias": { died: 1895, published: 1848 },
  // Crime
  "the-hound-of-the-baskervilles": { died: 1930, published: 1902 },
  "a-study-in-scarlet": { died: 1930, published: 1887 },
  "the-sign-of-the-four": { died: 1930, published: 1890 },
  "the-adventures-of-sherlock-holmes": { died: 1930, published: 1892 },
  "the-memoirs-of-sherlock-holmes": { died: 1930, published: 1893 },
  "the-return-of-sherlock-holmes": { died: 1930, published: 1905 },
  "the-valley-of-fear": { died: 1930, published: 1915 },
  "the-moonstone": { died: 1889, published: 1868 },
  "the-woman-in-white": { died: 1889, published: 1860 },
  "the-murders-in-the-rue-morgue": { died: 1849, published: 1841 },
  "the-purloined-letter": { died: 1849, published: 1844 },
  "the-gold-bug": { died: 1849, published: 1843 },
  "the-innocence-of-father-brown": { died: 1936, published: 1911 },
  "the-wisdom-of-father-brown": { died: 1936, published: 1914 },
  "the-mystery-of-the-yellow-room": { died: 1927, published: 1907 },
  "arsene-lupin-gentleman-burglar": { died: 1941, published: 1907 },
  "the-thirty-nine-steps": { died: 1940, published: 1915 },
  "the-leavenworth-case": { died: 1935, published: 1878 },
  // Fantasy and science fiction
  "alice-s-adventures-in-wonderland": { died: 1898, published: 1865 },
  "through-the-looking-glass": { died: 1898, published: 1871 },
  "the-wonderful-wizard-of-oz": { died: 1919, published: 1900 },
  "the-time-machine": { died: 1946, published: 1895 },
  "the-war-of-the-worlds": { died: 1946, published: 1898 },
  "the-invisible-man": { died: 1946, published: 1897 },
  "the-island-of-doctor-moreau": { died: 1946, published: 1896 },
  "the-first-men-in-the-moon": { died: 1946, published: 1901 },
  "the-sleeper-awakes": { died: 1946, published: 1899 },
  "frankenstein": { died: 1851, published: 1818 },
  "dracula": { died: 1912, published: 1897 },
  "twenty-thousand-leagues-under-the-sea": { died: 1905, published: 1870 },
  "journey-to-the-center-of-the-earth": { died: 1905, published: 1864 },
  "the-wind-in-the-willows": { died: 1932, published: 1908 },
  "the-jungle-book": { died: 1936, published: 1894 },
  "strange-case-of-dr-jekyll-and-mr-hyde": { died: 1894, published: 1886 },
  "a-christmas-carol": { died: 1870, published: 1843 },
  "the-picture-of-dorian-gray": { died: 1900, published: 1890 },
  // Self-help
  "as-a-man-thinketh": { died: 1912, published: 1903 },
  "self-reliance": { died: 1882, published: 1841 },
  "how-to-live-on-24-hours-a-day": { died: 1931, published: 1908 },
  "self-help": { died: 1904, published: 1859 },
  "character": { died: 1904, published: 1871 },
  "walden": { died: 1862, published: 1854 },
  "walking": { died: 1862, published: 1862 },
  "the-art-of-living-long": { died: 1566, published: 1558 },
  // Business and money
  "the-richest-man-in-babylon": { died: 1957, published: 1926 }, // George S. Clason: in copyright in the UK and the EU until 1 January 2028.
  "the-science-of-getting-rich": { died: 1911, published: 1910 },
  "acres-of-diamonds": { died: 1925, published: 1890 },
  "the-way-to-wealth": { died: 1790, published: 1758 },
  "advice-to-a-young-tradesman": { died: 1790, published: 1748 },
  "the-art-of-war": { died: -496, published: -500 },
  "the-prince": { died: 1527, published: 1532 },
  "the-wealth-of-nations": { died: 1790, published: 1776 },
  "the-art-of-money-getting": { died: 1891, published: 1880 },
  "the-gospel-of-wealth": { died: 1919, published: 1889 },
  "the-principles-of-scientific-management": { died: 1915, published: 1911 },
  // Religion and spirituality
  "the-dhammapada": { died: null, published: -250 },
  "tao-te-ching": { died: null, published: -400 },
  "the-bhagavad-gita": { died: null, published: -200 },
  "the-sermon-on-the-mount": { died: null, published: 85 },
  "the-book-of-proverbs": { died: null, published: -500 },
  "the-book-of-psalms": { died: null, published: -300 },
  "the-book-of-job": { died: null, published: -400 },
  "the-upanishads": { died: null, published: -500 },
  "the-little-flowers-of-saint-francis": { died: null, published: 1390 },
  "meditations": { died: 180, published: 180 },
  "the-prophet": { died: 1931, published: 1923 },
  "the-analects-of-confucius": { died: -479, published: -400 },
  "the-enchiridion": { died: 135, published: 125 },
  "the-imitation-of-christ": { died: 1471, published: 1427 },
  "letters-from-a-stoic": { died: 65, published: 65 },
  "the-rubaiyat-of-omar-khayyam": { died: 1131, published: 1120 },
  // History
  "the-histories": { died: -425, published: -430 },
  "the-gallic-war": { died: -44, published: -50 },
  "plutarch-s-lives": { died: 120, published: 100 },
  "the-travels-of-marco-polo": { died: 1324, published: 1300 },
  "narrative-of-the-life-of-frederick-douglass": { died: 1895, published: 1845 },
  "up-from-slavery": { died: 1915, published: 1901 },
  "the-autobiography-of-benjamin-franklin": { died: 1790, published: 1791 },
  "twelve-years-a-slave": { died: 1863, published: 1853 }, // Solomon Northup: the year of his death is not known; he is last recorded in 1857.
  "history-of-the-peloponnesian-war": { died: -400, published: -400 },
  "the-decline-and-fall-of-the-roman-empire": { died: 1794, published: 1776 },
  "common-sense": { died: 1809, published: 1776 },
  "a-journal-of-the-plague-year": { died: 1731, published: 1722 },
  "the-diary-of-samuel-pepys": { died: 1703, published: 1825 },
  // Science
  "on-the-origin-of-species": { died: 1882, published: 1859 },
  "the-voyage-of-the-beagle": { died: 1882, published: 1839 },
  "the-descent-of-man": { died: 1882, published: 1871 },
  "the-expression-of-the-emotions-in-man-and-animals": { died: 1882, published: 1872 },
  "the-chemical-history-of-a-candle": { died: 1867, published: 1861 },
  "relativity-the-special-and-general-theory": { died: 1955, published: 1916 }, // Albert Einstein: life + 70 ran out on 1 January 2026.
  "experiments-on-plant-hybridisation": { died: 1884, published: 1866 },
  "the-sidereal-messenger": { died: 1642, published: 1610 },
  "micrographia": { died: 1703, published: 1665 },
};

/** Whether the original of the book with this slug is in the public domain in `year` (see the top of this file). Unknown: no. */
export function inPublicDomain(slug: string, year: number = RIGHTS_YEAR): boolean {
  const o = ORIGINALS[slug];
  if (!o) return false;
  return (o.died ?? o.published) <= year - 71 && o.published <= year - 96;
}

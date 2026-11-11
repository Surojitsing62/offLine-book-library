// Gutendex client. Responses are slimmed to only what the UI renders,
// so cached and saved rows stay tiny.
export type Book = {
  id: number;
  title: string;
  authors: string[];
  languages: string[];
  subjects: string[];
  bookshelves: string[];
  downloadCount: number;
  coverUrl: string | null;
  formats: Record<string, string>; // label -> url
};

const BASE = 'https://gutendex.com/books/';

const FORMAT_LABELS: [string, string][] = [
  ['application/epub+zip', 'EPUB'],
  ['application/x-mobipocket-ebook', 'Kindle'],
  ['text/html', 'HTML'],
  ['text/plain', 'Plain text'],
  ['application/pdf', 'PDF'],
];

const flipName = (n: string) => {
  const [last, first] = n.split(',').map((s) => s.trim());
  return first ? `${first} ${last}` : n;
};

function slim(raw: any): Book {
  const formats: Record<string, string> = {};
  for (const [mime, label] of FORMAT_LABELS) {
    const key = Object.keys(raw.formats ?? {}).find((k) => k.startsWith(mime));
    if (key && !formats[label]) formats[label] = raw.formats[key];
  }
  return {
    id: raw.id,
    title: raw.title ?? 'Untitled',
    authors: (raw.authors ?? []).map((a: any) => flipName(a.name)),
    languages: raw.languages ?? [],
    subjects: (raw.subjects ?? []).slice(0, 8),
    bookshelves: (raw.bookshelves ?? []).slice(0, 6).map((s: string) => s.replace(/^Category:\s*/, '')),
    downloadCount: raw.download_count ?? 0,
    coverUrl: raw.formats?.['image/jpeg'] ?? null,
    formats,
  };
}

async function get(url: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBooks(opts: { lang: string | null; topic: string | null; page: number }) {
  const q: string[] = ['sort=popular', `page=${opts.page}`];
  if (opts.lang) q.push(`languages=${opts.lang}`);
  if (opts.topic) q.push(`topic=${encodeURIComponent(opts.topic)}`);
  const json = await get(`${BASE}?${q.join('&')}`);
  return { books: (json.results as any[]).map(slim), hasMore: !!json.next };
}

export async function fetchBookById(id: number): Promise<Book | null> {
  const json = await get(`${BASE}?ids=${id}`);
  return json.results?.[0] ? slim(json.results[0]) : null;
}

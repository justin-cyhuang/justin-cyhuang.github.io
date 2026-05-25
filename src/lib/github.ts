/**
 * Build-time GitHub repo fetcher with fallback.
 * Called from index.astro at build time only — no client bundle impact.
 */

export interface Repo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  topics: string[];
  updated_at: string;
  stargazers_count: number;
}

export interface CategorizedRepos {
  category: string;
  repos: Repo[];
}

const USERNAME = 'justin-cyhuang';

// Category routing: first match wins. Last (empty) bucket = catch-all.
const CATEGORIES: Array<{ name: string; match: (r: Repo) => boolean }> = [
  {
    name: 'AI / Agents',
    match: (r) =>
      /agent|llm|hermes|gpt|ai/i.test(r.name) ||
      r.topics?.some((t) => /ai|agent|llm/.test(t)),
  },
  {
    name: 'Web / Site',
    match: (r) =>
      /\.github\.io$/.test(r.name) ||
      /website|site|web/i.test(r.name) ||
      r.language === 'Astro' ||
      r.language === 'HTML',
  },
  {
    name: 'Experiments & Notes',
    match: () => true, // catch-all
  },
];

// Fallback for when GitHub API is rate-limited (60 req/h unauth) or unreachable.
const FALLBACK: Repo[] = [
  {
    name: 'justin-cyhuang.github.io',
    description: "Justin's Workshop — this site you're reading right now.",
    html_url: 'https://github.com/justin-cyhuang/justin-cyhuang.github.io',
    language: 'Astro',
    topics: [],
    updated_at: new Date().toISOString(),
    stargazers_count: 0,
  },
];

export async function fetchRepos(): Promise<CategorizedRepos[]> {
  let repos: Repo[];
  try {
    const res = await fetch(
      `https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=100&type=public`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'justin-cyhuang.github.io build',
        },
      },
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    repos = data.map((r: any) => ({
      name: r.name,
      description: r.description,
      html_url: r.html_url,
      language: r.language,
      topics: r.topics ?? [],
      updated_at: r.updated_at,
      stargazers_count: r.stargazers_count ?? 0,
    }));
    if (repos.length === 0) repos = FALLBACK;
  } catch (err) {
    console.warn('[github.ts] fetch failed, using fallback:', err);
    repos = FALLBACK;
  }

  // Route each repo to the first matching category.
  const buckets = new Map<string, Repo[]>();
  for (const cat of CATEGORIES) buckets.set(cat.name, []);

  for (const repo of repos) {
    for (const cat of CATEGORIES) {
      if (cat.match(repo)) {
        buckets.get(cat.name)!.push(repo);
        break;
      }
    }
  }

  // Drop empty categories, keep declared order.
  return CATEGORIES.map((cat) => ({
    category: cat.name,
    repos: buckets.get(cat.name)!.sort(
      (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
    ),
  })).filter((c) => c.repos.length > 0);
}

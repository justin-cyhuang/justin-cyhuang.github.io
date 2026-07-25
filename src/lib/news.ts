import { promises as fs } from 'fs';
import path from 'path';

/**
 * Build-time reader for the latest daily international-news briefing.
 * Reads a pre-generated JSON snapshot (public/data/latest-news.json) that's
 * committed to the repo — NOT read live from the Obsidian Vault, because
 * GitHub Actions CI has no access to the Pi's local filesystem.
 *
 * To refresh: run `node scripts/sync-latest-news.mjs` locally (has vault
 * access) before pushing, or wire it into the daily cron job later.
 *
 * NOTE: uses process.cwd() rather than import.meta.url — Astro bundles this
 * module into dist/ at build time, which breaks relative-to-source-file paths.
 * process.cwd() is the project root regardless of where the bundled code lands.
 */

export interface NewsItem {
  source: string;
  title: string;
  excerpt: string;
  link: string;
}

export interface LatestNews {
  date: string;
  generatedAt: string;
  items: NewsItem[];
}

const DATA_PATH = path.join(process.cwd(), 'public/data/latest-news.json');

export async function fetchLatestNews(): Promise<LatestNews | null> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw) as LatestNews;
  } catch (err) {
    console.warn('[news.ts] no latest-news.json snapshot found:', (err as Error).message);
    return null;
  }
}

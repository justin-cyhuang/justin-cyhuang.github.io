#!/usr/bin/env node
/**
 * 從 Obsidian Vault 的每日國際新聞 md 抓最新一篇，轉成 public/data/latest-news.json
 * 供首頁 LatestNewsCard 在 build time 讀取（GitHub Actions 沒有 Vault 存取權，
 * 所以要在本機/Pi 上先跑這個腳本產生 snapshot，再 commit + push）。
 *
 * 用法：node scripts/sync-latest-news.mjs
 */
import { promises as fs } from 'fs';
import path from 'path';

const VAULT_DAILY_DIR = path.join(
  process.env.HOME || '/home/justin',
  'Documents/Obsidian Vault/Daily',
);
const OUT_PATH = path.join(process.cwd(), 'public/data/latest-news.json');

function parseNewsFile(content) {
  const pattern =
    /\d+\.\s*(\S+?)\s*—\s*\*\*(.+?)\*\*\n.*?\n\s*>\s*(.+?)\n\s*-\s*原始連結：(\S+)/gs;
  const items = [];
  let m;
  while ((m = pattern.exec(content)) !== null) {
    items.push({
      source: m[1].trim(),
      title: m[2].trim(),
      excerpt: m[3].trim(),
      link: m[4].trim(),
    });
  }
  return items;
}

async function main() {
  const files = (await fs.readdir(VAULT_DAILY_DIR)).filter((f) =>
    /^\d{4}-\d{2}-\d{2}-InternationalNews\.md$/.test(f),
  );
  if (files.length === 0) {
    console.error('找不到任何 InternationalNews.md 檔案於', VAULT_DAILY_DIR);
    process.exit(1);
  }
  files.sort();
  const latestFile = files[files.length - 1];
  const date = latestFile.slice(0, 10);
  const fullPath = path.join(VAULT_DAILY_DIR, latestFile);
  const content = await fs.readFile(fullPath, 'utf-8');
  const items = parseNewsFile(content);

  const snapshot = {
    date,
    generatedAt: new Date().toISOString(),
    items: items.slice(0, 5), // 首頁只放前 5 則，完整版仍在 Obsidian
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');
  console.log(`已寫入 ${OUT_PATH}（${items.length} 則新聞，取前 5 則，日期 ${date}）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

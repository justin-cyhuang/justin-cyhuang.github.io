/**
 * Highlights marquee 卡片資料。
 *
 * 維護方式：只要在下面的陣列增加/刪除/調整順序一個物件即可，
 * 元件（HighlightsMarquee.astro）不需要改動。
 * 圖片放在 public/images/highlights/ 底下，這裡填相對路徑（從 public 根目錄算）。
 * 若沒有圖片，icon 會當作備援顯示（見元件內的 fallback 邏輯）。
 */

export interface HighlightItem {
  /** 唯一識別，方便未來做 analytics 或 A/B 用 */
  id: string;
  /** 卡片標題 */
  title: string;
  /** 一行簡短描述，超過 2 行建議精簡 */
  description: string;
  /** 點擊後導向的連結（站內相對路徑或外部 URL） */
  href: string;
  /** public/ 底下的圖片路徑，例如 '/images/highlights/pillow-studio.png'；留空則用 icon 顯示 */
  image?: string;
  /** 沒有圖片時的備援 emoji icon */
  icon: string;
}

export const highlights: HighlightItem[] = [
  {
    id: 'pillow-studio',
    title: 'Pillow Studio',
    description: '瀏覽器內 3D 抱枕/馬克杯即時預覽，上傳圖片直接看印刷效果',
    href: '/pillow-studio/',
    icon: '🛋️',
  },
  {
    id: 'comfyui-guide',
    title: 'ComfyUI SD 指南',
    description: 'Stable Diffusion 完整工作流：Prompting、ControlNet、擴圖、多解析度',
    href: '/comfyui-sd-guide/',
    icon: '🎨',
  },
  {
    id: 'case-law',
    title: '台灣司法判例筆記',
    description: '民事/刑事/行政分類，一審到最終審判決同卡對照',
    href: '/case-law/',
    icon: '⚖️',
  },
  {
    id: 'daily-briefing',
    title: '跨來源新聞日報',
    description: '每天 08:00 自動彙整 10 則國際新聞 + 台中天氣，推送到 Discord',
    href: '#workflows',
    icon: '📰',
  },
  {
    id: 'pi-watchdog',
    title: 'Pi 4 系統看門狗',
    description: '記憶體/磁碟/CPU 溫度監控，無事靜音、超標才告警，零 LLM 開銷',
    href: '#workflows',
    icon: '🩺',
  },
  {
    id: 'hermes-agent',
    title: 'Hermes Agent',
    description: '本站背後的 AI agent 框架，跑在 Raspberry Pi 4 上已半年',
    href: 'https://hermes-agent.nousresearch.com/',
    icon: '🔁',
  },
];

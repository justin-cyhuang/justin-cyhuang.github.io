# Justin's Workshop 網站風格範本

## 概述

這是 justin-cyhuang.github.io 網站的標準排版風格範本，用於所有技術指南和文件頁面，確保視覺一致性和可訪問性。

**建立日期**: 2026-06-04  
**基於頁面**: ComfyUI SD 指南系列

## 核心設計原則

### 1. 可訪問性優先
- **深色文字在淺色背景**: 所有內容區塊使用 `#1a1a1a` 深色文字
- **符合 WCAG 標準**: 確保足夠的對比度，避免淺色文字難以閱讀
- **明確的顏色值**: 避免依賴 CSS 變數在淺色背景區塊，使用固定色值

### 2. 一致性色彩系統

#### 對比框配色
- **正確做法 (.do)**:
  - 背景: `#dcfce7` (淺綠)
  - 邊框: `#16a34a` (綠色)
  - 文字: `#1a1a1a` (深黑)

- **錯誤做法 (.dont)**:
  - 背景: `#fee2e2` (淺粉紅)
  - 邊框: `#dc2626` (紅色)
  - 文字: `#1a1a1a` (深黑)

#### 提示框配色 (Callout)
- **Info**: 藍色背景 `#e0f2fe` + 邊框 `#0284c7`
- **Tip**: 綠色背景 `#dcfce7` + 邊框 `#16a34a`
- **Warning**: 黃色背景 `#fef3c7` + 邊框 `#f59e0b`

### 3. 導航卡片規範
- **背景**: 白色 `white`
- **標題**: `#1a1a1a`, `font-weight: 600`, `1.05rem`
- **描述文字**: `#4a4a4a`, `0.9rem`
- **hover 效果**: 邊框變色 + 陰影 + 上移 2px

## 檔案結構

```
src/
├── styles/
│   └── guide-template.css          # 共用樣式範本
├── pages/
│   ├── comfyui-sd-guide/
│   │   ├── index.astro             # 主頁（參考範例）
│   │   ├── prompting/index.astro   # 子頁面範例
│   │   └── ...
│   └── ...
└── ...
```

## 使用方式

### 方法 1: 直接引用 CSS 檔案（推薦）

在 Astro 頁面中引用共用樣式：

```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro';
---

<BaseLayout title="頁面標題">
  <article class="guide">
    <!-- 內容 -->
  </article>
</BaseLayout>

<style>
  @import '../../styles/guide-template.css';
  
  /* 頁面特定樣式（如果需要） */
</style>
```

### 方法 2: 複製樣式區塊

如果需要自訂，可以從現有頁面複製 `<style>` 區塊：

**參考頁面**:
- `src/pages/comfyui-sd-guide/prompting/index.astro` (完整範例)
- `src/pages/comfyui-sd-guide/index.astro` (主頁範例)

## 標準 HTML 結構

### 頁面基本結構

```astro
<article class="guide">
  <!-- 麵包屑 -->
  <div class="breadcrumb">
    <a href="/comfyui-sd-guide/">← 返回主頁</a>
  </div>

  <!-- 頁面標題 -->
  <header class="guide-header">
    <h1>📚 頁面標題</h1>
    <p class="subtitle">副標題說明</p>
  </header>

  <!-- 內容章節 -->
  <section id="section-1">
    <h2>🎯 章節標題</h2>
    <p>章節內容...</p>
  </section>

  <!-- 導航區域 -->
  <nav class="guide-nav">
    <h2>📚 相關主題</h2>
    <div class="nav-grid">
      <a href="/path/" class="nav-card">
        <h3>卡片標題</h3>
        <p>卡片描述</p>
      </a>
    </div>
  </nav>
</article>
```

### 對比框（正確/錯誤做法）

```html
<div class="comparison">
  <div class="dont">
    <h4>❌ 錯誤做法</h4>
    <pre><code>錯誤範例程式碼</code></pre>
  </div>
  <div class="do">
    <h4>✅ 正確做法</h4>
    <pre><code>正確範例程式碼</code></pre>
  </div>
</div>
```

### 提示框

```html
<!-- Info 提示 -->
<div class="callout info">
  <strong>💡 提示：</strong> 提示內容...
</div>

<!-- Tip 建議 -->
<div class="callout tip">
  <strong>✅ 最佳實踐：</strong> 建議內容...
</div>

<!-- Warning 警告 -->
<div class="callout warning">
  <strong>⚠️ 注意：</strong> 警告內容...
</div>
```

### 導航卡片

```html
<nav class="guide-nav">
  <h2>📚 深入主題</h2>
  <div class="nav-grid">
    <a href="/path1/" class="nav-card">
      <h3>✍️ 主題一</h3>
      <p>主題一的簡短描述</p>
    </a>
    <a href="/path2/" class="nav-card">
      <h3>🖼️ 主題二</h3>
      <p>主題二的簡短描述</p>
    </a>
  </div>
</nav>
```

## 響應式設計

範本已包含基本響應式設計：

- **桌面** (> 768px): 兩欄對比框、自適應導航網格
- **移動裝置** (≤ 768px): 單欄佈局、堆疊導航卡片

## 可訪問性檢查清單

使用此範本時，確認：

- ✅ 所有文字在背景上有足夠對比度
- ✅ `.do` / `.dont` / `.callout` 內所有元素（h4, pre, code, strong）都明確設定深色文字
- ✅ 導航卡片標題和描述使用深色文字
- ✅ 連結有清晰的 hover 效果
- ✅ 移動裝置上可正常閱讀

## 版本歷史

### v1.2 (2026-06-05)
- **修正深色模式可讀性問題**：移除所有未定義 CSS 變數依賴
- **問題根源**：global.css 定義深色模式變數，但 guide-template.css 引用了未定義的 `var(--bg-secondary)`, `var(--link-hover)`, `var(--link-color)` 等變數
- **解決方案**：
  - 新增表格樣式規則，使用明確淺色背景 (`#f3f4f6`, `white`)
  - 所有背景、邊框、文字顏色改用明確色值，不依賴 CSS 變數
  - 確保表格、code、導航在深色模式下可讀
- **更新檔案**：
  - `src/styles/guide-template.css` (v1.2)
  - `src/pages/comfyui-sd-guide/resolutions/index.astro`

### v1.1 (2026-06-05)
- 修正解析度頁面文字對比度問題
- 強化所有淺色背景區塊內的文字顏色規則：
  - `.do` / `.dont` 內的 `h4`, `ul`, `li`, `code` 全部明確設定 `#1a1a1a`
  - 表格 `th`, `td` 強制深色文字
  - `.tip-card`, `.model-strategy` 內所有元素明確設定深色
- 確保所有元件符合 WCAG 可訪問性標準

### v1.0 (2026-06-04)
- 初始版本，基於 ComfyUI SD 指南系列
- 修正所有可讀性問題（淺色文字 → 深色文字）
- 建立標準對比框、提示框、導航卡片樣式
- 加入響應式設計支援

## 維護指南

### 未來新增頁面時

1. 複製 `src/pages/comfyui-sd-guide/prompting/index.astro` 作為起點
2. 或引用 `src/styles/guide-template.css`
3. 保持相同的 HTML 結構和 class 命名
4. 避免覆蓋核心樣式（特別是文字顏色）

### 修改範本時

1. 更新 `src/styles/guide-template.css`
2. 測試所有使用該範本的頁面
3. 更新此 README 的版本歷史
4. 如有破壞性變更，考慮建立新版本檔案

## 相關檔案

- **範本 CSS**: `src/styles/guide-template.css`
- **參考頁面**: 
  - `src/pages/comfyui-sd-guide/index.astro`
  - `src/pages/comfyui-sd-guide/prompting/index.astro`
  - `src/pages/comfyui-sd-guide/image-editing/index.astro`
  - `src/pages/comfyui-sd-guide/controlnet/index.astro`
  - `src/pages/comfyui-sd-guide/optimization/index.astro`

## 支援

如發現樣式問題或需要新增元件，請記錄在此文件並更新範本。

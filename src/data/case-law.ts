/**
 * 台灣司法判例收藏 — 資料來源
 *
 * 每筆 CaseEntry 代表一個「事件」，底下的 instances 是各審級的判決
 * （一審 / 二審 / 三審...），全部掛在同一張卡片下面方便對照。
 *
 * 名詞說明：`statutes` 欄位收錄「本案援引的請求權基礎或論罪科刑法條」。
 * 嚴格來說「請求權基礎」是民事概念，刑事案件援引的其實是「構成要件法條／罪名」、
 * 行政案件則多半是「處分依據」——這裡統一用同一個欄位承載，是為了讓三個分類
 * 共用同一套子分類 UI，頁面上的篩選標題會寫「法條 / 罪名」以求精確，
 * 不會統一標成「請求權基礎」。
 *
 * 新增案例時複製一筆物件、改內容即可，不需要碰頁面程式碼。
 */

export type CaseCategory = 'civil' | 'criminal' | 'administrative';

export const categoryLabels: Record<CaseCategory, string> = {
  civil: '民事',
  criminal: '刑事',
  administrative: '行政',
};

/**
 * 判決結果對「本案主角」（被告/上訴人/原告，視案件而定）的傾向：
 * - favorable：有利（無罪、勝訴、撤銷原判決改判有利）
 * - unfavorable：不利（有罪、敗訴、上訴駁回維持不利判決）
 * - neutral：中性（發回更審、部分勝訴部分敗訴、程序駁回等，無法簡單二分）
 * 用於卡片左側色條，一眼看出審級間的翻轉，不用猜文字。
 */
export type RulingOutcome = 'favorable' | 'unfavorable' | 'neutral';

export interface CaseInstance {
  /** 審級名稱，例如「一審」「二審（定讞）」「更一審」「上訴審（駁回上訴）」 */
  level: string;
  /** 法院全名 */
  court: string;
  /** 案號，例如「114年度易字第917號刑事判決」 */
  caseNumber: string;
  /** 裁判日期，西元 YYYY-MM-DD */
  date: string;
  /** 主文結果簡述，例如「有罪（得易科罰金）」「無罪」「上訴駁回」 */
  ruling: string;
  /** 結果傾向，見 RulingOutcome 說明 */
  outcome: RulingOutcome;
  /** 補充說明（判決理由重點、旁論內容等），選填 */
  note?: string;
  /** 司法院裁判書查詢系統的直接連結（data.aspx 全文頁面） */
  link: string;
}

export interface CaseEntry {
  /** 網址錨點用的唯一 id，英文小寫+連字號 */
  id: string;
  /** 案件標題（自訂，方便辨識，不用照抄判決書標題） */
  title: string;
  /** 民事 / 刑事 / 行政 */
  category: CaseCategory;
  /** 援引的請求權基礎 / 罪名法條 / 處分依據，用於子分類篩選 */
  statutes: string[];
  /** 案情摘要 */
  summary: string;
  /** 自由標籤，用於搜尋與快速辨識主題 */
  tags?: string[];
  /** 收錄進本頁面的日期 */
  dateAdded: string;
  /** 各審級判決，依時間順序（一審在前） */
  instances: CaseInstance[];
}

export const cases: CaseEntry[] = [
  {
    id: 'oatmilk-latte-embezzlement',
    title: '大夜班店員燕麥奶拿鐵業務侵占案',
    category: 'criminal',
    statutes: ['刑法第336條第2項（業務侵占罪）'],
    summary:
      '徐姓女子在全家便利商店擔任支援店員，民國114年5月17日凌晨連續值大夜班18小時後身心疲憊，' +
      '自行以咖啡機製作一杯售價75元的愛之味燕麥奶拿鐵飲用，卻忘記結帳，遭陳姓店長調閱監視器後報警，' +
      '依業務侵占罪嫌提告。一審臺灣士林地方法院認定被告製作咖啡時「舉止穩健」、對結帳流程知之甚稔，' +
      '判決有罪。二審臺灣高等法院則指出，依認知心理學，製作咖啡屬「程序性記憶」不代表精神清醒，' +
      '結帳才是需要認知資源的「決策行為」，在極度疲勞下確實可能遺忘；且被告案發前已預購32杯同款飲品、' +
      '案發時仍餘26杯未兌換，缺乏偷取75元的動機。合議庭撤銷原判決、改判無罪確定，並在判決書以「旁論」' +
      '罕見批評雇主未落實勞基法休息規定、將經營風險轉嫁勞工又提告「以刑逼民」，也批評檢察官與一審法官' +
      '機械適用法條、忽視勞工連續值班的體力極限，背離無罪推定原則。',
    tags: ['勞動權益', '以刑逼民', '過勞', '無罪推定', '業務侵占'],
    dateAdded: '2026-07-06',
    instances: [
      {
        level: '一審',
        court: '臺灣士林地方法院',
        caseNumber: '114年度易字第917號刑事判決',
        date: '2026-01-27',
        ruling: '有罪（得易科罰金）',
        outcome: 'unfavorable',
        note: '依業務侵占罪判處有期徒刑3月；認定被告製作咖啡舉止穩健、所辯為卸責之詞。',
        link: 'https://judgment.judicial.gov.tw/FJUD/data.aspx?ty=JD&id=SLDM,114,%e6%98%93,917,20260127,1&ot=in',
      },
      {
        level: '二審（不得上訴，定讞）',
        court: '臺灣高等法院',
        caseNumber: '115年度上易字第587號刑事判決',
        date: '2026-06-25',
        ruling: '無罪',
        outcome: 'favorable',
        note:
          '撤銷原判決；以旁論指出雇主未落實勞基法休息制度、涉「以刑逼民」濫用刑事訴追，' +
          '檢察官與原審法官盲目追求定罪、未考量被告連續值班過勞情狀，違反經驗法則與無罪推定原則。',
        link: 'https://judgment.judicial.gov.tw/FJUD/data.aspx?ty=JD&id=TPHM,115,%e4%b8%8a%e6%98%93,587,20260625,1&ot=in',
      },
    ],
  },
];

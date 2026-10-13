(() => {
  "use strict";
  const Q = window.NIKKI_QUALITY;
  if (!Q) return;
  const languages = { "zh-CN": 0, en: 1, ja: 2, ko: 3, "zh-TW": 4 },
    labels = {
      title: [
        "数据质量",
        "Data quality",
        "データ品質",
        "데이터 품질",
        "資料品質",
      ],
      intro: [
        "看见资料的来源、完整度与边界。每一个比例，都有明确的分母。",
        "Trace sources, completeness and limitations. Every percentage has a defined denominator.",
        "出典・網羅性・制約を確認できます。すべての割合に分母を明記。",
        "출처, 완전성, 한계를 확인하세요. 모든 비율에 분모를 명시합니다.",
        "看見資料的來源、完整度與邊界。每一個比例，都有明確的分母。",
      ],
      audit: [
        "质量检查时间",
        "Quality checked",
        "品質確認日時",
        "품질 확인 시각",
        "品質檢查時間",
      ],
      sourceDate: [
        "原资料整理日期",
        "Source snapshot date",
        "元資料の整理日",
        "원본 자료 기준일",
        "原資料整理日期",
      ],
      snapshot: [
        "数据快照",
        "Data snapshot",
        "データスナップショット",
        "데이터 스냅샷",
        "資料快照",
      ],
      export: [
        "导出质量报告 JSON",
        "Export quality report JSON",
        "品質レポート JSON を保存",
        "품질 보고서 JSON 저장",
        "匯出品質報告 JSON",
      ],
      staticNote: [
        "本页检查现有本地资料；检查时间不代表外部资料已重新抓取。",
        "This report checks existing local data. The audit time is not a new collection time.",
        "既存のローカル資料を検査しています。検査日時は再収集日時ではありません。",
        "기존 로컬 자료를 검사합니다. 검사 시각은 외부 자료 재수집 시각이 아닙니다.",
        "本頁檢查現有本機資料；檢查時間不代表外部資料已重新擷取。",
      ],
      objects: [
        "对象记录",
        "Object records",
        "オブジェクト",
        "객체 기록",
        "物件記錄",
      ],
      families: [
        "独立套装",
        "Distinct outfits",
        "独立セット",
        "독립 세트",
        "獨立套裝",
      ],
      forms: [
        "套装形态",
        "Outfit forms",
        "セット形態",
        "세트 형태",
        "套裝形態",
      ],
      tables: [
        "关系数据表",
        "Relational tables",
        "関係テーブル",
        "관계형 테이블",
        "關聯資料表",
      ],
      scope: [
        "套装统计口径",
        "How outfits are counted",
        "セットの集計基準",
        "세트 집계 기준",
        "套裝統計口徑",
      ],
      scopeNote: [
        "独立套装按原色所属家族去重；焕新、进化不计为新独立套装。来源只写“满进”时，不推测进化等级。",
        "Distinct outfits count base-form families once. Renewals and evolutions are additional forms. Unspecified evolution levels stay unknown.",
        "独立セットは基本形のグループ単位で集計。進化・新形態は別セットに含めず、不明な進化段階は推測しません。",
        "독립 세트는 기본형 그룹별로 집계합니다. 진화와 신규 형태는 별도 세트로 세지 않으며 불명확한 단계는 추측하지 않습니다.",
        "獨立套裝按原色所屬家族去重；煥新、進化不計為新獨立套裝。來源只寫「滿進」時，不推測進化等級。",
      ],
      base: [
        "原色 / 单形态",
        "Base / single form",
        "基本形 / 単一形態",
        "기본형 / 단일 형태",
        "原色 / 單形態",
      ],
      evolution: [
        "明确进化形态",
        "Identified evolutions",
        "確認済み進化",
        "확인된 진화",
        "明確進化形態",
      ],
      renewal: ["焕新形态", "Renewal forms", "新形態", "신규 형태", "煥新形態"],
      unknownForm: [
        "变体阶段待核实",
        "Unresolved variants",
        "段階未確認",
        "단계 미확인",
        "變體階段待核實",
      ],
      completeness: [
        "字段完整度",
        "Field completeness",
        "項目の網羅性",
        "필드 완전성",
        "欄位完整度",
      ],
      notAssessed: ["未评估", "Not assessed", "未評価", "미평가", "未評估"],
      images: [
        "图片检查范围",
        "Image check scope",
        "画像の検査範囲",
        "이미지 검사 범위",
        "圖片檢查範圍",
      ],
      imageNote: [
        "只验证了本地主图的 PNG 文件签名与尺寸。外链暂未联网探测，因此不能据此宣称全站图片可用率为 100%。",
        "Only local primary PNG signatures and dimensions were checked. Remote images remain untested; this is not 100% site-wide availability.",
        "ローカルの主画像の PNG 署名と寸法のみ確認。外部画像は未検査のため、サイト全体の可用性 100% を意味しません。",
        "로컬 대표 PNG 서명과 크기만 검사했습니다. 외부 이미지는 미검사이므로 전체 가용성 100%를 의미하지 않습니다.",
        "只驗證了本機主圖的 PNG 檔案簽名與尺寸。外鏈暫未連網探測，因此不能據此宣稱全站圖片可用率為 100%。",
      ],
      local_verified: [
        "本地检查通过",
        "Local checks passed",
        "ローカル検査合格",
        "로컬 검사 통과",
        "本機檢查通過",
      ],
      local_invalid: [
        "本地缺失或异常",
        "Local missing / invalid",
        "ローカル欠損・異常",
        "로컬 누락 / 오류",
        "本機缺失或異常",
      ],
      remote_unchecked: [
        "外链未检查",
        "Remote, unchecked",
        "外部画像・未検査",
        "외부 이미지 미검사",
        "外鏈未檢查",
      ],
      missing: [
        "没有图片地址",
        "No image reference",
        "画像参照なし",
        "이미지 주소 없음",
        "沒有圖片地址",
      ],
      translations: [
        "名称翻译覆盖率",
        "Name translation coverage",
        "名称翻訳の網羅率",
        "이름 번역 범위",
        "名稱翻譯覆蓋率",
      ],
      translationNote: [
        "只统计目标语言实际存在的名称。备用英文不算日语或韩语翻译；繁体材料名称中的本站转换单独标明。",
        "Only actual target-language names count. English fallbacks do not count as Japanese or Korean translations. Site-curated names are shown separately.",
        "対象言語の実在する名称のみ集計。英語の代替表示は日韓訳に含めず、サイト整理名を別記。",
        "실제 해당 언어 이름만 집계합니다. 영어 대체 표시는 일본어·한국어 번역에 포함하지 않으며 사이트 정리 이름은 별도로 표시합니다.",
        "只統計目標語言實際存在的名稱。備用英文不算日語或韓語翻譯；繁體材料名稱中的本站轉換單獨標明。",
      ],
      lang: ["语言", "Language", "言語", "언어", "語言"],
      covered: [
        "已覆盖 / 总量",
        "Covered / total",
        "収録 / 全体",
        "수록 / 전체",
        "已覆蓋 / 總量",
      ],
      sourced: [
        "来源提供",
        "Source-provided",
        "出典提供",
        "출처 제공",
        "來源提供",
      ],
      curated: [
        "本站整理",
        "Site-curated",
        "サイト整理",
        "사이트 정리",
        "本站整理",
      ],
      absent: ["未收录", "Not collected", "未収録", "미수록", "未收錄"],
      checks: [
        "自动质量检查",
        "Automated checks",
        "自動品質検査",
        "자동 품질 검사",
        "自動品質檢查",
      ],
      passed: ["通过", "Passed", "合格", "통과", "通過"],
      checkNote: [
        "检查通过表示结构约束通过，不代表资料已全部补齐或所有来源一致。",
        "Passing checks means structural constraints pass, not that data is complete or every source agrees.",
        "合格は構造上の制約を満たす意味で、完全収録や出典一致を保証しません。",
        "검사 통과는 구조적 조건 충족을 뜻하며 완전한 수록이나 출처 일치를 보장하지 않습니다.",
        "檢查通過表示結構約束通過，不代表資料已全部補齊或所有來源一致。",
      ],
      unique: [
        "主键唯一",
        "Unique keys",
        "主キーの一意性",
        "기본 키 고유성",
        "主鍵唯一",
      ],
      required: [
        "必填字段",
        "Required fields",
        "必須項目",
        "필수 필드",
        "必填欄位",
      ],
      type: ["字段类型", "Field types", "項目の型", "필드 유형", "欄位類型"],
      accepted_values: [
        "合法取值",
        "Allowed values",
        "有効な値",
        "허용 값",
        "合法取值",
      ],
      range: [
        "数值范围",
        "Numeric ranges",
        "数値範囲",
        "숫자 범위",
        "數值範圍",
      ],
      foreign_key: [
        "关联对象存在",
        "Valid relationships",
        "参照先の存在",
        "유효한 관계",
        "關聯物件存在",
      ],
      family_integrity: [
        "套装家族一致",
        "Outfit family integrity",
        "セットグループ整合性",
        "세트 그룹 무결성",
        "套裝家族一致",
      ],
      recipe_complete: [
        "完整配方约束",
        "Complete-recipe rules",
        "完全レシピの制約",
        "완전한 제작법 규칙",
        "完整配方約束",
      ],
      duplicates: [
        "重复对象 ID",
        "Duplicate object IDs",
        "重複 ID",
        "중복 객체 ID",
        "重複物件 ID",
      ],
      broken: [
        "导出表悬空关联",
        "Dangling export references",
        "出力表の参照欠損",
        "내보낸 표의 잘못된 참조",
        "匯出表懸空關聯",
      ],
      warnings: [
        "待补充事项",
        "Collection gaps",
        "未収録事項",
        "추가 수집 사항",
        "待補充事項",
      ],
      conflicts: [
        "来源差异 · 待复核",
        "Source differences · review needed",
        "出典差異・要確認",
        "출처 차이 · 검토 필요",
        "來源差異 · 待複核",
      ],
      conflictNote: [
        "只对同类别、唯一名称匹配的资料比较品质、主风格、获取途径。差异候选不是已判定错误；获取途径可能因形态、语义和记载口径不同而不一致。",
        "Comparison covers rarity, main style and acquisition for unique same-category name matches. Differences need review; acquisition descriptions may use different scopes or wording.",
        "同カテゴリで名称が一意に一致する資料の品質・スタイル・入手方法を比較。差異は誤り確定ではなく、表現や形態の違いも含みます。",
        "같은 분류에서 이름이 고유하게 일치하는 자료의 품질·스타일·획득 경로를 비교합니다. 차이는 확정된 오류가 아니며 표현이나 형태 범위 차이일 수 있습니다.",
        "只對同類別、唯一名稱匹配的資料比較品質、主風格、取得途徑。差異候選不是已判定錯誤；取得途徑可能因形態、語義和記載口徑不同而不一致。",
      ],
      compared: [
        "已对照对象",
        "Compared objects",
        "比較済み項目",
        "비교한 객체",
        "已對照物件",
      ],
      differences: [
        "字段差异候选",
        "Field differences",
        "項目差異",
        "필드 차이",
        "欄位差異候選",
      ],
      all: ["全部字段", "All fields", "全項目", "모든 필드", "全部欄位"],
      rarity: ["品质", "Rarity", "レア度", "등급", "品質"],
      style: ["主风格", "Main style", "主スタイル", "주 스타일", "主風格"],
      obtain_text: [
        "获取途径",
        "Acquisition",
        "入手方法",
        "획득 경로",
        "取得途徑",
      ],
      search: [
        "搜索名称或 ID",
        "Search name or ID",
        "名前・IDで検索",
        "이름 또는 ID 검색",
        "搜尋名稱或 ID",
      ],
      object: ["对象", "Object", "対象", "객체", "物件"],
      field: ["字段", "Field", "項目", "필드", "欄位"],
      left: [
        "网站当前值",
        "Current site value",
        "現在のサイト値",
        "현재 사이트 값",
        "網站目前值",
      ],
      right: [
        "对照来源值",
        "Comparison source value",
        "比較出典値",
        "비교 출처 값",
        "對照來源值",
      ],
      previous: ["上一页", "Previous", "前へ", "이전", "上一頁"],
      next: ["下一页", "Next", "次へ", "다음", "下一頁"],
      empty: [
        "没有匹配项",
        "No matches",
        "一致なし",
        "일치 항목 없음",
        "沒有符合項目",
      ],
      changes: [
        "最近快照与修改记录",
        "Snapshot & change log",
        "スナップショットと変更履歴",
        "스냅샷 및 변경 기록",
        "最近快照與修改記錄",
      ],
      baseline: [
        "首次建档",
        "Initial baseline",
        "初回登録",
        "최초 기준점",
        "首次建檔",
      ],
      baselineNote: [
        "这是现有资料的首次结构化建档。所有收录记录都属于基线，不表示今天新增了这些游戏内容。相同输入重复运行不会产生新快照。",
        "This is the initial structured baseline of existing data, not new game content added today. Re-running unchanged inputs does not create a new snapshot.",
        "既存資料の初回構造化であり、本日のゲーム追加分ではありません。同じ入力では新規スナップショットを作りません。",
        "기존 자료의 최초 구조화 기준점이며 오늘 추가된 게임 콘텐츠가 아닙니다. 동일 입력으로 다시 실행해도 새 스냅샷을 만들지 않습니다.",
        "這是現有資料的首次結構化建檔。所有收錄記錄都屬於基線，不表示今天新增了這些遊戲內容。相同輸入重跑不會產生新快照。",
      ],
      added: ["新增行", "Added rows", "追加行", "추가 행", "新增列"],
      modified: ["修改行", "Modified rows", "変更行", "변경 행", "修改列"],
      deleted: ["删除行", "Deleted rows", "削除行", "삭제 행", "刪除列"],
      dictionary: [
        "数据表目录",
        "Dataset tables",
        "データテーブル一覧",
        "데이터 테이블 목록",
        "資料表目錄",
      ],
      dictNote: [
        "完整数据包包含 SQLite、CSV、JSON、字段字典与可复现构建脚本。下方原始表说明及导出报告使用中文。",
        "The dataset package includes SQLite, CSV, JSON, a field dictionary and reproducible build scripts. Original table notes and exported report use Chinese.",
        "データパッケージに SQLite・CSV・JSON・辞書・再現用スクリプトを収録。表の説明と出力レポートは中国語です。",
        "데이터 패키지에 SQLite, CSV, JSON, 필드 사전과 재현 가능한 스크립트가 포함됩니다. 원본 표 설명과 보고서는 중국어입니다.",
        "完整資料包包含 SQLite、CSV、JSON、欄位字典與可重現建置程式。下方原始表說明及匯出報告使用中文。",
      ],
      rows: ["行数", "Rows", "行数", "행 수", "列數"],
      grain: [
        "记录粒度与说明",
        "Grain & notes",
        "粒度と説明",
        "기록 단위 및 설명",
        "記錄粒度與說明",
      ],
    };
  labels.remote_verified = [
    "外链已核实",
    "Remote verified",
    "外部画像確認済み",
    "외부 이미지 검증됨",
    "外鏈已核實",
  ];
  labels.remote_failed = [
    "外链检查失败",
    "Remote check failed",
    "外部画像確認失敗",
    "외부 검사 실패",
    "外鏈檢查失敗",
  ];
  labels.semantic_form_claim = [
    "形态语义一致性",
    "Semantic form consistency",
    "形態の意味的一貫性",
    "형태 의미 일관성",
    "形態語義一致性",
  ];
  const metricLabels = {
    image_reference: [
      "图片地址覆盖率",
      "Image reference coverage",
      "画像参照率",
      "이미지 주소 범위",
      "圖片地址覆蓋率",
    ],
    image_available_checked: [
      "已检查图片可用率",
      "Availability in checked scope",
      "検査済み画像の可用率",
      "검사 범위 내 이미지 가용성",
      "已檢查圖片可用率",
    ],
    image_check_coverage: [
      "图片检查覆盖率",
      "Image check coverage",
      "画像検査率",
      "이미지 검사 범위",
      "圖片檢查覆蓋率",
    ],
    obtain: [
      "具体获取说明",
      "Specific acquisition notes",
      "具体的な入手説明",
      "구체적 획득 설명",
      "具體取得說明",
    ],
    recipe: [
      "完整配方",
      "Complete recipes",
      "完全なレシピ",
      "완전한 제작법",
      "完整配方",
    ],
    coordinates: [
      "精确采集坐标",
      "Exact gathering coordinates",
      "正確な採集座標",
      "정확한 채집 좌표",
      "精確採集座標",
    ],
    regions: [
      "采集区域",
      "Gathering areas",
      "採集エリア",
      "채집 지역",
      "採集區域",
    ],
    release: [
      "套装实装标记",
      "Outfit release markers",
      "セット実装記載",
      "세트 출시 표기",
      "套裝實裝標記",
    ],
    event_dates: [
      "活动起止日期",
      "Event date ranges",
      "イベント開催期間",
      "이벤트 기간",
      "活動起止日期",
    ],
  };
  const definitions = {
    image_reference: [
      "有地址的对象 / 全部对象，不代表图片可用。",
      "Objects with references / all objects; not availability.",
      "参照あり / 全対象。可用性とは異なります。",
      "주소가 있는 객체 / 전체 객체. 가용성과 다릅니다.",
      "有地址的物件 / 全部物件，不代表圖片可用。",
    ],
    image_available_checked: [
      "通过本地 PNG 检查 / 已检查主图，外链不在分母。",
      "Valid local PNGs / checked primary images; excludes remote images.",
      "有効なローカル PNG / 検査済み主画像。外部画像除外。",
      "유효한 로컬 PNG / 검사한 대표 이미지. 외부 이미지 제외.",
      "通過本機 PNG 檢查 / 已檢查主圖，外鏈不在分母。",
    ],
    image_check_coverage: [
      "已检查主图 / 全部对象。",
      "Checked primary images / all objects.",
      "検査済み主画像 / 全対象。",
      "검사한 대표 이미지 / 전체 객체.",
      "已檢查主圖 / 全部物件。",
    ],
    obtain: [
      "有具体说明 / 全部对象；排除“详见来源”等占位文本。",
      "Specific notes / all objects; generic source placeholders excluded.",
      "具体的説明 / 全対象。「出典参照」のみは除外。",
      "구체적 설명 / 전체 객체. 출처 참조만 있는 문구 제외.",
      "有具體說明 / 全部物件；排除「詳見來源」等預留文字。",
    ],
    recipe: [
      "完整原料与数量 / 可关联到目录的设计图目标。",
      "Complete ingredients and quantities / linked design targets.",
      "原料と数量が完全 / 図鑑に紐づく設計図。",
      "완전한 재료·수량 / 도감에 연결된 설계도 대상.",
      "完整原料與數量 / 可關聯到目錄的設計圖目標。",
    ],
    coordinates: [
      "有精确点位的材料 / 四类候选采集物；区域说明不算坐标。",
      "Materials with exact points / four gathering categories; area notes excluded.",
      "座標あり素材 / 4採集カテゴリ。地域説明は除外。",
      "좌표가 있는 재료 / 채집 후보 4종 분류. 지역 설명 제외.",
      "有精確點位的材料 / 四類候選採集物；區域說明不算座標。",
    ],
    regions: [
      "有区域说明的材料 / 四类候选采集物。",
      "Materials with areas / four gathering categories.",
      "地域説明あり素材 / 4採集カテゴリ。",
      "지역 설명이 있는 재료 / 채집 후보 4종 분류.",
      "有區域說明的材料 / 四類候選採集物。",
    ],
    release: [
      "有来源实装标记 / 全部套装形态，不是活动时间。",
      "Source release markers / all outfit forms; not event dates.",
      "実装記載あり / 全セット形態。イベント日付ではありません。",
      "출시 표기 / 전체 세트 형태. 이벤트 날짜가 아닙니다.",
      "有來源實裝標記 / 全部套裝形態，不是活動時間。",
    ],
    event_dates: [
      "起止日期齐全 / 已收录活动；空表显示未评估。",
      "Both dates / recorded events; empty tables are not assessed.",
      "開始終了日あり / 収録イベント。空表は未評価。",
      "시작·종료일 모두 있음 / 수록 이벤트. 빈 표는 미평가.",
      "起止日期齊全 / 已收錄活動；空表顯示未評估。",
    ],
  };
  metricLabels.human_gold=['搜索样本人审覆盖率','Human search label coverage','検索ラベルの人手レビュー率','검색 라벨 사람 검토율','搜尋樣本人審覆蓋率'];
  definitions.human_gold=['用户回传已确认标签 / 原100候选；预测可见、单审核人，非独立盲审，不是配方实测。','User-returned reviewed labels / 100 original candidates; single reviewer, predictions visible, not blind or recipe verification.','ユーザー提供レビュー / 元100候補。単一レビュアーで予測は可視、盲検やレシピ実測ではありません。','사용자 회신 검토 / 기존100후보. 한 명의 검토자와 보이는 예측이며 맹검·제작법 실측이 아닙니다.','使用者回傳已確認標籤 / 原100候選；預測可見、單審核人，非獨立盲審，不是配方實測。'];
  metricLabels.region_banners=["区域背景图可用率","Region banner availability","エリア背景の利用率","지역 배경 사용률","區域背景圖可用率"];
  metricLabels.region_official=["官方区域背景素材覆盖率","Official region artwork coverage","公式エリア画像の収録率","공식 지역 이미지 수록률","官方區域背景素材覆蓋率"];
  definitions.region_banners=["本地路径/文件检查，包含主题SVG占位；当前会话实际加载状态另列。","Local asset checks include SVG placeholders; current session decoding is reported separately.","ローカル検査にはSVG代替を含みます。セッションの実読込は別表示。","로컬 검사는SVG대체 포함. 세션 실제 로딩 상태는 별도.","本機路徑/檔案檢查，包含主題SVG佔位；目前工作階段實際載入另列。"];
  definitions.region_official=["官方素材/全部区域；合并地区图不代表子区域精确实景，来源范围见清单。","Official art / all regions. Wider-area images are not exact subregion views; see source scope.","公式画像/全エリア。広域図はサブエリア実景ではなく出典範囲を明示。","공식 이미지/전체 지역. 광역 이미지는 세부 지역 실경과 다르며 출처 범위 표시.","官方素材/全部區域；合併地區圖不代表子區域精確實景，來源範圍見清單。"];
  metricLabels.outfit_recipe = [
    "套装形态配方覆盖率",
    "Recipe coverage: all outfit forms",
    "全セット形態のレシピ収録率",
    "전체 세트 형태 제작법 수록률",
    "套裝形態配方覆蓋率",
  ];
  metricLabels.craft_recipe = [
    "可制作原色配方覆盖率",
    "Recipe coverage: craftable base outfits",
    "製作可能な原色のレシピ収録率",
    "제작 가능한 원색 제작법 수록률",
    "可製作原色配方覆蓋率",
  ];
  metricLabels.recipe_source_confidence = ['完整配方置信度标注率','Recipe confidence documentation','レシピ確度の記録率','제작법 신뢰도 기록률','完整配方置信度標註率'];
  definitions.recipe_source_confidence = ['置信度是来源依据强度；没有标注不等于低可信，公开确认不等于当前游戏实测。','Confidence describes source support. Unrated does not mean unreliable; sourced facts are not current in-game measurements.','確度は出典の根拠を示します。未評価は低確度を意味しません。ゲーム内実測とは別です。','신뢰도는 출처 근거를 의미합니다. 미평가는 낮은 신뢰도가 아니며 게임 내 실측과 다릅니다.','置信度是來源依據強度；沒有標註不等於低可信，公開確認不等於目前遊戲實測。'];
  metricLabels.evolution_cost = [
    "进化步骤资源覆盖率",
    "Evolution resource coverage",
    "進化資源の収録率",
    "진화 자원 수록률",
    "進化步驟資源覆蓋率",
  ];
  metricLabels.evolution_attributes = [
    "同等级进化属性核对率",
    "Evolution attributes verified at equal level",
    "同レベル進化属性の検証率",
    "동일 레벨 진화 속성 검증률",
    "同等級進化屬性核對率",
  ];
  definitions.evolution_cost = [
    "有来源的单次进化材料与货币 / 全部进化形态；副本前置另计，未游戏内实测。",
    "Sourced single-step material and currency costs / all evolution forms. Required copies are separate; current in-game costs are not human verified.",
    "出典付きの1回分の材料と通貨 / 全進化形態。必要な原色コピーは別計算。ゲーム内人手確認は未実施。",
    "출처가 있는 단일 진화 재료·재화 / 전체 진화 형태. 기본 세트 사본은 별도이며 게임 내 수동 검증 전입니다.",
    "有來源的單次進化材料與貨幣 / 全部進化形態；副本前置另計，未遊戲內實測。",
  ];
  definitions.evolution_attributes = [
    "前后分数与等级上下文均核实才计完整；不能把升级增幅当作进化增幅。",
    "Both scores and equal-level context must be verified. Upgrade gains cannot be treated as evolution gains.",
    "前後の点数と同レベル条件の検証が必要。強化による上昇を進化効果と混同しません。",
    "전후 수치와 동일 레벨 조건이 검증되어야 합니다. 강화 효과를 진화 효과와 혼동하지 않습니다.",
    "前後分數與等級上下文均核實才計完整；不能把升級增幅當作進化增幅。",
  ];
  definitions.outfit_recipe = [
    "完整消耗清单 / 全部形态；原色、进化、焕新独立统计。直接获取也在目录分母中。",
    "Complete cost lists / all catalog forms; base, evolution and glow-up forms are separate. Direct acquisition remains in the catalog denominator.",
    "完全な消費一覧 / 全形態。原色・進化・グローアップを別集計。直接入手も図鑑分母に含みます。",
    "완전한 소모 목록 / 전체 형태. 원색·진화·글로우업 별도 집계. 직접 획득도 도감 분모에 포함.",
    "完整消耗清單 / 全部形態；原色、進化、煥新獨立統計。直接取得也在目錄分母中。",
  ];
  definitions.craft_recipe = [
    "完整制作清单 / 有设计图或制作线索的原色；直接获取、进化和焕新不在分母。",
    "Complete crafting lists / base outfits with sketch or crafting evidence; excludes direct acquisition and other forms.",
    "完全な製作一覧 / 設計図等の製作根拠がある原色。直接入手・進化・グローアップを除外。",
    "완전한 제작 목록 / 설계도 등 제작 근거가 있는 원색. 직접 획득·진화·글로우업 제외.",
    "完整製作清單 / 有設計圖或製作線索的原色；直接取得、進化和煥新不在分母。",
  ];
  for (const [key, zh, en, ja, ko, tw] of [
    [
      "recipe_scope",
      "配方统计口径",
      "Recipe scope",
      "レシピ集計範囲",
      "제작법 집계 범위",
      "配方統計口徑",
    ],
    [
      "recipe_unit",
      "材料数量单位",
      "Ingredient units",
      "素材単位",
      "재료 단위",
      "材料數量單位",
    ],
    [
      "status_evidence",
      "公开状态证据",
      "Public-status evidence",
      "公開状態の根拠",
      "공개 상태 근거",
      "公開狀態證據",
    ],
    [
      "status_recipe",
      "状态关联配方",
      "Status-to-recipe links",
      "状態とレシピの関連",
      "상태와 제작법 연결",
      "狀態關聯配方",
    ],
    [
      "recipe_cycle",
      "材料树无循环",
      "Acyclic ingredient tree",
      "素材ツリー循環なし",
      "재료 트리 순환 없음",
      "材料樹無循環",
    ],
  ])
    labels[key] = [zh, en, ja, ko, tw];
  labels.date_format = [
    "日期有效性",
    "Valid dates",
    "日付の有効性",
    "날짜 유효성",
    "日期有效性",
  ];
  labels.object_kind = [
    "对象类别一致",
    "Object type consistency",
    "対象の種類整合性",
    "객체 유형 일치",
    "物件類別一致",
  ];
  labels.unresolved = [
    "未关联设计图目标",
    "Unmatched design targets",
    "未関連の設計図対象",
    "연결되지 않은 설계도 대상",
    "未關聯設計圖目標",
  ];
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  labels.imageNote = [
    "本地主图核验PNG签名与尺寸；外链抽查HTTP状态及图片签名。只统计已检查范围，外链抽样不代表全站可用率。",
    "Local PNG signatures/dimensions and sampled remote HTTP/image signatures are checked. Results apply only to checked scope, not all remote images.",
    "ローカルPNGと抽出外部画像のHTTP・署名を検査。検査済み範囲のみの結果で、全外部画像の可用率ではありません。",
    "로컬 PNG와 표본 외부 이미지의 HTTP·서명을 검사합니다. 검사 범위만의 결과이며 전체 외부 이미지 가용성이 아닙니다.",
    "本機PNG及外鏈抽樣核驗HTTP與圖片簽名；僅代表已檢查範圍，不是全站外鏈可用率。",
  ];
  definitions.image_available_checked = [
    "本地有效图与外链有效响应 / 实际已检查主图；不是全站图片可用率。",
    "Valid local images and valid remote responses / checked images; not overall availability.",
    "有効なローカル画像と外部応答 / 検査済み画像。全体の可用率ではありません。",
    "유효한 로컬 이미지·외부 응답 / 검사한 이미지. 전체 가용성이 아닙니다.",
    "本機有效圖片與外鏈有效回應／已檢查主圖；不是全站可用率。",
  ];
  definitions.event_dates = [
    "起止日期齐全 / 已录入活动样本；不代表全游戏活动收录完整。精确开始时间未公开时保留未知。",
    "Complete dates / recorded event sample, not all game events. Exact start times remain unknown when not stated.",
    "開始終了日あり / 収録イベント。全イベントの網羅率ではなく、未公表の開始時刻は不明です。",
    "시작·종료일 있음 / 수록 이벤트 표본. 전체 게임 이벤트 범위가 아니며 미공개 시작 시각은 미상입니다.",
    "起止日期完整／已錄入活動樣本；不是全遊戲活動覆蓋率，未公開精確開始時間保留未知。",
  ];
  const loc = () => languages[window.NikkiI18n?.locale] ?? 0,
    t = (k) => labels[k]?.[loc()] || k,
    n = (v) => Number(v).toLocaleString(window.NikkiI18n?.locale),
    pct = (v) => (v === null ? t("notAssessed") : n(v) + "%");
  let filter = "",
    query = "",
    page = 1;
  const ratio = (m) => `<span>${n(m.numerator)} / ${n(m.denominator)}</span>`;
  function render() {
    return `<div class="quality-page" data-no-translate><div class="quality-heading"><div><div class="quality-eyebrow">MIRALAND · DATA FOUNDATION</div><h1>${t("title")}</h1><p>${t("intro")}</p></div><button class="quality-export" data-quality-export>${t("export")} ↓</button></div><div class="quality-freshness"><span>${t("sourceDate")} <b>${esc(Q.source_date)}</b></span><span>${t("audit")} <b>${esc(new Date(Q.audited_at).toLocaleString(window.NikkiI18n.locale))}</b></span><span>${t("snapshot")} <code>${esc(Q.snapshot.snapshot_id.slice(9, 21))}</code></span></div><p class="quality-caption">${t("staticNote")}</p>${window.NikkiRegions?.qualityPanel()||''}
 <div class="quality-totals">${[
   ["objects", Q.totals.objects],
   ["families", Q.totals.independent_outfits],
   ["forms", Q.totals.outfit_forms],
   ["tables", Q.tables.length],
 ]
   .map(([k, v]) => `<div><span>${t(k)}</span><strong>${n(v)}</strong></div>`)
   .join("")}</div>
 <section class="quality-section"><h2>${t("scope")}</h2><p>${t("scopeNote")}</p><div class="quality-formbar" aria-hidden="true">${[
   ["base", Q.totals.base_forms],
   ["evolution", Q.totals.evolution_forms],
   ["renewal", Q.totals.renewal_forms],
   ["unknownForm", Q.totals.unknown_variant_forms],
 ]
   .map(
     ([k, v], i) => `<span style="flex:${v};background:var(--q-${i})"></span>`,
   )
   .join("")}</div><div class="quality-legend">${[
   ["base", Q.totals.base_forms],
   ["evolution", Q.totals.evolution_forms],
   ["renewal", Q.totals.renewal_forms],
   ["unknownForm", Q.totals.unknown_variant_forms],
 ]
   .map(
     ([k, v], i) =>
       `<span><i style="background:var(--q-${i})"></i>${t(k)} <b>${n(v)}</b></span>`,
   )
   .join("")}</div></section>
 <section class="quality-section"><h2>${t("completeness")}</h2><div class="quality-metrics">${Q.metrics.map((m) => `<article class="quality-metric ${m.percent === 0 ? "is-empty" : ""}"><h3>${metricLabels[m.key]?.[loc()] || window.NikkiI18n.t(m.label)}</h3><strong>${pct(m.percent)}</strong>${ratio(m)}<div class="quality-meter" aria-hidden="true"><i style="width:${m.percent || 0}%"></i></div><p>${definitions[m.key]?.[loc()] || window.NikkiI18n.t(m.definition)}</p></article>`).join("")}</div></section>
 ${window.NikkiAdvanced?.qualityPanel() || ""}<section class="quality-section"><h2>${t("images")}</h2><p>${t("imageNote")}</p><div class="quality-statuses">${Object.entries(
   Q.image_status,
 )
   .map(([k, v]) => `<span>${t(k)} <b>${n(v)}</b></span>`)
   .join("")}</div></section>
 <section class="quality-section"><h2>${t("translations")}</h2><p>${t("translationNote")}</p><div class="quality-table-wrap"><table><thead><tr>${["lang", "covered", "sourced", "curated", "absent"].map((k) => `<th>${t(k)}</th>`).join("")}</tr></thead><tbody>${Q.translations.map((m) => `<tr><th>${{ "zh-CN": "简体中文", en: "English", ja: "日本語", ko: "한국어", "zh-TW": "繁體中文" }[m.key]}</th><td><b>${pct(m.percent)}</b><small>${n(m.numerator)} / ${n(m.denominator)}</small></td><td>${n(m.source)}</td><td>${n(m.curated)}</td><td>${n(m.missing)}</td></tr>`).join("")}</tbody></table></div></section>
 <section class="quality-section"><h2>${t("checks")}</h2><p>${t("checkNote")}</p><div class="quality-checks">${Q.validation.checks.map((k) => `<span>✓ ${t(k)} <b>${t("passed")}</b></span>`).join("")}</div><div class="quality-statuses"><span>${t("duplicates")} <b>${Q.validation.duplicate_ids}</b></span><span>${t("broken")} <b>${Q.validation.missing_links}</b></span><span>${t("unresolved")} <b>${n(Q.validation.unresolved_source_links)}</b></span></div>${Q.validation.issues.length ? `<details class="quality-warning"><summary>${t("warnings")} · ${Q.validation.warning_count}</summary>${Q.validation.issues.map((i) => `<p lang="zh-CN">${esc(i.message)}</p>`).join("")}</details>` : ""}</section>
 <section class="quality-section"><h2>${t("conflicts")}</h2><p>${t("conflictNote")}</p><div class="quality-statuses"><span>${t("compared")} <b>${n(Q.conflicts.compared_objects)}</b></span><span>${t("differences")} <b>${n(Q.conflicts.count)}</b></span>${Object.entries(
   Q.conflicts.by_field,
 )
   .map(([k, v]) => `<span>${t(k)} <b>${n(v)}</b></span>`)
   .join(
     "",
   )}</div><div class="quality-filters"><label><span>${t("field")}</span><select id="quality-field">${["", "rarity", "style", "obtain_text"].map((k) => `<option value="${k}" ${k === filter ? "selected" : ""}>${t(k || "all")}</option>`).join("")}</select></label><input id="quality-query" aria-label="${t("search")}" placeholder="${t("search")}" value="${esc(query)}"></div><div id="quality-conflicts">${conflictRows()}</div></section>
 <section class="quality-section"><h2>${t("changes")}</h2><p><code>${esc(Q.snapshot.snapshot_id)}</code></p>${Q.changes.is_baseline ? `<h3>${t("baseline")}</h3><p>${t("baselineNote")}</p>` : `<div class="quality-statuses">${["added", "modified", "deleted"].map((k) => `<span>${t(k)} <b>${n(Q.changes.counts[k])}</b></span>`).join("")}</div><div class="quality-table-wrap"><table><tbody>${Q.changes.rows.map((r) => `<tr><td>${esc(r.table_name)}</td><td>${t(r.change_type)}</td><td><code>${esc(r.row_key)}</code></td></tr>`).join("")}</tbody></table></div>`}</section>
 <section class="quality-section"><h2>${t("snapshot")}</h2><div class="quality-table-wrap"><table><thead><tr><th>ID</th><th>UTC</th><th>${t("objects")}</th></tr></thead><tbody>${Q.snapshot_history.map((s) => `<tr><td><code>${esc(s.snapshot_id.slice(9, 21))}</code>${s.is_baseline ? " · " + t("baseline") : ""}</td><td>${esc(s.created_at)}</td><td>${n(s.object_count)}</td></tr>`).join("")}</tbody></table></div></section><section class="quality-section"><h2>${t("dictionary")}</h2><p>${t("dictNote")}</p><details><summary>${Q.tables.length} ${t("tables")}</summary><div class="quality-table-wrap"><table><thead><tr><th>Table</th><th>${t("rows")}</th><th>${t("grain")}</th></tr></thead><tbody>${Q.tables.map((r) => `<tr><th><code>${esc(r.name)}</code></th><td>${n(r.rows)}</td><td lang="zh-CN">${esc(r.description)}</td></tr>`).join("")}</tbody></table></div></details></section></div>`;
  }
  function conflictRows() {
    const rows = Q.conflicts.rows.filter(
        (r) =>
          (!filter || r.field === filter) &&
          (!query ||
            [r.name, r.object_id].some((v) =>
              v.toLowerCase().includes(query.toLowerCase()),
            )),
      ),
      pages = Math.max(1, Math.ceil(rows.length / 12));
    page = Math.min(page, pages);
    const link = (url, value) =>
      `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(value)} ↗</a>`;
    return `<div class="quality-table-wrap"><table><thead><tr>${["object", "field", "left", "right"].map((k) => `<th>${t(k)}</th>`).join("")}</tr></thead><tbody>${
      rows
        .slice((page - 1) * 12, page * 12)
        .map(
          (r) =>
            `<tr><td><button class="quality-record" data-detail="${esc(r.object_id)}">${esc(r.name)}</button><small>${esc(r.object_id)}</small></td><td>${t(r.field)}</td><td>${link(r.left_url, r.left)}</td><td>${link(r.right_url, r.right)}</td></tr>`,
        )
        .join("") || `<tr><td colspan="4">${t("empty")}</td></tr>`
    }</tbody></table></div><div class="quality-pagination"><span>${n(rows.length)} · ${page} / ${pages}</span><button data-quality-page="${page - 1}" ${page === 1 ? "disabled" : ""}>${t("previous")}</button><button data-quality-page="${page + 1}" ${page === pages ? "disabled" : ""}>${t("next")}</button></div>`;
  }
  document.addEventListener("click", (e) => {
    const exp = e.target.closest("[data-quality-export]"),
      pg = e.target.closest("[data-quality-page]");
    if (exp) {
      const url = URL.createObjectURL(
          new Blob(
            [
              JSON.stringify(
                {
                  ...Q,
                  advanced_features: window.NIKKI_ADVANCED_DATA
                    ? {
                        scope: window.NIKKI_ADVANCED_DATA.provenance.scope,
                        coverage: window.NIKKI_ADVANCED_DATA.coverage,
                        research_snapshot_id:
                          window.NIKKI_ADVANCED_DATA.provenance
                            .research_snapshot_id,
                        source_snapshot_id:
                          window.NIKKI_ADVANCED_DATA.provenance.snapshot_id,
                      }
                    : null,
                },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          ),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "miraland-quality-report.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (pg) {
      page = Number(pg.dataset.qualityPage);
      document.querySelector("#quality-conflicts").innerHTML = conflictRows();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "quality-field") {
      filter = e.target.value;
      page = 1;
      document.querySelector("#quality-conflicts").innerHTML = conflictRows();
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "quality-query") {
      query = e.target.value;
      page = 1;
      document.querySelector("#quality-conflicts").innerHTML = conflictRows();
    }
  });
  window.NikkiQuality = { render };
})();

export type Locale = "ko" | "en" | "ja";

export type I18nKey =
  | "myAllTitle"
  | "sectionRecord"
  | "sectionRecentLogs"
  | "sectionAiMentor"
  | "sectionSummary"
  | "sectionAutobiography"
  | "hintRecordSpace"
  | "savedNotice"
  | "btnSave"
  | "btnViewRecentLogs"
  | "btnLoadRecentLogs"
  | "btnConnect"
  | "btnBack"
  | "btnDailySummary"
  | "btnWeeklySummary"
  | "btnMonthlySummary"
  | "labelPeriodMonths"
  | "btnGenerateAutobiography"
  | "appName"
  | "appNameEn"
  | "slogan"
  | "pleaseEnterEmailTitle"
  | "pleaseEnterEmailBody"
  | "startTitle"
  | "startPrivateNotice"
  | "emailOptional"
  | "emailPlaceholder"
  | "startWithEmail"
  | "startAnonymously"
  | "privacyFooter"
  | "dashboardTitle"
  | "todayRecord"
  | "viewReview"
  | "aiAssistant"
  | "settings"
  | "firstHint"
  | "recentEmotion"
  | "language"
  | "langKo"
  | "langEn"
  | "langJa"
  | "recordTitle"
  | "recordSubtitle"
  | "recordPlaceholder"
  | "save"
  | "saving"
  | "cancel"
  | "emptyLogTitle"
  | "emptyLogBody"
  | "emotionSummaryTitle"
  | "emotionSummarySubtitle"
  | "savedTime"
  | "todayEmotion"
  | "goDashboard"
  | "talkAssistant"
  | "assistantTitle"
  | "assistantSubtitle"
  | "assistantPlaceholder"
  | "send"
  | "reviewTitle"
  | "prevMonth"
  | "nextMonth"
  | "settingsTitle"
  | "privacySectionTitle"
  | "privacySectionBody"
  | "deleteAllData"
  | "deleteConfirmTitle"
  | "deleteConfirmBody"
  | "deleteCancel"
  | "deleteDo";

type Dict = Record<I18nKey, string>;

export const translations: Record<Locale, Dict> = {
  ko: {
    myAllTitle: "나의 모든 것",
    sectionRecord: "기록",
    sectionRecentLogs: "기록보기",
    sectionAiMentor: "AI 멘토",
    sectionSummary: "요약",
    sectionAutobiography: "자서전",
    hintRecordSpace: "※ 이 공간은 지금의 생각과 감정을 남기기 위한 곳입니다.",
    savedNotice: "저장됨",
    btnSave: "저장",
    btnViewRecentLogs: "최근 기록 보기",
    btnLoadRecentLogs: "기록보기",
    btnConnect: "연결하기",
    btnBack: "돌아가기",
    btnDailySummary: "일일 요약",
    btnWeeklySummary: "주간 요약",
    btnMonthlySummary: "월간 요약",
    labelPeriodMonths: "기간(개월):",
    btnGenerateAutobiography: "자서전 생성",
    appName: "마이에브리씽",
    appNameEn: "My Everything",
    slogan: "“나의 모든 것, 나의 멘토는 나”",
    pleaseEnterEmailTitle: "이메일을 입력해 주세요",
    pleaseEnterEmailBody: "또는 익명으로 시작할 수 있어요.",
    startTitle: "시작하기",
    startPrivateNotice: "이 앱은 완전히 비공개입니다.",
    emailOptional: "이메일(선택)",
    emailPlaceholder: "you@example.com",
    startWithEmail: "이메일로 시작",
    startAnonymously: "익명으로 시작",
    privacyFooter: "기록은 기기 안에만 저장됩니다.\n공유/공개 기능은 기본적으로 제공하지 않아요.",
    dashboardTitle: "대시보드",
    todayRecord: "오늘의 기록",
    viewReview: "회고 보기",
    aiAssistant: "AI 조력자",
    settings: "설정",
    firstHint: "첫 기록을 남겨보면, 정서 요약과 회고가 시작돼요.",
    recentEmotion: "최근 정서",
    language: "언어",
    langKo: "한국어",
    langEn: "영어",
    langJa: "일본어",
    recordTitle: "오늘의 기록",
    recordSubtitle: "있는 그대로, 부담 없는 만큼만 남겨도 좋아요.",
    recordPlaceholder: "오늘은 어떤 하루였나요?",
    save: "저장",
    saving: "저장 중...",
    cancel: "취소",
    emptyLogTitle: "기록이 비어 있어요",
    emptyLogBody: "한 문장만 적어도 괜찮아요.",
    emotionSummaryTitle: "정서 요약",
    emotionSummarySubtitle: "기록 내용을 바탕으로, 오늘의 정서 흐름을 정리했어요.",
    savedTime: "저장 시간",
    todayEmotion: "오늘의 정서",
    goDashboard: "대시보드로",
    talkAssistant: "AI 조력자에게 말 걸기",
    assistantTitle: "AI 조력자",
    assistantSubtitle: "판단 대신 질문으로, 나를 정리하는 대화",
    assistantPlaceholder: "여기에 마음을 적어보세요...",
    send: "보내기",
    reviewTitle: "회고",
    prevMonth: "이전 달",
    nextMonth: "다음 달",
    settingsTitle: "설정",
    privacySectionTitle: "데이터 비공개",
    privacySectionBody:
      "- 기록과 대화는 기본적으로 기기 안에만 저장됩니다.\n- SNS/공유/공개 기능은 제공하지 않습니다.\n- 치료·의료적 표현을 사용하지 않으며, 판단 대신 질문을 중심으로 돕습니다.",
    deleteAllData: "전체 데이터 삭제",
    deleteConfirmTitle: "전체 데이터 삭제",
    deleteConfirmBody: "이 기기 안에 저장된 모든 기록/대화/설정을 삭제합니다. 되돌릴 수 없어요.",
    deleteCancel: "취소",
    deleteDo: "삭제",
  },
  en: {
    myAllTitle: "My Everything",
    sectionRecord: "Log",
    sectionRecentLogs: "Logs",
    sectionAiMentor: "AI mentor",
    sectionSummary: "Summary",
    sectionAutobiography: "Autobiography",
    hintRecordSpace: "* This space is for saving your thoughts and feelings.",
    savedNotice: "Saved",
    btnSave: "Save",
    btnViewRecentLogs: "View recent logs",
    btnLoadRecentLogs: "Load recent logs",
    btnConnect: "Connect",
    btnBack: "Back",
    btnDailySummary: "Daily summary",
    btnWeeklySummary: "Weekly summary",
    btnMonthlySummary: "Monthly summary",
    labelPeriodMonths: "Period (months):",
    btnGenerateAutobiography: "Generate",
    appName: "My Everything",
    appNameEn: "My Everything",
    slogan: "“My everything, my mentor is me.”",
    pleaseEnterEmailTitle: "Please enter your email",
    pleaseEnterEmailBody: "Or you can start anonymously.",
    startTitle: "Get started",
    startPrivateNotice: "This app is completely private.",
    emailOptional: "Email (optional)",
    emailPlaceholder: "you@example.com",
    startWithEmail: "Start with email",
    startAnonymously: "Start anonymously",
    privacyFooter: "Your logs stay on this device.\nSharing/public features are not included.",
    dashboardTitle: "Dashboard",
    todayRecord: "Today’s log",
    viewReview: "Monthly review",
    aiAssistant: "AI companion",
    settings: "Settings",
    firstHint: "Write your first log to begin emotion summaries and monthly reviews.",
    recentEmotion: "Recent mood",
    language: "Language",
    langKo: "Korean",
    langEn: "English",
    langJa: "Japanese",
    recordTitle: "Today’s log",
    recordSubtitle: "Write as you are—only as much as feels comfortable.",
    recordPlaceholder: "How was your day?",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    emptyLogTitle: "Your log is empty",
    emptyLogBody: "Even one sentence is enough.",
    emotionSummaryTitle: "Emotion summary",
    emotionSummarySubtitle: "Based on your log, here’s a gentle summary of today’s emotion flow.",
    savedTime: "Saved time",
    todayEmotion: "Today’s mood",
    goDashboard: "Back to dashboard",
    talkAssistant: "Talk to AI companion",
    assistantTitle: "AI companion",
    assistantSubtitle: "A conversation that organizes your thoughts with questions, not judgments",
    assistantPlaceholder: "Type what you feel...",
    send: "Send",
    reviewTitle: "Review",
    prevMonth: "Prev",
    nextMonth: "Next",
    settingsTitle: "Settings",
    privacySectionTitle: "Privacy",
    privacySectionBody:
      "- Logs and chats are stored only on this device.\n- No social/sharing/public features.\n- No medical claims; we focus on gentle, question-led support.",
    deleteAllData: "Delete all data",
    deleteConfirmTitle: "Delete all data",
    deleteConfirmBody: "This deletes all logs/chats/settings on this device. This can’t be undone.",
    deleteCancel: "Cancel",
    deleteDo: "Delete",
  },
  ja: {
    myAllTitle: "私のすべて",
    sectionRecord: "記録",
    sectionRecentLogs: "記録を見る",
    sectionAiMentor: "AIメンター",
    sectionSummary: "要約",
    sectionAutobiography: "自叙伝",
    hintRecordSpace: "※ この場所は、いまの考えや気持ちを残すための空間です。",
    savedNotice: "保存しました",
    btnSave: "保存",
    btnViewRecentLogs: "最近の記録を見る",
    btnLoadRecentLogs: "最近の記録を読み込む",
    btnConnect: "接続",
    btnBack: "戻る",
    btnDailySummary: "日次要約",
    btnWeeklySummary: "週次要約",
    btnMonthlySummary: "月次要約",
    labelPeriodMonths: "期間（月）:",
    btnGenerateAutobiography: "生成",
    appName: "マイ・エブリシング",
    appNameEn: "My Everything",
    slogan: "「私のすべて、私のメンターは私」",
    pleaseEnterEmailTitle: "メールを入力してください",
    pleaseEnterEmailBody: "または匿名で開始できます。",
    startTitle: "はじめる",
    startPrivateNotice: "このアプリは完全に非公開です。",
    emailOptional: "メール（任意）",
    emailPlaceholder: "you@example.com",
    startWithEmail: "メールで開始",
    startAnonymously: "匿名で開始",
    privacyFooter: "記録は端末内にのみ保存されます。\n共有・公開機能はありません。",
    dashboardTitle: "ダッシュボード",
    todayRecord: "今日の記録",
    viewReview: "振り返りを見る",
    aiAssistant: "AIサポーター",
    settings: "設定",
    firstHint: "最初の記録を残すと、感情まとめと月間振り返りが始まります。",
    recentEmotion: "最近の感情",
    language: "言語",
    langKo: "韓国語",
    langEn: "英語",
    langJa: "日本語",
    recordTitle: "今日の記録",
    recordSubtitle: "そのままの気持ちで。無理のない範囲で大丈夫です。",
    recordPlaceholder: "今日はどんな一日でしたか？",
    save: "保存",
    saving: "保存中…",
    cancel: "キャンセル",
    emptyLogTitle: "記録が空です",
    emptyLogBody: "一文だけでも大丈夫です。",
    emotionSummaryTitle: "感情まとめ",
    emotionSummarySubtitle: "記録内容にもとづき、今日の感情の流れを整理しました。",
    savedTime: "保存時刻",
    todayEmotion: "今日の感情",
    goDashboard: "ダッシュボードへ",
    talkAssistant: "AIに話しかける",
    assistantTitle: "AIサポーター",
    assistantSubtitle: "判断ではなく質問で、考えを整える対話",
    assistantPlaceholder: "ここに気持ちを書いてください…",
    send: "送信",
    reviewTitle: "振り返り",
    prevMonth: "前の月",
    nextMonth: "次の月",
    settingsTitle: "設定",
    privacySectionTitle: "プライバシー",
    privacySectionBody:
      "- 記録と会話は端末内にのみ保存されます。\n- SNS/共有/公開機能はありません。\n- 医療的な表現は避け、質問中心でサポートします。",
    deleteAllData: "全データ削除",
    deleteConfirmTitle: "全データ削除",
    deleteConfirmBody: "端末内の記録/会話/設定をすべて削除します。元に戻せません。",
    deleteCancel: "キャンセル",
    deleteDo: "削除",
  },
};


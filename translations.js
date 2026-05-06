export const DEFAULT_LANGUAGE = "my";

export const LANGUAGE_OPTIONS = [
  { key: "my", label: "မြန်မာ" },
  { key: "en", label: "English" },
];

export const COPY = {
  my: {
    language: "ဘာသာစကား",
    intro: {
      kicker: "ရိုးရာကစားခုံ",
      title: "မြန်မာ့ကျားကွက်",
    },
    settings: {
      title: "ဆက်တင်များ",
      button: "ဆက်တင်",
      back: "ပြန်သွားရန်",
      languageTitle: "ဘာသာစကား",
      languageDetail: "ဘာသာစကားကို ရွေးပါ။",
      rulesDetail: "မြန်မာကျားကွက်၏ အခြေခံကစားနည်းများ",
      aiTitle: "AI အဆင့်",
      aiDetail: "တစ်ယောက်တည်းကစားရာတွင် အသုံးပြုမည့် AI အဆင့်",
      modesTitle: "ကစားနည်းများ",
      modesDetail:
        "တစ်ယောက်ဆော့၊ နှစ်ယောက်ဆော့နှင့် အွန်လိုင်းကစားပွဲများကို ရွေးချယ်နိုင်သည်။",
      onlineTitle: "အွန်လိုင်းကစားပွဲ",
      onlineDetail:
        "အခန်းကုဒ်ဖြင့် အွန်လိုင်းစားသမားများနှင့် ချိတ်ဆက်ကစားနိုင်သည်။",
    },
    menu: {
      single: {
        label: "တစ်ယောက်ဆော့",
        detail: "မိမိစိတ်ကြိုက် အေးဆေးလေ့ကျင့်ပါ",
      },
      "two-player": {
        label: "နှစ်ယောက်ဆော့",
        detail: "ဒီစက်ပေါ်မှာပဲ အတူတူဆော့ပါ",
      },
      online: {
        label: "အွန်လိုင်းပွဲစဉ်",
        detail: "အွန်လိုင်းပွဲစဉ်အတွက် ပြင်ဆင်ပါ",
      },
    },
    rulesTitle: "စည်းမျဉ်းများ",
    rules: [
      "တောင်ဘက်ကစားသမားက စတင်ရွှေ့ပြီး ဖမ်းစားရန်မရှိပါက ရှေ့ထောင့်ဖြတ် တစ်ကွက်ရွှေ့နိုင်သည်။",
      "ဖမ်းစားနိုင်သောအကွက်ရှိပါက မဖြစ်မနေ ဖမ်းစားရမည်။",
      "ဆက်ဖမ်းနိုင်သောအကွက်ရှိပါက ထိုအလှည့်အတွင်း အဆုံးထိ ဆက်ဖမ်းရမည်။",
      "အဆုံးတန်းသို့မရောက်မချင်း အကောင်များသည် ရှေ့ဘက်သို့သာ ရွှေ့ပြီး ဖမ်းစားနိုင်သည်။",
      "ဘုရင်အကောင်များသည် ထောင့်ဖြတ်လမ်းကြောင်းပေါ်တွင် အကွက်အကွာအဝေးမရွေး ရွှေ့နိုင်ပြီး လမ်းရှင်းပါက အဝေးရှိ ပြိုင်ဘက်ကို ဖမ်းစားနိုင်သည်။",
    ],
    players: {
      red: { label: "ကျောက်စိမ်း", seat: "တောင်ဘက်" },
      blue: { label: "ရွှေ", seat: "မြောက်ဘက်" },
      fallback: "ကစားသမား",
      pieces: "လုံး",
      winner: "နိုင်သူ",
      onMove: "ရွှေ့ရန်အလှည့်",
    },
    difficulty: {
      title: "တစ်ယောက်တည်း AI",
      easy: "လွယ်ကူ",
      normal: "ပုံမှန်",
      hard: "ခက်ခဲ",
    },
    game: {
      menu: "Menu",
      matchState: "ကစားပွဲအခြေအနေ",
      room: "အခန်း",
      connected: "ချိတ်ဆက်ပြီး",
      online: "အွန်လိုင်း",
      winnerLocal: (player) =>
        `${player} က စားပွဲကို ထိန်းချုပ်နိုင်ပြီ။ အသစ်စရန် ဒီနေရာကို နှိပ်ပါ။`,
      drawAccepted: "သရေဖြစ်ပါသည်။ အသစ်စရန် ဒီနေရာကို နှိပ်ပါ။",
      drawRequested: (player, opponent) =>
        `${player} က သရေတောင်းထားသည်။ ${opponent} က သရေခလုတ်နှိပ်ပါက လက်ခံမည်။`,
      aiThinking: (player, difficulty) =>
        `${player} က ${difficulty} အဆင့် ရွှေ့ကွက်ကို စဉ်းစားနေသည်။`,
      continueCapture: (player) =>
        `${player} သည် ဖမ်းစားသည့်အဆက်ကို ဆက်လုပ်ရမည်။`,
      mustCapture: (player) => `${player} သည် ဖမ်းစားနိုင်သောအကွက်ကို ယူရမည်။`,
      quietMove: (player) => `${player} သည် ရှေ့ထောင့်ဖြတ် ရွှေ့နိုင်သည်။`,
      submittingMove: "အခန်းသို့ ရွှေ့ကွက် ပို့နေသည်။",
      waitingRoom: (roomCode, player) =>
        `အခန်း ${roomCode} သည် ${player} ဝင်လာရန် စောင့်နေသည်။`,
      winnerOnline: (player) =>
        `${player} က အွန်လိုင်းစားပွဲကို ထိန်းချုပ်နိုင်ပြီ။`,
      waitingMove: (player) => `${player} ရွှေ့ရန် စောင့်နေသည်။`,
      waitingSecondPlayer: "ဒုတိယကစားသမား ဝင်လာရန် စောင့်နေသည်။",
      exitTitle: "ကစားပွဲမှ ထွက်မလား?",
      exitMessage: "အတည်ပြုပါက လက်ရှိကစားပွဲမှ ထွက်ပြီး Menu သို့ ပြန်သွားမည်။",
      exitCancel: "မလုပ်တော့ပါ",
      exitConfirm: "ထွက်မည်",
      opponentLeftTitle: "ပြိုင်ဘက် ထွက်သွားပါပြီ",
      opponentLeftMessage: (player) =>
        `${player} သည် အွန်လိုင်းကစားပွဲမှ ထွက်သွားပါပြီ။ Menu သို့ ပြန်သွားရန် အတည်ပြုပါ။`,
      opponentLeftConfirm: "Menu သို့ ပြန်သွားမည်",
      resign: "အရှုံးပေးမည်",
      requestDraw: "သရေတောင်းမည်",
      acceptDraw: "သရေလက်ခံ",
      drawPending: "စောင့်နေ",
      confirmResignTitle: "အရှုံးပေးမလား?",
      confirmResignMessage: (player, opponent) =>
        `${player} အရှုံးပေးပါက ${opponent} အနိုင်ရမည်။`,
      confirmResign: "အရှုံးပေးမည်",
      confirmDrawTitle: "သရေတောင်းမလား?",
      confirmDrawMessage: (player) => `${player} သည် သရေတောင်းရန် အတည်ပြုပါ။`,
      confirmDraw: "သရေတောင်းမည်",
      confirmAcceptDrawTitle: "သရေလက်ခံမလား?",
      confirmAcceptDrawMessage: (player) =>
        `${player} သည် သရေတောင်းဆိုမှုကို လက်ခံရန် အတည်ပြုရမည်။`,
      confirmAcceptDraw: "သရေလက်ခံမည်",
      drawTitle: "သရေဖြစ်ပါသည်",
      drawMessage: "သရေတောင်းဆိုမှုကို လက်ခံပြီး ကစားပွဲပြီးဆုံးပါသည်။",
      congratsTitle: "ဂုဏ်ယူပါတယ်!",
      congratsMessage: (player) => `${player} အနိုင်ရရှိပါသည်။`,
      congratsClose: "ပိတ်ရန်",
      congratsRematch: "အသစ်ကစားရန်",
    },
    onlineLobby: {
      kicker: "အွန်လိုင်းကစားခုံ",
      title: "အွန်လိုင်းပွဲစဉ်",
      createTitle: "အခန်းအသစ် ဖန်တီးရန်",
      createDetail: "အခန်းကုဒ်အသစ် ရယူပြီး ပြိုင်ဘက်ကို ပေးပါ။",
      createRoom: "အခန်းဖန်တီးမည်",
      working: "လုပ်ဆောင်နေသည်...",
      joinTitle: "အခန်းကုဒ်ဖြင့် ဝင်ရန်",
      joinDetail: "ပြိုင်ဘက် မျှဝေထားသော စာလုံး ၆-လုံးပါ ကုဒ်ကို ထည့်ပါ။",
      joinByCode: "ကုဒ်ဖြင့်ဝင်ရန်",
      join: "ဝင်ရန်",
      savedRoom: "သိမ်းထားသောအခန်း",
      resume: "ပြန်စရန်",
      forget: "ဖျက်ရန်",
      rulesTitle: "အွန်လိုင်းပွဲစဉ် စည်းမျဉ်းများ",
      rules: [
        "ကျောက်စိမ်းရောင်က အခန်းဖန်တီးရမည်ဖြစ်ပြီး ရွှေရောင် ဝင်လာပြီးနောက် ပထမဆုံး စရွှေ့ရပါမည်။",
        "ကစားကွက် မပြောင်းလဲမီ ရွှေ့ကွက်များကို ဆာဗာမှ အတည်ပြုမှတ်သားထားပါမည်။",
      ],
    },
    errors: {
      onlineRequestFailed: "အွန်လိုင်းကစားပွဲ တောင်းဆိုမှု မအောင်မြင်ပါ။",
      missingConfig:
        "အွန်လိုင်းကစားပွဲ မစမီ .env ဖိုင်တွင် Supabase URL နှင့် anon key ထည့်ပါ။",
      invalidRoomCode: "အခန်းကုဒ် ၆ လုံး ထည့်ပါ။",
    },
  },
  en: {
    language: "Language",
    intro: {
      kicker: "Traditional Table",
      title: "Burmese Checkers",
    },
    settings: {
      title: "Settings",
      button: "Settings",
      back: "Back",
      languageTitle: "Language",
      languageDetail: "Choose the language used across the app.",
      rulesDetail: "Core rules for Burmese Checkers.",
      aiTitle: "AI difficulty",
      aiDetail: "Difficulty used for single-player matches.",
      modesTitle: "Game modes",
      modesDetail:
        "Choose single player, local two-player, or online multiplayer.",
      onlineTitle: "Online play",
      onlineDetail: "Use room codes to connect with a remote player.",
    },
    menu: {
      single: {
        label: "Single",
        detail: "Practice at your own pace",
      },
      "two-player": {
        label: "Two Player",
        detail: "Share this board locally",
      },
      online: {
        label: "Online Multiplayer",
        detail: "Prepare a remote match",
      },
    },
    rulesTitle: "Rules",
    rules: [
      "South seat moves first and can advance one diagonal step when no capture is open.",
      "Captures are mandatory. If a jump exists, quiet moves are blocked.",
      "A piece that can continue capturing must finish the full chain in the same turn.",
      "Pieces only move and capture forward until they crown into queens on the far edge.",
      "Queens move any distance diagonally and can capture over a distant opposing piece when the path is clear.",
    ],
    players: {
      red: { label: "Jade", seat: "South seat" },
      blue: { label: "Gold", seat: "North seat" },
      fallback: "Player",
      pieces: "pieces",
      winner: "winner",
      onMove: "on move",
    },
    difficulty: {
      title: "Single player AI",
      easy: "Easy",
      normal: "Normal",
      hard: "Hard",
    },
    game: {
      menu: "Menu",
      matchState: "Match state",
      room: "Room",
      connected: "Connected",
      online: "online",
      winnerLocal: (player) =>
        `${player} controls the table. Tap here for a new match.`,
      drawAccepted: "Draw agreed. Tap here for a new match.",
      drawRequested: (player, opponent) =>
        `${player} requested a draw. ${opponent} can press Draw to accept.`,
      aiThinking: (player, difficulty) =>
        `${player} is choosing a ${difficulty.toLowerCase()} move.`,
      continueCapture: (player) => `${player} must continue the capture chain.`,
      mustCapture: (player) => `${player} must take the open jump.`,
      quietMove: (player) => `${player} may make a quiet diagonal move.`,
      submittingMove: "Submitting the move to the room.",
      waitingRoom: (roomCode, player) =>
        `Room ${roomCode} is waiting for ${player} to join.`,
      winnerOnline: (player) => `${player} controls the online table.`,
      waitingMove: (player) => `Waiting for ${player} to move.`,
      waitingSecondPlayer: "Waiting for the second player to join.",
      exitTitle: "Exit match?",
      exitMessage:
        "If you confirm, the current match will close and you will return to the menu.",
      exitCancel: "Cancel",
      exitConfirm: "Exit",
      opponentLeftTitle: "Opponent left",
      opponentLeftMessage: (player) =>
        `${player} left the online match. Confirm to return to the menu.`,
      opponentLeftConfirm: "Return to menu",
      resign: "Resign",
      requestDraw: "Draw",
      acceptDraw: "Accept",
      drawPending: "Waiting",
      confirmResignTitle: "Resign match?",
      confirmResignMessage: (player, opponent) =>
        `${player} will resign and ${opponent} will win.`,
      confirmResign: "Resign",
      confirmDrawTitle: "Request draw?",
      confirmDrawMessage: (player) =>
        `${player} must confirm this draw request.`,
      confirmDraw: "Request draw",
      confirmAcceptDrawTitle: "Accept draw?",
      confirmAcceptDrawMessage: (player) =>
        `${player} must confirm accepting the draw request.`,
      confirmAcceptDraw: "Accept draw",
      drawTitle: "Draw agreed",
      drawMessage: "The draw request was accepted and the match is complete.",
      congratsTitle: "Congratulations!",
      congratsMessage: (player) => `${player} wins the match.`,
      congratsClose: "Close",
      congratsRematch: "New match",
    },
    onlineLobby: {
      kicker: "Remote Table",
      title: "Online Match",
      createTitle: "Create a new room",
      createDetail: "Get a fresh room code and share it with your opponent.",
      createRoom: "Create Room",
      working: "Working...",
      joinTitle: "Enter a room code",
      joinDetail: "Use the 6-character code shared by your opponent.",
      joinByCode: "Join by code",
      join: "Join",
      savedRoom: "Saved room",
      resume: "Resume",
      forget: "Forget",
      rulesTitle: "Online Rules",
      rules: [
        "Jade creates the room and moves first after Gold joins.",
        "Moves are committed by the server before the board changes.",
      ],
    },
    errors: {
      onlineRequestFailed: "Online match request failed.",
      missingConfig:
        "Add your Supabase URL and anon key to .env before starting an online match.",
      invalidRoomCode: "Enter the 6-character room code.",
    },
  },
};

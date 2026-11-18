// "How to use My Wax Planner": the in-app guide (Learn → How to use) and the
// shareable copy are written from this one text, so they cannot drift apart.
// Keep it brief and in the words on the buttons; update it with the screens.

export type GuideSection = { id: string; title: string; intro?: string; steps: string[] };

export const GUIDE: GuideSection[] = [
  {
    id: "start",
    title: "Getting started",
    intro: "A short checklist on Today walks you through these the first time.",
    steps: [
      "Choose how you wax in Account: Guide me (the app suggests waxes and walks you through them) or I know what I'm doing (you enter your own).",
      "Pick your Home Venue. Its forecast and conditions are on Today.",
      "Add skiers you wax for, if any. The line under Today's title shows who you're waxing for.",
      "Add your skis in Wax box → Skis. A known maker's logo appears beside each pair.",
      "Add your waxes in Wax box → Add a wax, and tick the tools you own in Wax box → Tools.",
    ],
  },
  {
    id: "today",
    title: "Today",
    steps: [
      "Check the Location card. Change it if you're skiing somewhere else today; tomorrow starts at home again.",
      "Open Today's Skiing Conditions, check the snow (temperature, snowball test, type, track) and save. Recording a wax job needs this first.",
      "Active sessions are listed in blue, completed skis waiting for a rating in green. Tap one to open it.",
    ],
  },
  {
    id: "plan",
    title: "Start a wax session (the app suggests)",
    steps: [
      "On Today, tap Start a wax session.",
      "Check where and when you'll ski, the weather and the snow, then tap Apply the above to start a guided session.",
      "Choose the skis and the kind of session, then tap RECOMMEND.",
      "Read the plan: the waxes from your box and why. Tap Use this plan to save it.",
      "Wax with Start wax-along (one step per screen, with timers), then tap I'm Done Waxing.",
      "After skiing, tap I'm Done Skiing. Rate it now or later.",
    ],
  },
  {
    id: "record",
    title: "Record a wax job (you choose the waxes)",
    steps: [
      "Set Today's location and Today's Skiing Conditions first; the button stays greyed until you do.",
      "On Today, tap Record a wax job (or Already waxed? Record a wax job).",
      "Check the date, time and venue; the forecast card follows them.",
      "Choose the skis, then add each layer: its role, the wax (only waxes for that layer are offered), method and temperature.",
      "Tap the finish steps in the order you did them, then Save. You're back on Today with the job ready to ski.",
    ],
  },
  {
    id: "rate",
    title: "Rate a session",
    intro: "Rating is what teaches the app what works for you.",
    steps: [
      "Open the session from Today. What you did (waxes, finish, forecast, photos) is at the top.",
      "Under How did it go?, rate the glide (and grip and kick for classic).",
      "If you changed a wax, tap I changed something and pick what went on instead.",
      "If the snow wasn't as forecast, tap Different and answer the snow questions.",
      "Add notes and tap Save, the last thing on the page.",
    ],
  },
  {
    id: "box",
    title: "Wax box",
    steps: [
      "Tap a wax to set how much is left; anything low or empty gathers under Running low.",
      "Add a photo of the container so you can spot it on the list.",
      "Grip waxes (and some glide waxes) have a second range for old or transformed snow. Suggestions use it on old snow.",
      "Waxes from the shared catalogue can't be edited; enter your own snow range in Your snow range instead.",
      "Ranges read warmer end first, as on the packaging: −1 to −10 °C.",
    ],
  },
  {
    id: "history",
    title: "History",
    steps: [
      "Filter by season, skis, venue, snow and more. Days similar to today, inside Filter, fills in today's snow.",
      "Open a past session to Share a summary (a picture or PDF, never with names or skis) or Copy to other skis.",
      "Use this session data for today's wax job starts a new wax job from it; Edit this record corrects it.",
      "Compare puts two to four sessions side by side; Insights shows which waxes worked at which temperatures.",
      "Download as spreadsheet gives you every session as a CSV file.",
    ],
  },
];

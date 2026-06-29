// Hugo v3 — CiaraLink Real-Life AI Assistant
// Proactive · Action-nav · Workflow mode · Context-aware · Role-specific briefings
(function () {
  if (window.__hugoLoaded) return;
  window.__hugoLoaded = true;

  var owlScript = document.createElement('script');
  owlScript.src = 'hugo-owl.js';
  document.head.appendChild(owlScript);

  // ── Session ──────────────────────────────────────────────────────────────
  var role = 'provider', userName = '';
  try { var _s=JSON.parse(localStorage.getItem('ciaralink_session')||'{}'); if(_s.role) role=_s.role; if(_s.name) userName=_s.name.split(' ')[0]; } catch(e){}

  // ── Page detection ────────────────────────────────────────────────────────
  function detectPage(){
    var h = window.location.href.toLowerCase();
    if(h.includes('proivder')||h.includes('provider dashboard')) return 'provider-dashboard';
    if(h.includes('service provider')) return 'service-provider';
    if(h.includes('provider console')) return 'provider-console';
    if(h.includes('service agreement')) return 'service-agreement';
    if(h.includes('worker agreement')) return 'worker-agreement';
    if(h.includes('worker app')) return 'worker-app';
    if(h.includes('worker passport')) return 'worker-passport';
    if(h.includes('verified visit')) return 'verified-visit';
    if(h.includes('support worker')) return 'worker-dashboard';
    if(h.includes('support coordination')) return 'sc-dashboard';
    if(h.includes('plan review')) return 'plan-review';
    if(h.includes('allied health')) return 'allied-dashboard';
    if(h.includes('participant dashboard')) return 'participant-dashboard';
    if(h.includes('participant profile')) return 'participant-profile';
    if(h.includes('care ecosystem')) return 'care-ecosystem';
    if(h.includes('ai file drop')) return 'file-drop';
    if(h.includes('ai intake')) return 'intake';
    if(h.includes('consent')) return 'consent';
    if(h.includes('notification')) return 'notifications';
    if(h.includes('task')) return 'tasks';
    if(h.includes('ciaralink connect')) return 'connect';
    if(h.includes('intelligence')) return 'intelligence';
    if(h.includes('onboarding')) return 'onboarding';
    if(h.includes('settings')) return 'settings';
    if(h.includes('login')) return 'login';
    return 'index';
  }
  var page = detectPage();

  // ── Page context map ─────────────────────────────────────────────────────
  var PAGE = {
    'provider-dashboard':{hint:'Provider',palette:'mint',
      prompts:["What needs my attention today?","Show me open shifts","Find workers for tonight","What documents are missing?","Draft a message to a coordinator","Show my referral pipeline"]},
    'service-provider':{hint:'Service Provider',palette:'mint',
      prompts:["Show credential alerts","Who needs onboarding?","Check worker compliance","Review my roster","Draft a worker agreement","Check missing documents"]},
    'service-agreement':{hint:'Service Agreement',palette:'mint',
      prompts:["Help me fill this agreement","What still needs signing?","Auto-fill from participant","Explain the funding section","Send a reminder to sign","Check for missing fields"]},
    'worker-agreement':{hint:'Worker Agreement',palette:'mint',
      prompts:["What's the difference between agreements?","Auto-fill from worker profile","How do I send for signature?","Where does the signed copy go?","What must be included?","Check for missing fields"]},
    'worker-dashboard':{hint:'Support Worker',palette:'lavender',
      prompts:["What do I need to do today?","Help me write a shift note","What credentials are expiring?","Find work near me","How do I use Verified Visit?","Check my Worker Passport"]},
    'worker-passport':{hint:'Worker Passport',palette:'lavender',
      prompts:["What's missing from my passport?","How do I upload First Aid?","How do I share my passport?","What do providers see?","Why is my passport score low?","Remind me what credentials I need"]},
    'verified-visit':{hint:'Verified Visit',palette:'lavender',
      prompts:["How do I clock in?","Help me write my shift note","What happens after I clock out?","What if I can't scan the QR?","Does the participant need to sign?","Where do my notes go?"]},
    'worker-app':{hint:'Worker App',palette:'lavender',
      prompts:["How do I find work?","How do I apply for a shift?","Set my availability","View my upcoming shifts","What's in my Worker Passport?","How does worker matching work?"]},
    'sc-dashboard':{hint:'Support Coordination',palette:'peach',
      prompts:["What needs my attention today?","Prepare a participant for review","What reports are missing?","Send a referral to an OT","Summarise funding for Liam W.","Show overdue tasks"]},
    'plan-review':{hint:'Plan Review Prep',palette:'peach',
      prompts:["What evidence is still missing?","Chase the missing OT report","Draft a review summary","What goals need updating?","Show funding used vs remaining","How long until the review?"]},
    'allied-dashboard':{hint:'Allied Health',palette:'lavender',
      prompts:["What do I have on today?","Help me write a session note","What evidence is needed for the review?","Send a report to the coordinator","What documents do I have access to?","Summarise previous recommendations"]},
    'participant-dashboard':{hint:'My Care',palette:'sky',
      prompts:["Who is in my care team?","What do I need to sign?","Explain my goals simply","What's my next support?","Help me message my coordinator","How do I understand my funding?"]},
    'participant-profile':{hint:'Participant Profile',palette:'sky',
      prompts:["Summarise this participant","What documents are missing?","Who is in their support team?","What goals need evidence?","Show their funding status","Check for missing consent"]},
    'care-ecosystem':{hint:'Care Ecosystem',palette:'mint',
      prompts:["Who has access to what?","Check consent status","Add a new team member","Explain a connection","Send a referral to allied health","Review evidence for plan"]},
    'file-drop':{hint:'AI File Drop',palette:'mint',
      prompts:["File this under a participant","What is AI classification?","How do I link to a review?","Where do NDIS plans go?","What file types can I upload?","What happens after I file a document?"]},
    'intake':{hint:'AI Intake',palette:'mint',
      prompts:["What information do I need?","Help me complete this intake","Can I upload a document instead?","What happens after intake?","Who gets access after intake?","How long does intake take?"]},
    'consent':{hint:'Consent Centre',palette:'sky',
      prompts:["How do I grant provider access?","What does summary access mean?","Revoke access for a role","Why can't this person see a document?","Explain the consent categories","What happens when consent is revoked?"]},
    'notifications':{hint:'Notifications',palette:'mint',
      prompts:["Explain my urgent notifications","What needs action first?","Why did I get this notification?","Show shift notifications","Show document notifications","Mark all as read"]},
    'tasks':{hint:'Task Centre',palette:'mint',
      prompts:["What's my most urgent task?","Explain this task","Chase a missing document","Show overdue tasks","Help me complete this task","What happens if I miss this?"]},
    'connect':{hint:'CiaraLink Connect',palette:'mint',
      prompts:["Draft a message","Send a referral to an OT","Find available physio","Explain warm handoff","What is my responsiveness score?","Explain referral stages"]},
    'index':{hint:'Launch Hub',palette:'mint',
      prompts:["Where do I start?","Show me the provider dashboard","What does CiaraLink do?","How do I log in?","What is the Worker Passport?","What is the Care Ecosystem?"]},
    'settings':{hint:'Settings',palette:'mint',
      prompts:["Update my profile","Change notification settings","What do permissions control?","How do I change my password?","How do I update my organisation?","What is two-factor auth?"]},
  };
  var ctx = PAGE[page] || PAGE['index'];

  // ── Daily briefings (proactive) ──────────────────────────────────────────
  var BRIEFINGS = {
    'provider': {
      title:"Here's what needs attention right now:",
      items:[
        {text:"Open shift tonight — Margaret R. · no worker assigned",urgency:"high",nav:"CiaraLink Provider Dashboard.dc.html",navLabel:"Assign now"},
        {text:"First Aid expiring — Noah R. · 7 days",urgency:"high",nav:"Service Provider.dc.html",navLabel:"View worker"},
        {text:"Service agreement unsigned — David L.",urgency:"med",nav:"Service Agreement.dc.html",navLabel:"Chase signature"},
        {text:"Missing speech report — plan review in 11 days",urgency:"med",nav:"Plan Review Prep.dc.html",navLabel:"Prepare review"},
        {text:"3 new worker applications waiting",urgency:"low",nav:"CiaraLink Provider Dashboard.dc.html",navLabel:"Review now"},
      ]
    },
    'worker': {
      title:"Here's what's on your plate today:",
      items:[
        {text:"Shift in 2h 15m — Margaret R. · 12 Rose St, Glenroy",urgency:"high",nav:"Verified Visit.dc.html",navLabel:"Open clock-in"},
        {text:"Shift note from yesterday still outstanding",urgency:"high",nav:"Support Worker.dc.html",navLabel:"Write now"},
        {text:"First Aid expiring in 14 days",urgency:"med",nav:"Worker Passport.dc.html",navLabel:"Upload renewal"},
        {text:"Worker Passport is 72% complete",urgency:"low",nav:"Worker Passport.dc.html",navLabel:"Complete it"},
      ]
    },
    'coordinator': {
      title:"Morning briefing — here's what needs you today:",
      items:[
        {text:"Margaret R. plan review in 11 days · 2 reports missing",urgency:"high",nav:"Plan Review Prep.dc.html",navLabel:"Prepare review"},
        {text:"Liam W. Core funding at 92% · risk alert",urgency:"high",nav:"Support Coordination.dc.html",navLabel:"Review funding"},
        {text:"Referral awaiting response — Jordan Pham · OT",urgency:"med",nav:"Support Coordination.dc.html",navLabel:"Check referral"},
        {text:"Consent form missing — Priya S.",urgency:"med",nav:"Consent Centre.dc.html",navLabel:"Chase consent"},
      ]
    },
    'allied': {
      title:"Good to see you! Here's your day:",
      items:[
        {text:"5 sessions today · next at 9:30",urgency:"high",nav:"Allied Health.dc.html",navLabel:"View schedule"},
        {text:"OT report due for Margaret R. · review in 11 days",urgency:"high",nav:"Allied Health.dc.html",navLabel:"Write report"},
        {text:"Previous recommendations not shared with coordinator",urgency:"med",nav:"Allied Health.dc.html",navLabel:"Share now"},
        {text:"2 reports in review evidence queue",urgency:"low",nav:"Plan Review Prep.dc.html",navLabel:"View evidence"},
      ]
    },
    'participant': {
      title:"Hi there! Here's what's happening:",
      items:[
        {text:"Service agreement needs your signature",urgency:"high",nav:"Participant Dashboard.dc.html",navLabel:"Sign now"},
        {text:"Next support: today at 11:00 AM with James Liu",urgency:"med",nav:"Participant Dashboard.dc.html",navLabel:"View details"},
        {text:"Your care team was updated recently",urgency:"low",nav:"Care Ecosystem.dc.html",navLabel:"See your team"},
      ]
    }
  };

  // ── Response library ─────────────────────────────────────────────────────
  var NAV = {
    'provider-dashboard':'CiaraLink Provider Dashboard.dc.html',
    'service-agreement':'Service Agreement.dc.html',
    'worker-agreement':'Worker Agreement.dc.html',
    'worker-passport':'Worker Passport.dc.html',
    'verified-visit':'Verified Visit.dc.html',
    'sc-dashboard':'Support Coordination.dc.html',
    'plan-review':'Plan Review Prep.dc.html',
    'allied-dashboard':'Allied Health.dc.html',
    'participant-dashboard':'Participant Dashboard.dc.html',
    'participant-profile':'Participant Profile.dc.html',
    'care-ecosystem':'Care Ecosystem.dc.html',
    'file-drop':'AI File Drop.dc.html',
    'consent':'Consent Centre.dc.html',
    'notifications':'Notification Centre.dc.html',
    'tasks':'Task Centre.dc.html',
    'connect':'CiaraLink Connect.dc.html',
    'service-provider':'Service Provider.dc.html',
  };

  var RESP = {
    "What needs my attention today?":     {role:'provider', text:"**5 items need you right now:**\n\n🔴 Open shift tonight — Margaret R. (no worker assigned)\n🔴 First Aid expiring — Noah R. (7 days)\n🟡 Agreement unsigned — David L.\n🟡 Speech report missing — Margaret R. review in 11 days\n🟢 3 new worker applications\n\nWant me to start with the urgent shift?", actions:[{label:"Post shift →",url:"CiaraLink Provider Dashboard.dc.html"},{label:"Task Centre →",url:"Task Centre.dc.html"}]},
    "Show me open shifts":                 {text:"**Open shifts right now:**\n\n• Tonight 7pm–11pm · Personal Care · Margaret R. · **URGENT**\n• Sat 10am–2pm · Community · Priya S. · 3 applications\n• Sun 9am–1pm · Personal Care · Ruth K. · 2 applications", actions:[{label:"Manage shifts →",url:"CiaraLink Provider Dashboard.dc.html"}]},
    "Find workers for tonight":            {text:"**8 workers available tonight** matching Margaret R.:\n\n⭐ Amara Okafor — 4.9 · 2.1km · Personal Care ✓ · Screening ✓\n⭐ James Liu — 4.8 · 3.4km · Personal Care ✓\n⭐ Lena Sorensen — 4.7 · 5.2km · Personal Care ✓\n\nI can notify the top 3. Want me to prepare the invitations?", confirm:"Notify Amara, James and Lena about the open shift for Margaret R. tonight?", actions:[{label:"Smart Match →",url:"CiaraLink Provider Dashboard.dc.html"}]},
    "What documents are missing?":        {text:"**Missing right now:**\n\n❌ Risk Assessment — Priya S.\n❌ Service Agreement — Ruth K. (unsigned)\n❌ Consent form — Hassan A.\n❌ SC report — Margaret R. (review coming)\n\nI can chase any of these — just confirm and I'll draft the reminder.", actions:[{label:"AI File Drop →",url:"AI File Drop.dc.html"},{label:"Task Centre →",url:"Task Centre.dc.html"}]},
    "Show referrals waiting":              {text:"**Referrals pending:**\n\n• 2 received — not yet actioned ⚠️\n• 1 sent — awaiting OT acceptance\n• 1 participant contacted · not yet booked", actions:[{label:"View referrals →",url:"Support Coordination.dc.html"}]},
    "Explain my pipeline":                 {text:"**Pipeline right now:**\n\n1. New referral — 2 participants\n2. Contacted — 1 participant\n3. Agreement sent — 1 awaiting signature\n4. Active support — 12 participants\n5. Review due — 3 in 14 days\n\nClick any stage to see participants there.", actions:[{label:"Open pipeline →",url:"Provider Console.dc.html"}]},
    "What do I need to do today?":         {text:"**Today's priority list:**\n\n🔴 Shift in 2h 15m — Margaret R. · clock-in via Verified Visit\n🔴 Shift note from yesterday still outstanding\n⚠️ First Aid expiring in 14 days — upload renewal\n💡 Worker Passport 72% complete — one more upload needed\n\nWant me to start with the shift note?", actions:[{label:"Verified Visit →",url:"Verified Visit.dc.html"},{label:"Write shift note →",url:"Support Worker.dc.html"}]},
    "What do I need to upload?":           {text:"**Worker Passport is 72% complete.** Missing:\n\n❌ First Aid certificate (expiring Nov 2026)\n❌ Updated Police Check (overdue)\n⚠️ Insurance certificate (ABN workers)\n\nProviders can't fully match you until this is complete. Want me to open your passport?", actions:[{label:"Worker Passport →",url:"Worker Passport.dc.html"}]},
    "Help me write a shift note":          {text:"Let's draft your shift note! Tell me:\n\n1. Which client (first name fine)\n2. What you did during the shift\n3. How they went — any observations?\n\nI'll turn your rough points into a professional note for you to review before saving. 🦉", actions:[]},
    "What credentials are expiring?":      {text:"⚠️ **Expiring soon:**\n\n• First Aid — **14 days** · Renew now\n• WWCC — Jul 2027 · Plenty of time\n• Police Check — Nov 2026 · Upload renewal soon\n\nUpload the renewal before it expires to stay visible on the job board. 🦉", actions:[{label:"Worker Passport →",url:"Worker Passport.dc.html"}]},
    "Find work near me":                   {text:"**12 shifts near you right now:**\n\n🔥 2 urgent tonight · $58/hr · Glenroy\n📅 3 this week · Personal Care · Brunswick\n📅 7 next week · Various · 5–8km\n\nFiltered by your skills and availability. Want to see them?", actions:[{label:"Find Work →",url:"Worker App.dc.html"}]},
    "How do I use Verified Visit?":        {text:"**3 steps:**\n\n1. 🚗 Arrive at participant's location\n2. 📱 Scan the QR code (or enter PIN)\n3. ✅ GPS confirms — clock-in done!\n\nAt the end: clock out, write a quick note, get optional digital signature. Everything auto-files. Simple! 🦉", actions:[{label:"Open Verified Visit →",url:"Verified Visit.dc.html"}]},
    "Prepare a participant for review":    {text:"**Margaret R. — review in 11 days.**\n\nStill missing:\n❌ Updated OT recommendations\n❌ Speech pathology report\n❌ Your SC summary\n\nI can chase the missing reports and help you draft the SC summary. Want to start?", confirm:"Draft a reminder message to Jordan Pham (OT) requesting updated recommendations for Margaret R.?", actions:[{label:"Plan Review Prep →",url:"Plan Review Prep.dc.html"}]},
    "What reports are missing?":           {text:"**Missing reports:**\n\n• Speech pathology — Liam W. · review in 8 days ❌\n• Updated OT recs — Margaret R. · review in 11 days ❌\n• SC summary — Margaret R. · not yet drafted ❌\n\nI can draft reminder messages to each professional. Confirm and I'll prepare them. ✉️", confirm:"Send reminder messages to Jordan Pham (OT) and speech pathologist requesting outstanding reports?", actions:[{label:"Task Centre →",url:"Task Centre.dc.html"}]},
    "Send a referral to an OT":            {text:"I'll open **Send Referral** with Allied Health (OT) pre-selected. Which participant is this for, and what needs to be assessed? Once you confirm the details, I'll help draft the referral message.", confirm:"Open Send Referral form for OT assessment?", actions:[{label:"Send Referral →",url:"Support Coordination.dc.html"}]},
    "Summarise funding for Liam W.":       {text:"**Liam W. — funding alert:**\n\n⚠️ Core Supports — 92% used · 8% remaining\nCapacity Building — 54% used · on track\n\nAt current rate, Core will run out **before the end of the plan year.** This needs a SC review.\n\nWant me to draft a note for the participant and their family?", actions:[{label:"View funding →",url:"Support Coordination.dc.html"}]},
    "Summarise funding usage":             {text:"**Funding snapshot:**\n\n• Margaret R. — 62% Core · ✅ on track\n• Liam W. — ⚠️ 92% Core · **at risk**\n• David L. — 28% Core · 💡 underspending\n• Priya S. — 18% Core · 💡 very low\n\n→ Go to Budgets for full breakdown", actions:[{label:"View budgets →",url:"Support Coordination.dc.html"}]},
    "Show overdue tasks":                  {text:"**Overdue right now:**\n\n1. SC summary — Margaret R.\n2. Consent form — Priya S.\n3. First Aid renewal — Noah R.\n4. Shift note — Wed 18 Jun\n5. Provider update — Tom B.\n\nWant me to help with the first one?", actions:[{label:"Task Centre →",url:"Task Centre.dc.html"}]},
    "What evidence is still missing?":     {text:"**For Margaret R.'s review (11 days):**\n\n❌ Updated OT recommendations\n❌ Speech pathology report\n❌ Final SC summary\n\n✅ FCA\n✅ Progress reports\n✅ Goals and functional outcomes\n\nI can help you draft the SC summary right now. Want to start?", actions:[{label:"Plan Review Prep →",url:"Plan Review Prep.dc.html"}]},
    "Chase the missing OT report":         {text:"I'll draft a reminder message to **Jordan Pham (OT)** requesting updated recommendations for Margaret R.'s plan review.\n\nDraft:\n*\"Hi Jordan, could you please upload updated OT recommendations for Margaret Reyes before her plan review on 21 July? The current evidence pack is missing this document. Thank you.\"*\n\nSend this?", confirm:"Send reminder to Jordan Pham requesting OT recommendations for Margaret R.?", actions:[]},
    "Draft a review summary":              {text:"I'll draft the plan review summary for **Margaret Reyes**. I'll include:\n\n• Goals progress (from file)\n• Funding usage (62% Core)\n• Allied health updates\n• Recommendations for next plan\n\nThis will take a moment. Want me to start the draft?", confirm:"Generate plan review summary for Margaret Reyes based on current file?", actions:[]},
    "What do I have on today?":            {text:"**Today's schedule:**\n\n📅 08:30 — Margaret R. · Gait retraining · Physio\n📅 09:30 — David L. · Initial OT assessment\n📅 11:00 — Phone — SC Sarah Kelly (review prep)\n📅 14:00 — Tom B. · Sensory program review\n\nYou have 1 report overdue and 2 pieces of review evidence outstanding.", actions:[{label:"My Practice →",url:"Allied Health.dc.html"}]},
    "Help me write a session note":        {text:"Let's draft your session note! Tell me:\n\n• Client name\n• What you covered\n• Progress on any goals\n• Any observations or barriers\n\nI'll structure it professionally for you to review before saving. No need to get the wording right — that's my job. 🦉", actions:[]},
    "What evidence is needed for the review?": {text:"**For Margaret R. (review in 11 days):**\n\nStill needed from you:\n❌ Updated OT recommendations\n❌ Final therapy outcomes summary\n\nAlready submitted:\n✅ FCA ✅ Progress reports ✅ Goals ✅ Functional outcomes\n\nShall I help you draft the outstanding items?", actions:[{label:"Plan Review Prep →",url:"Plan Review Prep.dc.html"}]},
    "Send a report to the coordinator":    {text:"I'll prepare your report for **Sarah Kelly (SC)**. Which report — progress, FCA, or OT recommendations? Once you confirm, I'll attach it and notify Sarah.", confirm:"Send report to Sarah Kelly (Support Coordinator) linked to current participant?", actions:[{label:"Allied Health →",url:"Allied Health.dc.html"}]},
    "Summarise previous recommendations":  {text:"**Current recommendations on file:**\n\n• Ceiling hoist — Margaret R. (approved ✅)\n• Gait training — David L. (in progress)\n• AAC device trial — Ruth K. (on order)\n• Sensory program — Tom B. (approved ✅)\n\nWant me to draft updated recommendations for review?", actions:[]},
    "Who is in my care team?":             {text:"**Your care team:**\n\n👩‍💼 Sarah Kelly — Support Coordinator\n🧑‍🔧 James Liu — Support Worker\n🏥 Jordan Pham — Physiotherapist\n👩 Mariam T. — Guardian / nominee\n\nEveryone here is approved by you or your nominee.", actions:[{label:"My Team →",url:"Care Ecosystem.dc.html"}]},
    "What do I need to sign?":             {text:"**Waiting for your signature:**\n\n• Service Agreement — Brightside Care (2026–27)\n\nI can open it for you to review right now. Nothing gets signed without you reading it first. 🦉", actions:[{label:"View agreement →",url:"Service Agreement.dc.html"}]},
    "Explain my goals simply":             {text:"**Your 4 goals in plain words:**\n\n🚶 Walking further — going really well! **88%**\n🌍 Going out more — almost there! **64%**\n📱 Using communication device — just started! **40%**\n🏠 Doing things at home — working on it! **33%**\n\nYou're doing great. Every little bit counts. 🎉", actions:[{label:"My Goals →",url:"Participant Dashboard.dc.html"}]},
    "What's my next support?":             {text:"**Next support:**\n\n📅 Today at 11:00 AM\nPersonal Care with **James Liu**\n📍 12 Rose St, Glenroy\n\nJames arrives around 10:50. Your coordinator Sarah is aware. Let me know if anything changes!", actions:[]},
    "Help me message my coordinator":      {text:"I'll help draft a message to **Sarah Kelly**. What do you want to say? Write rough notes and I'll make it clear and professional.\n\nOr pick a topic:\n• About my plan\n• About my support worker\n• About an appointment", confirm:"Draft a message to Sarah Kelly (Support Coordinator)?", actions:[{label:"Messages →",url:"CiaraLink Connect.dc.html"}]},
    "How do I understand my funding?":     {text:"**Your NDIS plan has 3 buckets:**\n\n🛡️ Daily Supports — everyday care · **62% used**\n🌱 Capacity Building — therapy · **41% used**\n🔧 Equipment — hoists & devices · **87% — nearly full!**\n\nSarah monitors your spending. → My Funding", actions:[{label:"My Funding →",url:"Participant Dashboard.dc.html"}]},
    "Draft a message":                     {text:"Who would you like to message?\n\n• Support Coordinator — Sarah Kelly\n• Provider — Brightside Care\n• Allied Health — Jordan Pham\n• Care team group\n\nTell me who and what you want to say — I'll draft it for you.", actions:[{label:"Messages →",url:"CiaraLink Connect.dc.html"}]},
    "Where do I start?":                   {text:"Start with your role:\n\n🏥 **Provider** — manage participants, workers, shifts, agreements\n🧑‍🔧 **Support Worker** — find work, shifts, credentials\n📋 **Coordinator** — plans, funding, referrals, reviews\n🩺 **Allied Health** — assessments, reports, goals\n❤️ **Participant** — your care, goals, team, documents\n\nClick **Login** and select your role to begin.", actions:[{label:"Login →",url:"Login.dc.html"},{label:"Launch Hub →",url:"Index.dc.html"}]},
    "What does CiaraLink do?":                 {text:"CiaraLink is the operating system for modern care in the NDIS.\n\nIt connects participants, providers, workers, coordinators, and allied health — all in one place. One participant profile. Zero referral fees. Hugo (that's me!) helps everyone do their job faster.\n\nWant a tour?", actions:[{label:"Launch Hub →",url:"Index.dc.html"}]},
    "What's missing from my passport?":   {text:"**Worker Passport — 72% complete.**\n\nMissing:\n❌ First Aid (expires Nov 2026)\n❌ Updated Police Check\n⚠️ Insurance (optional for ABN)\n\nOnce these are uploaded, your profile is fully visible to providers. You're nearly there! 🦉", actions:[{label:"Upload now →",url:"Worker Passport.dc.html"}]},
    "Check my Worker Passport":            {text:"**Worker Passport status:**\n\n✅ NDIS screening check\n✅ WWCC\n✅ Driver licence\n❌ First Aid — **expiring in 14 days**\n❌ Police Check — overdue update\n\nCompletion: **72%** — 2 uploads away from 100%.", actions:[{label:"Worker Passport →",url:"Worker Passport.dc.html"}]},
    "Show credential alerts":              {text:"**Credential alerts across your team:**\n\n🔴 Noah R. — First Aid expiring in 7 days\n🟡 Amara O. — Police Check due for renewal\n🟡 James L. — WWCC expiring in 4 months\n\nI can open each worker's file to chase these.", actions:[{label:"Service Provider →",url:"Service Provider.dc.html"}]},
    "What is my responsiveness score?":    {text:"**Your CiaraLink Responsiveness Score: A**\n\n• Avg acknowledgement: 4h 12m (SLA: 48h ✅)\n• Referrals responded to: 94% ✅\n• Within-SLA responses: 89% ✅\n• Capacity freshness: Good ✅\n\nFast responders rank higher on the Capacity Board — no money involved, only behaviour.", actions:[{label:"CiaraLink Connect →",url:"CiaraLink Connect.dc.html"}]},
  };

  function fmt(t){ return t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>'); }

  var CONFIRM_TRIGGERS = ['send','message','referral','report','agree','sign','submit','share','assign','draft and send'];
  var SAFETY_WORDS = ['emergency','unsafe','danger','hurt','harm','abuse','neglect','crisis','distress'];

  // ── Styles ────────────────────────────────────────────────────────────────
  var sty = document.createElement('style');
  sty.textContent = `
    #hugo-btn{position:fixed;bottom:20px;right:16px;z-index:9999;width:96px;height:96px;border:none;background:transparent;cursor:pointer;padding:0;box-shadow:none;display:flex;align-items:center;justify-content:center;transition:transform .2s;overflow:visible;filter:drop-shadow(0 8px 16px rgba(14,147,132,.38))}
    #hugo-btn:hover{transform:scale(1.07) translateY(-4px);filter:drop-shadow(0 12px 22px rgba(14,147,132,.55))}
    #hugo-btn hugo-owl{width:96px;height:96px;pointer-events:none}
    #hugo-badge{position:absolute;top:6px;right:4px;width:20px;height:20px;border-radius:50%;background:#e0556e;border:2px solid #fff;font-size:11px;font-weight:800;color:#fff;display:flex;align-items:center;justify-content:center;font-family:system-ui;box-shadow:0 2px 6px rgba(224,85,110,.5)}
    #hugo-label{position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);white-space:nowrap;font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:11px;font-weight:800;color:#0b6b60;background:#e7f4f1;border:1px solid #b8e8df;padding:2px 9px;border-radius:8px;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.10)}
    #hugo-panel{position:fixed;bottom:128px;right:16px;z-index:9998;width:390px;max-height:570px;background:#fff;border-radius:22px;box-shadow:0 32px 64px -20px rgba(0,0,0,.38),0 0 0 1px rgba(0,0,0,.06);display:flex;flex-direction:column;font-family:'Hanken Grotesk',system-ui,sans-serif;overflow:hidden;opacity:0;transform:translateY(18px) scale(.96);transition:opacity .22s,transform .22s;pointer-events:none}
    #hugo-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}
    #hugo-hdr{background:linear-gradient(150deg,#0c2622,#0e5147);padding:13px 16px;display:flex;align-items:center;gap:11px;flex:0 0 auto}
    #hugo-hdr .ha{width:52px;height:52px;flex:0 0 52px;border-radius:13px;background:rgba(255,255,255,.08);overflow:hidden;display:flex;align-items:center;justify-content:center}
    #hugo-hdr .hn{font-size:15px;font-weight:800;color:#f4faf8;line-height:1.2}
    #hugo-hdr .hr{font-size:10px;color:#7ce0d2;margin-top:1px;font-weight:700;letter-spacing:.04em}
    #hugo-hdr .hpg{font-size:9px;color:#4a7a72;margin-top:1px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
    #hugo-hdr .hx{margin-left:auto;background:none;border:none;color:#7ce0d2;cursor:pointer;font-size:22px;line-height:1;padding:4px 6px;opacity:.8}
    #hugo-hdr .hx:hover{opacity:1}
    #hugo-msgs{flex:1;overflow-y:auto;padding:13px;display:flex;flex-direction:column;gap:9px;min-height:0;scroll-behavior:smooth}
    #hugo-msgs::-webkit-scrollbar{width:3px}
    #hugo-msgs::-webkit-scrollbar-thumb{background:#cdd8d3;border-radius:9px}
    .hm{max-width:92%}.hm.hugo{align-self:flex-start}.hm.user{align-self:flex-end}
    .hb2{padding:9px 12px;border-radius:13px;font-size:12.5px;line-height:1.55;color:#14302b}
    .hm.hugo .hb2{background:#f4f7f5;border-bottom-left-radius:4px}
    .hm.user .hb2{background:#16b8a6;color:#06201c;border-bottom-right-radius:4px;font-weight:600}
    .hps{display:flex;flex-direction:column;gap:4px;margin-top:7px}
    .hp{background:#fff;border:1px solid #e2e9e6;border-radius:9px;padding:6px 10px;font-size:11.5px;font-weight:700;color:#0b6b60;cursor:pointer;text-align:left;font-family:inherit;transition:background .1s,border-color .1s}
    .hp:hover{background:#f0faf8;border-color:#16b8a6}
    .hact{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
    .hact-btn{padding:5px 11px;border-radius:8px;border:none;background:#e7f4f1;color:#0b6b60;font-size:11.5px;font-weight:800;cursor:pointer;font-family:inherit;transition:background .1s}
    .hact-btn:hover{background:#16b8a6;color:#06201c}
    #hugo-ir{display:flex;gap:7px;padding:9px 11px;border-top:1px solid #eef2f0;flex:0 0 auto}
    #hugo-in{flex:1;border:1.5px solid #dde4e1;border-radius:10px;padding:7px 11px;font-family:inherit;font-size:12.5px;color:#14302b;background:#f7faf9;outline:none}
    #hugo-in:focus{border-color:#16b8a6;background:#fff}
    #hugo-sd{width:34px;height:34px;border-radius:9px;border:none;background:#16b8a6;color:#06201c;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex:0 0 34px;transition:background .1s}
    #hugo-sd:hover{background:#2bcbb9}
    .hbri{background:#f0faf8;border:1px solid #cce9d8;border-radius:11px;overflow:hidden;margin-top:4px}
    .hbri-title{font-size:12px;font-weight:800;color:#0b6b60;padding:8px 11px 5px;border-bottom:1px solid #e0efe9}
    .hbri-row{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid #f4f7f5}
    .hbri-dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px}
    .hbri-text{flex:1;font-size:11.5px;color:#14302b;line-height:1.4}
    .hbri-nav{padding:4px 9px;border-radius:7px;border:none;background:#16b8a6;color:#06201c;font-size:10.5px;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap}
    .hcf{background:#f0faf8;border:1px solid #b8e8df;border-radius:11px;padding:10px 12px;margin-top:6px}
    .hcf-t{font-size:12px;font-weight:800;color:#0b6b60;margin-bottom:7px}
    .hcf-m{font-size:11.5px;color:#41635c;background:#fff;border:1px solid #e2e9e6;border-radius:8px;padding:8px 10px;line-height:1.5;margin-bottom:8px;font-style:italic}
    .hcf-bx{display:flex;gap:5px}
    .hcf-s{flex:1;height:30px;border-radius:7px;border:none;background:#16b8a6;color:#06201c;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer}
    .hcf-r{flex:1;height:30px;border-radius:7px;border:1px solid #e2e9e6;background:#fff;color:#41635c;font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer}
    .hcf-c{width:30px;height:30px;border-radius:7px;border:1px solid #fca5b8;background:#fef0f3;color:#9b1c3a;cursor:pointer;font-size:14px}
    .hcs{font-size:10px;color:#b6c4be;text-align:center;padding:2px 0;font-family:system-ui}
    .htag{display:inline-block;font-size:10px;font-weight:700;padding:1px 7px;border-radius:5px;margin-left:5px}
    @media(max-width:520px){#hugo-panel{width:calc(100vw - 16px);right:8px;bottom:150px}
      /* Lift the owl above the mobile bottom nav so it doesn't cover the last tab */
      #hugo-btn{bottom:76px;right:10px;width:76px;height:76px}
      #hugo-btn hugo-owl{width:76px;height:76px}}
  `;
  document.head.appendChild(sty);

  // ── DOM ───────────────────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'hugo-btn'; btn.title = 'Ask Hugo';
  btn.innerHTML = '<hugo-owl mood="happy" palette="'+(ctx.palette||'mint')+'"></hugo-owl><span id="hugo-badge">!</span><span id="hugo-label">Ask Hugo</span>';

  var panel = document.createElement('div'); panel.id = 'hugo-panel';
  panel.innerHTML = `<div id="hugo-hdr"><div class="ha"><hugo-owl mood="wave" palette="${ctx.palette||'mint'}" style="width:52px;height:52px"></hugo-owl></div><div><div class="hn">Hugo</div><div class="hr">Your CiaraLink assistant</div><div class="hpg">${ctx.hint||''}</div></div><button class="hx" id="hugo-x">×</button></div><div id="hugo-msgs"></div><div id="hugo-ir"><input id="hugo-in" placeholder="Ask Hugo to help with something…" autocomplete="off"><button id="hugo-sd">➤</button></div>`;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var msgs = panel.querySelector('#hugo-msgs');
  var inp = panel.querySelector('#hugo-in');
  var hdrOwl = panel.querySelector('#hugo-hdr hugo-owl');
  var btnOwl = btn.querySelector('hugo-owl');

  function mood(m){ if(hdrOwl) hdrOwl.setAttribute('mood',m); if(btnOwl) btnOwl.setAttribute('mood',m); }

  function addMsgEl(who, contentFn){
    var w=document.createElement('div'); w.className='hm '+who;
    contentFn(w);
    msgs.appendChild(w);
    msgs.scrollTop = msgs.scrollHeight;
    return w;
  }

  function addMsg(text, who, withPrompts, actions, confirmText){
    addMsgEl(who, function(w){
      var b=document.createElement('div'); b.className='hb2'; b.innerHTML=fmt(text); w.appendChild(b);
      if(withPrompts && who==='hugo'){
        var pd=document.createElement('div'); pd.className='hps';
        ctx.prompts.slice(0,5).forEach(function(p){
          var bt=document.createElement('button'); bt.className='hp'; bt.textContent=p;
          bt.onclick=function(){ handle(p); }; pd.appendChild(bt);
        });
        w.appendChild(pd);
      }
      if(actions && actions.length){
        var ad=document.createElement('div'); ad.className='hact';
        actions.forEach(function(a){
          var ab=document.createElement('button'); ab.className='hact-btn'; ab.textContent=a.label;
          ab.onclick=function(){ window.location.href=a.url; }; ad.appendChild(ab);
        });
        w.appendChild(ad);
      }
      if(confirmText && who==='hugo'){
        var cf=document.createElement('div'); cf.className='hcf';
        cf.innerHTML='<div class="hcf-t">Confirm before sending?</div><div class="hcf-m">'+confirmText+'</div><div class="hcf-bx"><button class="hcf-s">Send now ✓</button><button class="hcf-r">Review first</button><button class="hcf-c">✕</button></div>';
        cf.querySelector('.hcf-s').onclick=function(){ addMsg("Done! Sent and recorded in the activity log. 🦉",'hugo',false,[]);  cf.remove(); mood('celebrate'); };
        cf.querySelector('.hcf-r').onclick=function(){ addMsg("No problem — I've drafted it for review. Edit and send when ready.",'hugo',false,[]); cf.remove(); };
        cf.querySelector('.hcf-c').onclick=function(){ cf.remove(); };
        w.appendChild(cf);
      }
    });
  }

  function addBriefing(){
    var br = BRIEFINGS[role] || BRIEFINGS['provider'];
    var roleGreet={
      provider: "Hey"+(userName?' '+userName:'')+" — what can I help you with today? Here's what needs attention right now.",
      worker:   "Hey"+(userName?' '+userName:'')+" — what can I help you with today? Here's your day.",
      coordinator:"Hey"+(userName?' '+userName:'')+" — what can I help you with today? Here's what I'm watching for you.",
      allied:   "Hey"+(userName?' '+userName:'')+" — what can I help you with today? Here's your day.",
      participant:"Hey"+(userName?' '+userName:'')+" — how can I help you today?",
    };
    var greetMsg=roleGreet[role]||("Hey"+(userName?' '+userName:'')+" — what can I help you with today?");
    addMsgEl('hugo', function(w){
      var d=document.createElement('div'); d.className='hb2';
      d.innerHTML='<strong>'+greetMsg+'</strong>'; w.appendChild(d);
      var bx=document.createElement('div'); bx.className='hbri';
      var title=document.createElement('div'); title.className='hbri-title'; title.textContent='Today\'s priority list'; bx.appendChild(title);
      br.items.forEach(function(item){
        var row=document.createElement('div'); row.className='hbri-row';
        var dot=document.createElement('span'); dot.className='hbri-dot';
        dot.style.background=item.urgency==='high'?'#e0556e':item.urgency==='med'?'#d98b22':'#16b8a6';
        var txt=document.createElement('span'); txt.className='hbri-text'; txt.textContent=item.text;
        var nav=document.createElement('button'); nav.className='hbri-nav'; nav.textContent=item.navLabel;
        nav.onclick=function(){ window.location.href=item.nav; };
        row.appendChild(dot); row.appendChild(txt); row.appendChild(nav); bx.appendChild(row);
      });
      w.appendChild(bx);
      var pd=document.createElement('div'); pd.className='hps';
      ctx.prompts.slice(0,3).forEach(function(p){
        var bt=document.createElement('button'); bt.className='hp'; bt.textContent=p;
        bt.onclick=function(){ handle(p); }; pd.appendChild(bt);
      });
      w.appendChild(pd);
    });
  }

  var typingEl=null;
  function showTyping(){ typingEl=document.createElement('div'); typingEl.className='hm hugo'; typingEl.innerHTML='<div class="hb2" style="color:#9aa8a3">Hugo is thinking…</div>'; msgs.appendChild(typingEl); msgs.scrollTop=msgs.scrollHeight; }
  function hideTyping(){ if(typingEl){ typingEl.remove(); typingEl=null; } }

  function handle(text){
    if(!text.trim()) return;
    addMsg(text,'user',false,[]);
    inp.value=''; mood('curious'); showTyping();
    setTimeout(function(){
      hideTyping();
      var lc=text.toLowerCase();
      // Safety
      if(SAFETY_WORDS.some(function(w){ return lc.includes(w); })){
        mood('curious'); addMsg("I want to make sure you're okay.\n\n**If this is an emergency, call 000 immediately.**\n\nFor safeguarding concerns:\n• Talk to your support coordinator\n• NDIS Quality & Safeguards Commission: **1800 035 544**\n\nYour safety comes first. 🦉", 'hugo', false, []); return;
      }
      // Greetings
      if(/^(hello|hi|hey|yo|g'day|sup)$/.test(lc)){
        mood('wave'); addBriefing(); return;
      }
      // Jokes
      if(lc.includes('joke')||lc.includes('funny')||lc.includes('laugh')){
        mood('celebrate'); addMsg("Why did the support coordinator bring a spreadsheet to lunch?\n\nBecause they heard the review was **on the table**! 😄\n\n(Now — what can I actually help with?)",'hugo',false,[]); return;
      }
      // Thanks
      if(lc.includes('thank')||lc.includes('great job')||lc.includes('legend')||lc.includes('awesome work')){
        mood('love'); addMsg("You're very welcome! Happy to help anytime. Tiny owl is always here for you. 🦉❤️",'hugo',false,[]); return;
      }
      // Exact match
      var r=RESP[text];
      if(r){
        var needsConf = r.confirm || CONFIRM_TRIGGERS.some(function(t){ return lc.includes(t); });
        mood(lc.includes('expir')||lc.includes('missing')||lc.includes('overdue')?'curious':'happy');
        addMsg(r.text,'hugo',false,r.actions||[],needsConf?(r.confirm||'Confirm this action?'):null);
        return;
      }
      // Fuzzy match
      var matched=null, matchedR=null;
      Object.keys(RESP).forEach(function(k){
        if(!matched){
          var words=k.toLowerCase().split(' ').filter(function(w){ return w.length>4; });
          if(words.some(function(w){ return lc.includes(w); })){ matched=RESP[k]; }
        }
      });
      if(matched){ mood('happy'); addMsg(matched.text,'hugo',false,matched.actions||[]); return; }
      // Fallback
      mood('curious');
      addMsg("I'm still learning that one! 🦉\n\nTry asking:\n• **\"What needs my attention today?\"**\n• **\"What's missing?\"**\n• **\"Help me write a note\"**\n• **\"Draft a message\"**",'hugo',true,[]);
      if(lc.includes('send')||lc.includes('create')||lc.includes('submit')||lc.includes('automate')){
        setTimeout(function(){ var cs=document.createElement('div'); cs.className='hcs'; cs.textContent='🦉 Full AI agent actions — confirmation-based & audited — coming in v2'; msgs.appendChild(cs); msgs.scrollTop=msgs.scrollHeight; },350);
      }
    }, 700);
  }

  var open=false, greeted=false;
  function openHugo(){
    open=true; panel.classList.add('open');
    document.getElementById('hugo-badge').style.display='none';
    mood('wave');
    if(!greeted){ greeted=true; setTimeout(function(){ mood('happy'); addBriefing(); },260); }
    setTimeout(function(){ inp.focus(); },300);
  }
  function closeHugo(){ open=false; panel.classList.remove('open'); mood('happy'); }

  btn.addEventListener('click',function(){ open?closeHugo():openHugo(); });
  panel.querySelector('#hugo-x').addEventListener('click',closeHugo);
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter') handle(inp.value); });
  panel.querySelector('#hugo-sd').addEventListener('click',function(){ handle(inp.value); });

  window.Hugo={ open:openHugo, close:closeHugo, ask:handle, page:page, role:role };
})();

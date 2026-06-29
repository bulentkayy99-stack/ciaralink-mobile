// CiaraLink Unified Chat + Hugo AI Popup — v3
// Messages · Ask Hugo · Voice Mode · Self-injecting
(function () {
  if (window.__chatDrawerLoaded) return;
  window.__chatDrawerLoaded = true;

  // ── Threads ───────────────────────────────────────────────────────────────
  var THREADS = [
    {id:0,name:'Sarah Kelly',     role:'Support Coordinator',init:'SK',tint:'#6366f1',participant:'Margaret R.',lastMsg:'Can you confirm the OT report is uploaded?',   time:'2m ago',   unread:true },
    {id:1,name:'Jordan Pham',     role:'Physiotherapist',    init:'JP',tint:'#9333ea',participant:'Margaret R.',lastMsg:'I\'ve uploaded the physio summary.',            time:'1h ago',   unread:false},
    {id:2,name:'Brightside Care', role:'Service Provider',   init:'BC',tint:'#16b8a6',participant:'David L.',   lastMsg:'Worker confirmed for tonight\'s shift.',        time:'3h ago',   unread:true },
    {id:3,name:'Margaret Reyes',  role:'Participant',        init:'MR',tint:'#0891b2',participant:'Margaret R.',lastMsg:'Thank you for the update!',                     time:'Yesterday',unread:false},
    {id:4,name:'Mariam T.',       role:'Guardian',           init:'MT',tint:'#e0556e',participant:'Margaret R.',lastMsg:'Please keep us updated on the review.',         time:'2d ago',   unread:false},
  ];
  var DEF_MSGS = {
    0:[{from:'other',text:'Hi — do you have the OT report yet?',time:'9:14'},{from:'me',text:'Still waiting on Jordan. I\'ll follow up today.',time:'9:22'},{from:'other',text:'The review is in 11 days — we need it at least a week before.',time:'9:31'},{from:'other',text:'Can you confirm the OT report is uploaded?',time:'10:02'}],
    1:[{from:'other',text:'Hi, I\'ve completed the physio assessment.',time:'8:45'},{from:'other',text:'I\'ve uploaded the physio summary for review.',time:'8:46'}],
    2:[{from:'other',text:'Worker confirmed for tonight\'s shift.',time:'14:32'}],
  };
  var SUGS = {
    0:["Sure, I'll upload it today.","I'll send it through by Friday.","Can you confirm which report?","I'll follow this up right now."],
    1:["Thank you — I'll add to review evidence.","Can you also send recommendations?","I've linked this to Margaret's profile."],
    2:["Thanks — shift is confirmed.","Can you confirm arrival time?"],
    3:["You're welcome! Let me know if you need anything."],
    4:["I'll send updates before the review."],
  };

  // ── Hugo data ─────────────────────────────────────────────────────────────
  var role='provider',userName='';
  try{var _s=JSON.parse(localStorage.getItem('ciaralink_session')||'{}');if(_s.role)role=_s.role;if(_s.name)userName=_s.name.split(' ')[0];}catch(e){}
  var ROLE_PROMPTS={
    provider:["What needs my attention today?","Show open shifts","Find workers for tonight","What documents are missing?","Show referral pipeline"],
    worker:["What do I need to do today?","Help me write a shift note","What credentials are expiring?","Find work near me","Check my passport"],
    coordinator:["What needs attention today?","Prepare Margaret for review","What reports are missing?","Summarise funding usage","Show overdue tasks"],
    allied:["What do I have on today?","Help me write a session note","What evidence is needed?","Send a report to coordinator","Summarise recommendations"],
    participant:["Who is in my care team?","What do I need to sign?","Explain my goals simply","What's my next support?","How do I understand my funding?"],
  };
  var HUGO_RESP={
    "Show open shifts":"**Open shifts right now:**\n\n🔴 Tonight 7pm–11pm · Personal Care · Margaret R. · **URGENT — no worker assigned**\n📅 Sat 10am–2pm · Community · Priya S. · 3 applications\n📅 Sun 9am–1pm · Personal Care · Ruth K. · 2 applications\n\nWant me to help assign a worker for tonight?",
    "What's missing?":"**Missing right now:**\n\n❌ Risk Assessment — Priya S.\n❌ Service Agreement — Ruth K. (unsigned)\n❌ Consent form — Hassan A.\n❌ SC report — Margaret R.\n\nI can chase any of these. Just say the word.",
    "Draft a message":"Who would you like to message? Tell me who and what you want to say — I'll draft it and you can review before sending.",
    "New referrals":"**2 new referrals received:**\n\n• Jordan Pham (Physio) — re: Margaret R. · accepted\n• Inner West OT — re: David L. · awaiting response\n\nWant me to open the referral inbox?",
    "Create a reminder":"Of course! What would you like me to remind you about, and when?\n\n• Tonight\n• Tomorrow morning\n• Before a shift\n• Custom time",
    "My next shift":"**Your next shift:**\n\n📅 Today at 11:00 AM\nPersonal Care with Margaret R.\n📍 12 Rose St, Glenroy\n\nClock-in unlocks on-site. Want me to open Verified Visit?",
    "Draft a shift note":"Let's draft your shift note. Tell me:\n\n1. Client name\n2. What you did\n3. How they went\n\nI'll turn your rough points into a professional note you can review before saving. 🦉",
    "Upload credential":"Which credential needs uploading?\n\n• First Aid certificate\n• Police Check\n• WWCC\n• Insurance\n• Other\n\nI can open Worker Passport for you.",
    "Message my provider":"I'll draft a message to your provider. What would you like to say?",
    "Remind me tonight":"Of course! What would you like me to remind you about tonight?",
    "Plan reviews due":"**Plan reviews coming up:**\n\n• Margaret R. — **11 days** · 2 reports missing\n• Liam W. — 28 days · funding risk alert\n• David L. — 45 days · on track\n\nWant to start preparing Margaret's review now?",
    "Request a report":"Which report would you like to request, and from whom? I'll draft the message for you to review.",
    "Send a referral":"Which participant is this for, and what type of referral? I'll open the Send Referral form with the details pre-filled.",
    "Missing evidence":"**Missing review evidence:**\n\n• OT recommendations — Margaret R. ❌\n• Speech report — Liam W. ❌\n• SC summary — Margaret R. ❌\n\nI can draft reminder messages to the relevant professionals.",
    "Draft a session note":"Let's draft your session note. Tell me:\n\n• Client name\n• What was covered\n• Progress on goals\n• Any observations\n\nI'll structure it professionally for you.",
    "Reports due":"**Reports due:**\n\n• OT assessment — Margaret R. · due before 21 Jul\n• Progress report — David L. · overdue\n\nWant me to help draft either of these?",
    "Message coordinator":"I'll draft a message to the support coordinator. What would you like to say? I can help make it clear and professional.",
    "Upload a report":"I'll open AI File Drop so you can upload the report. Once uploaded, I'll help link it to the correct participant and review evidence.",
    "What do I need to sign?":"**Waiting for your signature:**\n\n• Service Agreement — Brightside Care (2026–27)\n\nI can open the agreement for you to review right now.",
    "Who is in my care team?":"**Your care team:**\n\n👩‍💼 Sarah Kelly — Support Coordinator\n🧑‍🔧 James Liu — Support Worker\n🏥 Jordan Pham — Physiotherapist\n👩 Mariam T. — Guardian\n\nWant to send a message to anyone?",
    "Show my documents":"I can see your documents. Key ones include your NDIS plan, service agreements and consent forms. Want me to open your profile?",
    "Message my coordinator":"I'll draft a message to Sarah Kelly. What would you like to say?",
    "Explain my plan simply":"Your NDIS plan helps fund your daily care, therapy and equipment. You have 3 funding categories. Sarah Kelly manages your plan. Want me to explain any section?",

    "What needs my attention today?":"🔴 Open shift tonight — Margaret R.\n🔴 First Aid expiring — Noah R. (7 days)\n🟡 Agreement unsigned — David L.\n🟡 Missing speech report — review in 11 days\n🟢 3 new worker applications\n\nWant me to start with the urgent shift?",
    "Show open shifts":"**Open shifts:**\n• Tonight 7pm–11pm · Personal Care · Margaret R. · URGENT\n• Sat 10am–2pm · Community · Priya S.\n• Sun 9am–1pm · Personal Care · Ruth K.",
    "What documents are missing?":"**Missing now:**\n❌ Risk Assessment — Priya S.\n❌ Service Agreement — Ruth K. (unsigned)\n❌ Consent form — Hassan A.\n❌ SC report — Margaret R.",
    "What do I need to do today?":"🔴 Shift in 2h 15m — Margaret R.\n🔴 Shift note from yesterday outstanding\n⚠️ First Aid expiring in 14 days\n💡 Worker Passport 72% — one upload away",
    "Help me write a shift note":"Tell me:\n1. Which client\n2. What you did\n3. How they went\n\nI'll turn your rough points into a professional note to review before saving. 🦉",
    "What credentials are expiring?":"⚠️ First Aid — **14 days** · Renew now\n• WWCC — Jul 2027 · Fine\n• Police Check — Nov 2026 · Upload soon",
    "What needs attention today?":"3 plan reviews due in 14 days. Liam W. Core budget at 92% — risk alert. Referral awaiting OT response. Want a full briefing?",
    "Prepare Margaret for review":"**Margaret R. — review in 11 days**\n\n❌ Updated OT recommendations\n❌ Speech report\n❌ Your SC summary\n\n✅ FCA ✅ Progress reports ✅ Goals",
    "What reports are missing?":"• Speech pathology — Liam W. · 8 days ❌\n• Updated OT recs — Margaret R. · 11 days ❌\n• SC summary — Margaret R. · not drafted ❌",
    "What do I have on today?":"📅 08:30 — Margaret R. · Gait retraining\n📅 09:30 — David L. · OT assessment\n📅 11:00 — SC Sarah Kelly (review prep)\n📅 14:00 — Tom B. · Sensory review",
    "Who is in my care team?":"👩‍💼 Sarah Kelly — Support Coordinator\n🧑‍🔧 James Liu — Support Worker\n🏥 Jordan Pham — Physiotherapist\n👩 Mariam T. — Guardian",
    "What do I need to sign?":"• Service Agreement — Brightside Care (2026–27) awaiting your signature",
    "Explain my goals simply":"🚶 Walking further — 88%\n🌍 Going out more — 64%\n📱 Communication device — 40%\n🏠 Home tasks — 33%\n\nYou're doing great! 🎉",
  };
  var VOICE_CMDS=[
    {chip:"Remind me tonight",intent:"reminder",draft:'Set a reminder to message the support coordinator tonight at 7 PM. Want me to save it?'},
    {chip:"Draft a shift note",intent:"note",draft:'Tell me what happened during the shift and I\'ll draft a professional note for you to review.'},
    {chip:"Message coordinator",intent:"message",draft:'Draft: "Hi Sarah, I wanted to follow up on Margaret\'s plan review. Could you please advise on the missing OT report?" — Send this?'},
    {chip:"Find the OT report",intent:"file",draft:'Searching files for OT reports linked to Margaret R… Found: "Margaret Reyes - OT Assessment - Jun 2026". Open it?'},
    {chip:"Read my next task",intent:"task",draft:'Your next task: Upload OT report for Margaret R. before plan review (11 days). Want me to open AI File Drop?'},
    {chip:"Update shift hours",intent:"shift",draft:'Which shift would you like to update? Tell me the worker name, date and new hours.'},
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  var S={open:false,tab:'messages',view:'list',activeId:null,msgInput:'',unread:{},messages:{},hugoMsgs:[],voiceState:'idle',voiceTranscript:'',voiceDraft:'',voiceIntent:''};
  THREADS.forEach(function(t){S.unread[t.id]=t.unread;});
  function loadData(){try{var AD=window.AegisData;if(AD){var m=AD.get('chat_messages');if(m)S.messages=m;var h=AD.get('hugo_chat');if(h)S.hugoMsgs=h;}}catch(e){}}
  function saveMsg(){try{var AD=window.AegisData;if(AD)AD.set('chat_messages',S.messages);}catch(e){}}
  function saveHugo(){try{var AD=window.AegisData;if(AD)AD.set('hugo_chat',S.hugoMsgs.slice(-30));}catch(e){}}
  function unreadCount(){return Object.values(S.unread).filter(Boolean).length;}
  function getMsgs(id){return(DEF_MSGS[id]||[]).concat(S.messages[id]||[]);}
  loadData();

  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function fmt(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');}

  // ── Styles ────────────────────────────────────────────────────────────────
  var st=document.createElement('style');
  st.textContent=`
    #cp-fab{position:fixed;bottom:128px;right:18px;z-index:9990;width:52px;height:52px;border-radius:50%;border:none;background:linear-gradient(150deg,#1e3a8a,#3b5ac8);box-shadow:0 6px 22px -6px rgba(42,74,138,.75);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .18s;outline:none}
    #cp-fab:hover{transform:scale(1.09)}
    #cp-fab svg{pointer-events:none}
    #cp-badge{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;border-radius:9px;padding:0 4px;background:#e0556e;border:2px solid #fff;font-size:10px;font-weight:800;color:#fff;display:flex;align-items:center;justify-content:center;font-family:system-ui}
    #cp-win{position:fixed;bottom:90px;right:18px;z-index:9991;width:400px;height:600px;max-height:calc(100vh - 110px);background:#fff;border-radius:22px;box-shadow:0 24px 64px -16px rgba(0,0,0,.36),0 0 0 1px rgba(0,0,0,.07);display:flex;flex-direction:column;overflow:hidden;font-family:'Hanken Grotesk',system-ui,sans-serif;opacity:0;transform:translateY(16px) scale(.95);transition:opacity .22s,transform .22s;pointer-events:none}
    #cp-win.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}
    #cp-hdr{background:linear-gradient(150deg,#0c2622,#0e5147);padding:12px 14px;display:flex;align-items:center;gap:10px;flex:0 0 auto}
    #cp-tabs{display:flex;gap:4px;flex:1}
    .cp-tab{flex:1;height:30px;border:none;border-radius:9px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:background .12s}
    .cp-tab.active{background:rgba(255,255,255,.18);color:#f4faf8}
    .cp-tab:not(.active){background:transparent;color:#7ce0d2}
    .cp-tab:not(.active):hover{background:rgba(255,255,255,.08)}
    #cp-hdr-acts{display:flex;gap:3px;align-items:center}
    #cp-full-btn{font-size:10.5px;font-weight:700;color:#7ce0d2;background:rgba(255,255,255,.1);border:none;border-radius:7px;padding:4px 8px;cursor:pointer;font-family:inherit}
    #cp-full-btn:hover{background:rgba(255,255,255,.18)}
    #cp-close{background:none;border:none;color:#7ce0d2;cursor:pointer;font-size:20px;line-height:1;padding:2px 5px}
    /* Messages */
    #cp-msg-pane{display:flex;flex-direction:column;flex:1;overflow:hidden}
    #cp-search-box{padding:8px 11px;border-bottom:1px solid #f4f7f5;flex:0 0 auto}
    #cp-search-inp{width:100%;height:33px;border:1.5px solid #e2e9e6;border-radius:9px;padding:0 10px;font-family:inherit;font-size:12.5px;color:#14302b;background:#f7faf9;outline:none;box-sizing:border-box}
    #cp-search-inp:focus{border-color:#16b8a6;background:#fff}
    #cp-conv-list{flex:1;overflow-y:auto}
    #cp-conv-list::-webkit-scrollbar{width:3px}#cp-conv-list::-webkit-scrollbar-thumb{background:#cdd8d3;border-radius:9px}
    .cp-row{display:flex;align-items:center;gap:9px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f9fbfa;transition:background .1s}
    .cp-row:hover{background:#f4f7f5}
    .cp-av{width:36px;height:36px;border-radius:10px;flex:0 0 36px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;position:relative}
    .cp-udot{position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:#e0556e;border:1.5px solid #fff}
    .cp-inf{flex:1;min-width:0}.cp-nm{font-size:12.5px;color:#14302b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cp-rl{font-size:10px;color:#8a9a94;margin-top:1px}.cp-lm{font-size:11.5px;color:#6c7f79;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cp-tm{font-size:10px;color:#b6c4be;white-space:nowrap;align-self:flex-start}
    /* Thread */
    #cp-thread-view{display:none;flex-direction:column;flex:1;overflow:hidden}
    #cp-th-hdr{padding:9px 12px;border-bottom:1px solid #e7ece9;display:flex;align-items:center;gap:8px;flex:0 0 auto}
    #cp-back-btn{background:none;border:none;cursor:pointer;color:#0b6b60;font-size:16px;font-weight:800;padding:2px 5px 2px 0}
    #cp-th-av{width:32px;height:32px;border-radius:8px;flex:0 0 32px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff}
    #cp-th-inf .n{font-size:13px;font-weight:800;color:#14302b}.#cp-th-inf .r{font-size:10.5px;color:#8a9a94}
    #cp-msgs{flex:1;overflow-y:auto;padding:11px 12px;display:flex;flex-direction:column;gap:8px}
    #cp-msgs::-webkit-scrollbar{width:3px}#cp-msgs::-webkit-scrollbar-thumb{background:#cdd8d3;border-radius:9px}
    .cp-brow{display:flex;align-items:flex-end;gap:6px}.cp-brow.me{flex-direction:row-reverse}
    .cp-bav{width:22px;height:22px;border-radius:6px;flex:0 0 22px;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#fff}
    .cp-bub{max-width:75%;padding:8px 11px;border-radius:12px;font-size:12.5px;line-height:1.5}
    .cp-bub.other{background:#f4f7f5;color:#14302b;border-bottom-left-radius:3px}.cp-bub.me{background:#16b8a6;color:#06201c;border-bottom-right-radius:3px;font-weight:600}
    .cp-ts{font-size:9.5px;color:#b6c4be;margin-top:2px;text-align:right}
    #cp-sug-strip{padding:7px 11px;border-top:1px solid #f4f7f5;display:flex;flex-wrap:wrap;gap:4px;background:#f9fbfa;flex:0 0 auto}
    .cp-sug{padding:4px 9px;border-radius:7px;border:1px solid #e2e9e6;background:#fff;color:#0b6b60;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
    .cp-sug:hover{background:#f0faf8;border-color:#16b8a6}
    #cp-inp-row{padding:8px 10px;border-top:1px solid #e7ece9;display:flex;gap:6px;align-items:flex-end;flex:0 0 auto}
    #cp-inp{flex:1;border:1.5px solid #dde4e1;border-radius:10px;padding:7px 10px;font-family:inherit;font-size:12.5px;color:#14302b;background:#f7faf9;resize:none;height:38px;outline:none;line-height:1.4}
    #cp-inp:focus{border-color:#16b8a6;background:#fff}
    #cp-send{width:38px;height:38px;border-radius:10px;border:none;background:#16b8a6;color:#06201c;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex:0 0 38px}
    #cp-send:hover{background:#2bcbb9}
    /* Hugo pane */
    #cp-hugo-pane{display:none;flex-direction:column;flex:1;overflow:hidden}
    #cp-hugo-msgs{flex:1;overflow-y:auto;padding:11px 12px;display:flex;flex-direction:column;gap:8px}
    #cp-hugo-msgs::-webkit-scrollbar{width:3px}#cp-hugo-msgs::-webkit-scrollbar-thumb{background:#cdd8d3;border-radius:9px}
    #cp-hugo-prompts{padding:6px 10px;border-top:1px solid #f4f7f5;display:flex;flex-wrap:wrap;gap:4px;background:#f9fbfa;flex:0 0 auto}
    .cp-hp{padding:4px 9px;border-radius:7px;border:1px solid #e2e9e6;background:#fff;color:#0b6b60;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
    .cp-hp:hover{background:#f0faf8;border-color:#16b8a6}
    #cp-voice-strip{padding:7px 10px 8px;background:#f9fbfa;border-top:1px solid #eef2f0;flex:0 0 auto}
    #cp-voice-big{display:flex;align-items:center;gap:10px;width:100%;padding:9px 13px;border:none;border-radius:12px;background:linear-gradient(135deg,#0c2622,#0e5147);color:#f4faf8;cursor:pointer;font-family:inherit}
    #cp-voice-big:hover{opacity:.92}
    #cp-voice-big .vi{width:32px;height:32px;border-radius:9px;background:rgba(22,184,166,.22);display:flex;align-items:center;justify-content:center;flex:0 0 32px}
    #cp-voice-big .vt .vl{font-size:12.5px;font-weight:800}.vt .vs{font-size:10px;color:#7ce0d2;margin-top:1px}
    #cp-voice-big .vb{font-size:9px;font-weight:700;background:rgba(22,184,166,.28);color:#7ce0d2;padding:2px 6px;border-radius:5px;margin-left:auto;white-space:nowrap}
    #cp-hugo-inp-row{padding:8px 10px;border-top:1px solid #e7ece9;display:flex;gap:6px;align-items:flex-end;flex:0 0 auto}
    #cp-hugo-inp{flex:1;border:1.5px solid #dde4e1;border-radius:10px;padding:7px 10px;font-family:inherit;font-size:12.5px;color:#14302b;background:#f7faf9;resize:none;height:38px;outline:none;line-height:1.4}
    #cp-hugo-inp:focus{border-color:#16b8a6;background:#fff}
    #cp-hugo-send{width:38px;height:38px;border-radius:10px;border:none;background:#16b8a6;color:#06201c;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex:0 0 38px}
    #cp-hugo-send:hover{background:#2bcbb9}
    /* Voice mode panel */
    #cp-voice-panel{display:none;flex-direction:column;flex:1;overflow:hidden}
    #cp-voice-hdr{padding:10px 13px;border-bottom:1px solid #e7ece9;display:flex;align-items:center;gap:9px;background:#f9fbfa;flex:0 0 auto}
    #cp-vback{background:none;border:none;cursor:pointer;color:#0b6b60;font-size:16px;font-weight:800;padding:2px 5px 2px 0}
    #cp-voice-status{font-size:12px;font-weight:700;padding:3px 10px;border-radius:8px;background:#e7f4f1;color:#0b6b60}
    #cp-voice-status.listening{background:#fde8ed;color:#9b1c3a;animation:cp-vs-pulse 1s ease-in-out infinite}
    #cp-voice-status.thinking{background:#fdf3e3;color:#8a5a1e}
    @keyframes cp-vs-pulse{0%,100%{opacity:1}50%{opacity:.5}}
    #cp-voice-body{flex:1;overflow-y:auto;padding:12px}
    #cp-voice-chips-row{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px}
    .cp-vc{padding:5px 11px;border-radius:9px;border:1px solid #e2e9e6;background:#fff;color:#14302b;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit}
    .cp-vc:hover{background:#f0faf8;border-color:#16b8a6;color:#0b6b60}
    #cp-transcript-box{background:#f4f7f5;border-radius:12px;padding:11px 13px;margin-bottom:10px;font-size:13px;color:#14302b;min-height:50px;line-height:1.5}
    #cp-transcript-box.empty{color:#9aa8a3;font-style:italic}
    #cp-hugo-resp-box{background:#fff;border:1px solid #e7ece9;border-radius:12px;padding:11px 13px;margin-bottom:10px;font-size:13px;color:#14302b;line-height:1.5;display:none}
    #cp-action-card{background:#f0faf8;border:1px solid #b8e8df;border-radius:12px;padding:12px 14px;margin-bottom:10px;display:none}
    #cp-action-card .at{font-size:12px;font-weight:800;color:#0b6b60;margin-bottom:8px}
    #cp-action-card .ab{font-size:12.5px;color:#14302b;background:#fff;border:1px solid #e2e9e6;border-radius:9px;padding:9px 11px;line-height:1.5;margin-bottom:9px;font-style:italic}
    #cp-action-btns{display:flex;gap:5px}
    #cp-action-btns button{height:30px;border-radius:8px;font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer}
    #cp-act-send{flex:1;border:none;background:#16b8a6;color:#06201c}
    #cp-act-edit{flex:1;border:1px solid #e2e9e6;background:#fff;color:#41635c}
    #cp-act-cancel{width:30px;border:1px solid #fca5b8;background:#fef0f3;color:#9b1c3a}
    #cp-voice-cmd-row{padding:8px 10px;border-top:1px solid #e7ece9;display:flex;gap:6px;flex:0 0 auto;background:#fff}
    #cp-voice-cmd-inp{flex:1;border:1.5px solid #dde4e1;border-radius:10px;padding:7px 10px;font-family:inherit;font-size:12.5px;color:#14302b;background:#f7faf9;outline:none}
    #cp-voice-cmd-inp:focus{border-color:#16b8a6;background:#fff}
    #cp-voice-go{height:38px;padding:0 14px;border-radius:10px;border:none;background:#16b8a6;color:#06201c;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:800;flex:0 0 auto}
    #cp-voice-go:hover{background:#2bcbb9}
    #cp-drive-toggle{padding:7px 10px 0;display:flex;align-items:center;gap:8px;background:#fff;flex:0 0 auto;border-top:1px solid #f4f7f5}
    #cp-drive-toggle label{font-size:11px;font-weight:700;color:#6c7f79;cursor:pointer;display:flex;align-items:center;gap:5px}
    /* Toast */
    #cp-toast{position:fixed;bottom:82px;right:80px;z-index:9999;background:#14302b;color:#eafaf7;padding:9px 14px;border-radius:11px;font-size:12px;font-weight:700;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .18s;box-shadow:0 6px 20px rgba(0,0,0,.28)}
    #cp-toast.show{opacity:1}
    @media(max-width:500px){#cp-win{width:calc(100vw - 12px);right:6px;bottom:80px}
      /* Sit above the lifted Hugo owl + mobile bottom nav */
      #cp-fab{bottom:166px;right:20px}}
  `;
  document.head.appendChild(st);

  // ── DOM ───────────────────────────────────────────────────────────────────
  var fab=document.createElement('button');
  fab.id='cp-fab'; fab.title='Messages';
  fab.innerHTML='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9h8 M8 13h5 M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/></svg><span id="cp-badge"></span>';

  var win=document.createElement('div'); win.id='cp-win';
  win.innerHTML=`
    <div id="cp-hdr">
      <div id="cp-tabs">
        <button class="cp-tab active" data-t="messages">💬 Messages</button>
        <button class="cp-tab" data-t="hugo">🦉 Ask Hugo</button>
      </div>
      <div id="cp-hdr-acts">
        <button id="cp-full-btn">Full inbox ↗</button>
        <button id="cp-close">×</button>
      </div>
    </div>

    <!-- MESSAGES PANE -->
    <div id="cp-msg-pane">
      <div id="cp-search-box"><input id="cp-search-inp" placeholder="Search conversations…" autocomplete="off"></div>
      <div id="cp-conv-list"></div>
    </div>

    <!-- THREAD VIEW -->
    <div id="cp-thread-view">
      <div id="cp-th-hdr">
        <button id="cp-back-btn">←</button>
        <div id="cp-th-av"></div>
        <div id="cp-th-inf"><div class="n" style="font-size:13px;font-weight:800;color:#14302b"></div><div class="r" style="font-size:10.5px;color:#8a9a94;margin-top:1px"></div></div>
      </div>
      <div id="cp-msgs"></div>
      <div id="cp-sug-strip"></div>
      <div id="cp-inp-row">
        <textarea id="cp-inp" placeholder="Type a message…"></textarea>
        <button id="cp-send">➤</button>
      </div>
    </div>

    <!-- HUGO PANE -->
    <div id="cp-hugo-pane">
      <div id="cp-hugo-msgs"></div>
      <div id="cp-hugo-prompts"></div>
      <div id="cp-voice-strip">
        <button id="cp-voice-big">
          <div class="vi"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ce0d2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v5 M8 23h8"/></svg></div>
          <div class="vt"><div class="vl">🎙 Talk to Hugo</div><div class="vs">Coming soon — draft notes, messages &amp; reminders hands-free</div></div>
          <span class="vb">Coming Soon</span>
        </button>
      </div>
      <div id="cp-hugo-inp-row">
        <textarea id="cp-hugo-inp" placeholder="Ask Hugo to help with something…"></textarea>
        <button id="cp-hugo-send">➤</button>
      </div>
    </div>

    <!-- VOICE COMING SOON MODAL -->
    <div id="cp-voice-modal" style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .2s;font-family:'Hanken Grotesk',system-ui,sans-serif">
      <div id="cp-vm-box" style="background:#fff;border-radius:22px;width:400px;max-width:calc(100vw - 24px);box-shadow:0 32px 64px -20px rgba(0,0,0,.4);overflow:hidden;transform:scale(.94);transition:transform .22s">
        <div style="background:linear-gradient(150deg,#0c2622,#0e5147);padding:22px 24px;display:flex;align-items:flex-start;gap:14px">
          <div style="width:52px;height:52px;border-radius:15px;background:rgba(22,184,166,.2);display:flex;align-items:center;justify-content:center;flex:0 0 52px">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7ce0d2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v5 M8 23h8"/></svg>
          </div>
          <div style="flex:1">
            <div style="font-size:18px;font-weight:800;color:#f4faf8;margin-bottom:6px">Hugo Voice Mode</div>
            <div style="font-size:12.5px;color:#9dcdc8;line-height:1.55">Hugo Voice will let you talk to Hugo like a real assistant — draft messages, create reminders, update shifts, find reports and guide workflows hands-free.</div>
            <span style="display:inline-block;margin-top:8px;font-size:11px;font-weight:700;color:#d98b22;background:rgba(217,139,34,.2);padding:3px 10px;border-radius:7px">Coming Soon</span>
          </div>
        </div>
        <div style="padding:20px 22px">
          <div style="font-size:11px;font-weight:700;color:#9aa8a3;letter-spacing:.08em;margin-bottom:10px">FUTURE VOICE COMMANDS</div>
          <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:16px">
            <div style="display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:10px;background:#f4f7f5;font-size:12.5px;color:#14302b"><span style="font-size:15px">🎙</span>"Hugo, remind me tonight to message the coordinator."</div>
            <div style="display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:10px;background:#f4f7f5;font-size:12.5px;color:#14302b"><span style="font-size:15px">📝</span>"Hugo, draft a shift note."</div>
            <div style="display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:10px;background:#f4f7f5;font-size:12.5px;color:#14302b"><span style="font-size:15px">📄</span>"Hugo, find the OT report."</div>
            <div style="display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:10px;background:#f4f7f5;font-size:12.5px;color:#14302b"><span style="font-size:15px">✉️</span>"Hugo, send Sema a shift for tomorrow."</div>
            <div style="display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:10px;background:#f4f7f5;font-size:12.5px;color:#14302b"><span style="font-size:15px">📋</span>"Hugo, read my next task."</div>
          </div>
          <div style="background:#f0faf8;border:1px solid #cce9d8;border-radius:11px;padding:11px 13px;font-size:12px;color:#14302b;line-height:1.55;margin-bottom:16px">🔒 <strong>Hugo always confirms</strong> before sending, sharing, signing, changing rosters, changing consent or submitting anything important. You stay in control.</div>
          <div style="background:#f7faf9;border:1px solid #e7ece9;border-radius:11px;padding:10px 13px;font-size:12px;color:#41635c;margin-bottom:16px">✅ <strong>Available now:</strong> Hugo Chat and suggested replies are live. Voice mode is coming in v2.</div>
          <button id="cp-vm-close" style="width:100%;height:44px;border-radius:13px;border:none;background:#16b8a6;color:#06201c;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">Got it — I'll be ready for voice mode</button>
        </div>
      </div>
    </div>

    <div id="cp-toast"></div>
  `;
  document.body.appendChild(fab);
  document.body.appendChild(win);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function updateBadge(){ var n=unreadCount(),b=document.getElementById('cp-badge'); if(b){b.textContent=n||'';b.style.display=n?'flex':'none';} }
  updateBadge();

  var toastTimer;
  function toast(m){ var t=win.querySelector('#cp-toast');if(!t)return; t.textContent=m;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('show');},2800); }

  function showPane(id){
    ['cp-msg-pane','cp-thread-view','cp-hugo-pane','cp-voice-panel'].forEach(function(p){
      var el=document.getElementById(p); if(el) el.style.display='none';
    });
    var el=document.getElementById(id); if(el){ el.style.display='flex'; el.style.flexDirection='column'; el.style.flex='1'; el.style.overflow='hidden'; }
  }

  function switchTab(tab){
    S.tab=tab;
    win.querySelectorAll('.cp-tab').forEach(function(b){ b.classList.toggle('active',b.dataset.t===tab); });
    if(tab==='messages'){ S.view==='list'?showPane('cp-msg-pane'):showPane('cp-thread-view'); }
    else{ showPane('cp-hugo-pane'); }
  }

  // ── Messages ──────────────────────────────────────────────────────────────
  function renderList(){
    var list=document.getElementById('cp-conv-list'); if(!list)return;
    list.innerHTML='';
    var q=(document.getElementById('cp-search-inp')||{}).value||'';
    THREADS.filter(function(t){return !q||(t.name+t.role+t.participant).toLowerCase().includes(q.toLowerCase());})
    .forEach(function(t){
      var row=document.createElement('div'); row.className='cp-row';
      var u=S.unread[t.id]; var last=(S.messages[t.id]||[]).slice(-1)[0];
      var lm=last?last.text:t.lastMsg; var lt=last?'Just now':t.time;
      row.innerHTML='<div class="cp-av" style="background:'+t.tint+'">'+t.init+(u?'<div class="cp-udot"></div>':'')+'</div>'
        +'<div class="cp-inf"><div class="cp-nm" style="font-weight:'+(u?800:600)+'">'+esc(t.name)+'</div>'
        +'<div class="cp-rl">'+esc(t.role)+(t.participant?' · '+esc(t.participant):'')+'</div>'
        +'<div class="cp-lm">'+(u?'<b>':'')+esc(lm.slice(0,50)+(lm.length>50?'…':''))+(u?'</b>':'')+'</div></div>'
        +'<div class="cp-tm">'+lt+'</div>';
      row.onclick=function(){openThread(t.id);};
      list.appendChild(row);
    });
  }

  function openThread(id){
    S.activeId=id; S.unread[id]=false; updateBadge(); S.view='thread';
    var t=THREADS[id]||THREADS[0];
    var av=document.getElementById('cp-th-av'); if(av){av.textContent=t.init;av.style.background=t.tint;}
    var nm=win.querySelector('#cp-th-inf .n'); if(nm)nm.textContent=t.name;
    var rl=win.querySelector('#cp-th-inf .r'); if(rl)rl.textContent=t.role+(t.participant?' · re: '+t.participant:'');
    renderThreadMsgs(id); renderSugs(id);
    var inp=document.getElementById('cp-inp'); if(inp){inp.value='';inp.focus();}
    showPane('cp-thread-view');
    setTimeout(function(){var m=document.getElementById('cp-msgs');if(m)m.scrollTop=m.scrollHeight;},50);
  }

  function renderThreadMsgs(id){
    var t=THREADS[id]||THREADS[0]; var mc=document.getElementById('cp-msgs'); if(!mc)return; mc.innerHTML='';
    getMsgs(id).forEach(function(m){
      var row=document.createElement('div'); row.className='cp-brow'+(m.from==='me'?' me':'');
      var av2=m.from!=='me'?'<div class="cp-bav" style="background:'+t.tint+'">'+t.init+'</div>':'';
      row.innerHTML=av2+'<div style="max-width:75%"><div class="cp-bub '+m.from+'">'+esc(m.text)+'</div><div class="cp-ts">'+m.time+(m.from==='me'?' · ✓✓':'')+'</div></div>';
      mc.appendChild(row);
    });
    mc.scrollTop=mc.scrollHeight;
  }

  function renderSugs(id){
    var strip=document.getElementById('cp-sug-strip'); if(!strip)return; strip.innerHTML='';
    (SUGS[id]||[]).forEach(function(s){
      var b=document.createElement('button'); b.className='cp-sug'; b.textContent=s;
      b.onclick=function(){var inp=document.getElementById('cp-inp');if(inp){inp.value=s;inp.focus();}};
      strip.appendChild(b);
    });
  }

  function sendMsg(){
    var inp=document.getElementById('cp-inp'); if(!inp||!inp.value.trim())return;
    var id=S.activeId; if(id===null)return;
    var text=inp.value.trim(); inp.value='';
    var msg={from:'me',text:text,time:new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}),id:Date.now()};
    if(!S.messages[id])S.messages[id]=[];
    S.messages[id].push(msg); saveMsg();
    try{var AD=window.AegisData;if(AD){var t=THREADS[id];AD.push('notifications',{title:'Message sent to '+t.name,body:text.slice(0,60),time:msg.time,type:'message',url:'CiaraLink Connect.dc.html',read:false});}}catch(e){}
    renderThreadMsgs(id); toast('Message sent ✓');
  }

  function goList(){ S.view='list'; showPane('cp-msg-pane'); renderList(); }

  // ── Hugo chat ─────────────────────────────────────────────────────────────
  function addHugoMsg(text,who){
    S.hugoMsgs.push({from:who,text:text,time:new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})});
    saveHugo(); renderHugoMsgs();
  }

  function renderHugoMsgs(){
    var mc=document.getElementById('cp-hugo-msgs'); if(!mc)return; mc.innerHTML='';
    if(!S.hugoMsgs.length){
      var roleSubtext={
        provider:"I can help with shifts, workers, referrals, agreements, documents or messages.",
        worker:"I can help with your shifts, notes, credentials, reminders or messages.",
        coordinator:"I can help with referrals, plan reviews, reports, funding, reminders or messages.",
        allied:"I can help with reports, session notes, referrals, reminders or participant documents.",
        participant:"I can help explain your care team, documents, messages, appointments or things you need to sign."
      };
      var sub=roleSubtext[role]||"I can help with messages, shifts, reminders, documents, tasks or anything you're working on in CiaraLink.";
      var greeting=document.createElement('div'); greeting.style.cssText='padding:12px';
      greeting.innerHTML=
        '<div style="background:linear-gradient(150deg,#0c2622,#0e5147);border-radius:14px;padding:14px 15px;margin-bottom:10px">'
        +'<div style="font-size:15px;font-weight:800;color:#f4faf8;margin-bottom:4px">Hey'+(userName?' '+userName:'')+', how can I help you today? 🦉</div>'
        +'<div style="font-size:12px;color:#9dcdc8;line-height:1.5">'+sub+'</div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
        +[["💬","Messages","Review unread messages"],["📋","Tasks","Check what needs action"],["📄","Documents","Find missing files"],["⏰","Reminder","Create a reminder"]].map(function(c){
          return '<button onclick="if(window.ChatDrawer&&window.ChatDrawer._hugoAsk)window.ChatDrawer._hugoAsk(\''+c[2]+'\');" style="display:flex;align-items:center;gap:7px;padding:9px 11px;border-radius:11px;border:1px solid #e2e9e6;background:#fff;cursor:pointer;font-family:inherit;text-align:left;transition:background .1s" onmouseover="this.style.background=\'#f4f7f5\'" onmouseout="this.style.background=\'#fff\'">'
            +'<span style="font-size:16px">'+c[0]+'</span>'
            +'<div><div style="font-size:12px;font-weight:700;color:#14302b">'+c[1]+'</div><div style="font-size:10.5px;color:#8a9a94">'+c[2]+'</div></div>'
            +'</button>';
        }).join('')
        +'</div>';
      mc.appendChild(greeting);
    }
    S.hugoMsgs.forEach(function(m){
      var row=document.createElement('div'); row.className='cp-brow'+(m.from==='me'?' me':'');
      row.innerHTML='<div style="max-width:90%"><div class="cp-bub '+m.from+'" style="border-radius:13px">'+fmt(m.text)+'</div><div class="cp-ts">'+m.time+'</div></div>';
      mc.appendChild(row);
    });
    mc.scrollTop=mc.scrollHeight;
  }

  function renderHugoPrompts(){
    var pd=document.getElementById('cp-hugo-prompts'); if(!pd)return; pd.innerHTML='';
    var ROLE_QUICK={
      provider:["Show open shifts","What's missing?","Draft a message","New referrals","Create a reminder"],
      worker:["My next shift","Draft a shift note","Upload credential","Message my provider","Remind me tonight"],
      coordinator:["Plan reviews due","Request a report","Send a referral","Missing evidence","Create a reminder"],
      allied:["Draft a session note","Reports due","Message coordinator","Upload a report","Create a reminder"],
      participant:["What do I need to sign?","Who is in my care team?","Show my documents","Message my coordinator","Explain my plan simply"],
    };
    var prompts=(ROLE_QUICK[role]||ROLE_QUICK.provider);
    prompts.forEach(function(p){
      var b=document.createElement('button'); b.className='cp-hp'; b.textContent=p;
      b.onclick=function(){handleHugo(p);}; pd.appendChild(b);
    });
  }

  function handleHugo(text){
    if(!text.trim())return;
    addHugoMsg(text,'me');
    var lc=text.toLowerCase();
    var resp=HUGO_RESP[text]||null;
    if(!resp){
      var keys=Object.keys(HUGO_RESP);
      for(var i=0;i<keys.length;i++){
        var k=keys[i];
        if(lc.split(' ').filter(function(w){return w.length>4;}).some(function(w){return k.toLowerCase().includes(w);})){resp=HUGO_RESP[k];break;}
      }
    }
    setTimeout(function(){
      if(lc.includes('joke')||lc.includes('fun')){addHugoMsg("Why did the support coordinator bring a spreadsheet to lunch? Because they heard the review was **on the table**! 😄 Now — what can I help with?",'other');}
      else if(lc.includes('thank')||lc.includes('great')){addHugoMsg("You're welcome! Happy to help anytime. Tiny owl is always here for you 🦉❤️",'other');}
      else if(resp){addHugoMsg(resp,'other');}
      else{addHugoMsg("I'm still learning that one! 🦉 Try asking: **\"What needs my attention today?\"** or **\"Help me write a shift note\"**",'other');}
    },650);
  }

  // ── Voice Mode ────────────────────────────────────────────────────────────
  function openVoice(){
    showPane('cp-voice-panel');
    renderVoiceChips();
    document.getElementById('cp-transcript-box').textContent='Speak or type a command below…';
    document.getElementById('cp-transcript-box').className='empty';
    document.getElementById('cp-hugo-resp-box').style.display='none';
    document.getElementById('cp-action-card').style.display='none';
    document.getElementById('cp-voice-status').textContent='Idle';
    document.getElementById('cp-voice-status').className='';
  }

  function renderVoiceChips(){
    var row=document.getElementById('cp-voice-chips-row'); if(!row)return; row.innerHTML='';
    VOICE_CMDS.forEach(function(vc){
      var b=document.createElement('button'); b.className='cp-vc'; b.textContent=vc.chip;
      b.onclick=function(){runVoiceCmd(vc.chip,vc.draft);};
      row.appendChild(b);
    });
  }

  function runVoiceCmd(text,draft){
    var tb=document.getElementById('cp-transcript-box');
    var rb=document.getElementById('cp-hugo-resp-box');
    var ac=document.getElementById('cp-action-card');
    var at=document.getElementById('cp-action-text');
    var vs=document.getElementById('cp-voice-status');
    // Show transcript
    if(tb){tb.textContent=text; tb.className='';}
    // Listening state
    vs.textContent='Listening…'; vs.className='listening';
    setTimeout(function(){
      vs.textContent='Hugo is thinking…'; vs.className='thinking';
      setTimeout(function(){
        vs.textContent='Draft ready'; vs.className='';
        if(rb){rb.innerHTML=fmt(draft||'I\'ve prepared your action below. Please review before I send anything.');rb.style.display='block';}
        var isDriveMode=document.getElementById('cp-drive-cb')&&document.getElementById('cp-drive-cb').checked;
        if(isDriveMode){
          if(at)at.textContent='🚗 Driving mode — action queued. I\'ll remind you to confirm when you stop.';
          if(ac){document.getElementById('cp-act-send').style.display='none'; ac.style.display='block';}
        } else {
          if(at)at.textContent=draft||text;
          if(ac){document.getElementById('cp-act-send').style.display=''; ac.style.display='block';}
        }
      },900);
    },800);
  }

  function handleVoiceCommand(){
    var inp=document.getElementById('cp-voice-cmd-inp'); if(!inp||!inp.value.trim())return;
    var text=inp.value.trim(); inp.value='';
    var match=VOICE_CMDS.find(function(vc){return text.toLowerCase().includes(vc.chip.toLowerCase().split(' ')[0]);});
    var draft=match?match.draft:'I\'ve understood your request: "'+text+'". Let me prepare the action for your review.';
    runVoiceCmd(text,draft);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  fab.addEventListener('click',function(){S.open?closeWin():openWin('messages');});
  document.getElementById('cp-close').addEventListener('click',closeWin);
  document.getElementById('cp-full-btn').addEventListener('click',function(){window.location.href='CiaraLink Connect.dc.html';});
  win.querySelectorAll('.cp-tab').forEach(function(b){ b.addEventListener('click',function(){switchTab(b.dataset.t);}); });
  document.getElementById('cp-back-btn').addEventListener('click',goList);
  document.getElementById('cp-send').addEventListener('click',sendMsg);
  document.getElementById('cp-inp').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}});
  document.getElementById('cp-hugo-send').addEventListener('click',function(){handleHugo(document.getElementById('cp-hugo-inp').value);document.getElementById('cp-hugo-inp').value='';});
  document.getElementById('cp-hugo-inp').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleHugo(this.value);this.value='';}});
  document.getElementById('cp-voice-big').addEventListener('click',function(){ var m=document.getElementById('cp-voice-modal'); if(m){m.style.opacity='1';m.style.pointerEvents='all'; var box=document.getElementById('cp-vm-box'); if(box)box.style.transform='scale(1)';} });
  // vback removed — voice panel replaced with modal
  // voice-go removed
  // voice-cmd-inp removed
  // act-send removed
  // act-edit removed
  // act-cancel removed
  var si=document.getElementById('cp-search-inp'); if(si)si.addEventListener('input',renderList);

  function openWin(tab){
    S.open=true; win.classList.add('open');
    switchTab(tab||S.tab);
    if(S.tab==='messages'){renderList();}
    else{renderHugoMsgs();renderHugoPrompts();}
  }
  function closeWin(){S.open=false; win.classList.remove('open');}

  // Hugo owl button → opens Hugo tab
  window.addEventListener('load',function(){
    var hugoBtn=document.getElementById('hugo-btn');
    if(hugoBtn){
      hugoBtn.addEventListener('click',function(e){
        e.stopPropagation();
        if(window.__hugoPanel&&window.__hugoPanel.close) window.__hugoPanel.close();
        S.open?closeWin():openWin('hugo');
      },true);
    }
  });

  // Voice modal close
  document.getElementById('cp-vm-close').addEventListener('click',function(){ var m=document.getElementById('cp-voice-modal'); if(m){m.style.opacity='0';m.style.pointerEvents='none';} });
  document.getElementById('cp-voice-modal').addEventListener('click',function(e){ if(e.target===this){this.style.opacity='0';this.style.pointerEvents='none';} });

  window.ChatDrawer={open:openWin,close:closeWin,openThread:openThread,_hugoAsk:handleHugo};
})();

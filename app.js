// @ts-nocheck
/* Aman Study Point — Main App */
const firebaseConfig = {
  apiKey: "AIzaSyDHKhXcfzOPHBYzkn1CXuz2tw0Iix1EzMw",
  authDomain: "aman-study-point.firebaseapp.com",
  databaseURL: "https://aman-study-point-default-rtdb.firebaseio.com",
  projectId: "aman-study-point",
  storageBucket: "aman-study-point.firebasestorage.app",
  messagingSenderId: "1059866846804",
  appId: "1:1059866846804:web:1a9b4b58377b815b79afc1",
  measurementId: "G-2V2R173QC3"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const INSTITUTE = {
  name: "Aman Study Point",
  upi: "amritpalsingh735031234-1@oksbi",
  whatsapp: "9041321843",
  price: 99,
  comboPrice: 499
};

const BOOKS = [
  { id: "punjabi", cat: "language", emoji: "📖", title: "Punjabi Grammar", sub: "SSC • Patwari • TET", pdf: "", demoPdf: "" },
  { id: "gk", cat: "gk", emoji: "🌏", title: "General Knowledge (GK)", sub: "All Competitive Exams", pdf: "", demoPdf: "" },
  { id: "maths", cat: "maths", emoji: "🔢", title: "Mathematics", sub: "Banking • SSC", pdf: "", demoPdf: "" },
  { id: "reasoning", cat: "maths", emoji: "🧩", title: "Reasoning Ability", sub: "SSC • Police • Banking", pdf: "", demoPdf: "" },
  { id: "history", cat: "gk", emoji: "🏛️", title: "History of Punjab", sub: "General Preparation", pdf: "", demoPdf: "" },
  { id: "science", cat: "gk", emoji: "🔬", title: "General Science", sub: "SSC • Patwari", pdf: "", demoPdf: "" },
  { id: "constitution", cat: "gk", emoji: "⚖️", title: "Indian Constitution", sub: "SSC • Police", pdf: "", demoPdf: "" },
  { id: "computer", cat: "language", emoji: "💻", title: "Computer Awareness", sub: "All Competitive Exams", pdf: "", demoPdf: "" }
];

let activeCategory = "all";
let userUnlockedBookIds = [];

const session = () => localStorage.getItem("pp_session");
const setSession = (p) => localStorage.setItem("pp_session", p);
const clearSession = () => localStorage.removeItem("pp_session");
const currentUser = () => {
  const p = session();
  return p ? { phone: p, name: localStorage.getItem("pp_name") || "Student" } : null;
};

function toast(m) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

function logout() {
  clearSession();
  localStorage.removeItem("pp_name");
  toast("Logged out ✓");
  setTimeout(() => location.href = "index.html", 600);
}

/* 1. PWA Install Logic */
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById("installAppBtn");
  if (btn) btn.style.display = "inline-block";
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
  }
}

/* 6. Referral WhatsApp Share */
function shareReferralWhatsApp() {
  const text = encodeURIComponent(`🔥 ਹੈਲੋ! ਮੈਂ Aman Study Point ਵੈੱਬਸਾਈਟ 'ਤੇ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ (Punjab Police, Patwari) ਦੀ ਤਿਆਰੀ ਕਰ ਰਿਹਾ ਹਾਂ। ਇੱਥੇ ਰੋਜ਼ਾਨਾ ਮੁਫ਼ਤ ਟੈਸਟ ਅਤੇ ਸਿਰਫ਼ ₹99 ਵਿੱਚ ਕਿਤਾਬਾਂ ਮਿਲ ਰਹੀਆਂ ਹਨ। ਹੁਣੇ ਚੈੱਕ ਕਰੋ: https://amanstudypoint.vercel.app
  `);
  window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
}

function renderAccount() {
  const b = document.getElementById("accountBtn"), u = currentUser(), lo = document.getElementById("logoutLink");
  if (!b) return;
  if (u) {
    b.textContent = "👤 " + u.name;
    b.href = "#myBooks";
    if (!lo) {
      const a = document.createElement("a");
      a.id = "logoutLink";
      a.className = "btn btn-ghost btn-small";
      a.href = "javascript:void(0)";
      a.onclick = logout;
      a.textContent = "Logout";
      const nav = document.getElementById("navLinks");
      if (nav) nav.appendChild(a);
    }
  } else {
    b.textContent = "🔐 Login";
    b.href = "login.html";
    if (lo) lo.remove();
  }
}

function renderBooksRealtime() {
  const u = currentUser();
  if (!u) { userUnlockedBookIds = []; drawBooks(); return; }
  db.ref("users/" + u.phone + "/books").on("value", s => {
    const un = s.val() || {};
    userUnlockedBookIds = Object.keys(un).filter(k => un[k] === true);
    drawBooks();
  });
}

/* 5. Category Filter Logic */
function filterBooks(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  drawBooks();
}

function drawBooks() {
  const g = document.getElementById("bookGrid");
  if (g) {
    const filtered = activeCategory === "all" ? BOOKS : BOOKS.filter(b => b.cat === activeCategory);
    g.innerHTML = filtered.map(b => {
      const has = userUnlockedBookIds.includes(b.id);
      return `<div class="book-card">
        ${has ? '<span class="pill">✅ Unlocked</span>' : ''}
        <div class="book-emoji">${b.emoji}</div>
        <div class="book-title">${b.title}</div>
        <div class="book-sub">${b.sub}</div>
        <div class="book-bottom">
          <div class="price">₹${INSTITUTE.price} <small>only</small></div>
          ${has ? `<a class="btn btn-read btn-small" href="reader.html?id=${b.id}">📖 Read</a>` : `
            <div style="display:flex;gap:6px;">
              <a class="btn btn-ghost btn-small" href="reader.html?id=${b.id}&demo=true" style="font-size:0.8rem;padding:5px 8px;">📄 Demo</a>
              <button class="btn btn-buy btn-small" onclick="openBuy('${b.id}')">🛒 Buy</button>
            </div>`}
        </div>
      </div>`;
    }).join("");
  }

  const mySec = document.getElementById("myBooks"), myG = document.getElementById("myBooksGrid");
  if (mySec && myG) {
    if (userUnlockedBookIds.length === 0) mySec.hidden = true;
    else {
      mySec.hidden = false;
      myG.innerHTML = userUnlockedBookIds.map(id => {
        const b = BOOKS.find(x => x.id === id);
        if (!b) return "";
        return `<div class="book-card"><span class="pill">🎒 Your Book</span><div class="book-emoji">${b.emoji}</div><div class="book-title">${b.title}</div><div class="book-sub">${b.sub}</div><div class="book-bottom"><a class="btn btn-read btn-small" href="reader.html?id=${b.id}">📖 Read Full Book</a></div></div>`;
      }).join("");
    }
  }
}

function openBuy(id) {
  const u = currentUser();
  if (!u) { toast("Please login first 👇"); setTimeout(() => location.href = "login.html", 800); return; }
  const b = BOOKS.find(x => x.id === id);
  if (b) showModal(b.emoji + " " + b.title, INSTITUTE.price, id, b.title);
}

function openBuyCombo() {
  const u = currentUser();
  if (!u) { toast("Please login first 👇"); setTimeout(() => location.href = "login.html", 800); return; }
  showModal("🎁 All 8 Books Combo Pack", INSTITUTE.comboPrice, "all_combo", "All 8 Books Combo");
}

function showModal(title, price, id, name) {
  const u = currentUser(), wa = encodeURIComponent(`Hello,\nI sent ₹${price} for "${name}".\nName: ${u.name}\nPhone: ${u.phone}\nPlease approve.`);
  const mb = document.getElementById("modalBody");
  if (!mb) return;
  mb.innerHTML = `<div class="pay-book">${title}</div><div class="pay-price">Price: ₹${price}</div><div style="text-align:center;margin:10px 0;"><img src="https://i.postimg.cc/FsFy1W75/qr.png" style="max-width:140px;width:100%;border-radius:8px;border:2px solid #ffd8a8;display:block;margin:0 auto;"><small style="color:#666;display:block;margin-top:4px;">UPI: <b>${INSTITUTE.upi}</b></small></div><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;"><a class="btn btn-primary btn-block" href="https://api.whatsapp.com/send?phone=91${INSTITUTE.whatsapp}&text=${wa}" target="_blank">📲 Send Screenshot on WhatsApp</a><button class="btn btn-ghost btn-block" onclick="submitReq('${id}','${name}')" style="background:#e8f5e9;color:#2e7d32;">✅ I Have Paid — Submit</button></div>`;
  const m = document.getElementById("modal");
  if (m) { m.hidden = false; m.style.display = "flex"; }
}

function submitReq(bookId, title) {
  const u = currentUser(), reqId = u.phone + "_" + bookId;
  db.ref("requests/" + reqId).set({ reqId, phone: u.phone, name: u.name, bookId, bookTitle: title, time: new Date().toLocaleString(), status: "pending" }).then(() => {
    closeModal(); toast("✅ Request Sent! Book unlocks once approved.");
  });
}

function closeModal() {
  const m = document.getElementById("modal");
  if (m) { m.hidden = true; m.style.display = "none"; }
}

/* Auth */
function initLogin() {
  const tL = document.getElementById("tabLogin"), tR = document.getElementById("tabReg"), fL = document.getElementById("formLogin"), fR = document.getElementById("formReg"), err = document.getElementById("loginError");
  if (!tL || !fL) return;
  tL.onclick = () => { tL.classList.add("active"); tR.classList.remove("active"); fL.style.display = "block"; fR.style.display = "none"; };
  tR.onclick = () => { tR.classList.add("active"); tL.classList.remove("active"); fR.style.display = "block"; fL.style.display = "none"; };
  if (session()) { location.replace("index.html"); return; }
  fR.onsubmit = e => {
    e.preventDefault();
    const name = document.getElementById("regName").value.trim(), phone = document.getElementById("regPhone").value.trim(), pass = document.getElementById("regPass").value;
    if (phone.length < 10 || pass.length < 4) { err.textContent = "Please fill details correctly"; err.style.display = "block"; return; }
    db.ref("accounts/" + phone).get().then(s => {
      if (s.exists()) { err.textContent = "Number already registered!"; err.style.display = "block"; }
      else { db.ref("accounts/" + phone).set({ name, phone, pass }).then(() => { setSession(phone); localStorage.setItem("pp_name", name); location.href = "index.html"; }); }
    });
  };
  fL.onsubmit = e => {
    e.preventDefault();
    const phone = document.getElementById("loginPhone").value.trim(), pass = document.getElementById("loginPass").value;
    db.ref("accounts/" + phone).get().then(s => {
      if (s.exists() && s.val().pass === pass) { setSession(phone); localStorage.setItem("pp_name", s.val().name); location.href = "index.html"; }
      else { err.textContent = "Invalid mobile or password!"; err.style.display = "block"; }
    });
  };
}

/* Quiz */
let activeQuiz = [], userAns = [], quizVersion = "v1", qIdx = 0, qScore = 0, qAnswered = false, qTimer = null, qSecs = 1200, isTimerStarted = false;

function initQuiz() {
  const box = document.getElementById("quizBox");
  if (!box) return;
  const u = currentUser();
  if (!u) {
    box.innerHTML = `<div style="text-align:center;padding:25px 15px;"><div style="font-size:3rem;margin-bottom:10px;">🔐</div><h3>Login Required for Daily Test</h3><p style="color:#666;margin:8px 0 16px;">ਟੈਸਟ ਦੇਣ ਲਈ ਪਹਿਲਾਂ ਲੌਗਇਨ ਕਰੋ।</p><a class="btn btn-primary" href="login.html">🔐 Login / Register</a></div>`;
    return;
  }
  db.ref("quizTimerMinutes").once("value", s => { qSecs = (s.val() || 20) * 60; });
  db.ref("quizVersion").on("value", vSnap => {
    quizVersion = vSnap.val() || "v1";
    db.ref("userAttempts/" + u.phone + "/" + quizVersion).once("value", aSnap => {
      if (aSnap.exists()) {
        const prev = aSnap.val(), share = encodeURIComponent(`🔥 ਮੇਰਾ Aman Study Point Mock Test ਸਕੋਰ ${prev.score}/${prev.total} ਹੈ! ਲਿੰਕ: ${window.location.origin}`);
        box.innerHTML = `<div class="quiz-score-card"><div style="font-size:3rem;">✅</div><h3>ਤੁਸੀਂ ਅੱਜ ਦਾ ਟੈਸਟ ਦੇ ਚੁੱਕੇ ਹੋ!</h3><p style="color:#666;">Student: <b>${u.name}</b></p><div class="quiz-score-num">${prev.score} / ${prev.total}</div><p style="color:#2b8a3e;font-weight:700;margin-bottom:15px;">Marks: ${Math.round((prev.score / prev.total) * 100)}%</p><a class="btn btn-primary btn-small" href="https://api.whatsapp.com/send?text=${share}" target="_blank" style="background:#25D366;color:#fff;">📲 Share on WhatsApp</a></div>`;
      } else {
        db.ref("dailyQuiz").once("value", qSnap => {
          activeQuiz = (qSnap.exists() && Array.isArray(qSnap.val())) ? qSnap.val() : [{ q: "1. ਪੰਜਾਬ ਦਾ ਰਾਜ ਪੰਛੀ ਕਿਹੜਾ ਹੈ?", options: ["ਮੋਰ", "ਬਾਜ਼", "ਤੋਤਾ", "ਕਬੂਤਰ"], answer: 1 }];
          qIdx = 0; qScore = 0; userAns = []; isTimerStarted = false; clearInterval(qTimer); renderQ();
        });
      }
    });
  });
  loadBoard();
}

function startTimer() {
  clearInterval(qTimer);
  qTimer = setInterval(() => {
    qSecs--;
    const d = document.getElementById("quizTimerDisplay");
    if (d) {
      const m = Math.floor(qSecs / 60), s = qSecs % 60;
      d.textContent = `⏱️ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    if (qSecs <= 0) { clearInterval(qTimer); alert("Time Up!"); finishTest(); }
  }, 1000);
}

function renderQ() {
  const box = document.getElementById("quizBox");
  if (!box) return;
  if (qIdx >= activeQuiz.length) { finishTest(); return; }
  qAnswered = false;
  const cur = activeQuiz[qIdx], m = Math.floor(qSecs / 60), s = qSecs % 60;
  box.innerHTML = `<div class="quiz-header"><span>Question ${qIdx + 1} of ${activeQuiz.length}</span><span class="quiz-timer-badge" id="quizTimerDisplay">⏱️ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}</span></div><div class="quiz-q">${cur.q}</div><div class="quiz-opts" id="quizOpts">${cur.options.map((opt, i) => `<button class="quiz-opt-btn" onclick="checkAns(${i})">${String.fromCharCode(65 + i)}) ${opt}</button>`).join("")}</div><div class="quiz-footer" id="quizFooter" style="display:none;"><span id="quizFeedback" style="font-weight:600;"></span><button class="btn btn-primary btn-small" onclick="qIdx++;renderQ();">Next ➔</button></div>`;
}

function checkAns(sel) {
  if (qAnswered) return;
  qAnswered = true;
  if (!isTimerStarted) { isTimerStarted = true; startTimer(); }
  const cur = activeQuiz[qIdx], btns = document.querySelectorAll("#quizOpts .quiz-opt-btn"), foot = document.getElementById("quizFooter"), feed = document.getElementById("quizFeedback");
  btns.forEach(b => b.disabled = true);
  userAns.push({ q: cur.q, opts: cur.options, sel, cor: cur.answer });
  if (sel === cur.answer) { btns[sel].classList.add("correct"); feed.textContent = "✅ ਬਿਲਕੁਲ ਸਹੀ!"; feed.style.color = "#2b8a3e"; qScore++; }
  else { btns[sel].classList.add("wrong"); if (btns[cur.answer]) btns[cur.answer].classList.add("correct"); feed.textContent = "❌ ਗ਼ਲਤ ਜਵਾਬ!"; feed.style.color = "#c92a2a"; }
  foot.style.display = "flex";
}

function finishTest() {
  clearInterval(qTimer);
  isTimerStarted = false;
  const box = document.getElementById("quizBox"), u = currentUser();
  db.ref("quizResults").push({ name: u.name, phone: u.phone, score: qScore, total: activeQuiz.length, version: quizVersion, time: new Date().toLocaleString() });
  db.ref("userAttempts/" + u.phone + "/" + quizVersion).set({ score: qScore, total: activeQuiz.length, time: new Date().toLocaleString() });
  const share = encodeURIComponent(`🔥 ਮੇਰਾ Aman Study Point Mock Test ਸਕੋਰ ${qScore}/${activeQuiz.length} ਹੈ! ਤੁਸੀਂ ਵੀ ਆਪਣੀ ਤਿਆਰੀ ਚੈੱਕ ਕਰੋ: https://amanstudypoint.netlify.app`);

  box.innerHTML = `<div class="quiz-score-card"><div style="font-size:3rem;">🏆</div><h3>Test Completed!</h3><p style="color:#666;">Student: <b>${u.name}</b></p><div class="quiz-score-num">${qScore} / ${activeQuiz.length}</div><div style="display:flex;flex-direction:column;gap:8px;max-width:320px;margin:15px auto;"><a class="btn btn-primary btn-block" href="https://api.whatsapp.com/send?text=${share}" target="_blank" style="background:#25D366;color:#fff;">📲 Share on WhatsApp Status</a><button class="btn btn-ghost btn-block" onclick="showReview()">🔍 View Detailed Solution</button></div><div id="revBox" style="display:none;margin-top:15px;"></div></div>`;
  loadBoard();
}

function showReview() {
  const rb = document.getElementById("revBox");
  if (!rb) return;
  if (rb.style.display === "block") { rb.style.display = "none"; return; }
  rb.style.display = "block";
  rb.innerHTML = userAns.map((a, i) => `<div class="review-item ${a.sel === a.cor ? 'is-correct' : 'is-wrong'}"><div style="font-weight:700;">${i + 1}. ${a.q}</div><div style="font-size:0.88rem;color:${a.sel === a.cor ? '#2b8a3e' : '#c92a2a'};">Your Answer: ${a.opts[a.sel] || 'Skipped'} ${a.sel === a.cor ? '✅' : '❌'}</div>${a.sel !== a.cor ? `<div style="font-size:0.88rem;color:#2b8a3e;">Correct Answer: ${a.opts[a.cor]}</div>` : ''}</div>`).join("");
}

function loadBoard() {
  const list = document.getElementById("leaderboardList");
  if (!list) return;
  db.ref("quizResults").on("value", snap => {
    const data = snap.val();
    if (!data) { list.innerHTML = "<p style='text-align:center;padding:10px;'>ਕੋਈ ਟੈਸਟ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।</p>"; return; }
    const items = Object.values(data).sort((a, b) => b.score - a.score).slice(0, 5), medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    list.innerHTML = items.map((r, i) => `<div class="rank-row"><span class="rank-badge">${medals[i] || (i + 1)}</span><span class="rank-name">${r.name}</span><span class="rank-score">${r.score} / ${r.total}</span></div>`).join("");
  });
}

function initReader() {
  const body = document.getElementById("readerBody");
  if (!body) return;
  const params = new URLSearchParams(location.search), id = params.get("id"), isDemo = params.get("demo") === "true", b = BOOKS.find(x => x.id === id), u = currentUser();
  if (isDemo && b) {
    const rh = document.getElementById("readerHead");
    if (rh) rh.innerHTML = `<div class="emoji">${b.emoji}</div><h1>${b.title} (Free Demo Sample)</h1><div class="meta">Sample Preview • ਪੂਰੀ ਕਿਤਾਬ ਪੜ੍ਹਨ ਲਈ ਖਰੀਦੋ</div><div style="margin-top:12px;"><button class="btn btn-primary btn-small" onclick="openBuy('${b.id}')">🛒 Buy Full Book (₹${INSTITUTE.price})</button></div>`;
    body.innerHTML = `<div style="position:relative;width:100%;height:80vh;border:2px solid var(--line);border-radius:14px;overflow:hidden;"><iframe src="${b.demoPdf || b.pdf || ''}" style="width:100%;height:100%;border:none;"></iframe></div>`;
    return;
  }
  if (!u) { body.innerHTML = '<div class="reader-note" style="margin-top:60px">❌ Please login first.<br><br><a class="btn btn-primary" href="login.html">🔐 Login</a></div>'; return; }
  db.ref("users/" + u.phone + "/books/" + id).get().then(snap => {
    if (snap.val() === true) {
      const rh = document.getElementById("readerHead");
      if (rh && b) rh.innerHTML = `<div class="emoji">${b.emoji}</div><h1>${b.title}</h1><div class="meta">${b.sub} • Full Unlocked</div>`;
      body.innerHTML = `<div style="position:relative;width:100%;height:80vh;border:2px solid var(--line);border-radius:14px;overflow:hidden;"><div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;display:flex;flex-direction:column;justify-content:space-around;align-items:center;opacity:0.18;transform:rotate(-25deg);user-select:none;"><h2>${u.name} — ${u.phone}</h2><h2>${u.name} — ${u.phone}</h2></div><iframe src="${b ? b.pdf : ''}" style="width:100%;height:100%;border:none;"></iframe></div>`;
    } else { body.innerHTML = '<div class="reader-note" style="margin-top:60px">🔒 Book is locked. Admin approval required.<br><br><a class="btn btn-primary" href="index.html#books">📚 View Books</a></div>'; }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderAccount();
  renderBooksRealtime();
  initReader();
  initLogin();
  initQuiz();
  const m = document.getElementById("modal");
  if (m) m.onclick = e => { if (e.target === m) closeModal(); };
  const mc = document.getElementById("modalClose");
  if (mc) mc.onclick = closeModal;
});

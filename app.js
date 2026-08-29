// @ts-nocheck
/* Aman Study Point — Core App */
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
  whatsapp: "9041321843"
};

const BOOKS = [
  { id: "punjabi", cat: "language", emoji: "📖", title: "Punjabi Grammar", sub: "SSC • Patwari • TET", defaultPrice: 99, pdf: "", demoPdf: "" },
  { id: "gk", cat: "gk", emoji: "🌏", title: "General Knowledge (GK)", sub: "All Competitive Exams", defaultPrice: 99, pdf: "", demoPdf: "" },
  { id: "maths", cat: "maths", emoji: "🔢", title: "Mathematics", sub: "Banking • SSC", defaultPrice: 99, pdf: "", demoPdf: "" },
  { id: "reasoning", cat: "maths", emoji: "🧩", title: "Reasoning Ability", sub: "SSC • Police • Banking", defaultPrice: 99, pdf: "", demoPdf: "" },
  { id: "history", cat: "gk", emoji: "🏛️", title: "History of Punjab", sub: "General Preparation", defaultPrice: 99, pdf: "", demoPdf: "" },
  { id: "science", cat: "gk", emoji: "🔬", title: "General Science", sub: "SSC • Patwari", defaultPrice: 99, pdf: "", demoPdf: "" },
  { id: "constitution", cat: "gk", emoji: "⚖️", title: "Indian Constitution", sub: "SSC • Police", defaultPrice: 99, pdf: "", demoPdf: "" },
  { id: "computer", cat: "language", emoji: "💻", title: "Computer Awareness", sub: "All Competitive Exams", defaultPrice: 99, pdf: "", demoPdf: "" }
];

let activeCategory = "all";
let userUnlockedBookIds = [];
let liveBooksConfig = {};
let activeCoupon = null;
let currentAppliedCoupon = null;

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

/* 1. Dark Mode System */
function initTheme() {
  const isDark = localStorage.getItem("asp_theme") === "dark";
  if (isDark) {
    document.body.classList.add("dark-mode");
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.textContent = "☀️ Light";
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("asp_theme", isDark ? "dark" : "light");
  const btn = document.getElementById("themeToggleBtn");
  if (btn) btn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
}

/* 2. PWA Install */
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

/* 3. Referral WhatsApp Share */
function shareReferralWhatsApp() {
  const text = encodeURIComponent(`🔥 ਹੈਲੋ! ਮੈਂ Aman Study Point ਵੈੱਬਸਾਈਟ 'ਤੇ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ (Punjab Police, Patwari) ਦੀ ਤਿਆਰੀ ਕਰ ਰਿਹਾ ਹਾਂ। ਇੱਥੇ ਰੋਜ਼ਾਨਾ ਮੁਫ਼ਤ ਟੈਸਟ ਆਉਂਦੇ ਹਨ । ਹੁਣੇ ਚੈੱਕ ਕਰੋ: https://amanstudypoint.vercel.app`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
}

/* 4. Realtime Books & Config Listener */
function updateComboUI(cfg) {
  if (!cfg) return;
  const comboCfg = cfg.combo || { price: 499, status: 'available' };
  const cPriceEl = document.getElementById('combo_price_display');
  const cBtn = document.getElementById('buy_btn_combo');
  const comboPrice = parseInt(comboCfg.price) || 499;

  let totalMRP = 0;
  BOOKS.forEach(b => {
    const bPrice = (cfg[b.id] && cfg[b.id].price) ? parseInt(cfg[b.id].price) : (b.defaultPrice || 99);
    totalMRP += bPrice;
  });

  if (totalMRP <= comboPrice) totalMRP = Math.round(comboPrice * 1.35);
  const saveAmount = totalMRP - comboPrice;

  if (cPriceEl) {
    cPriceEl.innerHTML = `₹${comboPrice} <small><s>₹${totalMRP}</s> (Save ₹${saveAmount})</small>`;
  }

  if (cBtn) {
    if (comboCfg.status === 'unavailable') {
      cBtn.innerText = '⏳ Coming Soon (ਜਲਦੀ ਆ ਰਹੀ ਹੈ)';
      cBtn.disabled = true;
      cBtn.style.background = '#868e96';
    } else {
      cBtn.innerText = '🛒 Unlock All 8 Books';
      cBtn.disabled = false;
      cBtn.style.background = '#e8590c';
    }
  }
}

function initLiveBooksConfig() {
  // 1. ਜ਼ੀਰੋ ਦੇਰੀ: ਪਹਿਲਾਂ ਤੋਂ ਸੇਵ ਡਾਟਾ ਤੁਰੰਤ ਦਿਖਾਓ
  const cachedCfg = localStorage.getItem('asp_cached_books_cfg');
  if (cachedCfg) {
    try {
      liveBooksConfig = JSON.parse(cachedCfg);
      updateComboUI(liveBooksConfig);
      if (typeof drawBooks === 'function') drawBooks();
    } catch(e) {}
  }

  if (typeof db === 'undefined') return;

  db.ref('siteSettings/coupon').on('value', snap => {
    activeCoupon = snap.val();
  });

  // 2. Firebase ਤੋਂ ਲਾਈਵ ਸਿੰਕ
  db.ref('siteSettings/booksConfig').on('value', snap => {
    liveBooksConfig = snap.val() || {};
    localStorage.setItem('asp_cached_books_cfg', JSON.stringify(liveBooksConfig));
    updateComboUI(liveBooksConfig);
    if (typeof drawBooks === 'function') drawBooks();
  });
}

function renderAccount() {
  const b = document.getElementById("accountBtn"), u = currentUser(), lo = document.getElementById("logoutLink");
  const anNav = document.getElementById("analyticsNav");
  if (!b) return;
  if (u) {
    b.textContent = "👤 " + u.name;
    b.onclick = () => editStudentName();
b.title = "Click to Edit Name";
    b.href = "#myBooks";
    if (anNav) anNav.style.display = "inline-block";
    loadUserAnalytics();
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
    if (anNav) anNav.style.display = "none";
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
      const cfg = liveBooksConfig[b.id] || { price: b.defaultPrice, status: 'available' };
      const isUnavailable = (cfg.status === 'unavailable');
      const curPrice = cfg.price || b.defaultPrice;

      let actionBtn = "";
      if (has) {
        actionBtn = `<a class="btn btn-read btn-small" href="reader.html?id=${b.id}">📖 Read</a>`;
      } else if (isUnavailable) {
        actionBtn = `<button class="btn btn-small" disabled style="background:#868e96; color:#fff; cursor:not-allowed;">⏳ Coming Soon</button>`;
      } else {
        actionBtn = `
          <div style="display:flex;gap:6px;">
            <a class="btn btn-ghost btn-small" href="reader.html?id=${b.id}&demo=true" style="font-size:0.8rem;padding:5px 8px;">📄 Demo</a>
            <button class="btn btn-buy btn-small" onclick="openBuy('${b.id}')">🛒 Buy</button>
          </div>
        `;
      }

      return `<div class="book-card">
        ${has ? '<span class="pill">✅ Unlocked</span>' : ''}
        <div class="book-emoji">${b.emoji}</div>
        <div class="book-title">${b.title}</div>
        <div class="book-sub">${b.sub}</div>
        <div class="book-bottom">
          <div class="price">₹${curPrice} <small>only</small></div>
          ${actionBtn}
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

/* 5. Checkout Modal with Coupon Discount System */
function openBuy(id) {
  const u = currentUser();
  if (!u) { toast("Please login first 👇"); setTimeout(() => location.href = "login.html", 800); return; }
  const b = BOOKS.find(x => x.id === id);
  const cfg = liveBooksConfig[id] || { price: b.defaultPrice };
  currentAppliedCoupon = null;
  if (b) showModal(b.emoji + " " + b.title, cfg.price, id, b.title);
}

function openBuyCombo() {
  const u = currentUser();
  if (!u) { toast("Please login first 👇"); setTimeout(() => location.href = "login.html", 800); return; }
  const comboCfg = liveBooksConfig.combo || { price: 499 };
  currentAppliedCoupon = null;
  showModal("🎁 All 8 Books Combo Pack", comboCfg.price, "combo", "All 8 Books Combo");
}

function showModal(title, price, id, name) {
  const mb = document.getElementById("modalBody");
  if (!mb) return;

  mb.innerHTML = `
    <div class="pay-book">${title}</div>
    <div class="pay-price" id="modalPriceDisplay">Price: ₹${price}</div>

    <!-- Coupon Box -->
    <div style="margin: 10px 0; background: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px dashed #ccc;">
      <div style="font-size: 0.84rem; font-weight: 600; margin-bottom: 5px;">🏷️ Have a Coupon Code? (ਕੂਪਨ ਕੋਡ ਲਗਾਓ):</div>
      <div style="display: flex; gap: 6px;">
        <input type="text" id="couponInput" placeholder="Enter Code" style="flex:1; padding:6px 10px; border-radius:6px; border:1px solid #ccc; text-transform:uppercase;">
        <button class="btn btn-primary btn-small" onclick="applyCoupon(${price}, '${id}', '${name}')">Apply</button>
      </div>
      <div id="couponMsg" style="font-size:0.8rem; margin-top:4px;"></div>
    </div>

    <div style="text-align:center;margin:10px 0;">
      <img src="https://i.postimg.cc/FsFy1W75/qr.png" style="max-width:130px;width:100%;border-radius:8px;border:2px solid #ffd8a8;display:block;margin:0 auto;">
      <small style="color:#666;display:block;margin-top:4px;">Scan & Pay via UPI: <b>${INSTITUTE.upi}</b></small>
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;" id="modalActionButtons">
      ${renderModalButtons(price, id, name)}
    </div>
  `;

  const m = document.getElementById("modal");
  if (m) { m.hidden = false; m.style.display = "flex"; }
}

function applyCoupon(originalPrice, id, name) {
  const inp = document.getElementById("couponInput").value.trim().toUpperCase();
  const msg = document.getElementById("couponMsg");
  const pDisp = document.getElementById("modalPriceDisplay");

  if (!activeCoupon || !activeCoupon.active || activeCoupon.code !== inp) {
    msg.innerHTML = `<span style="color:#e03131;">⚠️ ਗ਼ਲਤ ਜਾਂ ਐਕਸਪਾਇਰ ਕੂਪਨ ਕੋਡ!</span>`;
    return;
  }

  const discountAmount = Math.round((originalPrice * activeCoupon.discount) / 100);
  const finalPrice = originalPrice - discountAmount;
  currentAppliedCoupon = { code: inp, discount: activeCoupon.discount, finalPrice };

  msg.innerHTML = `<span style="color:#2b8a3e; font-weight:700;">🎉 ਕੂਪਨ ਲੱਗ ਗਿਆ! ₹${discountAmount} ਦੀ ਛੋਟ ਮਿਲੀ (${activeCoupon.discount}% Off)</span>`;
  pDisp.innerHTML = `Price: <s style="color:#888;">₹${originalPrice}</s> <b style="color:#2b8a3e;">₹${finalPrice}</b>`;

  document.getElementById("modalActionButtons").innerHTML = renderModalButtons(finalPrice, id, name);
}

function renderModalButtons(price, id, name) {
  const u = currentUser();
  const upiUrl = `upi://pay?pa=${INSTITUTE.upi}&pn=Aman%20Study%20Point&am=${price}&cu=INR&tn=Book-${encodeURIComponent(name)}`;
  const wa = encodeURIComponent(`Hello,\nI sent ₹${price} for "${name}".\nName: ${u.name}\nPhone: ${u.phone}\nPlease approve.`);
  
  return `
    <!-- 1-Click UPI Deep Link Button -->
    <a class="btn btn-block" href="${upiUrl}" style="background:#1971c2; color:#fff; font-weight:700; padding:12px; margin-bottom:4px;">
      ⚡ Pay via UPI (GPay / PhonePe / Paytm)
    </a>
    
    <a class="btn btn-primary btn-block" href="https://api.whatsapp.com/send?phone=91${INSTITUTE.whatsapp}&text=${wa}" target="_blank">
      📲 Send Screenshot on WhatsApp
    </a>
    
    <button class="btn btn-ghost btn-block" onclick="submitReq('${id}','${name}', ${price})" style="background:#e8f5e9; color:#2e7d32;">
      ✅ I Have Paid ₹${price} — Submit
    </button>
  `;
}


function submitReq(bookId, title, price) {
  const u = currentUser(), reqId = u.phone + "_" + bookId;
  db.ref("requests/" + reqId).set({
    reqId, phone: u.phone, name: u.name, bookId, bookTitle: title, paidAmount: price, time: new Date().toLocaleString(), status: "pending"
  }).then(() => {
    closeModal(); toast("✅ Request Sent! Book unlocks once approved.");
  });
}

function closeModal() {
  const m = document.getElementById("modal");
  if (m) { m.hidden = true; m.style.display = "none"; }
}

/* 6. Free PYQ Loader */
function loadPublicPYQs() {
  const container = document.getElementById("pyqListContainer");
  if (!container) return;
  db.ref("pyqList").on("value", snap => {
    const data = snap.val();
    if (!data) { container.innerHTML = "<p style='text-align:center;grid-column:1/-1;'>ਕੋਈ ਪੇਪਰ ਅੱਪਲੋਡ ਨਹੀਂ ਹੈ।</p>"; return; }
    container.innerHTML = Object.values(data).map(p => `
      <div class="card" style="padding:16px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <span class="pill" style="position:static; margin-bottom:6px; display:inline-block;">${p.exam}</span>
          <h3 style="font-size:1.05rem; margin:6px 0;">${p.title}</h3>
          <small style="color:#777;">📅 Added: ${p.date}</small>
        </div>
        <a href="${p.url}" target="_blank" class="btn btn-primary btn-small" style="margin-top:12px; background:#1971c2;">📥 Download PDF Paper</a>
      </div>
    `).join("");
  });
}

/* 7. Student Analytics Progress */
function loadUserAnalytics() {
  const u = currentUser();
  const box = document.getElementById("userAnalyticsBox");
  const sec = document.getElementById("analytics");
  if (!u || !box) return;

  db.ref("userAttempts/" + u.phone).on("value", snap => {
    const attempts = snap.val();
    if (!attempts) {
      if (sec) sec.style.display = "none";
      return;
    }
    if (sec) sec.style.display = "block";

    const list = Object.entries(attempts);
    const totalTests = list.length;
    let totalScore = 0, totalMax = 0;
    list.forEach(([_, a]) => { totalScore += a.score; totalMax += a.total; });
    const avg = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    box.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:12px; margin-bottom:16px;">
        <div class="card" style="padding:14px; text-align:center;">
          <div style="font-size:1.8rem; font-weight:800; color:#e8590c;">${totalTests}</div>
          <small>Total Tests Attempted</small>
        </div>
        <div class="card" style="padding:14px; text-align:center;">
          <div style="font-size:1.8rem; font-weight:800; color:#2b8a3e;">${avg}%</div>
          <small>Average Accuracy Score</small>
        </div>
      </div>
      <div class="card" style="padding:14px;">
        <h4 style="margin-bottom:10px;">📜 Test Attempt History:</h4>
        ${list.reverse().map(([key, a]) => `
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
            <div><b>Test Score:</b> ${a.score} / ${a.total} (${Math.round((a.score/a.total)*100)}%)</div>
            <small style="color:#777;">🕒 ${a.time}</small>
          </div>
        `).join("")}
      </div>
    `;
  });
}

/* 8. Quiz Engine & Digital Certificate */
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
        const prev = aSnap.val(), pct = Math.round((prev.score / prev.total) * 100);
        box.innerHTML = `
          <div class="quiz-score-card">
            <div style="font-size:3rem;">✅</div>
            <h3>ਤੁਸੀਂ ਅੱਜ ਦਾ ਟੈਸਟ ਦੇ ਚੁੱਕੇ ਹੋ!</h3>
            <p style="color:#666;">Student: <b>${u.name}</b></p>
            <div class="quiz-score-num">${prev.score} / ${prev.total}</div>
            <p style="color:#2b8a3e;font-weight:700;margin-bottom:15px;">Marks: ${pct}%</p>
            <button class="btn btn-primary btn-block" onclick="generateCertificate('${u.name}', ${prev.score}, ${prev.total})" style="background:#1971c2; color:#fff; max-width:280px; margin:0 auto 10px;">
              🎖️ Download Official Certificate
            </button>
          </div>
        `;
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

  box.innerHTML = `
    <div class="quiz-score-card">
      <div style="font-size:3rem;">🏆</div>
      <h3>Test Completed!</h3>
      <p style="color:#666;">Student: <b>${u.name}</b></p>
      <div class="quiz-score-num">${qScore} / ${activeQuiz.length}</div>
      <div style="display:flex;flex-direction:column;gap:8px;max-width:320px;margin:15px auto;">
        <button class="btn btn-primary btn-block" onclick="generateCertificate('${u.name}', ${qScore}, ${activeQuiz.length})" style="background:#1971c2; color:#fff;">
          🎖️ Download Score Certificate
        </button>
        <button class="btn btn-ghost btn-block" onclick="showReview()">🔍 View Detailed Solution</button>
      </div>
      <div id="revBox" style="display:none;margin-top:15px;"></div>
    </div>
  `;
  loadBoard();
}

function generateCertificate(name, score, total) {
  const percentage = Math.round((score / total) * 100);
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");

  // Certificate Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 900, 600);

  // Border
  ctx.strokeStyle = "#e8590c";
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, 860, 560);
  ctx.strokeStyle = "#ffd8a8";
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 836, 536);

  // Header Title
  ctx.fillStyle = "#e8590c";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("AMAN STUDY POINT", 450, 90);

  ctx.fillStyle = "#555555";
  ctx.font = "18px sans-serif";
  ctx.fillText("CERTIFICATE OF MOCK TEST ACHIEVEMENT", 450, 130);

  ctx.fillStyle = "#222222";
  ctx.font = "20px sans-serif";
  ctx.fillText("This is proudly presented to", 450, 190);

  // Student Name
  ctx.fillStyle = "#1971c2";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(name.toUpperCase(), 450, 250);

  // Score Info
  ctx.fillStyle = "#333333";
  ctx.font = "20px sans-serif";
  ctx.fillText(`for scoring ${score} out of ${total} (${percentage}% Marks)`, 450, 310);
  ctx.fillText(`in the Punjab Competitive Exam Daily Mock Test Series`, 450, 345);

  // Date & Badge
  const dateStr = new Date().toLocaleDateString('en-GB');
  ctx.fillStyle = "#777777";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Date: ${dateStr}  •  Status: Verified Participant`, 450, 420);

  // Signature
  ctx.fillStyle = "#e8590c";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("Aman Study Point Mansa", 450, 500);

  // Download Trigger
  const link = document.createElement("a");
  link.download = `Certificate_${name.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function showReview() {
  const rb = document.getElementById("revBox");
  if (!rb) return;
  rb.style.display = (rb.style.display === "block") ? "none" : "block";
  rb.innerHTML = userAns.map((a, i) => `
    <div class="review-item ${a.sel === a.cor ? 'is-correct' : 'is-wrong'}">
      <div style="font-weight:700;">${i + 1}. ${a.q}</div>
      <div style="font-size:0.88rem;color:${a.sel === a.cor ? '#2b8a3e' : '#c92a2a'};">Your Answer: ${a.opts[a.sel] || 'Skipped'} ${a.sel === a.cor ? '✅' : '❌'}</div>
      ${a.sel !== a.cor ? `<div style="font-size:0.88rem;color:#2b8a3e;">Correct Answer: ${a.opts[a.cor]}</div>` : ''}
    </div>
  `).join("");
}

function loadBoard() {
  const list = document.getElementById("leaderboardList");
  if (!list) return;

  // 1. ਮੌਜੂਦਾ ਨਵੇਂ ਟੈਸਟ ਦਾ ਵਰਜਨ ਚੈੱਕ ਕਰੋ
  db.ref("quizVersion").on("value", vSnap => {
    const curVer = vSnap.val() || "v1";

    // 2. ਸਿਰਫ਼ ਉਸੇ ਨਵੇਂ ਵਰਜਨ ਵਾਲੇ ਟੈਸਟ ਦੇ ਨਤੀਜੇ ਦਿਖਾਓ
    db.ref("quizResults").on("value", snap => {
      const data = snap.val();
      if (!data) {
        list.innerHTML = "<p style='text-align:center;padding:10px;'>ਕੋਈ ਟੈਸਟ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।</p>";
        return;
      }

      const items = Object.values(data)
        .filter(r => r.version === curVer) // ਕੇਵਲ ਨਵੇਂ ਟੈਸਟ ਦੇ ਰਿਜ਼ਲਟ
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (items.length === 0) {
        list.innerHTML = "<p style='text-align:center;padding:12px;color:#777;'>ਅਜੇ ਤੱਕ ਨਵੇਂ ਟੈਸਟ ਦਾ ਕੋਈ ਰੈਂਕ ਨਹੀਂ ਹੈ। ਪਹਿਲੇ ਨੰਬਰ 'ਤੇ ਆਉਣ ਲਈ ਹੁਣੇ ਟੈਸਟ ਦਿਓ! 🚀</p>";
        return;
      }

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
      list.innerHTML = items.map((r, i) => `
        <div class="rank-row">
          <span class="rank-badge">${medals[i] || (i + 1)}</span>
          <span class="rank-name">${r.name}</span>
          <span class="rank-score">${r.score} / ${r.total}</span>
        </div>
      `).join("");
    });
  });
}


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

function initReader() {
  const body = document.getElementById("readerBody");
  if (!body) return;
  const params = new URLSearchParams(location.search), id = params.get("id"), isDemo = params.get("demo") === "true", b = BOOKS.find(x => x.id === id), u = currentUser();
  if (isDemo && b) {
    const rh = document.getElementById("readerHead");
    if (rh) rh.innerHTML = `<div class="emoji">${b.emoji}</div><h1>${b.title} (Free Demo Sample)</h1><div class="meta">Sample Preview • ਪੂਰੀ ਕਿਤਾਬ ਪੜ੍ਹਨ ਲਈ ਖਰੀਦੋ</div><div style="margin-top:12px;"><button class="btn btn-primary btn-small" onclick="openBuy('${b.id}')">🛒 Buy Full Book</button></div>`;
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
  initTheme();
  renderAccount();
  initLiveBooksConfig();
  renderBooksRealtime();
  loadPublicPYQs();
  initReader();
  initLogin();
  initQuiz();
  const m = document.getElementById("modal");
  if (m) m.onclick = e => { if (e.target === m) closeModal(); };
  const mc = document.getElementById("modalClose");
  if (mc) mc.onclick = closeModal;
});

// --- STUDENT NAME EDIT FUNCTION ---
function editStudentName() {
  const u = currentUser();
  if (!u) return;
  const newName = prompt("ਆਪਣਾ ਨਵਾਂ ਨਾਮ ਦਰਜ ਕਰੋ (Enter New Name):", u.name);
  if (newName && newName.trim().length >= 2) {
    const cleanName = newName.trim();
    localStorage.setItem("pp_name", cleanName);
    if (typeof db !== 'undefined') {
      db.ref("accounts/" + u.phone + "/name").set(cleanName).then(() => {
        alert("✅ ਤੁਹਾਡਾ ਨਾਮ ਸਫਲਤਾਪੂਰਵਕ ਬਦਲ ਦਿੱਤਾ ਗਿਆ ਹੈ!");
        location.reload();
      });
    }
  }
}

// --- GOOGLE SIGN IN FUNCTION ---
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      const name = user.displayName || "Student";
      const identifier = user.phoneNumber || user.email.split('@')[0];

      // Save to Firebase Database
      db.ref("accounts/" + identifier).update({
        name: name,
        phone: identifier,
        email: user.email,
        authType: "google"
      }).then(() => {
        setSession(identifier);
        localStorage.setItem("pp_name", name);
        toast("✅ Google Login Successful!");
        setTimeout(() => location.href = "index.html", 500);
      });
    })
    .catch((error) => {
      alert("Google Sign-In Error: " + error.message);
    });
}

// --- LIVE POPUP POSTER LISTENER ---
function closePosterModal() {
  const pm = document.getElementById("posterModal");
  if (pm) pm.style.display = "none";
  sessionStorage.setItem("asp_poster_closed", "true");
}

if (typeof db !== 'undefined') {
  db.ref('siteSettings/popupPoster').on('value', snap => {
    const data = snap.val();
    const modal = document.getElementById('posterModal');
    const imgEl = document.getElementById('posterImageElement');
    const linkEl = document.getElementById('posterAnchor');

    if (data && data.active && data.imgUrl && !sessionStorage.getItem("asp_poster_closed")) {
      if (imgEl && modal) {
        imgEl.src = data.imgUrl;
        if (linkEl) {
          linkEl.href = data.clickUrl || "javascript:void(0)";
          if (!data.clickUrl) linkEl.style.cursor = "default";
        }
        modal.style.display = "flex";
      }
    } else {
      if (modal) modal.style.display = "none";
    }
  });
}

// --- ☰ SIDEBAR HAMBURGER MENU TOGGLE ---
function toggleNavMenu() {
  const nav = document.getElementById("navLinks");
  if (nav) nav.classList.toggle("menu-open");
}

// ਮੈਨਿਊ ਵਿੱਚੋਂ ਕੋਈ ਵੀ ਆਪਸ਼ਨ ਦਬਾਉਣ 'ਤੇ ਮੈਨਿਊ ਆਪਣੇ ਆਪ ਬੰਦ ਹੋ ਜਾਵੇ
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#navLinks a, #navLinks button").forEach(item => {
    item.addEventListener("click", () => {
      const nav = document.getElementById("navLinks");
      if (nav && nav.classList.contains("menu-open")) {
        nav.classList.remove("menu-open");
      }
    });
  });
});

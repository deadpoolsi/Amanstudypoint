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
  { id: "science", cat: "gk", emoji: "📗", title: "English", sub: "SSC • Patwari", defaultPrice: 99, pdf: "", demoPdf: "" },
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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toast(m) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

async function logout() {
  try {
    if (typeof firebase !== "undefined" && firebase.auth) {
      await firebase.auth().signOut();
    }
  } catch (e) {
    console.warn("Firebase sign-out warning:", e);
  }
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

/* 5. Checkout Modal with Coupon Discount & Razorpay Gateway */
const RAZORPAY_KEY_ID = "rzp_live_TVWYBLz18w4R54";

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
    <div class="pay-book" style="font-size:1.1rem; font-weight:bold; color:#e8590c; margin-bottom:6px;">${title}</div>
    <div class="pay-price" id="modalPriceDisplay" style="font-size:1.3rem; font-weight:bold; margin-bottom:12px;">Price: ₹${price}</div>

    <!-- 🏷️ Coupon Code Box -->
    <div style="margin: 10px 0 16px; background: #f8f9fa; padding: 12px; border-radius: 8px; border: 1px dashed #ffa94d;">
      <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">🏷️ Have a Coupon Code? (ਕੂਪਨ ਕੋਡ ਲਗਾਓ):</div>
      <div style="display: flex; gap: 6px;">
        <input type="text" id="couponInput" placeholder="ENTER CODE" style="flex:1; padding:8px 10px; border-radius:6px; border:1px solid #ccc; text-transform:uppercase; font-weight:bold;">
        <button class="btn btn-primary btn-small" onclick="applyCoupon(${price}, '${id}', '${name}')" style="background:#e8590c;">Apply</button>
      </div>
      <div id="couponMsg" style="font-size:0.8rem; margin-top:6px;"></div>
    </div>

    <!-- 💳 Razorpay Instant Pay Button -->
    <div id="modalPayBtnBox">
      <button class="btn btn-block" onclick="payWithRazorpay('${id}', '${name}', ${price})" style="background:#1971c2; color:#fff; font-weight:bold; padding:12px; border-radius:8px; width:100%; border:none; font-size:1rem; cursor:pointer;">
        ⚡ Pay ₹${price} via Razorpay (GPay/PhonePe/Cards)
      </button>
    </div>
  `;

  const m = document.getElementById("modal");
  if (m) { m.hidden = false; m.style.display = "flex"; }
}

function applyCoupon(originalPrice, id, name) {
  const inp = document.getElementById("couponInput").value.trim().toUpperCase();
  const msg = document.getElementById("couponMsg");
  const pDisp = document.getElementById("modalPriceDisplay");
  const btnBox = document.getElementById("modalPayBtnBox");

  if (!activeCoupon || !activeCoupon.active || activeCoupon.code !== inp) {
    msg.innerHTML = `<span style="color:#e03131;">⚠️ ਗ਼ਲਤ ਜਾਂ ਐਕਸਪਾਇਰ ਕੂਪਨ ਕੋਡ!</span>`;
    return;
  }

  const discountAmount = Math.round((originalPrice * activeCoupon.discount) / 100);
  const finalPrice = originalPrice - discountAmount;
  currentAppliedCoupon = { code: inp, discount: activeCoupon.discount, finalPrice };

  msg.innerHTML = `<span style="color:#2b8a3e; font-weight:700;">🎉 ਕੂਪਨ ਲੱਗ ਗਿਆ! ₹${discountAmount} ਦੀ ਛੋਟ ਮਿਲੀ (${activeCoupon.discount}% Off)</span>`;
  pDisp.innerHTML = `Price: <s style="color:#888;">₹${originalPrice}</s> <b style="color:#2b8a3e;">₹${finalPrice}</b>`;

  // ਡਿਸਕਾਊਂਟ ਵਾਲੇ ਰੇਟ ਨਾਲ ਬਟਨ ਅੱਪਡੇਟ ਕਰੋ
  if (btnBox) {
    btnBox.innerHTML = `
      <button class="btn btn-block" onclick="payWithRazorpay('${id}', '${name}', ${finalPrice}, '${inp}')" style="background:#2b8a3e; color:#fff; font-weight:bold; padding:12px; border-radius:8px; width:100%; border:none; font-size:1rem; cursor:pointer;">
        ⚡ Pay ₹${finalPrice} via Razorpay (Discount Applied)
      </button>
    `;
  }
}

function payWithRazorpay(bookId, itemName, finalPrice, couponCode = "") {
  const u = currentUser();
  if (!u) return;

  const options = {
    key: RAZORPAY_KEY_ID,
    amount: finalPrice * 100, // paise ਵਿੱਚ
    currency: "INR",
    name: "Aman Study Point",
    description: `Unlock ${itemName}`,
    prefill: {
      name: u.name || "",
      contact: u.phone || ""
    },
    theme: {
      color: "#e8590c"
    },
    handler: async function (response) {
      if (response.razorpay_payment_id) {
        toast("⏳ ਵੈਰੀਫਾਈ ਹੋ ਰਿਹਾ ਹੈ, ਕਿਰਪਾ ਕਰਕੇ ਇੰਤਜ਼ਾਰ ਕਰੋ...");

        // ਸਰਵਰ API ਰਾਹੀਂ ਸੁਰੱਖਿਅਤ ਵੈਰੀਫਿਕੇਸ਼ਨ
        try {
          const res = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              bookId: bookId,
              itemName: itemName,
              phone: u.phone,
              name: u.name,
              amount: finalPrice
            })
          });

          const result = await res.json();

          if (result.success) {
            closeModal();
            alert(`🎉 ਵਧਾਈਆਂ! ਪੇਮੈਂਟ ਸਫਲ ਹੋ ਗਈ ਹੈ।\nPayment ID: ${response.razorpay_payment_id}\nਕਿਤਾਬ ਤੁਰੰਤ ਅਨਲੌਕ ਹੋ ਗਈ ਹੈ।`);
            drawBooks();
          } else {
            alert("⚠️ ਪੇਮੈਂਟ ਵੈਰੀਫਿਕੇਸ਼ਨ ਫੇਲ ਹੋ ਗਈ: " + (result.message || "Error"));
          }
        } catch (err) {
          alert("⚠️ ਸਰਵਰ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਹੋ ਸਕਿਆ।");
        }
      }
    },
    modal: {
      ondismiss: function () {
        console.log("Payment cancelled");
      }
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

function closeModal() {
  const m = document.getElementById("modal");
  if (m) { m.hidden = true; m.style.display = "none"; }
}

/* 6. Free PYQ Loader (Compact & No-Gap Card) */
function loadPublicPYQs() {
  const container = document.getElementById("pyqListContainer") || document.getElementById("pyqList");
  if (!container) return;

  db.ref("pyqList").on("value", snap => {
    const data = snap.val();
    if (!data) {
      container.innerHTML = "<p style='text-align:center; color:#888; padding:15px; font-size:0.85rem;'>ਕੋਈ ਪੇਪਰ ਅੱਪਲੋਡ ਨਹੀਂ ਹੈ</p>";
      return;
    }

    const keys = Object.keys(data);
    container.innerHTML = keys.map(key => {
      const p = data[key];
      const views = (p.views || 0).toLocaleString();
      return `
        <div style="background:#fff; border:1px solid #e9ecef; border-radius:12px; padding:12px 14px; margin:0 auto 10px auto; max-width:550px; box-shadow:0 2px 6px rgba(0,0,0,0.03); display:block; height:auto; min-height:auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="background:#e7f5ff; color:#1971c2; font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:8px;">${p.exam || 'Exam'}</span>
            <span style="font-size:0.8rem; color:#e8590c; font-weight:700;">👁️ ${views}+ Views</span>
          </div>
          <h3 style="font-size:1rem; font-weight:700; margin:4px 0 3px 0; color:#222; line-height:1.3;">${p.title}</h3>
          <div style="color:#777; font-size:0.78rem; margin-bottom:10px;">📅 Added: ${p.date || 'Recently'}</div>
          <button type="button" onclick="openSecurePYQ('${key}')" class="btn btn-primary" style="background:#1971c2; color:#fff; border:none; cursor:pointer; font-weight:bold; border-radius:8px; padding:8px 12px; font-size:0.85rem; width:100%; display:block; text-align:center;">
            📖 View & Read Paper
          </button>
        </div>
      `;
    }).join("");
  });
}



// 👁️ ਸਿਰਫ਼ 1 ਯੂਜ਼ਰ / ਡਿਵਾਈਸ ਦਾ 1 ਹੀ ਵਿਊ ਕਾਊਂਟ ਹੋਵੇਗਾ
function openSecurePYQ(key) {
  const viewedKey = "viewed_pyq_" + key;

  // ਜੇਕਰ ਇਸ ਫ਼ੋਨ/ਬ੍ਰਾਊਜ਼ਰ ਨੇ ਪਹਿਲਾਂ ਇਹ ਪੇਪਰ ਨਹੀਂ ਦੇਖਿਆ
  if (!localStorage.getItem(viewedKey)) {
    localStorage.setItem(viewedKey, "true");
    
    // ਸਿਰਫ਼ ਪਹਿਲੀ ਵਾਰ ਵਿਊ +1 ਹੋਵੇਗਾ
    db.ref("pyqList/" + key + "/views").transaction(currentViews => {
      return (currentViews || 0) + 1;
    });
  }

  // ਰੀਡਰ ਪੇਜ 'ਤੇ ਭੇਜੋ
  window.location.href = `reader.html?id=${key}&type=pyq`;
}

// 🚀 ਪੇਜ ਖੁੱਲ੍ਹਦੇ ਹੀ ਫੰਕਸ਼ਨ ਚਲਾਓ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPublicPYQs);
} else {
  loadPublicPYQs();
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

/* 8. Quiz Engine (Auto-Submit Notice, Timer, Auto-Resume & Leaderboard) */
let activeQuiz = [], userAns = [], quizVersion = "v1", qIdx = 0, qScore = 0, qAnswered = false, qTimer = null, qSecs = 1200, isTimerStarted = false, quizTotalMins = 20;

function getProgressKey() {
  const u = currentUser();
  return u ? `asp_quiz_progress_${u.phone}_${quizVersion}` : null;
}

function saveQuizState() {
  const key = getProgressKey();
  if (!key || isNaN(qIdx)) return;
  const state = {
    qIdx: qIdx,
    qScore: qScore,
    userAns: userAns,
    qSecs: qSecs,
    isTimerStarted: isTimerStarted,
    quizVersion: quizVersion
  };
  localStorage.setItem(key, JSON.stringify(state));
}

function clearQuizState() {
  const key = getProgressKey();
  if (key) localStorage.removeItem(key);
}

// ⚠️ ਟੈਸਟ ਚੱਲਦੇ ਸਮੇਂ ਬਾਹਰ ਜਾਣ 'ਤੇ ਸੇਵ ਕਰੋ
window.addEventListener('beforeunload', (e) => {
  if (isTimerStarted && qIdx < activeQuiz.length) {
    saveQuizState();
    e.preventDefault();
    e.returnValue = "ਤੁਹਾਡਾ ਟੈਸਟ ਚੱਲ ਰਿਹਾ ਹੈ!";
  }
});

function initQuiz() {
  const box = document.getElementById("quizBox");
  if (!box) return;
  const u = currentUser();
  if (!u) {
    box.innerHTML = `<div style="text-align:center;padding:25px 15px;"><div style="font-size:3rem;margin-bottom:10px;">🔐</div><h3>Login Required for Daily Test</h3><p style="color:#666;margin:8px 0 16px;">ਟੈਸਟ ਦੇਣ ਲਈ ਪਹਿਲਾਂ ਲੌਗਇਨ ਕਰੋ।</p><a class="btn btn-primary" href="login.html" style="background:#e8590c; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none;">🔐 Login / Register</a></div>`;
    return;
  }

  db.ref("quizTimerMinutes").once("value", s => { 
    quizTotalMins = s.val() || 20;
    if (!localStorage.getItem(getProgressKey())) {
      qSecs = quizTotalMins * 60; 
    }
  });

  db.ref("quizVersion").on("value", vSnap => {
    quizVersion = vSnap.val() || "v1";

    db.ref("userAttempts/" + u.phone + "/" + quizVersion).once("value", aSnap => {
      if (aSnap.exists()) {
        clearQuizState();
        const prev = aSnap.val(), pct = Math.round((prev.score / prev.total) * 100);
        box.innerHTML = `
          <div class="quiz-score-card" style="text-align:center; padding:25px;">
            <div style="font-size:3rem;">✅</div>
            <h3>ਤੁਸੀਂ ਅੱਜ ਦਾ ਟੈਸਟ ਦੇ ਚੁੱਕੇ ਹੋ!</h3>
            <p style="color:#666; margin:6px 0;">Student: <b>${u.name}</b> <span id="userStreakBadge"></span></p>
            <div class="quiz-score-num" style="font-size:2rem; font-weight:800; color:#e8590c; margin:10px 0;">${prev.score} / ${prev.total}</div>
            <p style="color:#2b8a3e;font-weight:700;margin-bottom:15px;">Marks: ${pct}%</p>
                    <button class="btn btn-primary btn-block" onclick="generateCertificate('${u.name}', ${prev.score}, ${prev.total})" style="background:#1971c2; color:#fff; max-width:280px; margin:0 auto 8px; padding:10px; border-radius:6px; border:none; cursor:pointer; width:100%;">
          🎖️ Download Official Certificate
        </button>

        <!-- 🟢 WhatsApp Share Button -->
        <button class="btn btn-block" onclick="shareCertificateWhatsApp('${u.name}', ${prev.score}, ${prev.total}, 'Daily Mock Test')" style="background:#25D366; color:#fff; max-width:280px; margin:0 auto 10px; padding:10px; border-radius:6px; border:none; cursor:pointer; font-weight:700; width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
          <span>📲</span> Share Result on WhatsApp
        </button>
          </div>
        `;
        updateDailyStreak(u.phone).then(streak => {
  const badgeEl = document.getElementById("userStreakBadge");
  if (badgeEl) badgeEl.innerHTML = renderStreakBadge(streak);
});
      } else {
        db.ref("dailyQuiz").once("value", qSnap => {
          activeQuiz = (qSnap.exists() && Array.isArray(qSnap.val())) ? qSnap.val() : [{ q: "1. ਪੰਜਾਬ ਦਾ ਰਾਜ ਪੰਛੀ ਕਿਹੜਾ ਹੈ?", options: ["ਮੋਰ", "ਬਾਜ਼", "ਤੋਤਾ", "ਕਬੂਤਰ"], answer: 1 }];
          
          const savedStateStr = localStorage.getItem(getProgressKey());
          if (savedStateStr) {
            try {
              const saved = JSON.parse(savedStateStr);
              if (saved.quizVersion === quizVersion && saved.qIdx < activeQuiz.length) {
                qIdx = saved.qIdx || 0;
                qScore = saved.qScore || 0;
                userAns = saved.userAns || [];
                qSecs = saved.qSecs || qSecs;
                isTimerStarted = saved.isTimerStarted || false;
              } else {
                clearQuizState();
                qIdx = 0; qScore = 0; userAns = []; isTimerStarted = false;
              }
            } catch(e) {
              clearQuizState();
              qIdx = 0; qScore = 0; userAns = []; isTimerStarted = false;
            }
          } else {
            qIdx = 0; qScore = 0; userAns = []; isTimerStarted = false;
          }

          if (isTimerStarted) {
            startTimer();
            renderQ();
          } else {
            showQuizStartScreen();
          }
        });
      }
    });

    loadBoard();
  });
}

function showQuizStartScreen() {
  const box = document.getElementById("quizBox");
  if (!box) return;
  const u = currentUser();

  box.innerHTML = `
    <div style="padding:20px 15px; text-align:center;">
      <div style="font-size:2.8rem; margin-bottom:8px;">📝</div>
      <h3 style="color:#e8590c; margin-bottom:6px;">Daily Punjab Exam Mock Test</h3>
      <p style="color:#666; font-size:0.9rem; margin-bottom:16px;">ਵਿਦਿਆਰਥੀ: <b>${u.name}</b></p>
      
      <!-- ⚠️ ਸਪੱਸ਼ਟ ਆਟੋ-ਸਬਮਿਟ ਹਦਾਇਤ ਬਾਕਸ -->
      <div style="background:#fff4e6; border:1.5px dashed #ffa94d; border-radius:10px; padding:14px; text-align:left; margin-bottom:20px;">
        <h4 style="color:#d9480f; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          ⚠️ ਜ਼ਰੂਰੀ ਹਦਾਇਤ (Important Rule):
        </h4>
        <ul style="font-size:0.88rem; color:#444; line-height:1.5; padding-left:18px; margin:0;">
          <li>ਕੁੱਲ ਸਵਾਲ: <b>${activeQuiz.length}</b> | ਕੁੱਲ ਸਮਾਂ: <b>${quizTotalMins} ਮਿੰਟ</b></li>
          <li style="color:#c92a2a; font-weight:700; margin-top:6px;">
            ਜੇਕਰ ਤੁਸੀਂ ਟੈਸਟ ਵਿਚਕਾਰੋਂ ਕੱਟ ਦਿੱਤਾ, ਤਾਂ ਟਾਈਮਰ ਚੱਲਦਾ ਰਹੇਗਾ ਅਤੇ ਸਮਾਂ ਖ਼ਤਮ ਹੋਣ 'ਤੇ ਜਿੰਨੇ ਸਵਾਲ ਤੁਸੀਂ ਅਟੈਮਪਟ ਕੀਤੇ ਹੋਣਗੇ , ਉਹ ਆਪਣੇ ਆਪ (Auto-Submit) ਹੋ ਜਾਣਗੇ!
          </li>
          <li style="margin-top:4px;">ਟੈਸਟ ਪੂਰਾ ਹੋਣ 'ਤੇ ਸਰਟੀਫਿਕੇਟ ਮਿਲੇਗਾ।</li>
        </ul>
      </div>

      <button class="btn btn-primary" onclick="startQuizNow()" style="background:#e8590c; color:#fff; font-size:1.05rem; font-weight:bold; padding:12px 30px; border-radius:8px; border:none; cursor:pointer; width:100%; max-width:280px; box-shadow:0 4px 12px rgba(232,89,12,0.25);">
        🚀 Start Test Now
      </button>
    </div>
  `;
}

function startQuizNow() {
  isTimerStarted = true;
  qIdx = 0;
  qScore = 0;
  userAns = [];
  startTimer();
  renderQ();
}

function startTimer() {
  clearInterval(qTimer);
  qTimer = setInterval(() => {
    qSecs--;
    saveQuizState();
    const d = document.getElementById("quizTimerDisplay");
    if (d) {
      const m = Math.floor(qSecs / 60), s = qSecs % 60;
      d.textContent = `⏱️ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    if (qSecs <= 0) { 
      clearInterval(qTimer); 
      alert("⏱️ ਸਮਾਂ ਸਮਾਪਤ! ਤੁਹਾਡਾ ਟੈਸਟ ਅਟੈਮਪਟ ਕੀਤੇ ਸਵਾਲਾਂ  ਮੁਤਾਬਕ ਆਟੋ-ਸਬਮਿਟ ਹੋ ਰਿਹਾ ਹੈ।"); 
      finishTest(); 
    }
  }, 1000);
}

function renderQ() {
  const box = document.getElementById("quizBox");
  if (!box) return;
  if (qIdx >= activeQuiz.length) { finishTest(); return; }
  
  qAnswered = false;
  const cur = activeQuiz[qIdx];
  const m = Math.floor(qSecs / 60), s = qSecs % 60;
  
  box.innerHTML = `
    <!-- 💡 ਐਕਟਿਵ ਟੈਸਟ ਦੌਰਾਨ ਸਪੱਸ਼ਟ ਨੋਟਿਸ -->
    <div style="background:#fff9db; border:1px solid #fab005; padding:6px 10px; border-radius:6px; font-size:0.78rem; color:#f08c00; margin-bottom:10px; font-weight:600; text-align:center;">
      ⚠️ ਜੇਕਰ ਟੈਸਟ ਕੱਟਿਆ ਗਿਆ, ਤਾਂ ਸਮਾਂ ਪੂਰਾ ਹੋਣ 'ਤੇ ਅਟੈਮਪਟ ਸਵਾਲ ਆਟੋ-ਸਬਮਿਟ ਹੋ ਜਾਣਗੇ।
    </div>

    <div class="quiz-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <span style="font-weight:700;">Question ${qIdx + 1} of ${activeQuiz.length}</span>
      <span class="quiz-timer-badge" id="quizTimerDisplay" style="background:#ffe8cc; color:#d9480f; padding:4px 10px; border-radius:12px; font-weight:bold;">⏱️ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}</span>
    </div>
    <div class="quiz-q" style="font-size:1.1rem; font-weight:700; margin-bottom:16px;">${cur.q}</div>
    <div class="quiz-opts" id="quizOpts" style="display:flex; flex-direction:column; gap:10px;">
      ${cur.options.map((opt, i) => `
        <button class="quiz-opt-btn" onclick="checkAns(${i})" style="text-align:left; padding:12px; border:1.5px solid #dee2e6; border-radius:8px; background:#fff; font-size:0.95rem; cursor:pointer;">
          <b>${String.fromCharCode(65 + i)})</b> ${opt}
        </button>
      `).join("")}
    </div>
  `;
}

function checkAns(selectedIdx) {
  if (qAnswered) return;
  qAnswered = true;

  const cur = activeQuiz[qIdx];
  const isCorrect = (selectedIdx === cur.answer);
  
  if (isCorrect) qScore++;
  userAns.push({ q: cur.q, selected: selectedIdx, correct: cur.answer });

  const btns = document.querySelectorAll(".quiz-opt-btn");
  btns.forEach((b, i) => {
    b.disabled = true;
    if (i === cur.answer) {
      b.style.background = "#d3f9d8";
      b.style.borderColor = "#2b8a3e";
      b.style.color = "#2b8a3e";
      b.style.fontWeight = "bold";
    } else if (i === selectedIdx) {
      b.style.background = "#ffe3e3";
      b.style.borderColor = "#c92a2a";
      b.style.color = "#c92a2a";
    }
  });

  qIdx++;
  saveQuizState();

  setTimeout(() => {
    if (qIdx < activeQuiz.length) {
      renderQ();
    } else {
      finishTest();
    }
  }, 1000);
}

function finishTest() {
  clearInterval(qTimer);
  qTimer = null;
  isTimerStarted = false;
  clearQuizState();

  const u = currentUser();
  const box = document.getElementById("quizBox");
  if (!u || !box) return;

  box.innerHTML = `<div style="text-align:center; padding:30px;"><div style="font-size:2.5rem;">⏳</div><h3>ਟੈਸਟ ਦਾ ਨਤੀਜਾ ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ...</h3></div>`;

  // ਵਿਦਿਆਰਥੀ ਦੇ ਚੁਣੇ ਜਵਾਬ ਸਰਵਰ 'ਤੇ ਭੇਜੋ
  const selectedIndexes = userAns.map(a => a.selected);

  fetch("/api/submit-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: u.phone,
      name: u.name,
      userAnswers: selectedIndexes,
      version: quizVersion
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      qScore = data.score;
      const total = data.total;
      const pct = data.percentage;

      box.innerHTML = `
        <div class="quiz-score-card" style="text-align:center; padding:25px;">
          <div style="font-size:3rem;">🎉</div>
          <h3>Test Completed!</h3>
          <p style="color:#666; margin:6px 0;">Student: <b>${escapeHtml(u.name)}</b></p>
          <div class="quiz-score-num" style="font-size:2.2rem; font-weight:800; color:#e8590c; margin:10px 0;">${qScore} / ${total}</div>
          <p style="color:#2b8a3e; font-weight:700; margin-bottom:16px;">Marks: ${pct}%</p>
          <button class="btn btn-primary" onclick="generateCertificate('${escapeHtml(u.name)}', ${qScore}, ${total})" style="background:#1971c2; color:#fff; padding:12px 24px; border-radius:8px; border:none; cursor:pointer; font-weight:bold;">
            🎖️ Download Official Certificate
          </button>
        </div>
      `;
      loadBoard();
    } else {
      box.innerHTML = `<div style="text-align:center; padding:25px; color:#e03131;"><h3>⚠️ ${data.message || 'Error submitting test'}</h3></div>`;
    }
  })
  .catch(() => {
    box.innerHTML = `<div style="text-align:center; padding:25px; color:#e03131;"><h3>⚠️ ਸਰਵਰ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਹੋ ਸਕਿਆ।</h3></div>`;
  });
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
  const tL = document.getElementById("tabLogin");
  const tR = document.getElementById("tabReg");
  const fL = document.getElementById("formLogin");
  const fR = document.getElementById("formReg");

  if (!tL || !fL) return;

  // login.html owns the real Firebase Authentication handlers.
  // IMPORTANT: Do not overwrite form onsubmit here, otherwise the
  // Firebase Auth login/register functions in login.html get bypassed.
  if (typeof switchTab === "function") {
    tL.onclick = () => switchTab("login");
    if (tR) tR.onclick = () => switchTab("reg");
  }

  if (session()) {
    location.replace("index.html");
  }
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
    const params = new URLSearchParams(window.location.search);
  if (params.get('type') !== 'pyq') {
    initReader();
  }
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

// --- 📅 TODAY'S SPECIAL DAY LISTENER (Zero-Delay) ---
function renderDailyDay(data) {
  const sec = document.getElementById("dailyDaySection");
  if (!sec) return;

  if (data && data.active && data.title) {
    document.getElementById("dailyDayTitle").innerText = "📌 " + data.title;
    document.getElementById("dailyDayWhy").innerText = data.why || "";
    
    const themeBox = document.getElementById("dailyDayThemeBox");
    if (data.theme && data.theme.trim() !== "") {
      document.getElementById("dailyDayTheme").innerText = data.theme;
      themeBox.style.display = "block";
    } else {
      themeBox.style.display = "none";
    }

    const dEl = document.getElementById("dailyDayDate");
    if (dEl) dEl.innerText = data.updatedAt || "";

    sec.style.display = "block";
  } else {
    sec.style.display = "none";
  }
}

// 1. ਮੈਮਰੀ ਵਿੱਚੋਂ ਤੁਰੰਤ ਲੋਡ ਕਰੋ
const cachedDay = localStorage.getItem("asp_cached_daily_day");
if (cachedDay) {
  try { renderDailyDay(JSON.parse(cachedDay)); } catch(e) {}
}

// 2. Firebase ਤੋਂ ਲਾਈਵ ਸਿੰਕ
if (typeof db !== 'undefined') {
  db.ref("siteSettings/todayDay").on("value", snap => {
    const data = snap.val();
    if (data) {
      localStorage.setItem("asp_cached_daily_day", JSON.stringify(data));
      renderDailyDay(data);
    } else {
      renderDailyDay(null);
    }
  });
}

// --- 📲 DIRECT 1-CLICK PWA INSTALL ---
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  const btn = document.getElementById('installAppBtn');
  if (btn) btn.style.display = 'inline-flex';
});

function installPWA() {
  if (window.deferredPrompt) {
    window.deferredPrompt.prompt();
    window.deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        if (typeof toast === 'function') toast("🎉 ਐਪ ਇੰਸਟਾਲ ਹੋ ਰਹੀ ਹੈ!");
      }
      window.deferredPrompt = null;
    });
  }
}

window.addEventListener('appinstalled', () => {
  window.deferredPrompt = null;
  const btn = document.getElementById('installAppBtn');
  if (btn) btn.style.display = 'none'; // ਇੰਸਟਾਲ ਹੋਣ ਤੋਂ ਬਾਅਦ ਬਟਨ ਆਪਣੇ ਆਪ ਹਟ ਜਾਵੇਗਾ
});

// 🏆 1. ਆਟੋਮੈਟਿਕ ਸਰਟੀਫਿਕੇਟ ਬਣਾਉਣ ਅਤੇ WhatsApp ਸ਼ੇਅਰ ਕਰਨ ਵਾਲਾ ਫੰਕਸ਼ਨ
async function shareCertificateWhatsApp(studentName, score, total, examTitle) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 700;
  const ctx = canvas.getContext("2d");

  // ਬੈਕਗ੍ਰਾਊਂਡ ਅਤੇ ਬਾਰਡਰ
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1200, 700);

  ctx.lineWidth = 14;
  ctx.strokeStyle = "#e8590c";
  ctx.strokeRect(20, 20, 1160, 660);

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fab005";
  ctx.strokeRect(35, 35, 1130, 630);

  // ਹੈਡਰ ਅਤੇ ਬ੍ਰਾਂਡਿੰਗ
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8590c";
  ctx.font = "bold 44px -apple-system, sans-serif";
  ctx.fillText("📘 AMAN STUDY POINT", 600, 110);

  ctx.fillStyle = "#555555";
  ctx.font = "600 24px -apple-system, sans-serif";
  ctx.fillText("MOCK TEST PERFORMANCE CERTIFICATE", 600, 155);

  // ਸਰਟੀਫਾਈ ਟੈਕਸਟ
  ctx.fillStyle = "#777777";
  ctx.font = "22px -apple-system, sans-serif";
  ctx.fillText("This is proudly presented to", 600, 230);

  // ਵਿਦਿਆਰਥੀ ਦਾ ਨਾਮ
  ctx.fillStyle = "#1971c2";
  ctx.font = "bold 48px -apple-system, sans-serif";
  ctx.fillText(studentName || "Proud Aspirant", 600, 295);

  // ਲਾਈਨ
  ctx.beginPath();
  ctx.moveTo(350, 315);
  ctx.lineTo(850, 315);
  ctx.strokeStyle = "#dee2e6";
  ctx.lineWidth = 2;
  ctx.stroke();

  // ਐਗਜ਼ਾਮ ਅਤੇ ਵਧਾਈ ਸੰਦੇਸ਼
  ctx.fillStyle = "#333333";
  ctx.font = "24px -apple-system, sans-serif";
  ctx.fillText(`for successfully attempting the "${examTitle || 'Punjab Govt Exams'}" Mock Test`, 600, 370);

  // ਸਕੋਰ ਬਾਕਸ
  const percentage = Math.round((score / total) * 100);
  ctx.fillStyle = "#f8f9fa";
  ctx.fillRect(360, 410, 480, 110);
  ctx.strokeStyle = "#e9ecef";
  ctx.lineWidth = 2;
  ctx.strokeRect(360, 410, 480, 110);

  ctx.fillStyle = "#2b8a3e";
  ctx.font = "bold 38px -apple-system, sans-serif";
  ctx.fillText(`Score: ${score} / ${total} (${percentage}%)`, 600, 465);

  ctx.fillStyle = "#666666";
  ctx.font = "600 20px -apple-system, sans-serif";
  ctx.fillText("⭐ Verified Performance Result ⭐", 600, 500);

  // ਮਿਤੀ ਅਤੇ ਵੈਰੀਫਿਕੇਸ਼ਨ
  const today = new Date().toLocaleDateString('en-GB');
  ctx.textAlign = "left";
  ctx.fillStyle = "#777777";
  ctx.font = "20px -apple-system, sans-serif";
  ctx.fillText(`📅 Date: ${today}`, 70, 620);

  ctx.textAlign = "right";
  ctx.fillStyle = "#e8590c";
  ctx.font = "bold 20px -apple-system, sans-serif";
  ctx.fillText("Official Study Partner — Aman Study Point", 1130, 620);

  // ਸ਼ੇਅਰ ਟੈਕਸਟ ਮੈਸੇਜ
  const shareText = `🎯 ਮੈਂ Aman Study Point 'ਤੇ Daily Mock Test ਦਿੱਤਾ!\n🏆 ਮੇਰਾ ਸਕੋਰ: ${score}/${total} (${percentage}%)\n\nਤੁਸੀਂ ਵੀ ਆਪਣੀ ਤਿਆਰੀ ਪਰਖੋ ਅਤੇ ਫ੍ਰੀ ਮੌਕ ਟੈਸਟ ਦਿਓ 👉 ${window.location.origin}`;

  // ਮੋਬਾਈਲ 'ਤੇ ਫੋਟੋ ਸਿੱਧੀ WhatsApp 'ਤੇ ਸ਼ੇਅਰ ਕਰਨ ਲਈ
  canvas.toBlob(async (blob) => {
    const file = new File([blob], "Aman_Study_Point_Certificate.png", { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "My Mock Test Certificate",
          text: shareText
        });
      } catch (err) {
        console.log("Sharing failed", err);
      }
    } else {
      // ਕੰਪਿਊਟਰ ਜਾਂ ਪੁਰਾਣੇ ਬ੍ਰਾਊਜ਼ਰ ਲਈ ਆਟੋਮੈਟਿਕ ਡਾਊਨਲੋਡ + WhatsApp ਲਿੰਕ
      const link = document.createElement("a");
      link.download = "My_MockTest_Certificate.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, "_blank");
    }
  }, "image/png");
}

/* 🔥 Daily Study Streak System */
function getTodayDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function updateDailyStreak(phone) {
  if (!phone) return 1;
  const today = getTodayDateStr();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getTodayDateStr(yesterdayDate);

  try {
    const snap = await db.ref("users/" + phone + "/streakData").once("value");
    const data = snap.val() || { streak: 0, lastDate: "" };
    let currentStreak = data.streak || 0;

    if (data.lastDate === today) {
      return currentStreak;
    } else if (data.lastDate === yesterday) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    await db.ref("users/" + phone + "/streakData").set({
      streak: currentStreak,
      lastDate: today
    });
    return currentStreak;
  } catch (e) {
    return 1;
  }
}

function renderStreakBadge(streak) {
  if (!streak || streak < 1) return "";
  return `<span style="background:#fff3bf; color:#d9480f; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:20px; border:1px solid #ffd43b; display:inline-flex; align-items:center; gap:3px; margin-left:6px;">🔥 ${streak} Day${streak > 1 ? 's' : ''} Streak</span>`;
}

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

/* 1. Theme */
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

/* 2. Referral WhatsApp Share */
function shareReferralWhatsApp() {
  const text = encodeURIComponent(`🔥 ਹੈਲੋ! ਮੈਂ Aman Study Point ਵੈੱਬਸਾਈਟ 'ਤੇ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ (Punjab Police, Patwari) ਦੀ ਤਿਆਰੀ ਕਰ ਰਹਿਆ ਹਾਂ। ਇੱਥੇ ਰੋਜ਼ਾਨਾ ਮੁਫ਼ਤ ਟੈਸਟ ਆਉਂਦੇ ਹਨ। ਹੁਣੇ ਚੈੱਕ ਕਰੋ: https://amanstudypoint.vercel.app`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
}

/* 3. Realtime Books & Config Listener */
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
    b.href = "javascript:void(0)";
    if (anNav) anNav.style.display = "inline-block";
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
    b.onclick = null;
    if (lo) lo.remove();
    if (anNav) anNav.style.display = "none";
  }
}

function renderBooksRealtime() {
  const u = currentUser();
  if (!u || !u.phone) { 
    userUnlockedBookIds = []; 
    drawBooks(); 
    return; 
  }
  if (typeof db !== "undefined") {
    db.ref("users/" + u.phone + "/books").on("value", s => {
      const un = s.val() || {};
      userUnlockedBookIds = Object.keys(un).filter(k => un[k] === true);
      drawBooks();
    }, (error) => {
      console.warn("Realtime read warning:", error);
    });
  }
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

  const myG = document.getElementById("myBooksGrid");
  if (myG) {
    if (userUnlockedBookIds.length === 0) {
      myG.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:#777; padding:20px;'>ਤੁਹਾਡੇ ਅਕਾਊਂਟ ਵਿੱਚ ਅਜੇ ਕੋਈ ਕਿਤਾਬ ਅਨਲੌਕ ਨਹੀਂ ਹੈ।</p>";
    } else {
      myG.innerHTML = userUnlockedBookIds.map(id => {
        const b = BOOKS.find(x => x.id === id);
        if (!b) return "";
        return `<div class="book-card"><span class="pill">🎒 Unlocked</span><div class="book-emoji">${b.emoji}</div><div class="book-title">${b.title}</div><div class="book-sub">${b.sub}</div><div class="book-bottom"><a class="btn btn-read btn-small" href="reader.html?id=${b.id}">📖 Read Full Book</a></div></div>`;
      }).join("");
    }
  }
}

/* 4. Checkout Modal with Coupon Discount & Razorpay Gateway */
const RAZORPAY_KEY_ID = "rzp_live_TWdKzxxstllGLQ";
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

    <div style="margin: 10px 0 16px; background: #f8f9fa; padding: 12px; border-radius: 8px; border: 1px dashed #ffa94d;">
      <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">🏷️ Have a Coupon Code? (ਕੂਪਨ ਕੋਡ ਲਗਾਓ):</div>
      <div style="display: flex; gap: 6px;">
        <input type="text" id="couponInput" placeholder="ENTER CODE" style="flex:1; padding:8px 10px; border-radius:6px; border:1px solid #ccc; text-transform:uppercase; font-weight:bold;">
        <button class="btn btn-primary btn-small" onclick="applyCoupon(${price}, '${id}', '${name}')" style="background:#e8590c;">Apply</button>
      </div>
      <div id="couponMsg" style="font-size:0.8rem; margin-top:6px;"></div>
    </div>

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

  if (btnBox) {
    btnBox.innerHTML = `
      <button class="btn btn-block" onclick="payWithRazorpay('${id}', '${name}', ${finalPrice}, '${inp}')" style="background:#2b8a3e; color:#fff; font-weight:bold; padding:12px; border-radius:8px; width:100%; border:none; font-size:1rem; cursor:pointer;">
        ⚡ Pay ₹${finalPrice} via Razorpay (Discount Applied)
      </button>
    `;
  }
}

async function payWithRazorpay(bookId, itemName, finalPrice, couponCode = "") {
  const u = currentUser();
  if (!u) {
    if (typeof toast === "function") toast("Please login first 🔐");
    setTimeout(() => { location.href = "login.html"; }, 800);
    return;
  }

  const numPrice = Number(finalPrice) || 99;

  try {
    const orderRes = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: numPrice, bookId: bookId })
    });

    const orderData = await orderRes.json();

    if (!orderData.success) {
      alert("⚠️ Order Error: " + (orderData.message || "Razorpay ਆਰਡਰ ਨਹੀਂ ਬਣ ਸਕਿਆ"));
      return;
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "Aman Study Point",
      description: itemName || "Study Material",
      order_id: orderData.orderId,
      prefill: {
        name: u.name || "Student",
        contact: u.phone || ""
      },
      theme: {
        color: "#e8590c"
      },
      handler: async function (response) {
        try {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              bookId: bookId,
              phone: u.phone,
              name: u.name,
              amount: numPrice
            })
          });

          const data = await verifyRes.json();

          if (data.success) {
            alert("🎉 ਪੇਮੈਂਟ ਸਫਲ ਰਹੀ! ਕਿਤਾਬ ਅਨਲੌਕ ਹੋ ਗਈ ਹੈ।");
            window.location.reload();
          } else {
            alert("⚠️ " + (data.message || "ਪੇਮੈਂਟ ਵੈਰੀਫਿਕੇਸ਼ਨ ਫੇਲ੍ਹ ਹੋ ਗਈ!"));
          }
        } catch (err) {
          alert("⚠️ ਸਰਵਰ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਹੋ ਸਕਿਆ।");
        }
      },
      modal: {
        ondismiss: function () {
          console.log("Payment popup closed");
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function (resp) {
      alert("⚠️ Payment Failed: " + (resp.error.description || "ਟ੍ਰਾਂਜੈਕਸ਼ਨ ਰੱਦ ਹੋ ਗਈ"));
    });
    rzp.open();
  } catch (err) {
    alert("⚠️ ਪੇਮੈਂਟ ਸ਼ੁਰੂ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।");
  }
}

function closeModal() {
  const m = document.getElementById("modal");
  if (m) { m.hidden = true; m.style.display = "none"; }
}

/* 5. Free PYQ Loader */
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

function openSecurePYQ(key) {
  const u = currentUser();
  const storageKey = u ? ("asp_pyq_seen_" + u.phone + "_" + key) : ("asp_pyq_seen_guest_" + key);

  if (localStorage.getItem(storageKey) === "done") {
    window.location.href = `reader.html?id=${key}&type=pyq`;
    return;
  }

  localStorage.setItem(storageKey, "done");

  try {
    if (typeof db !== "undefined") {
      db.ref("pyqList/" + key + "/views").transaction(function(current) {
        return (current || 0) + 1;
      });
    }
  } catch (err) {
    console.warn("View update error:", err);
  }

  setTimeout(function() {
    window.location.href = `reader.html?id=${key}&type=pyq`;
  }, 200);
}

/* 6. Student Analytics Progress */
function loadUserAnalytics() {
  const u = currentUser();
  const box = document.getElementById("userAnalyticsBox");
  if (!u || !box) return;

  db.ref("userAttempts/" + u.phone).on("value", snap => {
    const attempts = snap.val();
    if (!attempts) {
      box.innerHTML = "<p style='text-align:center; color:#777; padding:20px;'>ਅਜੇ ਤੱਕ ਕੋਈ ਟੈਸਟ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।</p>";
      return;
    }

    const list = Object.entries(attempts);
    const totalTests = list.length;
    let totalScore = 0, totalMax = 0;
    list.forEach(([_, a]) => { totalScore += a.score; totalMax += a.total; });
    const avg = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    box.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:16px;">
        <div class="card" style="padding:12px; text-align:center; background:#f8f9fa;">
          <div style="font-size:1.6rem; font-weight:800; color:#e8590c;">${totalTests}</div>
          <small>Total Tests Attempted</small>
        </div>
        <div class="card" style="padding:12px; text-align:center; background:#f8f9fa;">
          <div style="font-size:1.6rem; font-weight:800; color:#2b8a3e;">${avg}%</div>
          <small>Average Accuracy Score</small>
        </div>
      </div>
      <div class="card" style="padding:12px; background:#fff; border:1px solid #eee;">
        <h4 style="margin-bottom:10px;">📜 Test Attempt History:</h4>
        ${list.reverse().map(([key, a]) => `
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee; font-size:0.88rem;">
            <div><b>Score:</b> ${a.score} / ${a.total} (${Math.round((a.score/a.total)*100)}%)</div>
            <small style="color:#777;">🕒 ${a.time}</small>
          </div>
        `).join("")}
      </div>
    `;
  });
}

/* 7. 🚀 TESTBOOK CBT QUIZ ENGINE (Question Palette, Navigation, Auto-Submit) */
let activeQuiz = [];
let userSelections = {};     // qIdx -> selectedOptionIndex (e.g. 0, 1, 2, 3)
let visitedQuestions = {};   // qIdx -> true (visited tracking for Red/Gray)
let quizVersion = "v1";
let currentQIdx = 0;
let qTimer = null;
let qSecs = 1200;
let isTimerStarted = false;
let quizTotalMins = 20;

function getProgressKey() {
  const u = currentUser();
  return u ? `asp_quiz_progress_${u.phone}_${quizVersion}` : null;
}

function saveQuizState() {
  const key = getProgressKey();
  if (!key) return;
  const state = {
    currentQIdx,
    userSelections,
    visitedQuestions,
    qSecs,
    isTimerStarted,
    quizVersion
  };
  localStorage.setItem(key, JSON.stringify(state));
}

function clearQuizState() {
  const key = getProgressKey();
  if (key) localStorage.removeItem(key);
}

window.addEventListener('beforeunload', (e) => {
  if (isTimerStarted) {
    saveQuizState();
    e.preventDefault();
    e.returnValue = "ਤੁਹਾਡਾ ਲਾਈਵ ਟੈਸਟ ਚੱਲ ਰਿਹਾ ਹੈ!";
  }
});

function initQuiz() {
  const box = document.getElementById("quizBox");
  if (!box) return;
  const u = currentUser();
  if (!u) {
    box.innerHTML = `
      <div style="text-align:center;padding:25px 15px;">
        <div style="font-size:3rem;margin-bottom:10px;">🔐</div>
        <h3>Login Required for Daily Test</h3>
        <p style="color:#666;margin:8px 0 16px;">ਟੈਸਟ ਦੇਣ ਲਈ ਪਹਿਲਾਂ ਲੌਗਇਨ ਕਰੋ।</p>
        <a class="btn btn-primary" href="login.html" style="background:#e8590c; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none;">🔐 Login / Register</a>
      </div>
    `;
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
            <p style="color:#666; margin:6px 0;">Student: <b>${escapeHtml(u.name)}</b> <span id="userStreakBadge"></span></p>
            <div class="quiz-score-num" style="font-size:2rem; font-weight:800; color:#e8590c; margin:10px 0;">${prev.score} / ${prev.total}</div>
            <p style="color:#2b8a3e;font-weight:700;margin-bottom:15px;">Marks: ${pct}%</p>
            <button class="btn btn-primary btn-block" onclick="generateCertificate('${escapeHtml(u.name)}', ${prev.score}, ${prev.total})" style="background:#1971c2; color:#fff; max-width:280px; margin:0 auto 8px; padding:10px; border-radius:6px; border:none; cursor:pointer; width:100%;">
              🎖️ Download Official Certificate
            </button>
            <button class="btn btn-block" onclick="shareCertificateWhatsApp('${escapeHtml(u.name)}', ${prev.score}, ${prev.total}, 'Daily Mock Test')" style="background:#25D366; color:#fff; max-width:280px; margin:0 auto 10px; padding:10px; border-radius:6px; border:none; cursor:pointer; font-weight:700; width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
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
          
          const savedStr = localStorage.getItem(getProgressKey());
          if (savedStr) {
            try {
              const saved = JSON.parse(savedStr);
              if (saved.quizVersion === quizVersion && saved.isTimerStarted) {
                currentQIdx = saved.currentQIdx || 0;
                userSelections = saved.userSelections || {};
                visitedQuestions = saved.visitedQuestions || {};
                qSecs = saved.qSecs || qSecs;
                isTimerStarted = true;
              } else {
                clearQuizState();
                resetQuizVars();
              }
            } catch(e) {
              clearQuizState();
              resetQuizVars();
            }
          } else {
            resetQuizVars();
          }

          if (isTimerStarted) {
            startTimer();
            renderCBTInterface();
          } else {
            showQuizStartScreen();
          }
        });
      }
    });

    loadBoard();
  });
}

function resetQuizVars() {
  currentQIdx = 0;
  userSelections = {};
  visitedQuestions = {};
  isTimerStarted = false;
  qSecs = quizTotalMins * 60;
}

function showQuizStartScreen() {
  const box = document.getElementById("quizBox");
  if (!box) return;
  const u = currentUser();

  box.innerHTML = `
    <div style="padding:20px 15px; text-align:center;">
      <div style="font-size:2.8rem; margin-bottom:8px;">📝</div>
      <h3 style="color:#e8590c; margin-bottom:6px;">Daily Punjab Exam Mock Test (CBT Online)</h3>
      <p style="color:#666; font-size:0.9rem; margin-bottom:16px;">ਵਿਦਿਆਰਥੀ: <b>${escapeHtml(u.name)}</b></p>
      
      <div style="background:#fff4e6; border:1.5px dashed #ffa94d; border-radius:10px; padding:14px; text-align:left; margin-bottom:20px;">
        <h4 style="color:#d9480f; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          🎯 Testbook CBT Mode ਨਿਯਮ:
        </h4>
        <ul style="font-size:0.88rem; color:#444; line-height:1.5; padding-left:18px; margin:0;">
          <li>ਕੁੱਲ ਸਵਾਲ: <b>${activeQuiz.length}</b> | ਕੁੱਲ ਸਮਾਂ: <b>${quizTotalMins} ਮਿੰਟ</b></li>
          <li><b>Question Palette:</b> ਤੁਸੀਂ ਕਿਸੇ ਵੀ ਸਵਾਲ ਨੰਬਰ 'ਤੇ ਸਿੱਧਾ ਕਲਿੱਕ ਕਰਕੇ ਉੱਥੇ ਜਾ ਸਕਦੇ ਹੋ।</li>
          <li>🟢 ਹਰਾ = Answered | 🔴 ਲਾਲ = Skipped | ⚪ ਸਲੇਟੀ = Not Visited</li>
          <li style="color:#c92a2a; font-weight:700; margin-top:4px;">ਸਮਾਂ ਪੂਰਾ ਹੋਣ 'ਤੇ ਟੈਸਟ ਆਪਣੇ ਆਪ Submit ਹੋ ਜਾਵੇਗਾ।</li>
        </ul>
      </div>

      <button class="btn btn-primary" onclick="startQuizNow()" style="background:#e8590c; color:#fff; font-size:1.05rem; font-weight:bold; padding:12px 30px; border-radius:8px; border:none; cursor:pointer; width:100%; max-width:280px; box-shadow:0 4px 12px rgba(232,89,12,0.25);">
        🚀 Start CBT Test Now
      </button>
    </div>
  `;
}

function startQuizNow() {
  isTimerStarted = true;
  currentQIdx = 0;
  userSelections = {};
  visitedQuestions = { 0: true };
  qSecs = quizTotalMins * 60;
  startTimer();
  renderCBTInterface();
}

function startTimer() {
  clearInterval(qTimer);
  qTimer = setInterval(() => {
    qSecs--;
    saveQuizState();
    const d = document.getElementById("cbtTimerDisplay");
    if (d) {
      const m = Math.floor(qSecs / 60), s = qSecs % 60;
      d.textContent = `⏱️ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    if (qSecs <= 0) { 
      clearInterval(qTimer); 
      alert("⏱️ ਸਮਾਂ ਸਮਾਪਤ! ਤੁਹਾਡਾ ਟੈਸਟ ਆਟੋ-ਸਬਮਿਟ ਹੋ ਰਿਹਾ ਹੈ।"); 
      finishCBTTest(); 
    }
  }, 1000);
}

/* Main CBT Render Engine */
function renderCBTInterface() {
  const box = document.getElementById("quizBox");
  if (!box || activeQuiz.length === 0) return;

  visitedQuestions[currentQIdx] = true;
  saveQuizState();

  const cur = activeQuiz[currentQIdx];
  const m = Math.floor(qSecs / 60), s = qSecs % 60;
  const curSelected = userSelections[currentQIdx];
  const isLast = (currentQIdx === activeQuiz.length - 1);

  // Count answered questions
  const answeredCount = Object.keys(userSelections).length;

  box.innerHTML = `
    <!-- Top CBT Status Bar -->
    <div style="background:#f8f9fa; border:1px solid #e9ecef; border-radius:10px; padding:10px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div>
        <span style="font-weight:800; font-size:1rem; color:#212529;">Question ${currentQIdx + 1}</span>
        <span style="color:#868e96; font-size:0.85rem;"> / ${activeQuiz.length}</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:0.8rem; background:#e7f5ff; color:#1971c2; font-weight:700; padding:4px 8px; border-radius:6px;">
          Solved: ${answeredCount}/${activeQuiz.length}
        </span>
        <span id="cbtTimerDisplay" style="background:#ffe8cc; color:#d9480f; padding:4px 10px; border-radius:12px; font-weight:800; font-size:0.95rem;">
          ⏱️ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}
        </span>
      </div>
    </div>

    <!-- Question Palette (1 to N circle buttons) -->
    <div style="background:#fff; border:1.5px solid #edf2f7; border-radius:10px; padding:12px; margin-bottom:14px;">
      <div style="font-size:0.8rem; font-weight:700; color:#6c757d; margin-bottom:8px; display:flex; justify-content:space-between;">
        <span>🎯 QUESTION PALETTE (ਸਿੱਧਾ ਸਵਾਲ 'ਤੇ ਜਾਓ)</span>
        <span style="font-size:0.75rem;">🟢 Done | 🔴 Skipped</span>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; max-height:100px; overflow-y:auto; padding:2px;">
        ${activeQuiz.map((_, i) => {
          const isAnswered = userSelections[i] !== undefined;
          const isVisited = visitedQuestions[i] === true;
          const isCurrent = i === currentQIdx;

          let bg = "#e9ecef";
          let color = "#495057";

          if (isAnswered) {
            bg = "#2b8a3e"; color = "#fff"; // Green
          } else if (isVisited) {
            bg = "#e03131"; color = "#fff"; // Red (Skipped)
          }

          const currentBorder = isCurrent ? "border: 2.5px solid #1971c2; transform: scale(1.1); font-weight:900;" : "border: 1px solid #ced4da;";

          return `
            <button onclick="cbtJumpTo(${i})" style="width:32px; height:32px; border-radius:6px; background:${bg}; color:${color}; font-size:0.82rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0; ${currentBorder}">
              ${i + 1}
            </button>
          `;
        }).join("")}
      </div>
    </div>

    <!-- Question Text -->
    <div style="background:#fff; border:1px solid #dee2e6; border-radius:10px; padding:16px; margin-bottom:14px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
      <div style="font-size:1.05rem; font-weight:700; color:#212529; line-height:1.5; margin-bottom:16px;">
        ${cur.q}
      </div>

      <!-- Options -->
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${cur.options.map((opt, optIdx) => {
          const isSelected = (curSelected === optIdx);
          const activeOptStyle = isSelected 
            ? "background:#e7f5ff; border:2px solid #1971c2; color:#1971c2; font-weight:700;" 
            : "background:#fff; border:1.5px solid #dee2e6; color:#333;";

          return `
            <button onclick="cbtSelectOption(${optIdx})" style="text-align:left; padding:12px 14px; border-radius:8px; font-size:0.95rem; cursor:pointer; transition:all 0.15s; ${activeOptStyle}">
              <span style="display:inline-block; width:22px; font-weight:bold;">${String.fromCharCode(65 + optIdx)})</span> ${opt}
            </button>
          `;
        }).join("")}
      </div>
    </div>

    <!-- CBT Action Controls (Prev, Clear, Save & Next) -->
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:14px;">
      <div style="display:flex; gap:6px;">
        <button onclick="cbtPrev()" ${currentQIdx === 0 ? 'disabled' : ''} class="btn btn-ghost" style="padding:10px 14px; font-weight:bold; font-size:0.88rem; border:1px solid #ced4da; background:#fff; border-radius:8px; cursor:pointer;">
          ⬅️ Prev
        </button>
        <button onclick="cbtClearResponse()" class="btn btn-ghost" style="padding:10px 12px; font-size:0.85rem; color:#e03131; border:1px solid #ffc9c9; background:#fff; border-radius:8px; cursor:pointer;">
          🗑️ Clear
        </button>
      </div>

      <div>
        ${!isLast ? `
          <button onclick="cbtNext()" class="btn btn-primary" style="background:#e8590c; color:#fff; font-weight:bold; padding:10px 22px; border-radius:8px; border:none; cursor:pointer; font-size:0.95rem; box-shadow:0 2px 6px rgba(232,89,12,0.3);">
            Save & Next ➡️
          </button>
        ` : `
          <button onclick="confirmCBTSubmit()" class="btn btn-primary" style="background:#2b8a3e; color:#fff; font-weight:bold; padding:10px 22px; border-radius:8px; border:none; cursor:pointer; font-size:0.95rem;">
            ✅ Final Submit
          </button>
        `}
      </div>
    </div>

    <!-- Separated Safe Submit Zone -->
    <div style="border-top:1.5px dashed #e9ecef; padding-top:12px; text-align:center;">
      <button onclick="confirmCBTSubmit()" style="background:none; border:1px solid #adb5bd; color:#495057; padding:7px 16px; border-radius:6px; font-size:0.82rem; cursor:pointer;">
        🏁 Submit Test Paper
      </button>
    </div>
  `;
}

function cbtSelectOption(optIdx) {
  userSelections[currentQIdx] = optIdx;
  saveQuizState();
  renderCBTInterface();
}

function cbtClearResponse() {
  delete userSelections[currentQIdx];
  saveQuizState();
  renderCBTInterface();
}

function cbtNext() {
  if (currentQIdx < activeQuiz.length - 1) {
    currentQIdx++;
    renderCBTInterface();
  }
}

function cbtPrev() {
  if (currentQIdx > 0) {
    currentQIdx--;
    renderCBTInterface();
  }
}

function cbtJumpTo(targetIdx) {
  if (targetIdx >= 0 && targetIdx < activeQuiz.length) {
    currentQIdx = targetIdx;
    renderCBTInterface();
  }
}

function confirmCBTSubmit() {
  const answered = Object.keys(userSelections).length;
  const left = activeQuiz.length - answered;

  let msg = `ਕੁੱਲ ਸਵਾਲ: ${activeQuiz.length}\nਹੱਲ ਕੀਤੇ: ${answered}\nਬਾਕੀ ਬਚੇ (Left): ${left}\n\n`;
  if (left > 0) {
    msg += `⚠️ ਚੇਤਾਵਨੀ: ਤੁਹਾਡੇ ਅਜੇ ${left} ਸਵਾਲ ਬਾਕੀ ਹਨ!\n\nਕੀ ਤੁਸੀਂ ਸੱਚਮੁੱਚ ਅਧੂਰਾ ਟੈਸਟ Submit ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?`;
  } else {
    msg += `ਕੀ ਤੁਸੀਂ ਟੈਸਟ Submit ਕਰਕੇ ਆਪਣਾ ਸਕੋਰ ਅਤੇ ਰੈਂਕ ਦੇਖਣਾ ਚਾਹੁੰਦੇ ਹੋ?`;
  }

  if (confirm(msg)) {
    finishCBTTest();
  }
}

function finishCBTTest() {
  clearInterval(qTimer);
  qTimer = null;
  isTimerStarted = false;
  clearQuizState();

  const u = currentUser();
  const box = document.getElementById("quizBox");
  if (!u || !box) return;

  box.innerHTML = `<div style="text-align:center; padding:30px;"><div style="font-size:2.5rem;">⏳</div><h3>ਟੈਸਟ ਦਾ ਨਤੀਜਾ ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ...</h3></div>`;

  // Build sequential array of answers matching API expectations (-1 if skipped)
  const finalAnswersArray = activeQuiz.map((_, i) => {
    return userSelections[i] !== undefined ? userSelections[i] : -1;
  });

  fetch("/api/submit-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: u.phone,
      name: u.name,
      userAnswers: finalAnswersArray,
      version: quizVersion
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const score = data.score;
      const total = data.total;
      const pct = data.percentage;

      box.innerHTML = `
        <div class="quiz-score-card" style="text-align:center; padding:25px;">
          <div style="font-size:3rem;">🎉</div>
          <h3>CBT Test Completed!</h3>
          <p style="color:#666; margin:6px 0;">Student: <b>${escapeHtml(u.name)}</b> <span id="userStreakBadge"></span></p>
          <div class="quiz-score-num" style="font-size:2.2rem; font-weight:800; color:#e8590c; margin:10px 0;">${score} / ${total}</div>
          <p style="color:#2b8a3e; font-weight:700; margin-bottom:16px;">Marks: ${pct}%</p>
          
          <div style="display:flex; flex-direction:column; gap:10px; max-width:280px; margin:0 auto;">
            <button class="btn btn-primary btn-block" onclick="generateCertificate('${escapeHtml(u.name)}', ${score}, ${total})" style="background:#1971c2; color:#fff; padding:11px; border-radius:8px; border:none; cursor:pointer; font-weight:bold; width:100%;">
              🎖️ Download Official Certificate
            </button>
            <button class="btn btn-block" onclick="shareCertificateWhatsApp('${escapeHtml(u.name)}', ${score}, ${total}, 'Daily Mock Test')" style="background:#25D366; color:#fff; padding:11px; border-radius:8px; border:none; cursor:pointer; font-weight:700; width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span>📲</span> Share Result on WhatsApp
            </button>
          </div>
        </div>
      `;
      updateDailyStreak(u.phone).then(streak => {
        const badgeEl = document.getElementById("userStreakBadge");
        if (badgeEl) badgeEl.innerHTML = renderStreakBadge(streak);
      });
      loadBoard();
    } else {
      box.innerHTML = `<div style="text-align:center; padding:25px; color:#e03131;"><h3>⚠️ ${data.message || 'Error submitting test'}</h3></div>`;
    }
  })
  .catch(() => {
    box.innerHTML = `<div style="text-align:center; padding:25px; color:#e03131;"><h3>⚠️ ਸਰਵਰ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਹੋ ਸਕਿਆ।</h3></div>`;
  });
}

/* Certificate Generator */
function generateCertificate(name, score, total) {
  const percentage = Math.round((score / total) * 100);
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 900, 600);

  ctx.strokeStyle = "#e8590c";
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, 860, 560);
  ctx.strokeStyle = "#ffd8a8";
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 836, 536);

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

  ctx.fillStyle = "#1971c2";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(name.toUpperCase(), 450, 250);

  ctx.fillStyle = "#333333";
  ctx.font = "20px sans-serif";
  ctx.fillText(`for scoring ${score} out of ${total} (${percentage}% Marks)`, 450, 310);
  ctx.fillText(`in the Punjab Competitive Exam Daily Mock Test Series`, 450, 345);

  const dateStr = new Date().toLocaleDateString('en-GB');
  ctx.fillStyle = "#777777";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Date: ${dateStr}  •  Status: Verified Participant`, 450, 420);

  ctx.fillStyle = "#e8590c";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("Aman Study Point Mansa", 450, 500);

  const link = document.createElement("a");
  link.download = `Certificate_${name.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/* Leaderboard */
function loadBoard() {
  const list = document.getElementById("leaderboardList");
  if (!list) return;

  db.ref("quizVersion").on("value", vSnap => {
    const curVer = vSnap.val() || "v1";

    db.ref("quizResults").on("value", snap => {
      const data = snap.val();
      if (!data) {
        list.innerHTML = "<p style='text-align:center;padding:10px;'>ਕੋਈ ਟੈਸਟ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।</p>";
        return;
      }

      const items = Object.values(data)
        .filter(r => r.version === curVer)
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
          <span class="rank-name">${escapeHtml(r.name)}</span>
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

  if (typeof switchTab === "function") {
    tL.onclick = () => switchTab("login");
    if (tR) tR.onclick = () => switchTab("reg");
  }

  if (session()) {
    location.replace("index.html");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderAccount();
  initLiveBooksConfig();
  renderBooksRealtime();
  loadPublicPYQs();
  initLogin();
  initQuiz();

  const m = document.getElementById("modal");
  if (m) m.onclick = e => { if (e.target === m) closeModal(); };
  const mc = document.getElementById("modalClose");
  if (mc) mc.onclick = closeModal;

  const sModal = document.getElementById("studentDashboardModal");
  if (sModal) {
    sModal.onclick = e => { if (e.target === sModal) closeStudentDashboard(); };
  }
});

/* Student Dashboard */
function openStudentTab(tab) {
  const u = currentUser();
  if (!u) {
    toast("ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਲੌਗਇਨ ਕਰੋ 🔐");
    setTimeout(() => location.href = "login.html", 600);
    return;
  }

  const modal = document.getElementById("studentDashboardModal");
  const bContent = document.getElementById("dashMyBooksContent");
  const aContent = document.getElementById("dashAnalyticsContent");
  const title = document.getElementById("dashModalTitle");

  if (!modal) return;

  if (tab === "books") {
    if (title) title.innerText = "🎒 My Unlocked Books";
    if (bContent) bContent.style.display = "block";
    if (aContent) aContent.style.display = "none";
    drawBooks();
  } else if (tab === "progress") {
    if (title) title.innerText = "📊 My Test Performance";
    if (aContent) aContent.style.display = "block";
    if (bContent) bContent.style.display = "none";
    loadUserAnalytics();
  }

  modal.style.display = "flex";
}

function closeStudentDashboard() {
  const modal = document.getElementById("studentDashboardModal");
  if (modal) modal.style.display = "none";
}

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

/* Google Sign-in */
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      const name = user.displayName || "Student";
      const identifier = user.phoneNumber || user.email.split('@')[0];

      db.ref("accounts/" + identifier).once("value", (snap) => {
        const isNewUser = !snap.exists();

        db.ref("accounts/" + identifier).update({
          name: name,
          phone: identifier,
          email: user.email,
          authType: "google"
        }).then(() => {
          setSession(identifier);
          localStorage.setItem("pp_name", name);

          if (isNewUser) {
            fetch("/api/notify-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: name,
                phone: identifier,
                email: user.email,
                authType: "Google Login"
              })
            }).catch(err => console.warn("Telegram alert error:", err));
          }

          toast("✅ Google Login Successful!");
          setTimeout(() => location.href = "index.html", 500);
        });
      });
    })
    .catch((error) => {
      alert("Google Sign-In Error: " + error.message);
    });
}

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
      const preloader = new Image();
      preloader.src = data.imgUrl;
      preloader.onload = () => {
        if (imgEl && modal) {
          imgEl.src = data.imgUrl;
          if (linkEl) {
            linkEl.href = data.clickUrl || "javascript:void(0)";
            if (!data.clickUrl) linkEl.style.cursor = "default";
          }
          modal.style.display = "flex";
        }
      };
      preloader.onerror = () => {
        if (modal) modal.style.display = "none";
      };
    } else {
      if (modal) modal.style.display = "none";
    }
  });
}

function toggleNavMenu() {
  const nav = document.getElementById("navLinks");
  if (nav) nav.classList.toggle("menu-open");
}

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

const cachedDay = localStorage.getItem("asp_cached_daily_day");
if (cachedDay) {
  try { renderDailyDay(JSON.parse(cachedDay)); } catch(e) {}
}

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
  if (btn) btn.style.display = 'none';
});

async function shareCertificateWhatsApp(studentName, score, total, examTitle) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 700;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1200, 700);

  ctx.lineWidth = 14;
  ctx.strokeStyle = "#e8590c";
  ctx.strokeRect(20, 20, 1160, 660);

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fab005";
  ctx.strokeRect(35, 35, 1130, 630);

  ctx.textAlign = "center";
  ctx.fillStyle = "#e8590c";
  ctx.font = "bold 44px -apple-system, sans-serif";
  ctx.fillText("📘 AMAN STUDY POINT", 600, 110);

  ctx.fillStyle = "#555555";
  ctx.font = "600 24px -apple-system, sans-serif";
  ctx.fillText("MOCK TEST PERFORMANCE CERTIFICATE", 600, 155);

  ctx.fillStyle = "#777777";
  ctx.font = "22px -apple-system, sans-serif";
  ctx.fillText("This is proudly presented to", 600, 230);

  ctx.fillStyle = "#1971c2";
  ctx.font = "bold 48px -apple-system, sans-serif";
  ctx.fillText(studentName || "Proud Aspirant", 600, 295);

  ctx.beginPath();
  ctx.moveTo(350, 315);
  ctx.lineTo(850, 315);
  ctx.strokeStyle = "#dee2e6";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#333333";
  ctx.font = "24px -apple-system, sans-serif";
  ctx.fillText(`for successfully attempting the "${examTitle || 'Punjab Govt Exams'}" Mock Test`, 600, 370);

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

  const today = new Date().toLocaleDateString('en-GB');
  ctx.textAlign = "left";
  ctx.fillStyle = "#777777";
  ctx.font = "20px -apple-system, sans-serif";
  ctx.fillText(`📅 Date: ${today}`, 70, 620);

  ctx.textAlign = "right";
  ctx.fillStyle = "#e8590c";
  ctx.font = "bold 20px -apple-system, sans-serif";
  ctx.fillText("Official Study Partner — Aman Study Point", 1130, 620);

  const shareText = `🎯 ਮੈਂ Aman Study Point 'ਤੇ Daily Mock Test ਦਿੱਤਾ!\n🏆 ਮੇਰਾ ਸਕੋਰ: ${score}/${total} (${percentage}%)\n\nਤੁਸੀਂ ਵੀ ਆਪਣੀ ਤਿਆਰੀ ਪਰਖੋ ਅਤੇ ਫ੍ਰੀ ਮੌਕ ਟੈਸਟ ਦਿਓ 👉 ${window.location.origin}`;

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
      const link = document.createElement("a");
      link.download = "My_MockTest_Certificate.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, "_blank");
    }
  }, "image/png");
}

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

/* 🔒 STRICT SECURITY: Single Device Login & Anti-Inspection */
function enforceSingleDeviceLogin() {
  const u = currentUser();
  if (!u) return;

  let localDeviceId = localStorage.getItem("asp_device_id");
  if (!localDeviceId) {
    localDeviceId = "dev_" + Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem("asp_device_id", localDeviceId);
  }

  if (typeof db !== "undefined") {
    const userRef = db.ref("users/" + u.phone + "/currentDeviceId");

    userRef.once("value", snap => {
      if (!snap.exists()) {
        userRef.set(localDeviceId);
      }
    });

    userRef.on("value", snap => {
      const activeDevice = snap.val();
      if (activeDevice && activeDevice !== localDeviceId) {
        alert("⚠️ ਤੁਹਾਡਾ ਖਾਤਾ ਕਿਸੇ ਹੋਰ ਡਿਵਾਈਸ 'ਤੇ ਖੁੱਲ੍ਹ ਚੁੱਕਾ ਹੈ। ਤੁਸੀਂ ਇੱਥੋਂ ਲੌਗਆਉਟ ਹੋ ਰਹੇ ਹੋ।");
        logout();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  enforceSingleDeviceLogin();
});

// Disable Right Click
document.addEventListener('contextmenu', e => e.preventDefault());

// Block F12, Inspect Element, Ctrl+U, Ctrl+S
document.addEventListener('keydown', e => {
  if (
    e.keyCode === 123 ||
    (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
    (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83))
  ) {
    e.preventDefault();
    return false;
  }
});

function syncPurchasedBooks() {
  const u = (typeof currentUser === "function") ? currentUser() : null;
  if (!u || !u.phone) return;

  if (typeof db !== "undefined") {
    db.ref("users/" + u.phone + "/books").on("value", snap => {
      const un = snap.val() || {};
      userUnlockedBookIds = Object.keys(un).filter(k => un[k] === true);
      if (typeof drawBooks === "function") {
        drawBooks();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  syncPurchasedBooks();
});

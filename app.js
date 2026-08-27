// @ts-nocheck
/* ================= Aman Study Point — App Code ================= */

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
  price: 99
};

const BOOKS = [
  { id: "punjabi",      emoji: "📖", title: "Punjabi Grammar",        sub: "SSC • Patwari • TET",        pdf: "https://drive.google.com/file/d/YOUR_DRIVE_ID/preview" },
  { id: "gk",           emoji: "🌏", title: "General Knowledge (GK)",   sub: "All Competitive Exams",      pdf: "https://drive.google.com/file/d/1-8L7de7HycNScAsbCfuziI6SlzgVmJQ1/preview" },
  { id: "maths",        emoji: "🔢", title: "Mathematics",            sub: "Banking • SSC",              pdf: "https://drive.google.com/file/d/YOUR_DRIVE_ID/preview" },
  { id: "reasoning",    emoji: "🧩", title: "Reasoning Ability",      sub: "SSC • Police • Banking",     pdf: "https://drive.google.com/file/d/YOUR_DRIVE_ID/preview" },
  { id: "history",      emoji: "🏛️", title: "History of Punjab",      sub: "General Preparation",        pdf: "https://drive.google.com/file/d/YOUR_DRIVE_ID/preview" },
  { id: "science",      emoji: "🔬", title: "General Science",        sub: "SSC • Patwari",              pdf: "https://drive.google.com/file/d/YOUR_DRIVE_ID/preview" },
  { id: "constitution", emoji: "⚖️", title: "Indian Constitution",    sub: "SSC • Police",               pdf: "https://drive.google.com/file/d/YOUR_DRIVE_ID/preview" },
  { id: "computer",     emoji: "💻", title: "Computer Awareness",     sub: "All Competitive Exams",      pdf: "https://drive.google.com/file/d/YOUR_DRIVE_ID/preview" }
];

/* ---------- Storage & Session ---------- */
const session = () => localStorage.getItem("pp_session");
const setSession = (p) => localStorage.setItem("pp_session", p);
const clearSession = () => localStorage.removeItem("pp_session");

function currentUser() {
  const phone = session();
  const name = localStorage.getItem("pp_name");
  return phone ? { phone, name } : null;
}

function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove("show"), 3000);
}

function logout() {
  clearSession();
  localStorage.removeItem("pp_name");
  toast("You have logged out ✓");
  setTimeout(() => location.href = "index.html", 600);
}

/* ---------- Realtime Book Renderer ---------- */
function renderAccount() {
  const btn = document.getElementById("accountBtn");
  if (!btn) return;
  const u = currentUser();
  const lo = document.getElementById("logoutLink");

  if (u) {
    btn.textContent = "👤 " + u.name;
    btn.href = "#myBooks";
    if (!lo) {
      const a = document.createElement("a");
      a.id = "logoutLink";
      a.className = "btn btn-ghost btn-small";
      a.href = "javascript:void(0)";
      a.onclick = logout;
      a.textContent = "Logout";
      document.getElementById("navLinks").appendChild(a);
    }
  } else {
    btn.textContent = "🔐 Login";
    btn.href = "login.html";
    if (lo) lo.remove();
  }
}

function renderBooksRealtime() {
  const u = currentUser();
  const grid = document.getElementById("bookGrid");
  if (!grid) return;

  if (!u) {
    drawBookCards([]);
    return;
  }

  db.ref("users/" + u.phone + "/books").on("value", (snapshot) => {
    const unlocked = snapshot.val() || {};
    const myBookIds = Object.keys(unlocked).filter(k => unlocked[k] === true);
    drawBookCards(myBookIds);
    drawMyBooks(myBookIds);
  });
}

function drawBookCards(myBookIds) {
  const grid = document.getElementById("bookGrid");
  if (!grid) return;

  grid.innerHTML = BOOKS.map(b => {
    const has = myBookIds.includes(b.id);
    return `<div class="book-card">
      ${has ? '<span class="pill">✅ Unlocked</span>' : ""}
      <div class="book-emoji">${b.emoji}</div>
      <div class="book-title">${b.title}</div>
      <div class="book-sub">${b.sub}</div>
      <div class="book-bottom">
        <div class="price">₹${INSTITUTE.price} <small>only</small></div>
        ${has
          ? `<a class="btn btn-read btn-small" href="reader.html?id=${b.id}">📖 Read</a>`
          : `<button class="btn btn-buy btn-small" onclick="openBuy('${b.id}')">🛒 Buy</button>`}
      </div>
    </div>`;
  }).join("");
}

function drawMyBooks(myBookIds) {
  const sec = document.getElementById("myBooks");
  if (!sec) return;
  if (myBookIds.length === 0) { sec.hidden = true; return; }
  sec.hidden = false;

  document.getElementById("myBooksGrid").innerHTML = myBookIds.map(id => {
    const b = BOOKS.find(x => x.id === id);
    if (!b) return "";
    return `<div class="book-card">
      <span class="pill">🎒 Your Book</span>
      <div class="book-emoji">${b.emoji}</div>
      <div class="book-title">${b.title}</div>
      <div class="book-sub">${b.sub}</div>
      <div class="book-bottom">
        <a class="btn btn-read btn-small" href="reader.html?id=${b.id}">📖 Read</a>
      </div>
    </div>`;
  }).join("");
}

/* ---------- Purchase & Request Approval ---------- */
function openBuy(id) {
  const u = currentUser();
  if (!u) {
    toast("Please login first 👇");
    setTimeout(() => location.href = "login.html", 900);
    return;
  }
  const b = BOOKS.find(x => x.id === id);
  const waMsg = encodeURIComponent(`Hello,\nI sent ₹${INSTITUTE.price} for "${b.title}".\nName: ${u.name}\nPhone: ${u.phone}\nPlease approve my book.`);
  const waLink = `https://api.whatsapp.com/send?phone=91${INSTITUTE.whatsapp}&text=${waMsg}`;

  document.getElementById("modalBody").innerHTML = `
    <div class="pay-book">${b.emoji} ${b.title}</div>
    <div class="pay-price">Price: ₹${INSTITUTE.price}</div>
    
    <div style="text-align:center; margin:10px 0;">
      <img src="https://i.postimg.cc/FsFy1W75/qr.png" alt="QR Scanner" style="max-width:160px; width:100%; border-radius:10px; border:2px solid #ffd8a8; display:block; margin:0 auto;">
      <small style="color:#666; display:block; margin-top:4px;">UPI: <b>${INSTITUTE.upi}</b></small>
    </div>

    <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
      <a class="btn btn-primary btn-block" href="${waLink}" target="_blank">
        📲 Send Screenshot on WhatsApp
      </a>
      <button class="btn btn-ghost btn-block" onclick="submitPaymentRequest('${id}', '${b.title}')" style="background:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9;">
        ✅ I Have Paid — Submit for Approval
      </button>
    </div>`;

  const m = document.getElementById("modal");
  m.hidden = false;
  m.style.display = "flex";
}

function submitPaymentRequest(bookId, bookTitle) {
  const u = currentUser();
  const reqId = u.phone + "_" + bookId;

  db.ref("requests/" + reqId).set({
    reqId: reqId,
    phone: u.phone,
    name: u.name,
    bookId: bookId,
    bookTitle: bookTitle,
    time: new Date().toLocaleString(),
    status: "pending"
  }).then(() => {
    closeModal();
    toast("✅ Request Sent! Book will unlock automatically once approved.");
  }).catch((err) => {
    toast("Error: " + err.message);
  });
}

function closeModal() {
  const m = document.getElementById("modal");
  if (m) {
    m.hidden = true;
    m.style.display = "none";
  }
}

/* ---------- Login, Registration & Forgot Password ---------- */
function showForgotForm() {
  document.getElementById("formLogin").style.display = "none";
  document.getElementById("formReg").style.display = "none";
  document.getElementById("authTabs").style.display = "none";
  document.getElementById("formForgot").style.display = "block";
  document.getElementById("formSubtitle").textContent = "Reset your account password";
  document.getElementById("loginError").style.display = "none";
}

function cancelForgot() {
  document.getElementById("formForgot").style.display = "none";
  document.getElementById("authTabs").style.display = "flex";
  document.getElementById("formLogin").style.display = "block";
  document.getElementById("formSubtitle").textContent = "Log in to your account or create a new one";
  document.getElementById("loginError").style.display = "none";
}

function sendForgotWhatsApp() {
  const phone = document.getElementById("forgotPhone").value.trim();
  const err = document.getElementById("loginError");

  if (!/^[6-9]\d{9}$/.test(phone)) {
    err.textContent = "⚠️ Please enter a valid 10-digit registered number";
    err.style.display = "block";
    return;
  }

  db.ref("accounts/" + phone).get().then(snap => {
    if (!snap.exists()) {
      err.textContent = "⚠️ This number is not registered. Please create an account.";
      err.style.display = "block";
      return;
    }
    const u = snap.val();
    const msg = encodeURIComponent(`Hello Sir,\nI forgot my password for Aman Study Point.\nName: ${u.name}\nRegistered Mobile: ${phone}\nPlease help me reset my password.`);
    window.open(`https://api.whatsapp.com/send?phone=91${INSTITUTE.whatsapp}&text=${msg}`, '_blank');
  });
}

function initLogin() {
  const tabLogin = document.getElementById("tabLogin");
  if (!tabLogin) return;
  const tabReg = document.getElementById("tabReg");
  const formLogin = document.getElementById("formLogin");
  const formReg = document.getElementById("formReg");
  const err = document.getElementById("loginError");

  function show(which) {
    tabLogin.classList.toggle("active", which === "login");
    tabReg.classList.toggle("active", which === "reg");
    formLogin.style.display = which === "login" ? "block" : "none";
    formReg.style.display = which === "reg" ? "block" : "none";
    document.getElementById("formForgot").style.display = "none";
    err.style.display = "none";
  }
  tabLogin.onclick = () => show("login");
  tabReg.onclick = () => show("reg");

  if (session()) { location.replace("index.html"); return; }

  // ਸਿੱਧਾ ਨਵਾਂ ਖਾਤਾ ਬਣਾਓ
  formReg.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("regName").value.trim();
    const phone = document.getElementById("regPhone").value.trim();
    const pass = document.getElementById("regPass").value;

    if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone) || pass.length < 4) {
      err.textContent = "⚠️ Please fill all fields correctly (10-digit mobile, 4+ char password)";
      err.style.display = "block";
      return;
    }

    db.ref("accounts/" + phone).get().then(snap => {
      if (snap.exists()) {
        err.textContent = "⚠️ Number already registered. Please Login.";
        err.style.display = "block";
      } else {
        db.ref("accounts/" + phone).set({ name, phone, pass }).then(() => {
          setSession(phone);
          localStorage.setItem("pp_name", name);
          toast("🎉 Welcome, " + name);
          setTimeout(() => location.href = "index.html", 700);
        });
      }
    });
  });

  // ਲੌਗਇਨ ਹੈਂਡਲਰ
  formLogin.addEventListener("submit", e => {
    e.preventDefault();
    const phone = document.getElementById("loginPhone").value.trim();
    const pass = document.getElementById("loginPass").value;

    db.ref("accounts/" + phone).get().then(snap => {
      if (snap.exists() && snap.val().pass === pass) {
        setSession(phone);
        localStorage.setItem("pp_name", snap.val().name);
        toast("👋 Welcome back, " + snap.val().name);
        setTimeout(() => location.href = "index.html", 600);
      } else {
        err.textContent = "⚠️ Invalid Mobile Number or Password";
        err.style.display = "block";
      }
    });
  });
}

/* ---------- PDF Reader Protection ---------- */
function initReader() {
  const body = document.getElementById("readerBody");
  if (!body) return;
  const id = new URLSearchParams(location.search).get("id");
  const b = BOOKS.find(x => x.id === id);
  const u = currentUser();

  if (!u) {
    body.innerHTML = `<div class="reader-note" style="margin-top:60px">
      ❌ Please login to view your books.<br><br>
      <a class="btn btn-primary" href="login.html">🔐 Login</a></div>`;
    return;
  }

  db.ref("users/" + u.phone + "/books/" + id).get().then(snap => {
    if (snap.val() === true) {
      document.getElementById("readerHead").innerHTML = `
        <div class="emoji">${b.emoji}</div>
        <h1>${b.title}</h1>
        <div class="meta">${b.sub} • Online Reading Only</div>`;
        
      body.innerHTML = `
        <div class="pdf-container" style="position:relative; width:100%; height:80vh; border:2px solid var(--line); border-radius:16px; overflow:hidden; background:#fff;">
          
          <div style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10; display:flex; flex-direction:column; justify-content:space-around; align-items:center; opacity:0.18; transform:rotate(-25deg); user-select:none;">
            <h2 style="color:#000;">${u.name} — ${u.phone}</h2>
            <h2 style="color:#000;">${u.name} — ${u.phone}</h2>
            <h2 style="color:#000;">${u.name} — ${u.phone}</h2>
          </div>

          <iframe src="${b.pdf || ''}" style="width:100%; height:100%; border:none;"></iframe>
        </div>`;
    } else {
      body.innerHTML = `<div class="reader-note" style="margin-top:60px">
        🔒 This book is locked. Approval from Admin is required.<br><br>
        <a class="btn btn-primary" href="index.html#books">📚 View Books</a></div>`;
    }
  });
}

/* ---------- Start ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderAccount();
  renderBooksRealtime();
  initReader();
  initLogin();
  const m = document.getElementById("modal");
  if (m) m.addEventListener("click", e => { if (e.target === m) closeModal(); });
  const mc = document.getElementById("modalClose");
  if (mc) mc.addEventListener("click", closeModal);
});



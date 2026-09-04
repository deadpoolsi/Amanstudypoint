// @ts-nocheck
/* ============================================================
   Aman Study Point — SECURE Create Order (api/create-order.js)
   ------------------------------------------------------------
   🔒 SECURITY FIX:
   Pehle client (browser) khud amount bhejda si. Koi vi Developer
   Tools vich ₹399 di kitab da order ₹1 da bana sakda si.
   Hun server khud Firebase siteSettings ton asli price labhda hai
   te client da amount POORI TARAH IGNORE karda hai.
   ============================================================ */

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  "https://aman-study-point-default-rtdb.firebaseio.com";

// Plan di miaad (milliseconds)
const PASS_DURATIONS = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  sixMonths: 180 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

const VALID_PLANS = Object.keys(PASS_DURATIONS);

// "combo" pass da sab kitaaban da unlock honda hai
const ALL_BOOK_IDS = [
  "punjabi", "gk", "maths", "reasoning",
  "history", "science", "constitution", "computer",
];

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function sanitizeKey(k) {
  // Firebase key characters check (phone ya email)
  return typeof k === "string" && k.trim().length >= 3 &&
    !/[\/#$\[\]]/.test(k);
}

/* Firebase siteSettings (public read) ton live prices lai aao */
async function fetchSiteSettings() {
  const res = await fetch(`${FIREBASE_DB_URL}/siteSettings.json`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Firebase read failed: " + res.status);
  return res.json();
}

/* Server-side item da asli price + coupon nalo calculate karo */
function computeItemPrice(type, item, settings) {
  // ---- PASS (test series membership) ----
  if (type === "pass") {
    const { planId, category } = item;
    if (!VALID_PLANS.includes(planId)) return { error: "ਗ਼ਲਤ ਪਲਾਨ ਚੁਣਿਆ ਗਿਆ ਹੈ।" };
    if (!category || !/^[a-z0-9]+$/i.test(category)) return { error: "ਗ਼ਲਤ ਕੈਟਾਗਰੀ।" };
    const catPricing = settings && settings.passPricing && settings.passPricing[category];
    if (!catPricing) return { error: "ਇਹ ਕੈਟਾਗਰੀ ਮੌਜੂਦ ਨਹੀਂ ਹੈ।" };
    const basePrice = Number(catPricing[planId]);
    if (!basePrice || basePrice < 1) return { error: "ਇਸ ਪਲਾਨ ਦੀ ਕੀਮਤ ਸੈੱਟ ਨਹੀਂ ਹੈ।" };

    // Coupon validate (server-side)
    let discountPct = 0;
    const coupon = catPricing.coupon;
    if (item.couponCode && coupon && coupon.active &&
        String(coupon.code).toUpperCase() === String(item.couponCode).toUpperCase()) {
      const limit = parseInt(coupon.limit) || 0;
      const used = parseInt(coupon.usedCount) || 0;
      if (limit > 0 && used >= limit) return { error: "ਕੂਪਨ ਦੀ ਲਿਮਿਟ ਪੂਰੀ ਹੋ ਚੁੱਕੀ ਹੈ।" };
      discountPct = Math.min(100, Math.max(0, parseInt(coupon.discount) || 0));
    }
    const finalRupees = Math.max(1, Math.round(basePrice - (basePrice * discountPct) / 100));
    return { amountPaise: finalRupees * 100, basePrice, discountPct };
  }

  // ---- BOOK (ya combo) ----
  const bookId = item.bookId;
  if (!bookId || !/^[a-z0-9_-]+$/i.test(bookId)) return { error: "ਗ਼ਲਤ ਕਿਤਾਬ ID।" };
  const cfg = settings && settings.booksConfig && settings.booksConfig[bookId];
  if (!cfg) return { error: "ਇਹ ਕਿਤਾਬ ਮੌਜੂਦ ਨਹੀਂ ਹੈ।" };
  if (cfg.status === "unavailable") return { error: "ਇਹ ਕਿਤਾਬ ਹਾਲੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।" };
  const basePrice = Number(cfg.price);
  if (!basePrice || basePrice < 1) return { error: "ਕਿਤਾਬ ਦੀ ਕੀਮਤ ਸੈੱਟ ਨਹੀਂ ਹੈ।" };

  let discountPct = 0;
  const coupon = settings && settings.coupon;
  if (item.couponCode && coupon && coupon.active &&
      String(coupon.code).toUpperCase() === String(item.couponCode).toUpperCase()) {
    discountPct = Math.min(100, Math.max(0, parseInt(coupon.discount) || 0));
  }
  const finalRupees = Math.max(1, Math.round(basePrice - (basePrice * discountPct) / 100));
  return { amountPaise: finalRupees * 100, basePrice, discountPct };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return fail(res, 405, "ਸਿਰਫ਼ POST allowed ਹੈ।");
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET)
    return fail(res, 500, "Server keys missing (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return fail(res, 400, "ਗ਼ਲਤ request format।");
  }

  const type = body.type === "pass" ? "pass" : "book";
  const item = {
    bookId: String(body.bookId || "").trim(),
    planId: String(body.planId || "").trim(),
    category: String(body.category || "").trim(),
    couponCode: String(body.couponCode || "").trim().toUpperCase(),
  };

  // Phone optional hai (order banauṇ lai), par jehde aiha kar layo — uhnu sanitize karo
  if (body.phone && !sanitizeKey(String(body.phone).trim()))
    return fail(res, 400, "ਗ਼ਲਤ phone format।");

  try {
    // 1) ASLI PRICE sirf server-side Firebase ton (client amount ignore!)
    const settings = await fetchSiteSettings();
    const pricing = computeItemPrice(type, item, settings);
    if (pricing.error) return fail(res, 400, pricing.error);

    // 2) Razorpay vich order banao (server-computed amount naal)
    const authHeader =
      "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

    const receipt = "ASP_" + Date.now();
    // 📌 NOTES = server-attested receipt (verify-payment vich check hoga)
    const notes = {
      item_type: type,
      expected_amount: String(pricing.amountPaise),
      base_price: String(pricing.basePrice),
      discount_pct: String(pricing.discountPct),
      coupon_code: item.couponCode || "",
    };
    if (type === "pass") {
      notes.plan_id = item.planId;
      notes.category = item.category;
    } else {
      notes.book_id = item.bookId;
    }

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: pricing.amountPaise, // 💰 sirf server di keemti amount
        currency: "INR",
        receipt,
        notes,
      }),
    });

    const order = await orderRes.json();
    if (!orderRes.ok || !order.id) {
      console.error("Razorpay order error:", order);
      return fail(res, 502, order.error?.description || "Razorpay ਆਰਡਰ ਨਹੀਂ ਬਣ ਸਕਿਆ।");
    }

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("create-order crash:", err);
    return fail(res, 500, "ਸਰਵਰ ਸਮੱਸਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।");
  }
};

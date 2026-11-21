/* ==========================================================================
   Body Scent — script.js (shared across all pages)
   - product.html : load products.json, render cards, mood filter
   - order.html   : prefill #items / #total from URL, submit to Apps Script
   - admin.html   : load orders from published Google Sheet CSV
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     Config
     ------------------------------------------------------------------------ */
  var PRODUCTS_URL = "products.json";
  var ORDER_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbz0n-Val3SgViZlEfZLtIwa519lTNJVbkTDp9NqrX0vVbr6yfxBI75n61wTkeg5WAfg/exec";
  var ORDERS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTMs5kI0OEhxP401wLK1le_kaeQJ3j6oz4vtGnoGlR10V4Gsz971lxbn9QmGRhnK98_qajhJBxGiFOf/pub?gid=0&single=true&output=csv";

  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  var MOOD_LABELS = {
    fresh: "Fresh",
    sweet: "Sweet",
    confident: "Confident",
    romance: "Romance"
  };

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function formatPrice(value) {
    var n = Number(value);
    return isNaN(n) ? String(value) : n.toLocaleString("th-TH");
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /* ========================================================================
     1) product.html
     ======================================================================== */
  var allProducts = [];

  function initProductPage() {
    var filterBar = $("#filter-bar");
    var productList = $("#product-list");
    if (!filterBar || !productList) return;

    var validMoods = MOODS.map(function (m) { return m.key; });
    var paramMood = (getParam("mood") || "all").toLowerCase();
    var activeMood = validMoods.indexOf(paramMood) !== -1 ? paramMood : "all";

    renderFilterBar(filterBar, productList, activeMood);

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        allProducts = Array.isArray(data) ? data : [];
        renderProducts(productList, activeMood);
      })
      .catch(function (error) {
        console.error(error);
        productList.innerHTML = "";
        var msg = document.createElement("p");
        msg.className = "text-center text-mute";
        msg.textContent = "ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง";
        productList.appendChild(msg);
      });
  }

  function renderFilterBar(filterBar, productList, activeMood) {
    filterBar.innerHTML = "";
    filterBar.classList.add("filters");

    MOODS.forEach(function (mood) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-btn" + (mood.key === activeMood ? " is-active" : "");
      btn.setAttribute("data-mood", mood.key);

      if (mood.key !== "all") {
        var dot = document.createElement("span");
        dot.className = "mood-dot mood-dot--" + mood.key;
        btn.appendChild(dot);
      }

      btn.appendChild(document.createTextNode(mood.label));

      btn.addEventListener("click", function () {
        setActiveFilter(filterBar, mood.key);
        renderProducts(productList, mood.key);
        updateMoodInUrl(mood.key);
      });

      filterBar.appendChild(btn);
    });
  }

  function setActiveFilter(filterBar, moodKey) {
    var buttons = filterBar.querySelectorAll(".filter-btn");
    Array.prototype.forEach.call(buttons, function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-mood") === moodKey);
    });
  }

  function updateMoodInUrl(moodKey) {
    if (!window.history || !window.history.replaceState) return;
    var url = new URL(window.location.href);
    if (moodKey === "all") {
      url.searchParams.delete("mood");
    } else {
      url.searchParams.set("mood", moodKey);
    }
    window.history.replaceState(null, "", url.toString());
  }

  function renderProducts(productList, moodKey) {
    var items = allProducts.filter(function (p) {
      return moodKey === "all" || p.mood === moodKey;
    });

    productList.innerHTML = "";
    productList.classList.add("product-grid");

    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "text-center text-mute";
      empty.textContent = "ไม่พบสินค้าในหมวดนี้";
      productList.appendChild(empty);
      return;
    }

    items.forEach(function (p) {
      productList.appendChild(createProductCard(p));
    });
  }

  function createProductCard(p) {
    var card = document.createElement("article");
    card.className = "product-card";
    card.setAttribute("data-mood", p.mood);

    /* image */
    var media = document.createElement("div");
    media.className = "product-card__media";
    var img = document.createElement("img");
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";
    media.appendChild(img);
    card.appendChild(media);

    /* body */
    var body = document.createElement("div");
    body.className = "product-card__body";

    var moodLabel = document.createElement("span");
    moodLabel.className = "mood-label";
    moodLabel.textContent = MOOD_LABELS[p.mood] || p.mood;
    body.appendChild(moodLabel);

    var title = document.createElement("h3");
    title.className = "product-card__title";
    title.textContent = p.name;
    body.appendChild(title);

    if (p.size) {
      var meta = document.createElement("p");
      meta.className = "product-card__meta";
      meta.textContent = p.size;
      body.appendChild(meta);
    }

    /* footer: price + order button */
    var footer = document.createElement("div");
    footer.className = "product-card__footer";

    var price = document.createElement("span");
    price.className = "price";
    price.textContent = formatPrice(p.price);
    var unit = document.createElement("small");
    unit.textContent = "บาท";
    price.appendChild(unit);
    footer.appendChild(price);

    var order = document.createElement("a");
    order.className = "btn btn--small";
    order.textContent = "สั่งซื้อ";
    order.href =
      "order.html?item=" + encodeURIComponent(buildItemLabel(p)) +
      "&price=" + encodeURIComponent(p.price);
    footer.appendChild(order);

    body.appendChild(footer);
    card.appendChild(body);

    return card;
  }

  /* Name already contains the size words (เล็ก/ใหญ่); add the ml size for clarity */
  function buildItemLabel(p) {
    return p.size ? p.name + " " + p.size : p.name;
  }

  /* ========================================================================
     2) order.html
     ======================================================================== */
  function initOrderPage() {
    var form = $("#orderForm");
    if (!form) return;

    var itemsInput = $("#items");
    var totalInput = $("#total");

    var itemParam = getParam("item");
    var priceParam = getParam("price");

    if (itemsInput && itemParam) itemsInput.value = itemParam;
    if (totalInput && priceParam) totalInput.value = priceParam;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      var payload = {
        customerName: $("#customerName").value.trim(),
        contact: $("#contact").value.trim(),
        items: $("#items").value.trim(),
        total: $("#total").value.trim(),
        note: $("#note") ? $("#note").value.trim() : ""
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload)
      })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* ========================================================================
     3) admin.html
     ======================================================================== */

  /* Minimal CSV parser: handles quoted fields, escaped quotes ("") and
     line breaks inside quotes. Returns an array of rows (arrays of strings). */
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;
    var i = 0;

    // strip BOM
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    while (i < text.length) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (ch === "\r" || ch === "\n") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
      } else {
        field += ch;
        i++;
      }
    }

    // last field / row
    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }

    // drop completely empty rows
    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ""; });
    });
  }

  function initAdminPage() {
    var tbody = $("#ordersTable tbody");
    if (!tbody) return;

    setTableMessage(tbody, "กำลังโหลดข้อมูล...");

    // cache-bust so a freshly published sheet isn't served stale
    var sep = ORDERS_CSV_URL.indexOf("?") === -1 ? "?" : "&";
    var url = ORDERS_CSV_URL + sep + "_=" + Date.now();

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        rows.shift(); // header row

        // newest first (sheet rows are appended in time order)
        rows.reverse();

        renderOrders(tbody, rows);
      })
      .catch(function (error) {
        console.error(error);
        setTableMessage(tbody, "ไม่สามารถโหลดข้อมูลได้ กรุณารีเฟรชหน้าอีกครั้ง");
      });
  }

  function setTableMessage(tbody, message) {
    tbody.innerHTML = "";
    var tr = document.createElement("tr");
    var td = document.createElement("td");
    td.colSpan = 6;
    td.className = "text-center text-mute";
    td.textContent = message;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function renderOrders(tbody, rows) {
    tbody.innerHTML = "";

    if (!rows.length) {
      setTableMessage(tbody, "ยังไม่มีรายการสั่งซื้อ");
      return;
    }

    rows.forEach(function (r) {
      var tr = document.createElement("tr");

      // columns: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
      for (var c = 0; c < 6; c++) {
        var td = document.createElement("td");
        td.textContent = r[c] !== undefined ? r[c] : "";
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });
  }

  /* ========================================================================
     Boot
     ======================================================================== */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ==========================================================================
   JECILLÉ — Bag, wishlist & demo checkout
   Client-side state only. Persists to localStorage; no data leaves the page.
   ========================================================================== */
(function () {
  "use strict";

  const J = window.JECILLE;
  if (!J) return;

  const CART_KEY = "jecille.bag.v1";
  const WISH_KEY = "jecille.wishlist.v1";
  const format = J.formatPrice;

  const canStore = (() => {
    try {
      const probe = "__jecille__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  })();

  function read(key, fallback) {
    if (!canStore) return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function write(key, value) {
    if (!canStore) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* Storage can be full or disabled; the session still works. */
    }
  }

  let cart = read(CART_KEY, []).filter((item) => item && item.key && item.name && Number(item.qty) > 0);
  let wishlist = read(WISH_KEY, []).filter((id) => typeof id === "string" && J.getProduct(id));

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hash(text) {
    let h = 5381;
    for (let i = 0; i < text.length; i += 1) {
      h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    }
    return "ln-" + h.toString(36);
  }

  function toQuantity(value) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 1;
  }

  function subtotal() {
    return cart.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.qty), 0);
  }

  function count() {
    return cart.reduce((sum, item) => sum + Number(item.qty), 0);
  }

  function wishCount() {
    return wishlist.length;
  }

  /* ------------------------------------------------------------------ */
  /*  Toast                                                              */
  /* ------------------------------------------------------------------ */
  const toastRegion = document.getElementById("toast-region");

  function toast(title, message, type) {
    if (!toastRegion) return;
    const node = document.createElement("div");
    node.className = "toast" + (type === "wish" ? " toast--wish" : "");
    node.innerHTML =
      '<svg class="icon" aria-hidden="true"><use href="#' +
      (type === "wish" ? "i-heart" : "i-check") +
      '"></use></svg><div><strong>' +
      esc(title) +
      "</strong>" +
      (message ? esc(message) : "") +
      "</div>";
    toastRegion.appendChild(node);

    const dismiss = () => {
      if (node.classList.contains("is-leaving")) return;
      node.classList.add("is-leaving");
      window.setTimeout(() => node.remove(), 380);
    };
    const timer = window.setTimeout(dismiss, 3400);
    node.addEventListener("click", () => {
      window.clearTimeout(timer);
      dismiss();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Bag mutations                                                      */
  /* ------------------------------------------------------------------ */
  function commit(type) {
    write(CART_KEY, cart);
    render();
    document.dispatchEvent(
      new CustomEvent("jecille:bag", { detail: { type: type || "change", items: cart.slice() } })
    );
  }

  function add(item, options) {
    const opts = options || {};
    const qty = toQuantity(opts.qty || item.qty || 1);
    const signature = [
      item.productId || "",
      item.name || "",
      item.variantLabel || "",
      item.wrappingLabel || "",
      item.complementsLabel || "",
      item.message || "",
    ].join("|");

    const existing = cart.find((line) => line.signature === signature);
    if (existing) {
      existing.qty = toQuantity(existing.qty + qty);
      commit("qty");
      const notify = opts.notify !== false;
      if (notify) {
        toast(item.name + " updated", "Your bag now holds " + existing.qty + ".");
      }
      return existing;
    }

    const line = {
      key: hash(signature + "|" + Date.now().toString(36)),
      signature: signature,
      productId: item.productId || "",
      name: item.name,
      img: item.img || "",
      categoryLabel: item.categoryLabel || "The Atelier",
      botanical: item.botanical || "",
      variantLabel: item.variantLabel || "",
      wrappingLabel: item.wrappingLabel || "",
      complementsLabel: item.complementsLabel || "",
      message: item.message || "",
      qty: qty,
      unitPrice: Math.max(0, Math.round(Number(item.unitPrice) || 0)),
      bespoke: !!item.bespoke,
      addedAt: Date.now(),
    };
    cart.push(line);
    commit("add");
    if (opts.notify !== false) {
      toast(item.name + " added to your bag", "Wrapped by hand, carded with care.");
    }
    return line;
  }

  function addProduct(product, options) {
    if (!product) return null;
    const opts = options || {};
    const variants = product.variants || [];
    const variant = variants.find((v) => v.key === opts.variantKey) || variants[0];
    if (!variant) return null;

    const complements = (opts.complements || [])
      .map((key) => J.complements.find((c) => c.key === key))
      .filter(Boolean);
    const complementLabel = complements.length ? complements.map((c) => c.name).join(", ") : "None";

    let wrapping = null;
    if (product.wrapping) {
      wrapping =
        J.wrapping.find((w) => w.key === opts.wrappingKey) ||
        J.wrapping.find((w) => w.key === J.defaults.wrapping) ||
        J.wrapping[0];
    }

    const unitPrice =
      variant.price + (wrapping ? wrapping.price : 0) + complements.reduce((sum, c) => sum + c.price, 0);

    const variantLabel = variant.label + (variant.note ? " · " + variant.note : "");

    return add(
      {
        productId: product.id,
        name: product.name,
        img: product.img,
        categoryLabel: product.categoryLabel,
        botanical: product.botanical,
        variantLabel: variantLabel,
        wrappingLabel: wrapping ? wrapping.name : "",
        complementsLabel: complementLabel,
        message: opts.message || "",
        unitPrice: unitPrice,
        bespoke: false,
      },
      { qty: opts.qty, notify: opts.notify }
    );
  }

  function addBespoke(payload, options) {
    if (!payload) return null;
    const opts = options || {};
    const complements = payload.complements || [];
    return add(
      {
        productId: "bespoke",
        name: payload.name || "Bespoke Bouquet",
        img: payload.img || "img/lilies/stargazer-bouquet.jpg",
        categoryLabel: "Bespoke Atelier",
        botanical: payload.botanical || "Composed to order",
        variantLabel: payload.variantLabel || "",
        wrappingLabel: payload.wrappingLabel || "",
        complementsLabel: complements.length ? complements.map((c) => c.name).join(", ") : "None",
        message: payload.message || "",
        unitPrice: payload.unitPrice,
        bespoke: true,
      },
      { qty: opts.qty, notify: opts.notify }
    );
  }

  function remove(key) {
    const line = cart.find((item) => item.key === key);
    cart = cart.filter((item) => item.key !== key);
    commit("remove");
    if (line) toast(line.name + " removed", "Your bag has been updated.");
  }

  function setQty(key, qty) {
    const line = cart.find((item) => item.key === key);
    if (!line) return;
    const next = Math.floor(Number(qty));
    if (!Number.isFinite(next) || next <= 0) {
      remove(key);
      return;
    }
    line.qty = Math.min(next, 20);
    commit("qty");
  }

  function clear() {
    cart = [];
    commit("clear");
  }

  /* ------------------------------------------------------------------ */
  /*  Wishlist                                                           */
  /* ------------------------------------------------------------------ */
  function hasWish(id) {
    return wishlist.indexOf(id) !== -1;
  }

  function toggleWish(id, options) {
    const product = J.getProduct(id);
    if (!product) return false;
    const opts = options || {};
    let added;
    if (hasWish(id)) {
      wishlist = wishlist.filter((item) => item !== id);
      added = false;
      if (opts.notify !== false) toast(product.name + " removed", "Taken off your wishlist.");
    } else {
      wishlist.push(id);
      added = true;
      if (opts.notify !== false) toast(product.name + " saved", "Kept in your wishlist for later.", "wish");
    }
    write(WISH_KEY, wishlist);
    render();
    document.dispatchEvent(
      new CustomEvent("jecille:wishlist", { detail: { type: added ? "add" : "remove", id: id } })
    );
    return added;
  }

  function removeWish(id) {
    if (!hasWish(id)) return;
    wishlist = wishlist.filter((item) => item !== id);
    write(WISH_KEY, wishlist);
    render();
    document.dispatchEvent(new CustomEvent("jecille:wishlist", { detail: { type: "remove", id: id } }));
  }

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                          */
  /* ------------------------------------------------------------------ */
  const cartItemsEl = document.getElementById("cart-items");
  const cartEmptyEl = document.getElementById("cart-empty");
  const cartFooterEl = document.getElementById("cart-footer");
  const cartNoteEl = document.getElementById("cart-note");
  const cartSubtotalEl = document.getElementById("cart-subtotal");
  const cartTitleCountEl = document.getElementById("cart-title-count");
  const cartBadge = document.getElementById("cart-count");

  const wishItemsEl = document.getElementById("wishlist-items");
  const wishEmptyEl = document.getElementById("wishlist-empty");
  const wishTitleCountEl = document.getElementById("wishlist-title-count");
  const wishBadge = document.getElementById("wishlist-count");

  const checkoutItemsEl = document.getElementById("checkout-items");
  const checkoutSubtotalEl = document.getElementById("checkout-subtotal");
  const checkoutTotalEl = document.getElementById("checkout-total");

  function updateBadge(el, value, bump) {
    if (!el) return;
    el.textContent = String(value);
    el.dataset.count = String(value);
    el.classList.toggle("has-items", value > 0);
    if (bump && value > 0) {
      el.classList.remove("is-bumping");
      void el.offsetWidth;
      el.classList.add("is-bumping");
      window.setTimeout(() => el.classList.remove("is-bumping"), 550);
    }
  }

  let lastBagCount = count();

  function renderCart() {
    const items = cart;
    const total = count();
    const sum = subtotal();

    if (cartEmptyEl) cartEmptyEl.hidden = items.length > 0;
    if (cartFooterEl) cartFooterEl.hidden = items.length === 0;
    if (cartNoteEl) cartNoteEl.hidden = items.length === 0;
    if (cartTitleCountEl) cartTitleCountEl.textContent = "(" + total + ")";
    if (cartSubtotalEl) cartSubtotalEl.textContent = format(sum);
    updateBadge(cartBadge, total, total !== lastBagCount);
    lastBagCount = total;

    if (!cartItemsEl) return;

    cartItemsEl.innerHTML = items
      .map((item) => {
        const options = [];
        if (item.variantLabel) options.push(esc(item.variantLabel));
        if (item.wrappingLabel) options.push("Wrap: " + esc(item.wrappingLabel));
        if (item.complementsLabel && item.complementsLabel !== "None") {
          options.push("Extras: " + esc(item.complementsLabel));
        }
        return (
          '<article class="cart-item" data-key="' +
          esc(item.key) +
          '">' +
          '<img class="cart-item__img" src="' +
          esc(item.img) +
          '" alt="' +
          esc(item.name) +
          '" width="82" height="82" loading="lazy">' +
          '<div class="cart-item__body">' +
          '<p class="cart-item__category">' +
          esc(item.bespoke ? "Bespoke Atelier" : item.categoryLabel) +
          "</p>" +
          '<h3 class="cart-item__name">' +
          esc(item.name) +
          "</h3>" +
          '<p class="cart-item__options">' +
          options.join(" · ") +
          "</p>" +
          (item.message ? '<p class="cart-item__message">“' + esc(item.message) + "”</p>" : "") +
          '<div class="cart-item__foot">' +
          '<div class="qty" role="group" aria-label="Quantity for ' +
          esc(item.name) +
          '">' +
          '<button type="button" data-qty="dec" aria-label="Decrease quantity"><svg class="icon" aria-hidden="true"><use href="#i-minus"></use></svg></button>' +
          '<span aria-live="polite">' +
          item.qty +
          "</span>" +
          '<button type="button" data-qty="inc" aria-label="Increase quantity"><svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg></button>' +
          "</div>" +
          '<span class="cart-item__price">' +
          format(Number(item.unitPrice) * Number(item.qty)) +
          "</span>" +
          "</div>" +
          "</div>" +
          '<button class="cart-item__remove" type="button" data-remove aria-label="Remove ' +
          esc(item.name) +
          ' from bag"><svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg></button>' +
          "</article>"
        );
      })
      .join("");
  }

  function renderWishlist() {
    const ids = wishlist;
    if (wishEmptyEl) wishEmptyEl.hidden = ids.length > 0;
    if (wishTitleCountEl) wishTitleCountEl.textContent = "(" + ids.length + ")";
    updateBadge(wishBadge, ids.length, false);

    if (!wishItemsEl) return;
    wishItemsEl.innerHTML = ids
      .map((id) => {
        const product = J.getProduct(id);
        if (!product) return "";
        const from = product.variants && product.variants.length ? product.variants[0].price : product.base;
        return (
          '<article class="wishlist-item" data-id="' +
          esc(id) +
          '">' +
          '<img src="' +
          esc(product.img) +
          '" alt="' +
          esc(product.name) +
          '" width="76" height="76" loading="lazy">' +
          '<div class="wishlist-item__body">' +
          "<h4>" +
          esc(product.name) +
          "</h4>" +
          "<p>" +
          esc(product.categoryLabel) +
          " · from " +
          format(from) +
          "</p>" +
          '<div class="wishlist-item__actions">' +
          '<button class="btn btn--ghost" type="button" data-wish-add>Add to bag</button>' +
          '<button class="wishlist-item__remove" type="button" data-wish-remove>Remove</button>' +
          "</div></div></article>"
        );
      })
      .join("");
  }

  function renderCheckout() {
    if (checkoutSubtotalEl) checkoutSubtotalEl.textContent = format(subtotal());
    if (checkoutTotalEl) checkoutTotalEl.textContent = format(subtotal());
    if (!checkoutItemsEl) return;

    if (!cart.length) {
      checkoutItemsEl.innerHTML =
        '<p class="fineprint checkout__empty">Your bag is empty. Add a bouquet or a gift to compose an order.</p>';
      return;
    }

    checkoutItemsEl.innerHTML = cart
      .map((item) => {
        const detail = [item.variantLabel, item.wrappingLabel].filter(Boolean).join(" · ");
        return (
          '<div class="checkout-item">' +
          '<img src="' +
          esc(item.img) +
          '" alt="' +
          esc(item.name) +
          '" width="54" height="54" loading="lazy">' +
          '<div class="checkout-item__info"><h4>' +
          esc(item.name) +
          "</h4><p>" +
          esc(item.qty + " × " + (detail || item.categoryLabel)) +
          "</p></div>" +
          '<span class="checkout-item__price">' +
          format(Number(item.unitPrice) * Number(item.qty)) +
          "</span></div>"
        );
      })
      .join("");
  }

  function render() {
    renderCart();
    renderWishlist();
    renderCheckout();
  }

  /* ------------------------------------------------------------------ */
  /*  Drawer controls found inside the store's own markup                */
  /* ------------------------------------------------------------------ */
  if (cartItemsEl) {
    cartItemsEl.addEventListener("click", (event) => {
      const line = event.target.closest(".cart-item");
      if (!line) return;
      const key = line.dataset.key;
      const removeBtn = event.target.closest("[data-remove]");
      if (removeBtn) {
        remove(key);
        return;
      }
      const qtyBtn = event.target.closest("[data-qty]");
      if (!qtyBtn) return;
      const current = cart.find((item) => item.key === key);
      if (!current) return;
      setQty(key, qtyBtn.dataset.qty === "inc" ? current.qty + 1 : current.qty - 1);
    });
  }

  if (wishItemsEl) {
    wishItemsEl.addEventListener("click", (event) => {
      const row = event.target.closest(".wishlist-item");
      if (!row) return;
      const id = row.dataset.id;
      if (event.target.closest("[data-wish-remove]")) {
        removeWish(id);
        return;
      }
      if (event.target.closest("[data-wish-add]")) {
        const product = J.getProduct(id);
        if (product) addProduct(product, { notify: true });
      }
    });
  }

  /* Keep tabs in sync if the same page is open twice. */
  window.addEventListener("storage", (event) => {
    if (event.key === CART_KEY) {
      cart = read(CART_KEY, []).filter((item) => item && item.key && Number(item.qty) > 0);
      render();
    }
    if (event.key === WISH_KEY) {
      wishlist = read(WISH_KEY, []).filter((id) => typeof id === "string" && J.getProduct(id));
      render();
    }
  });

  window.JECILLE_STORE = {
    add: add,
    addProduct: addProduct,
    addBespoke: addBespoke,
    remove: remove,
    setQty: setQty,
    clear: clear,
    items: () => cart.slice(),
    subtotal: subtotal,
    count: count,
    hasWish: hasWish,
    toggleWish: toggleWish,
    removeWish: removeWish,
    wishlist: () => wishlist.slice(),
    wishCount: wishCount,
    render: render,
    toast: toast,
    formatPrice: format,
  };

  render();
})();

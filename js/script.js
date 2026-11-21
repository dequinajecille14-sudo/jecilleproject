/* ==========================================================================
   JECILLÉ — Interface
   Catalogue rendering, filters, quick view, bespoke builder, search,
   navigation, drawers and demonstration forms. No network requests.
   ========================================================================== */
(function () {
  "use strict";

  const J = window.JECILLE;
  const STORE = window.JECILLE_STORE;

  const loader = document.getElementById("page-loader");

  function hideLoader() {
    document.documentElement.classList.remove("is-loading");
    document.body.classList.remove("is-loading");
    if (loader) {
      loader.classList.add("is-hidden");
      window.setTimeout(() => {
        loader.setAttribute("aria-hidden", "true");
      }, 800);
    }
  }

  window.addEventListener("error", hideLoader);

  if (!J || !STORE) {
    hideLoader();
    return;
  }

  const $ = (selector, context) => (context || document).querySelector(selector);
  const $$ = (selector, context) => Array.from((context || document).querySelectorAll(selector));
  const format = J.formatPrice;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function debounce(fn, wait) {
    let timer;
    return function debounced() {
      const args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(null, args), wait);
    };
  }

  function priceFrom(product) {
    const variants = product.variants || [];
    return variants.length ? variants[0].price : product.base;
  }

  function badgeClass(text) {
    const value = String(text).toLowerCase();
    if (value.indexOf("rare") !== -1 || value.indexOf("limited") !== -1) return " badge--rare";
    if (value.indexOf("signature") !== -1) return " badge--signature";
    return "";
  }

  /* ------------------------------------------------------------------ */
  /*  Catalogue cards                                                    */
  /* ------------------------------------------------------------------ */
  function swatches(product, limit) {
    const colors = (product.colors || []).slice(0, limit || 5);
    if (!colors.length) return "";
    return (
      '<div class="swatches" aria-hidden="true">' +
      colors.map((c) => '<span class="swatch" style="--sw:' + esc(c.hex) + '"></span>').join("") +
      "</div>"
    );
  }

  function productCard(product, index) {
    const active = STORE.hasWish(product.id);
    const from = priceFrom(product);
    const many = (product.variants || []).length > 1;
    const included = (product.included || []).slice(0, 2);

    return (
      '<article class="product-card" data-id="' +
      esc(product.id) +
      '" style="--i:' +
      (index % 12) +
      '">' +
      '<div class="product-card__media">' +
      '<img src="' +
      esc(product.img) +
      '" alt="' +
      esc(product.alt) +
      '" width="512" height="512" loading="lazy" decoding="async">' +
      (product.badge
        ? '<div class="product-card__badges"><span class="badge' +
          badgeClass(product.badge) +
          '">' +
          esc(product.badge) +
          "</span></div>"
        : "") +
      '<div class="product-card__actions">' +
      '<button class="product-card__action' +
      (active ? " is-active" : "") +
      '" type="button" data-wish="' +
      esc(product.id) +
      '" aria-label="Save ' +
      esc(product.name) +
      ' to wishlist" aria-pressed="' +
      active +
      '"><svg class="icon" aria-hidden="true"><use href="#i-heart"></use></svg></button>' +
      '<button class="product-card__action" type="button" data-quickview="' +
      esc(product.id) +
      '" aria-label="Quick view ' +
      esc(product.name) +
      '"><svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg></button>' +
      "</div>" +
      '<button class="product-card__quickadd" type="button" data-quickadd="' +
      esc(product.id) +
      '"><svg class="icon" aria-hidden="true"><use href="#i-bag"></use></svg>Quick add</button>' +
      "</div>" +
      '<div class="product-card__body">' +
      '<div class="product-card__meta"><span class="product-card__category">' +
      esc(product.categoryLabel) +
      '</span><span class="product-card__price">' +
      (many ? "From " : "") +
      format(from) +
      "</span></div>" +
      '<h3 class="product-card__name"><button type="button" data-quickview="' +
      esc(product.id) +
      '">' +
      esc(product.name) +
      "</button></h3>" +
      '<p class="product-card__botanical">' +
      esc(product.botanical) +
      "</p>" +
      '<p class="product-card__desc">' +
      esc(product.desc) +
      "</p>" +
      (included.length
        ? '<div class="product-card__included">' + included.map((i) => "<span>" + esc(i) + "</span>").join("") + "</div>"
        : "") +
      '<div class="product-card__footer">' +
      swatches(product) +
      '<button class="product-card__link" type="button" data-quickview="' +
      esc(product.id) +
      '">View <svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg></button>' +
      "</div></div></article>"
    );
  }

  function paintGrid(el, products) {
    if (!el) return;
    el.innerHTML = products.map((product, index) => productCard(product, index)).join("");
    el.classList.add("is-entering");
    window.setTimeout(() => el.classList.remove("is-entering"), 900);
    syncWishButtons();
  }

  function syncWishButtons() {
    $$("[data-wish]").forEach((btn) => {
      const active = STORE.hasWish(btn.dataset.wish);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    if (modalState) {
      const active = STORE.hasWish(modalState.product.id);
      const btn = document.getElementById("modal-wishlist");
      if (btn) {
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Lily collection                                                    */
  /* ------------------------------------------------------------------ */
  const LILY_LABELS = {
    pink: "Pink",
    white: "White",
    cream: "Cream",
    yellow: "Yellow",
    orange: "Orange",
    coral: "Coral",
    peach: "Peach",
    red: "Red",
    burgundy: "Burgundy",
    purple: "Purple",
    blue: "Blue",
    green: "Green",
    bicolor: "Bicolour",
    double: "Double",
  };

  const LILY_ORDER = [
    "pink",
    "white",
    "cream",
    "yellow",
    "orange",
    "coral",
    "peach",
    "red",
    "burgundy",
    "purple",
    "blue",
    "green",
    "bicolor",
    "double",
  ];

  const lilies = J.products.filter((p) => p.category === "lilies");
  let lilyFilter = "all";

  function lilyHaystack(product) {
    return (product.filters || []).concat(product.colorFamilies || []);
  }

  function renderLilyFilters() {
    const holder = document.getElementById("lily-filters");
    if (!holder) return;

    const available = LILY_ORDER.filter((key) => lilies.some((p) => lilyHaystack(p).indexOf(key) !== -1));
    const chips = [{ key: "all", label: "All lilies", count: lilies.length }].concat(
      available.map((key) => ({
        key: key,
        label: LILY_LABELS[key] || key,
        count: lilies.filter((p) => lilyHaystack(p).indexOf(key) !== -1).length,
      }))
    );

    holder.innerHTML = chips
      .map(
        (chip) =>
          '<button class="chip' +
          (lilyFilter === chip.key ? " is-active" : "") +
          '" type="button" data-value="' +
          esc(chip.key) +
          '" aria-pressed="' +
          (lilyFilter === chip.key) +
          '">' +
          esc(chip.label) +
          " <span>" +
          chip.count +
          "</span></button>"
      )
      .join("");
  }

  function renderLilies() {
    const grid = document.getElementById("lily-grid");
    const count = document.getElementById("lily-count");
    const list = lilyFilter === "all" ? lilies : lilies.filter((p) => lilyHaystack(p).indexOf(lilyFilter) !== -1);
    if (count) count.textContent = String(list.length);
    paintGrid(grid, list);
  }

  /* ------------------------------------------------------------------ */
  /*  Collections                                                        */
  /* ------------------------------------------------------------------ */
  function collectionProducts(key) {
    if (key === "single-variety") return J.flowers;
    return J.mixed.filter((p) => p.bouquetCollections.indexOf(key) !== -1);
  }

  function renderCollections() {
    const grid = document.getElementById("collection-grid");
    if (!grid) return;

    grid.innerHTML = J.collections
      .map((collection, index) => {
        const items = collectionProducts(collection.key);
        return (
          '<a class="collection-card' +
          (index === 0 ? " collection-card--wide" : "") +
          '" href="#shop" data-collection="' +
          esc(collection.key) +
          '">' +
          '<img src="' +
          esc(collection.img) +
          '" alt="' +
          esc(collection.name) +
          '" loading="lazy" decoding="async">' +
          '<span class="collection-card__shade" aria-hidden="true"></span>' +
          '<span class="collection-card__number">0' +
          (index + 1) +
          "</span>" +
          '<span class="collection-card__count">' +
          items.length +
          " pieces</span>" +
          '<span class="collection-card__body"><span class="collection-card__tagline">' +
          esc(collection.tagline) +
          "</span><h3>" +
          esc(collection.name) +
          "</h3><p>" +
          esc(collection.desc) +
          '</p><span class="collection-card__cta">View the collection <svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg></span></span>' +
          "</a>"
        );
      })
      .join("");
  }

  /* ------------------------------------------------------------------ */
  /*  Bouquet atelier                                                    */
  /* ------------------------------------------------------------------ */
  let atelierFilter = "all";
  let atelierSort = "curated";

  const atelierCollections = J.collections.filter((c) => c.key !== "single-variety");

  function renderAtelierChips() {
    const holder = document.getElementById("atelier-filters");
    if (!holder) return;
    const chips = [{ key: "all", name: "All bouquets", count: J.mixed.length }].concat(
      atelierCollections.map((c) => ({
        key: c.key,
        name: c.short,
        count: J.mixed.filter((p) => p.bouquetCollections.indexOf(c.key) !== -1).length,
      }))
    );
    holder.innerHTML = chips
      .map(
        (chip) =>
          '<button class="chip' +
          (atelierFilter === chip.key ? " is-active" : "") +
          '" type="button" data-value="' +
          esc(chip.key) +
          '" aria-pressed="' +
          (atelierFilter === chip.key) +
          '">' +
          esc(chip.name) +
          " <span>" +
          chip.count +
          "</span></button>"
      )
      .join("");
  }

  function sortProducts(list, mode) {
    const sorted = list.slice();
    if (mode === "price-asc") sorted.sort((a, b) => a.base - b.base);
    else if (mode === "price-desc") sorted.sort((a, b) => b.base - a.base);
    else if (mode === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }

  function renderAtelier() {
    const grid = document.getElementById("atelier-grid");
    const count = document.getElementById("atelier-count");
    let list =
      atelierFilter === "all"
        ? J.mixed.slice()
        : J.mixed.filter((p) => p.bouquetCollections.indexOf(atelierFilter) !== -1);
    list = sortProducts(list, atelierSort);
    if (count) count.textContent = String(list.length);
    paintGrid(grid, list);
  }

  /* ------------------------------------------------------------------ */
  /*  Beyond the lily                                                    */
  /* ------------------------------------------------------------------ */
  const BEYOND = ["hydrangeas", "peonies", "sweet-peas", "roses", "lisianthus", "ranunculus", "accents"];
  let beyondFilter = "all";

  function renderBeyondTabs() {
    const holder = document.getElementById("beyond-tabs");
    if (!holder) return;
    const chips = [{ key: "all", name: "All blooms", count: J.flowers.length - lilies.length }]
      .concat(
        BEYOND.map((key) => ({
          key: key,
          name: J.categories[key],
          count: J.flowers.filter((p) => p.category === key).length,
        }))
      )
      .filter((chip) => chip.count > 0);

    holder.innerHTML = chips
      .map(
        (chip) =>
          '<button class="chip' +
          (beyondFilter === chip.key ? " is-active" : "") +
          '" type="button" role="tab" aria-selected="' +
          (beyondFilter === chip.key) +
          '" data-value="' +
          esc(chip.key) +
          '">' +
          esc(chip.name) +
          " <span>" +
          chip.count +
          "</span></button>"
      )
      .join("");
  }

  function renderBeyond() {
    const grid = document.getElementById("beyond-grid");
    const count = document.getElementById("beyond-count");
    const list =
      beyondFilter === "all"
        ? J.flowers.filter((p) => lilies.indexOf(p) === -1)
        : J.flowers.filter((p) => p.category === beyondFilter);
    if (count) count.textContent = String(list.length);
    paintGrid(grid, list);
  }

  /* ------------------------------------------------------------------ */
  /*  Simple section grids                                               */
  /* ------------------------------------------------------------------ */
  function paintType(type, selector) {
    const products = J.products.filter((p) => p.type === type);
    paintGrid(document.getElementById(selector), products);
    return products.length;
  }

  /* ------------------------------------------------------------------ */
  /*  Shop all                                                           */
  /* ------------------------------------------------------------------ */
  const PAGE_SIZE = 16;

  const shopState = {
    q: "",
    category: "all",
    collection: "all",
    color: "all",
    sort: "curated",
    shown: PAGE_SIZE,
  };

  const shopSearch = document.getElementById("shop-search");
  const shopClear = document.getElementById("shop-search-clear");
  const shopCategory = document.getElementById("shop-category");
  const shopCollection = document.getElementById("shop-collection");
  const shopColor = document.getElementById("shop-color");
  const shopSort = document.getElementById("shop-sort");
  const shopGrid = document.getElementById("shop-grid");
  const shopEmpty = document.getElementById("shop-empty");
  const shopCount = document.getElementById("shop-count");
  const shopLoad = document.getElementById("shop-load");
  const shopTotal = document.getElementById("shop-total");

  function matchesQuery(product, query) {
    if (!query) return true;
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => product.searchText.indexOf(token) !== -1);
  }

  function filteredShop() {
    let list = J.products.filter((p) => {
      if (!matchesQuery(p, shopState.q)) return false;
      if (shopState.category !== "all" && p.category !== shopState.category) return false;
      if (shopState.collection !== "all" && (p.bouquetCollections || []).indexOf(shopState.collection) === -1) {
        return false;
      }
      if (
        shopState.color !== "all" &&
        (p.colorFamilies || []).indexOf(shopState.color) === -1 &&
        (p.filters || []).indexOf(shopState.color) === -1
      ) {
        return false;
      }
      return true;
    });
    list = sortProducts(list, shopState.sort);
    return list;
  }

  function renderShop(reset) {
    if (!shopGrid) return;
    if (reset) shopState.shown = PAGE_SIZE;
    const list = filteredShop();
    const visible = list.slice(0, shopState.shown);

    paintGrid(shopGrid, visible);
    shopGrid.hidden = list.length === 0;
    if (shopEmpty) shopEmpty.hidden = list.length !== 0;

    if (shopCount) {
      shopCount.textContent = list.length
        ? "Showing " + visible.length + " of " + list.length + " pieces"
        : "No pieces match these filters";
    }
    if (shopTotal) shopTotal.textContent = String(J.products.length);
    if (shopLoad) shopLoad.hidden = visible.length >= list.length || list.length === 0;
    if (shopClear) shopClear.hidden = !shopState.q;
  }

  function syncShopControls() {
    if (shopSearch) shopSearch.value = shopState.q;
    if (shopCategory) shopCategory.value = shopState.category;
    if (shopCollection) shopCollection.value = shopState.collection;
    if (shopColor) shopColor.value = shopState.color;
    if (shopSort) shopSort.value = shopState.sort;
    if (shopClear) shopClear.hidden = !shopState.q;
  }

  function resetShop() {
    shopState.q = "";
    shopState.category = "all";
    shopState.collection = "all";
    shopState.color = "all";
    shopState.sort = "curated";
    shopState.shown = PAGE_SIZE;
    syncShopControls();
    renderShop(true);
  }

  function applyCollection(key) {
    shopState.q = "";
    shopState.category = "all";
    shopState.collection = key;
    shopState.color = "all";
    shopState.sort = "curated";
    shopState.shown = PAGE_SIZE;
    syncShopControls();
    renderShop(true);
    const target = document.getElementById("shop");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ------------------------------------------------------------------ */
  /*  Search overlay                                                     */
  /* ------------------------------------------------------------------ */
  const searchOverlay = document.getElementById("search-overlay");
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  const searchResults = document.getElementById("search-results");
  const searchFooter = document.getElementById("search-footer");

  let lastSearchQuery = "";

  function renderSearch(query) {
    if (!searchResults) return;
    lastSearchQuery = query.trim();
    const q = lastSearchQuery.toLowerCase();
    if (searchClear) searchClear.hidden = !query;
    if (!q) {
      searchResults.innerHTML = "";
      if (searchFooter) searchFooter.hidden = true;
      return;
    }

    const list = J.products.filter((p) => matchesQuery(p, q));
    list.sort((a, b) => {
      const an = a.name.toLowerCase().indexOf(q);
      const bn = b.name.toLowerCase().indexOf(q);
      return (an === -1 ? 999 : an) - (bn === -1 ? 999 : bn);
    });

    if (!list.length) {
      searchResults.innerHTML =
        '<div class="search-empty"><h3>No blooms by that name.</h3><p>Try “lily”, “peony”, “chocolate” or a colour such as “burgundy”.</p></div>';
      if (searchFooter) searchFooter.hidden = true;
      return;
    }

    searchResults.innerHTML = list
      .slice(0, 8)
      .map(
        (product) =>
          '<a class="search-result" href="#shop" data-quickview="' +
          esc(product.id) +
          '"><img src="' +
          esc(product.img) +
          '" alt="" width="72" height="72" loading="lazy"><span class="search-result__meta"><span>' +
          esc(product.categoryLabel) +
          "</span><h4>" +
          esc(product.name) +
          "</h4><p>" +
          format(priceFrom(product)) +
          "</p></span></a>"
      )
      .join("");
    if (searchFooter) {
      searchFooter.hidden = false;
      const link = document.getElementById("search-view-all");
      if (link) {
        link.innerHTML =
          "View all " +
          list.length +
          ' results in the shop <svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg>';
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Surfaces: drawers, modals, search, menu                            */
  /* ------------------------------------------------------------------ */
  const overlay = document.getElementById("overlay");
  const cartDrawer = document.getElementById("cart-drawer");
  const wishlistDrawer = document.getElementById("wishlist-drawer");
  const productModal = document.getElementById("product-modal");
  const checkoutModal = document.getElementById("checkout-modal");
  const mobileMenu = document.getElementById("mobile-menu");
  const menuToggle = document.getElementById("menu-toggle");

  let focusReturn = null;
  let overlayTimer = null;

  function anySurfaceOpen() {
    return !!(
      (checkoutModal && checkoutModal.classList.contains("is-open")) ||
      (productModal && productModal.classList.contains("is-open")) ||
      (searchOverlay && searchOverlay.classList.contains("is-open")) ||
      $(".drawer.is-open") ||
      document.body.classList.contains("menu-open")
    );
  }

  function syncBodyLock() {
    document.body.classList.toggle("is-locked", anySurfaceOpen());
    document.body.classList.toggle("modal-open", anySurfaceOpen());
  }

  function rememberFocus() {
    focusReturn = document.activeElement;
  }

  function restoreFocus() {
    if (focusReturn && document.contains(focusReturn)) {
      const target = focusReturn;
      focusReturn = null;
      if (target.offsetParent !== null || target === menuToggle) {
        try {
          target.focus({ preventScroll: true });
        } catch (err) {
          /* Ignore focus failures on detached triggers. */
        }
      }
    } else {
      focusReturn = null;
    }
  }

  function showOverlay() {
    if (!overlay) return;
    window.clearTimeout(overlayTimer);
    overlay.hidden = false;
    window.requestAnimationFrame(() => overlay.classList.add("is-open"));
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    window.clearTimeout(overlayTimer);
    overlayTimer = window.setTimeout(() => {
      if (!$(".drawer.is-open")) overlay.hidden = true;
    }, 450);
  }

  function setOpen(el) {
    if (!el) return;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
  }

  function setClosed(el) {
    if (!el) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
  }

  function focusFirst(el) {
    if (!el) return;
    const target =
      el.querySelector("[data-close-drawer], [data-close-modal], [data-close-checkout], [data-close-search]") ||
      el.querySelector("input, button, a[href]");
    if (target) {
      try {
        target.focus({ preventScroll: true });
      } catch (err) {
        /* no-op */
      }
    }
  }

  function openCart(trigger) {
    if (wishlistDrawer && wishlistDrawer.classList.contains("is-open")) closeWishlist(false);
    rememberFocus();
    showOverlay();
    setOpen(cartDrawer);
    syncBodyLock();
    window.setTimeout(() => focusFirst(cartDrawer), 60);
    if (trigger) focusReturn = trigger;
  }

  function openWishlist(trigger) {
    if (cartDrawer && cartDrawer.classList.contains("is-open")) closeCart(false);
    rememberFocus();
    showOverlay();
    setOpen(wishlistDrawer);
    syncBodyLock();
    window.setTimeout(() => focusFirst(wishlistDrawer), 60);
    if (trigger) focusReturn = trigger;
  }

  function closeCart(restore) {
    if (!cartDrawer || !cartDrawer.classList.contains("is-open")) return;
    setClosed(cartDrawer);
    if (!wishlistDrawer || !wishlistDrawer.classList.contains("is-open")) hideOverlay();
    syncBodyLock();
    if (restore !== false) restoreFocus();
  }

  function closeWishlist(restore) {
    if (!wishlistDrawer || !wishlistDrawer.classList.contains("is-open")) return;
    setClosed(wishlistDrawer);
    if (!cartDrawer || !cartDrawer.classList.contains("is-open")) hideOverlay();
    syncBodyLock();
    if (restore !== false) restoreFocus();
  }

  function openSearch(trigger) {
    if (!searchOverlay) return;
    closeMobileMenu();
    rememberFocus();
    setOpen(searchOverlay);
    syncBodyLock();
    window.setTimeout(() => {
      if (searchInput) {
        searchInput.focus({ preventScroll: true });
        if (searchInput.value.trim()) renderSearch(searchInput.value);
      }
    }, 80);
    if (trigger) focusReturn = trigger;
  }

  function closeSearch(restore) {
    if (!searchOverlay || !searchOverlay.classList.contains("is-open")) return;
    setClosed(searchOverlay);
    syncBodyLock();
    if (restore !== false) restoreFocus();
  }

  function openModal(el, trigger) {
    if (!el) return;
    rememberFocus();
    setOpen(el);
    syncBodyLock();
    const dialog = el.querySelector(".modal__dialog");
    if (dialog) {
      dialog.scrollTop = 0;
      dialog.setAttribute("tabindex", "-1");
      window.setTimeout(() => {
        try {
          dialog.focus({ preventScroll: true });
        } catch (err) {
          /* no-op */
        }
      }, 80);
    }
    if (trigger) focusReturn = trigger;
  }

  function closeModal(el, restore) {
    if (!el || !el.classList.contains("is-open")) return;
    setClosed(el);
    syncBodyLock();
    if (restore !== false) restoreFocus();
  }

  function openMobileMenu() {
    if (!mobileMenu) return;
    rememberFocus();
    document.body.classList.add("menu-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "true");
    syncBodyLock();
    window.setTimeout(() => {
      const first = mobileMenu.querySelector("a[href]");
      if (first) first.focus({ preventScroll: true });
    }, 80);
  }

  function closeMobileMenu(restore) {
    if (!mobileMenu || !document.body.classList.contains("menu-open")) return;
    document.body.classList.remove("menu-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    syncBodyLock();
    if (restore !== false) restoreFocus();
  }

  function toggleMobileMenu() {
    if (document.body.classList.contains("menu-open")) closeMobileMenu();
    else openMobileMenu();
  }

  function topSurface() {
    if (checkoutModal && checkoutModal.classList.contains("is-open")) return checkoutModal;
    if (productModal && productModal.classList.contains("is-open")) return productModal;
    if (searchOverlay && searchOverlay.classList.contains("is-open")) return searchOverlay;
    const drawer = $(".drawer.is-open");
    if (drawer) return drawer;
    if (document.body.classList.contains("menu-open")) return mobileMenu;
    return null;
  }

  function closeTopSurface() {
    if (checkoutModal && checkoutModal.classList.contains("is-open")) {
      closeCheckout();
      return;
    }
    if (productModal && productModal.classList.contains("is-open")) {
      closeProductModal();
      return;
    }
    if (searchOverlay && searchOverlay.classList.contains("is-open")) {
      closeSearch();
      return;
    }
    if (cartDrawer && cartDrawer.classList.contains("is-open")) {
      closeCart();
      return;
    }
    if (wishlistDrawer && wishlistDrawer.classList.contains("is-open")) {
      closeWishlist();
      return;
    }
    if (document.body.classList.contains("menu-open")) closeMobileMenu();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (topSurface()) {
        event.preventDefault();
        closeTopSurface();
      }
      return;
    }

    if (event.key !== "Tab") return;
    const surface = topSurface();
    if (!surface) return;

    const focusables = $$(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      surface
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    if (!focusables.length) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Product quick view                                                 */
  /* ------------------------------------------------------------------ */
  const modalImage = document.getElementById("modal-image");
  const modalImageLabel = document.getElementById("modal-image-label");
  const modalCategory = document.getElementById("modal-category");
  const modalTitle = document.getElementById("modal-title");
  const modalBotanical = document.getElementById("modal-botanical");
  const modalDesc = document.getElementById("modal-desc");
  const modalPalette = document.getElementById("modal-palette");
  const modalIncludedGroup = document.getElementById("modal-included-group");
  const modalIncluded = document.getElementById("modal-included");
  const modalSizeGroup = document.getElementById("modal-size-group");
  const modalSizeLabel = document.getElementById("modal-size-label");
  const modalSizeHint = document.getElementById("modal-size-hint");
  const modalSizes = document.getElementById("modal-sizes");
  const modalWrapGroup = document.getElementById("modal-wrap-group");
  const modalWraps = document.getElementById("modal-wraps");
  const modalMessage = document.getElementById("modal-message");
  const modalMessageCount = document.getElementById("modal-message-count");
  const modalPrice = document.getElementById("modal-price");
  const modalThumbs = document.getElementById("modal-thumbs");
  const modalAdd = document.getElementById("modal-add");
  const modalWishlist = document.getElementById("modal-wishlist");

  let modalState = null;

  function wrapMarkup(wraps, activeKey, namePrefix) {
    return wraps
      .map((wrap) => {
        const id = namePrefix + "-" + wrap.key;
        return (
          '<label class="wrap-option' +
          (wrap.key === "transparent" ? " is-sheer" : "") +
          '" for="' +
          id +
          '"><input type="radio" id="' +
          id +
          '" name="' +
          namePrefix +
          '" value="' +
          esc(wrap.key) +
          '"' +
          (wrap.key === activeKey ? " checked" : "") +
          '><span class="wrap-option__swatch" style="--c1:' +
          esc(wrap.swatch[0]) +
          ";--c2:" +
          esc(wrap.swatch[1]) +
          ";--c3:" +
          esc(wrap.swatch[2]) +
          '"></span><span class="wrap-option__text"><span class="wrap-option__name">' +
          esc(wrap.short) +
          '</span><span class="wrap-option__price">' +
          (wrap.price === 0 ? "Included" : "+ " + format(wrap.price)) +
          "</span></span></label>"
        );
      })
      .join("");
  }

  function sizeMarkup(variants, activeKey, name) {
    return variants
      .map(
        (variant) =>
          '<label class="option-card"><input type="radio" name="' +
          name +
          '" value="' +
          esc(variant.key) +
          '"' +
          (variant.key === activeKey ? " checked" : "") +
          '><span class="option-card__label">' +
          esc(variant.label) +
          '</span><span class="option-card__note">' +
          esc(variant.note) +
          '</span><span class="option-card__price">' +
          format(variant.price) +
          "</span></label>"
      )
      .join("");
  }

  function updateModalPrice() {
    if (!modalState) return;
    const product = modalState.product;
    const variant =
      (product.variants || []).find((v) => v.key === modalState.variantKey) || (product.variants || [])[0];
    const wrap = product.wrapping
      ? J.wrapping.find((w) => w.key === modalState.wrapKey) || J.wrapping.find((w) => w.key === "transparent")
      : null;
    const total = (variant ? variant.price : 0) + (wrap ? wrap.price : 0);
    if (modalPrice) modalPrice.textContent = format(total);
    if (modalSizeHint && variant) modalSizeHint.textContent = variant.note || "";
  }

  function openProduct(id, trigger) {
    const product = J.getProduct(id);
    if (!product || !productModal) return;

    closeMobileMenu(false);
    if (searchOverlay && searchOverlay.classList.contains("is-open")) {
      closeSearch(false);
    }

    modalState = {
      product: product,
      variantKey: product.variants && product.variants.length ? product.variants[0].key : "",
      wrapKey: product.wrapping ? J.defaults.wrapping : null,
      galleryIndex: 0,
    };

    if (modalCategory) modalCategory.textContent = product.categoryLabel;
    if (modalTitle) modalTitle.textContent = product.name;
    if (modalBotanical) modalBotanical.textContent = product.botanical;
    if (modalDesc) modalDesc.textContent = product.desc;

    if (modalPalette) {
      const colors = product.colors || [];
      modalPalette.hidden = colors.length === 0;
      modalPalette.innerHTML = colors
        .map(
          (c) =>
            '<span class="palette-item"><i style="--sw:' +
            esc(c.hex) +
            '"></i>' +
            esc(c.name) +
            "</span>"
        )
        .join("");
    }

    if (modalIncludedGroup) modalIncludedGroup.hidden = !(product.included || []).length;
    if (modalIncluded) {
      modalIncluded.innerHTML = (product.included || [])
        .map(
          (item) =>
            '<li><svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>' + esc(item) + "</li>"
        )
        .join("");
    }

    if (modalSizeLabel) modalSizeLabel.textContent = product.variantLabel || "Size";
    if (modalSizeGroup) modalSizeGroup.hidden = !(product.variants || []).length;
    if (modalSizes) {
      modalSizes.innerHTML = sizeMarkup(product.variants || [], modalState.variantKey, "modal-size");
    }
    if (modalSizeHint) {
      const variant = (product.variants || [])[0];
      modalSizeHint.textContent = variant ? variant.note : "";
    }

    if (modalWrapGroup) modalWrapGroup.hidden = !product.wrapping;
    if (modalWraps) {
      modalWraps.innerHTML = product.wrapping ? wrapMarkup(J.wrapping, modalState.wrapKey, "modal-wrap") : "";
    }

    if (modalMessage) modalMessage.value = "";
    if (modalMessageCount) modalMessageCount.textContent = "0";

    if (modalWishlist) {
      const active = STORE.hasWish(product.id);
      modalWishlist.classList.toggle("is-active", active);
      modalWishlist.setAttribute("aria-pressed", String(active));
    }

    const gallery = product.gallery && product.gallery.length ? product.gallery : [{ src: product.img, label: product.alt }];
    modalState.galleryIndex = 0;
    if (modalImage) {
      modalImage.src = gallery[0].src;
      modalImage.alt = product.alt;
    }
    if (modalImageLabel) modalImageLabel.textContent = gallery[0].label;

    if (modalThumbs) {
      modalThumbs.hidden = gallery.length < 2;
      modalThumbs.innerHTML = gallery
        .map(
          (shot, index) =>
            '<button class="product-detail__thumb' +
            (index === 0 ? " is-active" : "") +
            '" type="button" data-thumb="' +
            index +
            '" aria-label="View ' +
            esc(shot.label) +
            '"><img src="' +
            esc(shot.src) +
            '" alt="" width="70" height="70" loading="lazy"></button>'
        )
        .join("");
    }

    updateModalPrice();
    openModal(productModal, trigger);
  }

  function closeProductModal() {
    closeModal(productModal);
    modalState = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Bespoke builder                                                    */
  /* ------------------------------------------------------------------ */
  const builderVariety = document.getElementById("builder-variety");
  const builderMeta = document.getElementById("builder-variety-meta");
  const builderColors = document.getElementById("builder-colors");
  const builderSizes = document.getElementById("builder-sizes");
  const builderWraps = document.getElementById("builder-wraps");
  const builderComplements = document.getElementById("builder-complements");
  const builderMessage = document.getElementById("builder-message");
  const builderMessageCount = document.getElementById("builder-message-count");
  const builderTotal = document.getElementById("builder-total");
  const builderBreakdown = document.getElementById("builder-breakdown");
  const builderImage = document.getElementById("builder-image");
  const builderTag = document.getElementById("builder-tag");
  const builderName = document.getElementById("builder-name");
  const builderBotanical = document.getElementById("builder-botanical");
  const builderColorLabel = document.getElementById("builder-color");
  const builderSizeLabel = document.getElementById("builder-size");
  const builderWrapLabel = document.getElementById("builder-wrap");
  const builderComplementsLabel = document.getElementById("builder-complements-label");

  const builderState = {
    varietyId: "",
    colorIndex: 0,
    sizeKey: "",
    wrapKey: J.defaults.wrapping,
    complements: new Set(),
    message: "",
  };

  function builderProduct() {
    return J.getProduct(builderState.varietyId) || J.flowers[0];
  }

  function builderVariant(product) {
    return (
      (product.variants || []).find((v) => v.key === builderState.sizeKey) || (product.variants || [])[0] || null
    );
  }

  function builderWrap() {
    return J.wrapping.find((w) => w.key === builderState.wrapKey) || J.wrapping.find((w) => w.key === J.defaults.wrapping);
  }

  function builderExtras() {
    return Array.from(builderState.complements)
      .map((key) => J.complements.find((c) => c.key === key))
      .filter(Boolean);
  }

  function builderPrice(product, variant, wrap, extras) {
    return (
      (variant ? variant.price : 0) +
      (wrap ? wrap.price : 0) +
      extras.reduce((sum, item) => sum + item.price, 0)
    );
  }

  function renderBuilderVariety() {
    const product = builderProduct();
    if (!product) return;

    if (builderMeta) {
      builderMeta.innerHTML =
        '<img src="' +
        esc(product.img) +
        '" alt="" width="56" height="56" loading="lazy"><div><h4>' +
        esc(product.name) +
        "</h4><p>" +
        esc(product.botanical) +
        " · " +
        esc(product.categoryLabel) +
        "</p>" +
        (product.colors || [])
          .slice(0, 3)
          .map(
            (c) =>
              '<span class="palette-item"><i style="--sw:' + esc(c.hex) + '"></i>' + esc(c.name) + "</span>"
          )
          .join("") +
        "</div>";
    }

    if (builderColors) {
      const colors = product.colors || [];
      if (builderState.colorIndex >= colors.length) builderState.colorIndex = 0;
      builderColors.innerHTML = colors
        .map(
          (color, index) =>
            '<label class="swatch-option"><input type="radio" name="builder-color" value="' +
            index +
            '"' +
            (index === builderState.colorIndex ? " checked" : "") +
            '><span class="swatch-option__dot" style="--sw:' +
            esc(color.hex) +
            '"></span><span class="swatch-option__name">' +
            esc(color.name) +
            "</span></label>"
        )
        .join("");
    }

    const variants = product.variants || [];
    if (!variants.some((v) => v.key === builderState.sizeKey)) {
      builderState.sizeKey = variants.length ? variants[0].key : "";
    }
    if (builderSizes) builderSizes.innerHTML = sizeMarkup(variants, builderState.sizeKey, "builder-size");
  }

  function renderBuilderOptions() {
    if (builderWraps) builderWraps.innerHTML = wrapMarkup(J.wrapping, builderState.wrapKey, "builder-wrap");
    if (builderComplements) {
      builderComplements.innerHTML = J.complements
        .map(
          (item) =>
            '<label class="complement"><input type="checkbox" value="' +
            esc(item.key) +
            '"' +
            (builderState.complements.has(item.key) ? " checked" : "") +
            '><img src="' +
            esc(item.img) +
            '" alt="" width="40" height="40" loading="lazy"><span class="complement__text"><strong>' +
            esc(item.name) +
            "</strong><span>+ " +
            format(item.price) +
            '</span></span><span class="complement__check"><svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg></span></label>'
        )
        .join("");
    }
  }

  function updateBuilderSummary() {
    const product = builderProduct();
    if (!product) return;
    const variant = builderVariant(product);
    const wrap = builderWrap();
    const extras = builderExtras();
    const colors = product.colors || [];
    const color = colors[builderState.colorIndex] || colors[0] || null;
    const total = builderPrice(product, variant, wrap, extras);

    if (builderImage) {
      builderImage.src = product.img;
      builderImage.alt = "Bespoke " + product.name + " bouquet preview";
    }
    if (builderTag) builderTag.textContent = product.badge || "Bespoke";
    if (builderName) builderName.textContent = "Bespoke " + product.name;
    if (builderBotanical) builderBotanical.textContent = product.botanical;
    if (builderColorLabel) builderColorLabel.textContent = color ? color.name : "Natural";
    if (builderSizeLabel) builderSizeLabel.textContent = variant ? variant.label + " · " + variant.note : "—";
    if (builderWrapLabel) builderWrapLabel.textContent = wrap ? wrap.name : "—";
    if (builderComplementsLabel) {
      builderComplementsLabel.textContent = extras.length ? extras.map((e) => e.name).join(", ") : "None";
    }

    if (builderBreakdown) {
      const rows = [];
      if (variant) rows.push([variant.label + " bouquet", format(variant.price)]);
      if (wrap) rows.push([wrap.short + " wrapping", wrap.price === 0 ? "Included" : format(wrap.price)]);
      extras.forEach((extra) => rows.push([extra.name, format(extra.price)]));
      builderBreakdown.innerHTML = rows
        .map((row) => "<div><span>" + esc(row[0]) + "</span><span>" + esc(row[1]) + "</span></div>")
        .join("");
    }
    if (builderTotal) builderTotal.textContent = format(total);
    if (builderMessageCount && builderMessage) builderMessageCount.textContent = String(builderMessage.value.length);
  }

  function initBuilder() {
    if (!builderVariety) return;

    const groups = {};
    J.flowers.forEach((product) => {
      if (!groups[product.category]) groups[product.category] = [];
      groups[product.category].push(product);
    });

    builderVariety.innerHTML = Object.keys(groups)
      .map(
        (key) =>
          '<optgroup label="' +
          esc(J.categories[key]) +
          '">' +
          groups[key]
            .map((product) => '<option value="' + esc(product.id) + '">' + esc(product.name) + "</option>")
            .join("") +
          "</optgroup>"
      )
      .join("");

    const featured = J.getProduct("lilies-stargazer") || J.flowers[0];
    builderState.varietyId = featured.id;
    builderState.colorIndex = 0;
    builderState.sizeKey = featured.variants[0].key;
    builderVariety.value = featured.id;

    renderBuilderVariety();
    renderBuilderOptions();
    updateBuilderSummary();
  }

  /* ------------------------------------------------------------------ */
  /*  Wrapping library                                                   */
  /* ------------------------------------------------------------------ */
  function renderWrappingLibrary() {
    const grid = document.getElementById("wrapping-grid");
    if (!grid) return;
    grid.innerHTML = J.wrapping
      .map(
        (wrap) =>
          '<article class="wrap-card' +
          (wrap.key === "transparent" ? " is-sheer" : "") +
          '" style="--c1:' +
          esc(wrap.swatch[0]) +
          ";--c2:" +
          esc(wrap.swatch[1]) +
          ";--c3:" +
          esc(wrap.swatch[2]) +
          '"><div class="wrap-card__fabric"></div><div class="wrap-card__info"><h4>' +
          esc(wrap.short) +
          "</h4><p>" +
          esc(wrap.desc) +
          '</p><span class="wrap-card__price">' +
          (wrap.price === 0 ? "Included with every bouquet" : "+ " + format(wrap.price)) +
          "</span></div></article>"
      )
      .join("");
  }

  /* ------------------------------------------------------------------ */
  /*  Checkout                                                           */
  /* ------------------------------------------------------------------ */
  const checkoutContent = document.getElementById("checkout-content");
  const checkoutSuccess = document.getElementById("checkout-success");
  const checkoutForm = document.getElementById("checkout-form");

  function openCheckout(trigger) {
    if (!STORE.count()) {
      STORE.toast("Your bag is quiet", "Add a bloom or a gift before checking out.");
      return;
    }
    closeCart(false);
    if (checkoutContent) checkoutContent.hidden = false;
    if (checkoutSuccess) checkoutSuccess.hidden = true;
    if (checkoutForm) {
      checkoutForm.reset();
      const dateInput = checkoutForm.querySelector('input[name="date"]');
      if (dateInput) {
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        dateInput.min = local.toISOString().slice(0, 10);
      }
    }
    STORE.render();
    openModal(checkoutModal, trigger || $("[data-open-cart]"));
  }

  function closeCheckout() {
    if (!checkoutModal || !checkoutModal.classList.contains("is-open")) return;
    closeModal(checkoutModal);
    window.setTimeout(() => {
      if (checkoutContent) checkoutContent.hidden = false;
      if (checkoutSuccess) checkoutSuccess.hidden = true;
    }, 200);
  }

  /* ------------------------------------------------------------------ */
  /*  Event wiring                                                       */
  /* ------------------------------------------------------------------ */
  function wire() {
    document.addEventListener("click", (event) => {
      const openCartBtn = event.target.closest("[data-open-cart]");
      if (openCartBtn) {
        event.preventDefault();
        openCart(openCartBtn);
        return;
      }

      const openWishBtn = event.target.closest("[data-open-wishlist]");
      if (openWishBtn) {
        event.preventDefault();
        openWishlist(openWishBtn);
        return;
      }

      const searchBtn = event.target.closest("[data-open-search]");
      if (searchBtn) {
        event.preventDefault();
        openSearch(searchBtn);
        return;
      }

      const quickview = event.target.closest("[data-quickview]");
      if (quickview) {
        event.preventDefault();
        openProduct(quickview.dataset.quickview, quickview);
        return;
      }

      const wishBtn = event.target.closest("[data-wish]");
      if (wishBtn) {
        event.preventDefault();
        STORE.toggleWish(wishBtn.dataset.wish);
        return;
      }

      const quickAdd = event.target.closest("[data-quickadd]");
      if (quickAdd) {
        event.preventDefault();
        const product = J.getProduct(quickAdd.dataset.quickadd);
        if (product) STORE.addProduct(product);
        return;
      }

      const collectionBtn = event.target.closest("[data-collection]");
      if (collectionBtn) {
        event.preventDefault();
        applyCollection(collectionBtn.dataset.collection);
        return;
      }

      const closeDrawerBtn = event.target.closest("[data-close-drawer]");
      if (closeDrawerBtn) {
        const drawer = closeDrawerBtn.closest(".drawer");
        if (drawer === cartDrawer) closeCart();
        else if (drawer === wishlistDrawer) closeWishlist();
        else {
          closeCart();
          closeWishlist();
        }
        return;
      }

      if (event.target.closest("[data-close-modal]")) {
        closeProductModal();
        return;
      }

      if (event.target.closest("[data-close-checkout]")) {
        closeCheckout();
        return;
      }

      if (event.target.closest("[data-close-search]")) {
        closeSearch();
        return;
      }

      if (event.target.closest("#checkout-open")) {
        openCheckout();
        return;
      }

      const searchTerm = event.target.closest("[data-search-term]");
      if (searchTerm) {
        if (searchInput) {
          searchInput.value = searchTerm.dataset.searchTerm;
          searchInput.focus();
          renderSearch(searchInput.value);
        }
        return;
      }

      if (event.target.closest("#search-view-all")) {
        if (!lastSearchQuery) return;
        shopState.q = lastSearchQuery;
        shopState.category = "all";
        shopState.collection = "all";
        shopState.color = "all";
        shopState.sort = "curated";
        shopState.shown = PAGE_SIZE;
        syncShopControls();
        renderShop(true);
        closeSearch(false);
        const target = document.getElementById("shop");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (event.target.closest("#back-top")) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    if (overlay) {
      overlay.addEventListener("click", () => {
        closeCart();
        closeWishlist();
      });
    }

    if (menuToggle) menuToggle.addEventListener("click", toggleMobileMenu);

    if (mobileMenu) {
      mobileMenu.addEventListener("click", (event) => {
        if (event.target.closest("a[href]")) closeMobileMenu(false);
      });
    }

    document.addEventListener("jecille:wishlist", syncWishButtons);
    document.addEventListener("jecille:bag", syncWishButtons);

    /* Lily filters */
    const lilyFilters = document.getElementById("lily-filters");
    if (lilyFilters) {
      lilyFilters.addEventListener("click", (event) => {
        const chip = event.target.closest(".chip");
        if (!chip) return;
        lilyFilter = chip.dataset.value;
        renderLilyFilters();
        renderLilies();
      });
    }

    /* Atelier filters */
    const atelierFilters = document.getElementById("atelier-filters");
    if (atelierFilters) {
      atelierFilters.addEventListener("click", (event) => {
        const chip = event.target.closest(".chip");
        if (!chip) return;
        atelierFilter = chip.dataset.value;
        renderAtelierChips();
        renderAtelier();
      });
    }

    const atelierSortSelect = document.getElementById("atelier-sort");
    if (atelierSortSelect) {
      atelierSortSelect.addEventListener("change", () => {
        atelierSort = atelierSortSelect.value;
        renderAtelier();
      });
    }

    /* Beyond tabs */
    const beyondTabs = document.getElementById("beyond-tabs");
    if (beyondTabs) {
      beyondTabs.addEventListener("click", (event) => {
        const chip = event.target.closest(".chip");
        if (!chip) return;
        beyondFilter = chip.dataset.value;
        renderBeyondTabs();
        renderBeyond();
      });
    }

    /* Shop */
    if (shopSearch) {
      const run = debounce(() => {
        shopState.q = shopSearch.value.trim();
        renderShop(true);
      }, 140);
      shopSearch.addEventListener("input", () => {
        if (shopClear) shopClear.hidden = !shopSearch.value;
        run();
      });
    }
    if (shopClear) {
      shopClear.addEventListener("click", () => {
        if (!shopSearch) return;
        shopSearch.value = "";
        shopClear.hidden = true;
        shopState.q = "";
        renderShop(true);
        shopSearch.focus();
      });
    }
    if (shopCategory) {
      shopCategory.addEventListener("change", () => {
        shopState.category = shopCategory.value;
        renderShop(true);
      });
    }
    if (shopCollection) {
      shopCollection.addEventListener("change", () => {
        shopState.collection = shopCollection.value;
        renderShop(true);
      });
    }
    if (shopColor) {
      shopColor.addEventListener("change", () => {
        shopState.color = shopColor.value;
        renderShop(true);
      });
    }
    if (shopSort) {
      shopSort.addEventListener("change", () => {
        shopState.sort = shopSort.value;
        renderShop(true);
      });
    }
    const shopReset = document.getElementById("shop-reset");
    if (shopReset) shopReset.addEventListener("click", resetShop);
    const shopEmptyReset = document.getElementById("shop-empty-reset");
    if (shopEmptyReset) shopEmptyReset.addEventListener("click", resetShop);

    if (shopLoad) {
      shopLoad.addEventListener("click", () => {
        shopState.shown += PAGE_SIZE;
        renderShop(false);
      });
    }

    /* Search overlay */
    if (searchInput) {
      searchInput.addEventListener("input", () => renderSearch(searchInput.value));
    }
    if (searchClear) {
      searchClear.addEventListener("click", () => {
        if (!searchInput) return;
        searchInput.value = "";
        searchClear.hidden = true;
        renderSearch("");
        searchInput.focus();
      });
    }

    /* Product modal options */
    if (modalSizes) {
      modalSizes.addEventListener("change", (event) => {
        if (!modalState) return;
        const input = event.target.closest('input[name="modal-size"]');
        if (!input) return;
        modalState.variantKey = input.value;
        updateModalPrice();
      });
    }

    if (modalWraps) {
      modalWraps.addEventListener("change", (event) => {
        if (!modalState) return;
        const input = event.target.closest('input[name="modal-wrap"]');
        if (!input) return;
        modalState.wrapKey = input.value;
        updateModalPrice();
      });
    }

    if (modalThumbs) {
      modalThumbs.addEventListener("click", (event) => {
        if (!modalState) return;
        const thumb = event.target.closest("[data-thumb]");
        if (!thumb) return;
        const index = Number(thumb.dataset.thumb);
        const gallery = modalState.product.gallery || [];
        if (!gallery[index]) return;
        modalState.galleryIndex = index;
        if (modalImage) {
          modalImage.src = gallery[index].src;
          modalImage.alt = modalState.product.alt;
        }
        if (modalImageLabel) modalImageLabel.textContent = gallery[index].label;
        $$(".product-detail__thumb", modalThumbs).forEach((el) => el.classList.toggle("is-active", el === thumb));
      });
    }

    if (modalMessage && modalMessageCount) {
      modalMessage.addEventListener("input", () => {
        modalMessageCount.textContent = String(modalMessage.value.length);
      });
    }

    if (modalAdd) {
      modalAdd.addEventListener("click", () => {
        if (!modalState) return;
        STORE.addProduct(modalState.product, {
          variantKey: modalState.variantKey,
          wrappingKey: modalState.wrapKey,
          message: modalMessage ? modalMessage.value.trim() : "",
        });
        closeProductModal();
      });
    }

    if (modalWishlist) {
      modalWishlist.addEventListener("click", () => {
        if (!modalState) return;
        STORE.toggleWish(modalState.product.id);
      });
    }

    /* Builder */
    if (builderVariety) {
      builderVariety.addEventListener("change", () => {
        builderState.varietyId = builderVariety.value;
        builderState.colorIndex = 0;
        const product = builderProduct();
        builderState.sizeKey = product.variants && product.variants.length ? product.variants[0].key : "";
        renderBuilderVariety();
        renderBuilderOptions();
        updateBuilderSummary();
      });
    }

    if (builderColors) {
      builderColors.addEventListener("change", (event) => {
        const input = event.target.closest('input[name="builder-color"]');
        if (!input) return;
        builderState.colorIndex = Number(input.value) || 0;
        updateBuilderSummary();
      });
    }

    if (builderSizes) {
      builderSizes.addEventListener("change", (event) => {
        const input = event.target.closest('input[name="builder-size"]');
        if (!input) return;
        builderState.sizeKey = input.value;
        updateBuilderSummary();
      });
    }

    if (builderWraps) {
      builderWraps.addEventListener("change", (event) => {
        const input = event.target.closest('input[name="builder-wrap"]');
        if (!input) return;
        builderState.wrapKey = input.value;
        updateBuilderSummary();
      });
    }

    if (builderComplements) {
      builderComplements.addEventListener("change", (event) => {
        const input = event.target.closest('input[type="checkbox"]');
        if (!input) return;
        if (input.checked) builderState.complements.add(input.value);
        else builderState.complements.delete(input.value);
        updateBuilderSummary();
      });
    }

    if (builderMessage) {
      builderMessage.addEventListener("input", () => {
        builderState.message = builderMessage.value;
        if (builderMessageCount) builderMessageCount.textContent = String(builderMessage.value.length);
      });
    }

    const builderAdd = document.getElementById("builder-add");
    if (builderAdd) {
      builderAdd.addEventListener("click", () => {
        const product = builderProduct();
        const variant = builderVariant(product);
        const wrap = builderWrap();
        const extras = builderExtras();
        if (!product || !variant) return;
        const total = builderPrice(product, variant, wrap, extras);
        STORE.addBespoke({
          name: "Bespoke " + product.name,
          img: product.img,
          botanical: product.botanical,
          variantLabel: variant.label + " · " + variant.note,
          wrappingLabel: wrap ? wrap.name : "",
          complements: extras,
          message: builderMessage ? builderMessage.value.trim() : "",
          unitPrice: total,
        });
        if (builderMessage) builderMessage.value = "";
        builderState.message = "";
        if (builderMessageCount) builderMessageCount.textContent = "0";
      });
    }

    const builderReset = document.getElementById("builder-reset");
    if (builderReset) {
      builderReset.addEventListener("click", () => {
        const featured = J.getProduct("lilies-stargazer") || J.flowers[0];
        builderState.varietyId = featured.id;
        builderState.colorIndex = 0;
        builderState.sizeKey = featured.variants[0].key;
        builderState.wrapKey = J.defaults.wrapping;
        builderState.complements.clear();
        builderState.message = "";
        if (builderVariety) builderVariety.value = featured.id;
        if (builderMessage) builderMessage.value = "";
        if (builderMessageCount) builderMessageCount.textContent = "0";
        renderBuilderVariety();
        renderBuilderOptions();
        updateBuilderSummary();
        STORE.toast("A fresh beginning", "Your bespoke bouquet has been reset.");
      });
    }

    /* Checkout */
    if (checkoutForm) {
      checkoutForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!checkoutForm.checkValidity()) {
          checkoutForm.reportValidity();
          return;
        }
        STORE.clear();
        if (checkoutContent) checkoutContent.hidden = true;
        if (checkoutSuccess) checkoutSuccess.hidden = false;
        STORE.toast("Beautifully imagined", "This was a demonstration — no order was placed.");
      });
    }

    /* Contact */
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
      contactForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!contactForm.checkValidity()) {
          contactForm.reportValidity();
          return;
        }
        contactForm.reset();
        STORE.toast("Enquiry noted", "This is a demonstration form — no data was sent.");
      });
    }

    /* Newsletter */
    const newsletter = document.getElementById("newsletter-form");
    if (newsletter) {
      newsletter.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!newsletter.checkValidity()) {
          newsletter.reportValidity();
          return;
        }
        newsletter.reset();
        STORE.toast("Welcome to the atelier", "Demonstration only — no email was stored.");
      });
    }

    /* Header */
    const header = document.getElementById("site-header");
    if (header) {
      const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    /* Active navigation */
    const navLinks = $$(".nav__link");
    const linkMap = {};
    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (href.charAt(0) === "#") linkMap[href.slice(1)] = link;
    });
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const link = linkMap[entry.target.id];
            if (!link) return;
            navLinks.forEach((item) => item.classList.remove("is-active"));
            link.classList.add("is-active");
          });
        },
        { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
      );
      Object.keys(linkMap).forEach((id) => {
        const section = document.getElementById(id);
        if (section) observer.observe(section);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Start                                                              */
  /* ------------------------------------------------------------------ */
  function start() {
    document.documentElement.classList.add("is-loading");

    renderLilyFilters();
    renderLilies();
    renderCollections();
    renderAtelierChips();
    renderAtelier();
    renderBeyondTabs();
    renderBeyond();
    paintType("gift", "gift-grid");
    paintType("plush", "plush-grid");
    paintType("sweet", "sweets-grid");
    paintType("pastry", "pastry-grid");
    renderWrappingLibrary();
    renderShop(true);
    initBuilder();
    syncWishButtons();

    wire();

    const finish = () => window.setTimeout(hideLoader, 450);
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    window.setTimeout(hideLoader, 4500);
  }

  try {
    start();
  } catch (err) {
    console.error("[JECILLÉ] Interface failed to start:", err);
    hideLoader();
  }
})();

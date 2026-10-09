/* =========================================================
   Brasa Burger — app.js
   Lógica do cardápio. Depende de dados.js (CONFIG e PRODUCTS).

   Índice
     1. Constantes e utilidades
     2. Estado e referências do DOM
     3. Horário de funcionamento
     4. Cardápio (categorias, busca e lista)
     5. Detalhe do produto
     6. Carrinho
     7. Entrega, endereço e pagamento
     8. Camadas (gaveta do carrinho e janelas)
     9. Tema, avisos e animações
    10. Eventos e inicialização
   ========================================================= */
(() => {
  "use strict";

  /* =========================================================
     1. Constantes e utilidades
     ========================================================= */

  const CART_KEY = "brasa-cart";
  const ADDRESS_KEY = "brasa-address";
  const THEME_KEY = "theme";
  const MAX_QTY = 99;            // limite de cada item no carrinho
  const DEFAULT_EXTRA_MAX = 5;   // limite de cada adicional (muda por grupo com extras(..., max))
  const TOAST_MS = 2200;
  const ROLL_MS = 260;           // mesma duração de --roll-ms no CSS
  const FLY_MS = 900;            // tempo da bolinha até o carrinho
  const CEP_TIMEOUT_MS = 6000;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Os valores são calculados em centavos para evitar erros de arredondamento.
  function toCents(reais) {
    return Math.round(reais * 100);
  }

  function money(cents) {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // Minúsculas e sem acento, para a busca achar "acai" ao procurar "Açaí".
  function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function esc(value) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(value).replace(/[&<>"']/g, (char) => map[char]);
  }

  const digits = (value) => String(value).replace(/\D/g, "");

  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // localStorage pode falhar (aba anônima, bloqueio de dados); nesse caso o site segue funcionando.
  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { /* ignora */ }
    },
  };

  // Ícone do sprite que fica no começo do index.html (cor = cor do texto ao redor).
  const icon = (name) => `<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

  const MIN_ORDER_CENTS = toCents(CONFIG.minOrder);
  const DELIVERY_FEE_CENTS = toCents(CONFIG.deliveryFee ?? 0);

  // Contador − número +. O número fica dentro de .roll para poder "rolar" ao mudar (ver rollTo).
  function stepper({ qty, label, min = 0, max = MAX_QTY }) {
    return `
      <div class="stepper">
        <button type="button" class="stepBtn" data-step="-1" aria-label="Diminuir quantidade de ${esc(label)}"${qty <= min ? " disabled" : ""}>${icon("minus")}</button>
        <span class="roll"><span class="rollNum">${qty}</span></span>
        <button type="button" class="stepBtn" data-step="1" aria-label="Aumentar quantidade de ${esc(label)}"${qty >= max ? " disabled" : ""}>${icon("plus")}</button>
      </div>`;
  }

  // Troca o número de um contador com transição.
  // dir "up" (ao somar): o número sobe e o próximo vem de baixo.
  // dir "down" (ao tirar): o número desce e o próximo vem de cima.
  function rollTo(box, value, dir) {
    const current = $(".rollNum:not(.leaving)", box);
    const text = String(value);
    if (!current || current.textContent === text) return;
    if (prefersReducedMotion()) {
      current.textContent = text;
      return;
    }

    $$(".leaving", box).forEach((node) => node.remove());   // animação anterior ainda rodando
    const incoming = document.createElement("span");
    incoming.className = `rollNum in-${dir}`;
    incoming.textContent = text;

    current.className = `rollNum leaving out-${dir}`;
    box.appendChild(incoming);

    setTimeout(() => {
      current.remove();
      if (!incoming.classList.contains("leaving")) incoming.className = "rollNum";
    }, ROLL_MS);
  }

  /* =========================================================
     2. Estado e referências do DOM
     ========================================================= */

  const productById = new Map(PRODUCTS.map((product) => [product.id, product]));

  const ADDRESS_FIELDS = ["cep", "street", "number", "complement", "district", "city", "uf", "reference"];

  const state = {
    cart: [],            // [{ key, productId, options: [{ group, name, qty }], qty }]
    product: null,       // produto aberto no detalhe
    picks: new Map(),    // opções escolhidas no detalhe: "grupo:opção" -> quantidade
    category: "Todos",
    search: "",
    layers: [],          // camadas abertas (gaveta/janelas), a última é a de cima
    fulfillment: null,   // "delivery" (entrega) ou "pickup" (retirada)
    address: null,       // endereço de entrega confirmado
    lastCep: "",         // último CEP consultado
  };

  const dom = {
    themeColor: $('meta[name="theme-color"]'),
    themeBtn: $("#themeBtn"),
    cartBtn: $("#cartBtn"),
    cartCount: $("#cartCount"),
    statusCard: $("#statusCard"),
    statusText: $("#statusText"),
    statusHours: $("#statusHours"),
    minOrder: $("#minOrder"),
    address: $("#address"),
    search: $("#search"),
    cats: $("#cats"),
    menu: $("#menu"),
    overlay: $("#overlay"),
    drawer: $("#drawer"),
    cartItems: $("#cartItems"),
    minimumHint: $("#minimumHint"),
    cartTotal: $("#cartTotal"),
    checkout: $("#checkout"),
    clearCart: $("#clearCart"),
    homeNav: $("#homeNav"),
    searchNav: $("#searchNav"),
    ordersNav: $("#ordersNav"),
    productModal: $("#productModal"),
    pImg: $("#pImg"),
    pCat: $("#pCat"),
    pName: $("#pName"),
    pDesc: $("#pDesc"),
    options: $("#options"),
    pTotal: $("#pTotal"),
    add: $("#add"),
    modeModal: $("#modeModal"),
    deliveryFee: $("#deliveryFee"),
    pickupAddress: $("#pickupAddress"),
    modeNext: $("#modeNext"),
    addressModal: $("#addressModal"),
    addressForm: $("#addressForm"),
    cepHint: $("#cepHint"),
    payModal: $("#payModal"),
    payWhere: $("#payWhere"),
    payItems: $("#payItems"),
    paySubtotal: $("#paySubtotal"),
    payFeeRow: $("#payFeeRow"),
    payFeeLabel: $("#payFeeLabel"),
    payFee: $("#payFee"),
    payTotal: $("#payTotal"),
    pix: $("#pix"),
    copyPix: $("#copyPix"),
    customer: $("#customer"),
    note: $("#note"),
    sendWhats: $("#sendWhats"),
    toast: $("#toast"),
  };

  /* =========================================================
     3. Horário de funcionamento
     ========================================================= */

  function minutesOf(hhmm) {
    const [hours, minutes] = hhmm.split(":").map(Number);
    return hours * 60 + minutes;
  }

  // Minutos desde 00:00 no fuso da loja (não no do celular do cliente).
  function minutesNow() {
    const now = new Date();
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: CONFIG.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(now);
      const read = (type) => Number(parts.find((part) => part.type === type).value);
      return read("hour") * 60 + read("minute");
    } catch {
      return now.getHours() * 60 + now.getMinutes();
    }
  }

  // Funciona também quando o horário passa da meia-noite (ex.: 18:00 às 02:00).
  function isOpenNow() {
    const now = minutesNow();
    const open = minutesOf(CONFIG.hours.open);
    const close = minutesOf(CONFIG.hours.close);
    return open < close ? now >= open && now < close : now >= open || now < close;
  }

  function updateStatus() {
    const open = isOpenNow();
    dom.statusText.textContent = open ? "Aberto" : "Fechado";
    dom.statusCard.classList.toggle("open", open);
  }

  /* =========================================================
     4. Cardápio (categorias, busca e lista)
     ========================================================= */

  function renderCategories() {
    const categories = ["Todos", ...new Set(PRODUCTS.map((product) => product.cat))];
    dom.cats.innerHTML = categories.map((cat) => `
      <button type="button" class="${cat === state.category ? "active" : ""}"
              data-cat="${esc(cat)}" aria-pressed="${cat === state.category}">${esc(cat)}</button>`).join("");
  }

  function visibleProducts() {
    const query = normalize(state.search.trim());
    return PRODUCTS.filter((product) => {
      const inCategory = state.category === "Todos" || product.cat === state.category;
      const matches = !query || normalize(`${product.name} ${product.desc} ${product.cat}`).includes(query);
      return inCategory && matches;
    });
  }

  const productCard = (product) => `
    <article class="card" data-id="${product.id}">
      <img src="${esc(product.img)}" alt="${esc(product.name)}" loading="lazy" decoding="async">
      <div class="cardBody">
        <h3>${esc(product.name)}</h3>
        <p>${esc(product.desc)}</p>
        <div class="cardFoot">
          <span class="price">${money(toCents(product.price))}</span>
          <button type="button" class="addMini" aria-label="Adicionar ${esc(product.name)}">${icon("plus")}</button>
        </div>
      </div>
    </article>`;

  // Agrupa os produtos por categoria, na ordem em que aparecem no cardápio (dados.js).
  function groupByCategory(list) {
    const groups = new Map();
    for (const product of list) {
      if (!groups.has(product.cat)) groups.set(product.cat, []);
      groups.get(product.cat).push(product);
    }
    return [...groups];
  }

  // Em "Todos" (e na busca) cada categoria ganha um título; numa categoria só vem direto a lista.
  function renderMenu() {
    const list = visibleProducts();
    if (!list.length) {
      dom.menu.innerHTML = `<div class="noResults">${icon("search")}<b>Nada encontrado</b><p>Tente buscar outro nome ou categoria.</p></div>`;
      return;
    }

    const showTitles = state.category === "Todos";
    dom.menu.innerHTML = groupByCategory(list).map(([cat, products]) => `
      <section class="menuSection">
        ${showTitles ? `<h2 class="catTitle">${esc(cat)}</h2>` : ""}
        <div class="menuGrid">${products.map(productCard).join("")}</div>
      </section>`).join("");
  }

  /* =========================================================
     5. Detalhe do produto
     Tipos de grupo (definidos em dados.js):
       single = escolhe 1 (obrigatório)   multi = marcar/desmarcar   count = − número +
     ========================================================= */

  const groupMax = (group) => (group.type === "count" ? group.max ?? DEFAULT_EXTRA_MAX : 1);
  const pickKey = (groupIndex, optionIndex) => `${groupIndex}:${optionIndex}`;

  function renderGroup(group, groupIndex) {
    const isSingle = group.type === "single";
    const rows = group.options.map((option, optionIndex) => {
      const label = `<span class="optName">${esc(option.name)}${option.price ? `<em>+ ${money(toCents(option.price))}</em>` : ""}</span>`;

      if (group.type === "count") {
        return `
          <div class="option" data-group="${groupIndex}" data-option="${optionIndex}">
            ${label}${stepper({ qty: 0, label: option.name, max: groupMax(group) })}
          </div>`;
      }
      return `
        <label class="option">
          ${label}
          <input type="${isSingle ? "radio" : "checkbox"}" name="g${groupIndex}" data-group="${groupIndex}" data-option="${optionIndex}">
        </label>`;
    }).join("");

    return `
      <div class="group" data-group="${groupIndex}">
        <div class="groupTitle">
          <strong>${esc(group.title)}</strong>
          <span class="${isSingle ? "required" : ""}">${isSingle ? "Escolha 1 · obrigatório" : "Opcional"}</span>
        </div>
        ${rows}
      </div>`;
  }

  function openProduct(id) {
    const product = productById.get(id);
    if (!product) return;

    state.product = product;
    state.picks.clear();
    dom.pImg.classList.remove("imgError");
    dom.pImg.src = product.img;
    dom.pImg.alt = product.name;
    dom.pCat.textContent = product.cat;
    dom.pName.textContent = product.name;
    dom.pDesc.textContent = product.desc;
    dom.options.innerHTML = product.groups.map(renderGroup).join("");
    $(".modalScroll", dom.productModal).scrollTop = 0;

    updateProductTotal();
    openLayer(dom.productModal);
  }

  // Opções escolhidas no momento: [{ group: "Adicionais", name: "Bacon crocante", qty: 2 }]
  function readSelection() {
    const selection = [];
    state.product.groups.forEach((group, groupIndex) => {
      group.options.forEach((option, optionIndex) => {
        const qty = state.picks.get(pickKey(groupIndex, optionIndex));
        if (qty) selection.push({ group: group.title, name: option.name, qty });
      });
    });
    return selection;
  }

  function updateProductTotal() {
    const product = state.product;
    if (!product) return;
    const extras = readSelection().reduce((sum, sel) => sum + (optionCents(product, sel) ?? 0) * sel.qty, 0);
    dom.pTotal.textContent = money(toCents(product.price) + extras);
  }

  function afterPick(groupIndex) {
    $$(".group", dom.options)[groupIndex]?.classList.remove("error");
    updateProductTotal();
  }

  // Adicionais com − número +: soma ou tira uma unidade (0 até o máximo do grupo).
  function changePick(row, delta) {
    const groupIndex = Number(row.dataset.group);
    const optionIndex = Number(row.dataset.option);
    const max = groupMax(state.product.groups[groupIndex]);
    const key = pickKey(groupIndex, optionIndex);

    const before = state.picks.get(key) ?? 0;
    const after = Math.min(Math.max(before + delta, 0), max);
    if (after === before) return;
    if (after) state.picks.set(key, after);
    else state.picks.delete(key);

    const [minus, plus] = $$(".stepBtn", row);
    rollTo($(".roll", row), after, delta > 0 ? "up" : "down");
    minus.disabled = after <= 0;
    plus.disabled = after >= max;
    row.classList.toggle("has", after > 0);
    afterPick(groupIndex);
  }

  // Caixas de marcar ("Sem cebola") e escolha única (bebida do combo).
  function pickFromInput(input) {
    const groupIndex = Number(input.dataset.group);
    const optionIndex = Number(input.dataset.option);
    const group = state.product.groups[groupIndex];

    if (group.type === "single") {
      group.options.forEach((_, index) => state.picks.delete(pickKey(groupIndex, index)));
    }
    if (input.checked) state.picks.set(pickKey(groupIndex, optionIndex), 1);
    else state.picks.delete(pickKey(groupIndex, optionIndex));
    afterPick(groupIndex);
  }

  function addSelectedToCart() {
    const product = state.product;

    // Grupos de "escolha 1" são obrigatórios (ex.: sabor da bebida do combo).
    const missing = product.groups.findIndex((group, groupIndex) =>
      group.type === "single" && !group.options.some((_, optionIndex) => state.picks.has(pickKey(groupIndex, optionIndex))));
    if (missing !== -1) {
      const groupEl = $$(".group", dom.options)[missing];
      groupEl.classList.add("error");
      groupEl.scrollIntoView({ behavior: "smooth", block: "center" });
      return toast("Escolha uma das opções obrigatórias");
    }

    // O item entra no carrinho primeiro; o número no ícone só sobe quando a bolinha chega lá.
    putInCart(product.id, readSelection());
    flyToCart(dom.add, updateCartBadge);
    closeLayer(dom.productModal);
    commitCart({ badge: false });
    toast("Adicionado ao carrinho");
  }

  /* =========================================================
     6. Carrinho
     ========================================================= */

  // Procura a opção pelo nome (não pela posição), para o carrinho salvo
  // continuar válido se o dono reorganizar o cardápio. null = não existe mais.
  function findOption(product, selection) {
    const group = product.groups.find((g) => g.title === selection?.group);
    const option = group?.options.find((o) => o.name === selection.name);
    return option ? { group, option } : null;
  }

  // Preço unitário de uma opção, em centavos (null se a opção não existe mais).
  function optionCents(product, selection) {
    const found = findOption(product, selection);
    return found ? toCents(found.option.price) : null;
  }

  // Itens idênticos (mesmo produto e mesmas opções) viram uma linha só, com quantidade.
  const cartKey = (productId, options) =>
    `${productId}|${options.map((o) => `${o.group}:${o.name}:${o.qty}`).sort().join("|")}`;

  function putInCart(productId, options, qty = 1) {
    const key = cartKey(productId, options);
    const line = state.cart.find((l) => l.key === key);
    if (line) line.qty = Math.min(line.qty + qty, MAX_QTY);
    else state.cart.push({ key, productId, options, qty: Math.min(qty, MAX_QTY) });
  }

  // Monta os dados de exibição de uma linha (nome, preços, imagem) a partir do cardápio atual.
  function resolveLine(entry) {
    const product = productById.get(entry.productId);
    const options = entry.options
      .map((sel) => ({ ...sel, cents: optionCents(product, sel) }))
      .filter((sel) => sel.cents !== null);
    const base = toCents(product.price);
    const unit = base + options.reduce((sum, o) => sum + o.cents * o.qty, 0);
    return { key: entry.key, product, options, qty: entry.qty, base, unit, subtotal: unit * entry.qty };
  }

  const cartLines = () => state.cart.map(resolveLine);
  const cartTotal = () => cartLines().reduce((sum, line) => sum + line.subtotal, 0);

  // "2× Bacon crocante, Sem cebola"
  const describeOptions = (options) =>
    options.map((o) => (o.qty > 1 ? `${o.qty}× ${o.name}` : o.name)).join(", ");

  const cartRow = (line) => `
    <div class="cartRow" data-key="${esc(line.key)}">
      <img src="${esc(line.product.img)}" alt="" decoding="async">
      <div class="cartInfo">
        <h4>${esc(line.product.name)}</h4>
        <small>${esc(describeOptions(line.options) || "Sem alterações")}</small>
        <b class="cartPrice">${money(line.subtotal)}</b>
        <div class="qty">
          ${stepper({ qty: line.qty, label: line.product.name })}
          <button type="button" class="remove" data-action="remove">Excluir</button>
        </div>
      </div>
    </div>`;

  function updateCartBadge() {
    dom.cartCount.textContent = state.cart.reduce((sum, line) => sum + line.qty, 0);
  }

  function updateCartSummary(lines, { badge = true } = {}) {
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    if (badge) updateCartBadge();
    dom.cartTotal.textContent = money(total);
    updateCheckout(total);
  }

  function renderCart(options) {
    const lines = cartLines();
    dom.cartItems.innerHTML = lines.length
      ? lines.map(cartRow).join("")
      : `<div class="empty">Seu carrinho está vazio.<br>Escolha um lanche para começar.</div>`;
    updateCartSummary(lines, options);
  }

  function updateCheckout(total) {
    const ok = total > 0 && total >= MIN_ORDER_CENTS;
    const text = ok
      ? "Pedido mínimo atingido"
      : total > 0
        ? `Faltam ${money(MIN_ORDER_CENTS - total)} para o pedido mínimo (${money(MIN_ORDER_CENTS)})`
        : `Pedido mínimo: ${money(MIN_ORDER_CENTS)}`;
    dom.checkout.disabled = !ok;
    dom.minimumHint.classList.toggle("ok", ok);
    dom.minimumHint.innerHTML = `${icon("bag")}<span>${esc(text)}</span>`;
  }

  const saveCart = () => storage.set(CART_KEY, JSON.stringify(state.cart));

  // Salva o carrinho (para sobreviver a recarregar a página) e redesenha.
  function commitCart(options) {
    saveCart();
    renderCart(options);
  }

  // Mexer na quantidade atualiza só aquela linha, para o número poder "rolar" sem a lista piscar.
  function changeQty(key, delta) {
    const line = state.cart.find((l) => l.key === key);
    if (!line) return;
    const next = Math.min(line.qty + delta, MAX_QTY);
    if (next === line.qty) return;
    if (next < 1) return removeLine(key);

    line.qty = next;
    saveCart();

    const lines = cartLines();
    const data = lines.find((l) => l.key === key);
    const row = $$(".cartRow", dom.cartItems).find((el) => el.dataset.key === key);
    if (row && data) {
      rollTo($(".roll", row), next, delta > 0 ? "up" : "down");
      $(".cartPrice", row).textContent = money(data.subtotal);
      $$(".stepBtn", row)[1].disabled = next >= MAX_QTY;
    }
    updateCartSummary(lines);
  }

  function removeLine(key) {
    state.cart = state.cart.filter((l) => l.key !== key);
    commitCart();
  }

  // Recupera o carrinho salvo, descartando o que não existe mais no cardápio.
  function restoreCart() {
    let saved;
    try { saved = JSON.parse(storage.get(CART_KEY) || "[]"); } catch { saved = []; }
    if (!Array.isArray(saved)) return;

    for (const entry of saved) {
      const product = productById.get(entry?.productId);
      const qty = Number(entry?.qty);
      if (!product || !Number.isInteger(qty) || qty < 1) continue;

      const options = [];
      for (const sel of Array.isArray(entry.options) ? entry.options : []) {
        const found = findOption(product, sel);
        if (!found) continue;
        const optionQty = Math.min(Math.max(Math.trunc(Number(sel.qty)) || 1, 1), groupMax(found.group));
        options.push({ group: sel.group, name: sel.name, qty: optionQty });
      }
      putInCart(product.id, options, qty);
    }
  }

  /* =========================================================
     7. Entrega, endereço e pagamento
     Caminho: carrinho → entrega ou retirada → (se entrega) endereço → pagamento.
     ========================================================= */

  // Subtotal (itens), taxa de entrega e total.
  function orderTotals() {
    const subtotal = cartTotal();
    const fee = state.fulfillment === "delivery" ? DELIVERY_FEE_CENTS : 0;
    return { subtotal, fee, total: subtotal + fee };
  }

  const formatCep = (value) => {
    const d = digits(value).slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  // ["Rua X, 123 — Apto 4", "Bairro — Cidade/UF", "CEP 00000-000", "Referência: ..."]
  function addressLines(a) {
    return [
      `${a.street}, ${a.number}${a.complement ? ` — ${a.complement}` : ""}`,
      `${a.district} — ${a.city}/${a.uf}`,
      `CEP ${formatCep(a.cep)}`,
      a.reference ? `Referência: ${a.reference}` : "",
    ].filter(Boolean);
  }

  function startCheckout() {
    if (!state.cart.length) return toast("Adicione um item primeiro.");
    if (cartTotal() < MIN_ORDER_CENTS) return toast(`O pedido mínimo é de ${money(MIN_ORDER_CENTS)}.`);
    goStep("mode");
  }

  // Troca de tela mantendo a animação das janelas (a atual desce, a nova sobe).
  function goStep(name) {
    const steps = { mode: dom.modeModal, address: dom.addressModal, pay: dom.payModal };
    if (name === "pay" && state.fulfillment === "delivery" && !state.address) name = "address";

    if (name === "mode") renderMode();
    if (name === "address") fillAddressForm();
    if (name === "pay") renderPayment();

    closeLayer(dom.drawer);
    for (const [key, el] of Object.entries(steps)) if (key !== name) closeLayer(el);
    openLayer(steps[name]);
  }

  // Botão voltar de cada tela.
  function goBack(from) {
    if (from === dom.modeModal) {
      closeLayer(dom.modeModal);
      openLayer(dom.drawer);
    } else if (from === dom.addressModal) {
      goStep("mode");
    } else if (from === dom.payModal) {
      goStep(state.fulfillment === "delivery" ? "address" : "mode");
    }
  }

  // --- Tela: entrega ou retirada ---

  function renderMode() {
    $$(".choice", dom.modeModal).forEach((button) => {
      const selected = button.dataset.mode === state.fulfillment;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });
    dom.modeNext.disabled = !state.fulfillment;
  }

  // --- Tela: endereço ---

  const readAddress = () => {
    const fields = dom.addressForm.elements;
    const address = Object.fromEntries(ADDRESS_FIELDS.map((name) => [name, fields[name].value.trim()]));
    address.uf = address.uf.toUpperCase();
    return address;
  };

  function fillAddressForm() {
    const fields = dom.addressForm.elements;
    const saved = state.address ?? {};
    ADDRESS_FIELDS.forEach((name) => {
      fields[name].value = saved[name] ?? "";
      fields[name].closest(".field").classList.remove("invalid");
    });
    state.lastCep = digits(saved.cep ?? "");   // não consulta de novo um CEP que já está preenchido
    setCepHint("");
  }

  function setCepHint(text, kind = "") {
    dom.cepHint.textContent = text;
    dom.cepHint.className = `hint ${kind}`.trim();
  }

  let cepRequest = 0;

  // Preenche rua, bairro, cidade e UF a partir do CEP (ViaCEP, serviço gratuito).
  // Se der erro ou ficar sem internet, o cliente preenche à mão.
  async function lookupCep(cep) {
    const id = ++cepRequest;
    state.lastCep = cep;
    setCepHint("Buscando endereço…");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CEP_TIMEOUT_MS);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (id !== cepRequest) return;   // o cliente já digitou outro CEP

      if (data.erro) {
        setCepHint("CEP não encontrado. Preencha o endereço abaixo.", "warn");
        return;
      }
      const fields = dom.addressForm.elements;
      fields.street.value = data.logradouro || "";
      fields.district.value = data.bairro || "";
      fields.city.value = data.localidade || "";
      fields.uf.value = (data.uf || "").toUpperCase();
      ["street", "district", "city", "uf"].forEach((name) => fields[name].closest(".field").classList.remove("invalid"));
      setCepHint("Endereço encontrado. Confira e informe o número.", "ok");
      (data.logradouro ? fields.number : fields.street).focus();
    } catch {
      if (id === cepRequest) setCepHint("Não foi possível buscar o CEP. Preencha o endereço abaixo.", "warn");
    } finally {
      clearTimeout(timer);
    }
  }

  function onAddressInput(event) {
    const field = event.target;
    field.closest(".field")?.classList.remove("invalid");

    if (field.name === "cep") {
      field.value = formatCep(field.value);
      const cep = digits(field.value);
      if (cep.length === 8) {
        if (cep !== state.lastCep) lookupCep(cep);
      } else {
        state.lastCep = "";
        cepRequest++;       // cancela uma consulta que ainda esteja em andamento
        setCepHint("");
      }
    } else if (field.name === "uf") {
      field.value = field.value.replace(/[^a-z]/gi, "").toUpperCase();
    }
  }

  function submitAddress(event) {
    event.preventDefault();
    const fields = dom.addressForm.elements;
    const address = readAddress();

    const valid = {
      cep: digits(address.cep).length === 8,
      street: address.street.length >= 3,
      number: address.number.length >= 1,
      district: address.district.length >= 2,
      city: address.city.length >= 2,
      uf: /^[A-Z]{2}$/.test(address.uf),
    };
    const invalid = Object.keys(valid).filter((name) => !valid[name]);
    ADDRESS_FIELDS.forEach((name) => fields[name].closest(".field").classList.toggle("invalid", invalid.includes(name)));
    if (invalid.length) {
      fields[invalid[0]].focus();
      return toast("Preencha os campos obrigatórios.");
    }

    state.address = { ...address, cep: formatCep(address.cep) };
    storage.set(ADDRESS_KEY, JSON.stringify(state.address));   // o cliente não digita tudo de novo no próximo pedido
    goStep("pay");
  }

  function restoreAddress() {
    try {
      const saved = JSON.parse(storage.get(ADDRESS_KEY) || "null");
      if (saved && typeof saved === "object") {
        state.address = Object.fromEntries(ADDRESS_FIELDS.map((name) => [name, String(saved[name] ?? "")]));
      }
    } catch { /* ignora */ }
  }

  // --- Tela: pagamento ---

  // Cada item com seus adicionais e o valor de cada um, para a cobrança ficar clara.
  const summaryItem = (line) => `
    <div class="sumItem">
      <div class="sumLine"><span>${line.qty}x ${esc(line.product.name)}</span><b>${money(line.base * line.qty)}</b></div>
      ${line.options.map((o) => `
        <div class="sumLine sub">
          <span>${o.cents ? "+ " : ""}${o.qty > 1 ? `${o.qty}x ` : ""}${esc(o.name)}</span>
          ${o.cents ? `<b>${money(o.cents * o.qty * line.qty)}</b>` : ""}
        </div>`).join("")}
    </div>`;

  function renderPayment() {
    const { subtotal, fee, total } = orderTotals();
    const delivery = state.fulfillment === "delivery";

    if (delivery) {
      const [street, ...rest] = addressLines(state.address);
      dom.payWhere.innerHTML = `
        <span class="whereIcon">${icon("truck")}</span>
        <div class="whereText"><small>Entrega em</small><b>${esc(street)}</b>${rest.map((l) => `<span>${esc(l)}</span>`).join("")}</div>
        <button type="button" class="textBtn" data-edit>Alterar</button>`;
    } else {
      dom.payWhere.innerHTML = `
        <span class="whereIcon">${icon("store")}</span>
        <div class="whereText"><small>Retirada na loja</small><b>${esc(CONFIG.address)}</b></div>
        <button type="button" class="textBtn" data-edit>Alterar</button>`;
    }

    dom.payItems.innerHTML = cartLines().map(summaryItem).join("");
    dom.paySubtotal.textContent = money(subtotal);
    dom.payFeeLabel.textContent = delivery ? "Taxa de entrega" : "Retirada na loja";
    dom.payFee.textContent = fee ? money(fee) : "Grátis";
    dom.payFeeRow.classList.toggle("free", !fee);
    dom.payTotal.textContent = money(total);
  }

  async function copyPixKey() {
    try {
      await navigator.clipboard.writeText(CONFIG.pixKey);
      toast("Chave Pix copiada");
    } catch {
      toast("Copie a chave manualmente");
    }
  }

  function buildWhatsAppMessage() {
    const name = dom.customer.value.trim() || "Cliente";
    const note = dom.note.value.trim();
    const { subtotal, fee, total } = orderTotals();
    const delivery = state.fulfillment === "delivery";

    const items = cartLines().map((line) => {
      const extras = line.options.length
        ? ` | ${line.options.map((o) => (o.qty > 1 ? `${o.qty}x ${o.name}` : o.name)).join(", ")}`
        : "";
      return `${line.qty}x ${line.product.name} — ${money(line.subtotal)}${extras}`;
    });

    const parts = [
      `Olá! Fiz um pedido na ${CONFIG.storeName}.`, "",
      `Cliente: ${name}`, "",
      items.join("\n"), "",
      `Subtotal: ${money(subtotal)}`,
      delivery ? `Taxa de entrega: ${money(fee)}` : "Retirada na loja: grátis",
      `Total: ${money(total)}`, "",
    ];
    if (delivery) parts.push("Entrega em:", ...addressLines(state.address), "");
    else parts.push("Vou retirar o pedido na loja.", "");
    if (note) parts.push(`Observação: ${note}`, "");
    parts.push("Já realizei o Pix e vou enviar o comprovante nesta conversa.");
    return parts.join("\n");
  }

  function sendOrder() {
    if (!state.cart.length) return toast("Seu carrinho está vazio.");
    if (!state.fulfillment) return goStep("mode");
    if (state.fulfillment === "delivery" && !state.address) return goStep("address");

    const number = digits(CONFIG.whatsapp);
    const url = `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage())}`;
    window.open(url, "_blank", "noopener");
  }

  /* =========================================================
     8. Camadas (gaveta do carrinho e janelas)
     Todas usam a classe "is-open"; o CSS cuida da animação.
     ========================================================= */

  const openers = new Map(); // quem estava com o foco antes de abrir (para devolver ao fechar)

  function openLayer(el) {
    if (state.layers.includes(el)) return;
    state.layers.push(el);
    openers.set(el, document.activeElement);

    el.classList.add("is-open");
    if (el === dom.drawer) dom.overlay.classList.add("is-open");
    document.body.classList.add("lock-scroll"); // trava a página de fundo
    $("[data-close]", el)?.focus({ preventScroll: true });
  }

  function closeLayer(el) {
    if (!el || !state.layers.includes(el)) return;
    state.layers = state.layers.filter((layer) => layer !== el);

    el.classList.remove("is-open");
    if (el === dom.drawer) dom.overlay.classList.remove("is-open");
    if (!state.layers.length) document.body.classList.remove("lock-scroll");
    openers.get(el)?.focus?.({ preventScroll: true });
    openers.delete(el);
  }

  const closeAllLayers = () => [...state.layers].forEach(closeLayer);

  /* =========================================================
     9. Tema, avisos e animações
     ========================================================= */

  function applyTheme(dark) {
    document.documentElement.classList.toggle("dark", dark);
    dom.themeBtn.innerHTML = icon(dark ? "sun" : "moon");
    dom.themeColor.setAttribute("content", dark ? "#111111" : "#ffffff");
  }

  function toggleTheme() {
    const dark = !document.documentElement.classList.contains("dark");
    applyTheme(dark);
    storage.set(THEME_KEY, dark ? "dark" : "light");
  }

  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add("show");
    toastTimer = setTimeout(() => dom.toast.classList.remove("show"), TOAST_MS);
  }

  // O carrinho dá um pulo quando a bolinha chega.
  function bumpCart() {
    dom.cartBtn.classList.remove("bump");
    void dom.cartBtn.offsetWidth; // reinicia a animação
    dom.cartBtn.classList.add("bump");
  }

  const centerOf = (el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  // Suaviza o começo e o fim do trajeto.
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // A bolinha "nasce" (cresce rapidinho), voa e vai encolhendo até sumir no carrinho.
  const dotScale = (t) =>
    t < 0.15 ? 0.4 + (t / 0.15) * 0.95
      : t < 0.35 ? 1.35 - ((t - 0.15) / 0.2) * 0.35
        : 1 - ((t - 0.35) / 0.65) * 0.55;

  function spawnTrail(point) {
    const puff = document.createElement("span");
    puff.className = "flyTrail";
    puff.style.setProperty("--x", `${point.x}px`);
    puff.style.setProperty("--y", `${point.y}px`);
    document.body.appendChild(puff);
    puff.addEventListener("animationend", () => puff.remove(), { once: true });
    setTimeout(() => puff.remove(), 800); // garantia
  }

  // Bolinha que voa em arco do botão até o carrinho, deixando um rastro.
  // onArrive roda quando ela chega (é aí que o número do carrinho sobe).
  function flyToCart(source, onArrive) {
    if (prefersReducedMotion()) {
      onArrive?.();
      return bumpCart();
    }

    const from = centerOf(source);
    const to = centerOf(dom.cartBtn);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Ponto de controle da curva: o trajeto faz um arco para o lado com mais espaço na tela.
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const bend = Math.min(150, dist * 0.3);
    const perp = { x: dy / dist, y: -dx / dist };
    const screenMid = window.innerWidth / 2;
    const side = Math.abs(mid.x + perp.x * bend - screenMid) <= Math.abs(mid.x - perp.x * bend - screenMid) ? 1 : -1;
    const ctrl = {
      x: Math.min(Math.max(mid.x + perp.x * bend * side, 24), window.innerWidth - 24),
      y: mid.y + perp.y * bend * side,
    };
    const pointAt = (t) => {
      const u = 1 - t;
      return {
        x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x,
        y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y,
      };
    };

    const dot = document.createElement("span");
    dot.className = "flyDot";
    dot.style.transform = `translate3d(${from.x}px, ${from.y}px, 0) scale(.4)`;
    document.body.appendChild(dot);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      dot.remove();
      onArrive?.();
      bumpCart();
    };

    const startedAt = performance.now();
    let lastTrail = 0;
    function frame(now) {
      if (finished) return;
      const t = Math.min((now - startedAt) / FLY_MS, 1);
      const point = pointAt(easeInOut(t));
      dot.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) scale(${dotScale(t)})`;
      if (now - lastTrail > 30 && t < 0.95) {
        lastTrail = now;
        spawnTrail(point);
      }
      if (t < 1) requestAnimationFrame(frame);
      else finish();
    }
    requestAnimationFrame(frame);
    setTimeout(finish, FLY_MS + 400); // se a aba ficar em segundo plano e o navegador pausar a animação
  }

  /* =========================================================
     10. Eventos e inicialização
     ========================================================= */

  function goToTop() {
    closeAllLayers();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Celular: arrastar o carrinho da esquerda para a direita fecha a gaveta.
  // Ela acompanha o dedo; se soltar depois de arrastar o bastante (ou rápido), fecha; senão, volta.
  function bindDrawerSwipe() {
    const CLOSE_PX = 90;       // distância que fecha
    const FAST_PX_MS = 0.5;    // ...ou velocidade (px por ms) com pelo menos MIN_PX de arrasto
    const MIN_PX = 30;
    let drag = null;           // { id, x, y, t, dx, active }

    // Devolve o controle ao CSS: a gaveta anima da posição atual até fechar (ou até voltar ao lugar).
    function settle(close) {
      dom.drawer.classList.remove("dragging");
      dom.overlay.classList.remove("dragging");
      void dom.drawer.offsetWidth;   // registra a posição atual antes de reativar a transição
      if (close) closeLayer(dom.drawer);
      dom.drawer.style.transform = "";
      dom.overlay.style.opacity = "";
    }

    dom.drawer.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch" || drag) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, t: event.timeStamp, dx: 0, active: false };
    });

    dom.drawer.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;

      if (!drag.active) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;                    // ainda não deu para saber a direção
        if (dx <= 0 || Math.abs(dx) < Math.abs(dy) * 1.2) { drag = null; return; }  // rolagem vertical ou para a esquerda: ignora
        drag.active = true;
        dom.drawer.setPointerCapture(event.pointerId);
        dom.drawer.classList.add("dragging");
        dom.overlay.classList.add("dragging");
      }

      drag.dx = Math.max(dx, 0);
      dom.drawer.style.transform = `translateX(${drag.dx}px)`;
      dom.overlay.style.opacity = String(Math.max(0, 1 - drag.dx / dom.drawer.offsetWidth));
    });

    const release = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const { active, dx, t } = drag;
      drag = null;
      if (!active) return;
      const speed = dx / Math.max(event.timeStamp - t, 1);
      settle(event.type === "pointerup" && (dx > CLOSE_PX || (dx > MIN_PX && speed > FAST_PX_MS)));
    };
    dom.drawer.addEventListener("pointerup", release);
    dom.drawer.addEventListener("pointercancel", release);
  }

  function bindEvents() {
    // Foto que não carrega (link quebrado): some o ícone de imagem quebrada e fica só o fundo cinza.
    document.addEventListener("error", (event) => {
      if (event.target instanceof HTMLImageElement) event.target.classList.add("imgError");
    }, true);

    // Topo e barra inferior
    dom.themeBtn.addEventListener("click", toggleTheme);
    dom.cartBtn.addEventListener("click", () => openLayer(dom.drawer));
    dom.ordersNav.addEventListener("click", () => openLayer(dom.drawer));
    dom.homeNav.addEventListener("click", goToTop);
    dom.searchNav.addEventListener("click", () => {
      goToTop();
      setTimeout(() => dom.search.focus({ preventScroll: true }), 350);
    });

    // Busca e categorias
    dom.search.addEventListener("input", (event) => {
      state.search = event.target.value;
      // Ao buscar, procura no cardápio todo (não só na categoria aberta).
      if (state.search.trim() && state.category !== "Todos") {
        state.category = "Todos";
        renderCategories();
      }
      renderMenu();
    });

    dom.cats.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-cat]");
      if (!button) return;
      state.category = button.dataset.cat;
      renderCategories();
      renderMenu();
    });

    dom.menu.addEventListener("click", (event) => {
      const card = event.target.closest(".card");
      if (card) openProduct(Number(card.dataset.id));
    });

    // Detalhe do produto
    dom.options.addEventListener("click", (event) => {
      const button = event.target.closest(".stepBtn");
      if (button && !button.disabled) changePick(button.closest(".option"), Number(button.dataset.step));
    });
    dom.options.addEventListener("change", (event) => {
      const input = event.target.closest("input[data-group]");
      if (input) pickFromInput(input);
    });
    dom.add.addEventListener("click", addSelectedToCart);

    // Carrinho
    dom.cartItems.addEventListener("click", (event) => {
      const row = event.target.closest(".cartRow");
      if (!row) return;
      const button = event.target.closest(".stepBtn");
      if (button) {
        if (!button.disabled) changeQty(row.dataset.key, Number(button.dataset.step));
      } else if (event.target.closest(".remove")) {
        removeLine(row.dataset.key);
      }
    });
    dom.clearCart.addEventListener("click", () => {
      state.cart = [];
      commitCart();
    });
    dom.checkout.addEventListener("click", startCheckout);

    // Entrega ou retirada, e endereço
    dom.modeModal.addEventListener("click", (event) => {
      const choice = event.target.closest(".choice");
      if (!choice) return;
      state.fulfillment = choice.dataset.mode;
      renderMode();
    });
    dom.modeNext.addEventListener("click", () => goStep(state.fulfillment === "delivery" ? "address" : "pay"));
    dom.addressForm.addEventListener("input", onAddressInput);
    dom.addressForm.addEventListener("submit", submitAddress);

    // Pagamento
    dom.payWhere.addEventListener("click", (event) => {
      if (event.target.closest("[data-edit]")) goBack(dom.payModal);
    });
    dom.copyPix.addEventListener("click", copyPixKey);
    dom.sendWhats.addEventListener("click", sendOrder);

    // Fechar camadas: botão ×, clique no fundo escuro ou tecla Esc.
    // O fundo só fecha se o clique também COMEÇOU nele (evita fechar ao
    // selecionar texto num campo e soltar o mouse fora).
    let pressStartedOnBackdrop = false;
    document.addEventListener("pointerdown", (event) => {
      pressStartedOnBackdrop = event.target.classList.contains("modalBg") || event.target === dom.overlay;
    });
    document.addEventListener("click", (event) => {
      const back = event.target.closest("[data-back]");
      if (back) return goBack(back.closest(".modalBg"));

      const closer = event.target.closest("[data-close]");
      if (closer) return closeLayer(closer.closest(".modalBg, .drawer"));

      if (pressStartedOnBackdrop) {
        if (event.target.classList.contains("modalBg")) closeLayer(event.target);
        else if (event.target === dom.overlay) closeLayer(dom.drawer);
      }
      pressStartedOnBackdrop = false;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.layers.length) {
        closeLayer(state.layers[state.layers.length - 1]);
      }
    });
  }

  function init() {
    dom.statusHours.textContent = `${CONFIG.hours.open} às ${CONFIG.hours.close}`;
    dom.minOrder.textContent = money(MIN_ORDER_CENTS);
    dom.address.textContent = CONFIG.address;
    dom.deliveryFee.textContent = DELIVERY_FEE_CENTS ? `+ ${money(DELIVERY_FEE_CENTS)}` : "Grátis";
    dom.pickupAddress.textContent = CONFIG.address;
    dom.pix.textContent = CONFIG.pixKey;

    applyTheme(document.documentElement.classList.contains("dark")); // classe já aplicada pelo <head>
    restoreCart();
    restoreAddress();
    renderCategories();
    renderMenu();
    renderCart();
    updateStatus();
    setInterval(updateStatus, 30000);
    bindEvents();
    bindDrawerSwipe();
  }

  init();
})();

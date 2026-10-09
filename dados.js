/* =========================================================
   Brasa Burger — dados.js
   Tudo o que o dono do cardápio precisa editar fica aqui:
   configurações da loja e lista de produtos.
   (A lógica do site fica em app.js — não precisa mexer lá.)
   ========================================================= */

const CONFIG = {
  storeName: "Brasa Burger",
  pixKey: "pix@brasaburger.exemplo",   // TROQUE pela chave Pix real
  whatsapp: "5521972522280",           // TROQUE: DDI + DDD + número, só dígitos
  address: "Rua Montenegro, 555 — Brás Pina, Rio de Janeiro — RJ, 10107-000", // endereço fictício (retirada no balcão)
  minOrder: 20,                        // pedido mínimo, em reais
  deliveryFee: 5,                      // taxa de entrega, em reais (0 = entrega grátis)
  hours: { open: "19:00", close: "00:00" }, // "00:00" = meia-noite
  timeZone: "America/Sao_Paulo",       // horário usado no "Aberto/Fechado"
};

/* ---------- Atalhos para escrever os produtos ----------
   Os grupos de opções de um produto podem ser de 3 tipos:
     single  → o cliente escolhe UMA opção (obrigatório). Ex.: sabor da bebida.
     multi   → caixinhas de marcar, várias opções (opcional). Ex.: "Remover ingredientes".
     count   → cada opção tem  −  número  +  (opcional). Ex.: adicionais, molhos, complementos.
               O 3º parâmetro é o máximo por opção (padrão 5). */

const opt = (name, price = 0) => ({ name, price });                                    // uma opção (preço extra em reais)
const single = (title, options) => ({ title, type: "single", options });               // escolhe 1 (obrigatório)
const multi = (title, options) => ({ title, type: "multi", options });                 // marcar vários (opcional)
const extras = (title, options, max = 5) => ({ title, type: "count", options, max });  // −/número/+ (opcional)
const without = (...names) => multi("Remover ingredientes", names.map((n) => opt(n)));
const unsplash = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`;

/* ---------- Grupos de opções reaproveitados ---------- */

const SODA_FLAVORS = ["Coca-Cola", "Guaraná", "Fanta", "Sprite"].map((n) => opt(n));
const COMBO_DRINK = single("Escolha sua bebida", SODA_FLAVORS);
const FRY_EXTRAS = extras("Adicionais", [opt("Cheddar na batata", 4), opt("Bacon na batata", 5)]);
const SAUCES = extras("Molhos", [opt("Maionese da casa", 2), opt("Barbecue", 2), opt("Cheddar", 4)]);
const ACAI_TOPPINGS = extras("Complementos", [
  opt("Leite em pó", 2), opt("Granola", 2), opt("Banana", 2), opt("Morango", 3), opt("Leite condensado", 3),
]);
const ICE_CREAM_SYRUP = single("Calda", [opt("Sem calda"), opt("Chocolate", 2), opt("Morango", 2)]);

/* ---------- Cardápio ----------
   Cada produto precisa de: id (único), cat, name, price (em reais), img, desc e groups.
   A ordem abaixo é a ordem em que aparece no site. As categorias são criadas
   automaticamente a partir do campo "cat".
   Fotos: são de demonstração (Unsplash, uso livre) e cada produto tem a sua.
   Troque por fotos reais do estabelecimento antes de usar comercialmente
   (use  img: "fotos/nome.jpg"  para um arquivo seu, ou outra URL). */

const PRODUCTS = [
  /* ===== Hambúrgueres ===== */
  {
    id: 1, cat: "Hambúrgueres", name: "Brasa Clássico", price: 29.9,
    img: unsplash("photo-1568901346375-23c9450c58cd"),
    desc: "Pão brioche, hambúrguer bovino 160g, queijo, alface, tomate e molho da casa.",
    groups: [
      without("Sem cebola", "Sem tomate", "Sem alface", "Sem molho"),
      extras("Adicionais", [opt("Bacon crocante", 5), opt("Queijo extra", 4), opt("Ovo", 3.5)]),
    ],
  },
  {
    id: 2, cat: "Hambúrgueres", name: "Duplo da Casa", price: 39.9,
    img: unsplash("photo-1785502107546-4048640859bb"),
    desc: "Dois hambúrgueres bovinos, cheddar, cebola caramelizada e molho especial.",
    groups: [
      without("Sem cebola", "Sem cheddar", "Sem molho"),
      extras("Adicionais", [opt("Bacon crocante", 5), opt("Queijo extra", 4)]),
    ],
  },
  {
    id: 3, cat: "Hambúrgueres", name: "Frango Crocante", price: 31.9,
    img: unsplash("photo-1692737349870-e3bfc704ebf9"),
    desc: "Frango crocante, queijo, alface, tomate e maionese temperada.",
    groups: [
      without("Sem alface", "Sem tomate", "Sem maionese"),
      extras("Adicionais", [opt("Bacon crocante", 5), opt("Queijo extra", 4)]),
    ],
  },
  {
    id: 4, cat: "Hambúrgueres", name: "Barbecue Bacon", price: 36.9,
    img: unsplash("photo-1553979459-d2229ba7433b"),
    desc: "Hambúrguer bovino, cheddar, bacon crocante e barbecue defumado.",
    groups: [
      without("Sem bacon", "Sem cheddar", "Sem barbecue"),
      extras("Adicionais", [opt("Bacon extra", 5), opt("Queijo extra", 4)]),
    ],
  },
  {
    id: 5, cat: "Hambúrgueres", name: "Brasa Veggie", price: 32.9,
    img: unsplash("photo-1520072959219-c595dc870360"),
    desc: "Burger vegetal, queijo, alface, tomate, cebola roxa e molho da casa.",
    groups: [
      without("Sem queijo", "Sem tomate", "Sem cebola", "Sem molho"),
      extras("Adicionais", [opt("Queijo extra", 4), opt("Ovo", 3.5)]),
    ],
  },

  /* ===== Combos ===== */
  {
    id: 6, cat: "Combos", name: "Combo Brasa", price: 44.9,
    img: unsplash("photo-1624855600799-ac8e8bddd1da"),
    desc: "Um Brasa Clássico com batata frita e refrigerante lata.",
    groups: [COMBO_DRINK, FRY_EXTRAS],
  },
  {
    id: 7, cat: "Combos", name: "Combo Duplo", price: 54.9,
    img: unsplash("photo-1785064138524-fdb0287e2918"),
    desc: "Duplo da Casa, batata crocante e refrigerante de 350 ml.",
    groups: [COMBO_DRINK, FRY_EXTRAS],
  },

  /* ===== Porções ===== */
  {
    id: 8, cat: "Porções", name: "Batata Crocante", price: 18.9,
    img: unsplash("photo-1573080496219-bb080dd4f877"),
    desc: "Porção individual de batatas crocantes com molho da casa.",
    groups: [SAUCES],
  },
  {
    id: 9, cat: "Porções", name: "Batata com Cheddar e Bacon", price: 27.9,
    img: unsplash("photo-1743193711514-4f7bc5d78d4d"),
    desc: "Batata crocante coberta com cheddar cremoso e bacon.",
    groups: [extras("Adicionais", [opt("Bacon extra", 5), opt("Cheddar extra", 4)])],
  },
  {
    id: 10, cat: "Porções", name: "Onion Rings", price: 22.9,
    img: unsplash("photo-1639024471283-03518883512d"),
    desc: "Anéis de cebola empanados e crocantes, servidos com molho da casa.",
    groups: [SAUCES],
  },
  {
    id: 11, cat: "Porções", name: "Nuggets Crocantes", price: 21.9,
    img: unsplash("photo-1562967914-608f82629710"),
    desc: "Nuggets dourados e crocantes com opção de molho.",
    groups: [SAUCES],
  },
  {
    id: 26, cat: "Porções", name: "Mandioca Frita", price: 19.9,
    img: unsplash("photo-1684893265739-a88b30c33e92"),
    desc: "Mandioca frita crocante por fora e macia por dentro.",
    groups: [SAUCES],
  },
  {
    id: 25, cat: "Porções", name: "Calabresa Acebolada", price: 26.9,
    img: unsplash("photo-1695089026973-c1067361d0e1"),
    desc: "Porção de calabresa acebolada para compartilhar.",
    groups: [extras("Adicionais", [opt("Cheddar", 4), opt("Bacon", 5)])],
  },

  /* ===== Bebidas ===== */
  {
    id: 13, cat: "Bebidas", name: "Coca-Cola 600 ml", price: 8.9,
    img: unsplash("photo-1567103472667-6898f3a79cf2"),
    desc: "Garrafa de Coca-Cola bem gelada, 600 ml.",
    groups: [],
  },
  {
    id: 15, cat: "Bebidas", name: "Água Mineral", price: 4.5,
    img: unsplash("photo-1616118132534-381148898bb4"),
    desc: "Água mineral sem gás, 500 ml.",
    groups: [],
  },
  {
    id: 14, cat: "Bebidas", name: "Suco Natural", price: 9.9,
    img: unsplash("photo-1600271886742-f049cd451bba"),
    desc: "Suco natural gelado, preparado na hora.",
    groups: [single("Escolha o sabor", [opt("Laranja"), opt("Maracujá"), opt("Morango", 1)])],
  },
  {
    id: 22, cat: "Bebidas", name: "Suco de Abacaxi com Hortelã", price: 11.9,
    img: unsplash("photo-1681251282201-d3b78a867e47"),
    desc: "Suco natural refrescante de abacaxi com hortelã.",
    groups: [],
  },
  {
    id: 23, cat: "Bebidas", name: "Suco de Acerola", price: 10.9,
    img: unsplash("photo-1560526860-1f0e56046c85"),
    desc: "Suco natural gelado de acerola.",
    groups: [],
  },
  {
    id: 24, cat: "Bebidas", name: "Suco de Limão", price: 9.9,
    img: unsplash("photo-1623084921164-4a8c5c37a912"),
    desc: "Suco de limão bem gelado e refrescante.",
    groups: [single("Escolha o preparo", [opt("Natural"), opt("Com hortelã", 1)])],
  },
  {
    id: 16, cat: "Bebidas", name: "Milk-shake de Chocolate", price: 16.9,
    img: unsplash("photo-1579954115545-a95591f28bfc"),
    desc: "Milk-shake cremoso de chocolate, servido gelado.",
    groups: [extras("Adicionais", [opt("Chantilly", 2), opt("Calda extra", 2)])],
  },

  /* ===== Açaí ===== */
  {
    id: 17, cat: "Açaí", name: "Açaí 300 ml", price: 14.9,
    img: unsplash("photo-1627308594190-a057cd4bfac8"),
    desc: "Açaí cremoso servido gelado, perfeito para fechar o pedido.",
    groups: [ACAI_TOPPINGS],
  },
  {
    id: 18, cat: "Açaí", name: "Açaí 500 ml", price: 20.9,
    img: unsplash("photo-1612974443138-a2c494d78dfb"),
    desc: "Açaí maior para matar a vontade de verdade.",
    groups: [ACAI_TOPPINGS],
  },

  /* ===== Sobremesas ===== */
  {
    id: 19, cat: "Sobremesas", name: "Sorvete de Chocolate", price: 9.9,
    img: unsplash("photo-1597648152428-f883fbc9c873"),
    desc: "Sorvete cremoso de chocolate.",
    groups: [ICE_CREAM_SYRUP],
  },
  {
    id: 20, cat: "Sobremesas", name: "Sorvete de Creme", price: 9.9,
    img: unsplash("photo-1628815870980-f416105d89b3"),
    desc: "Sorvete cremoso de creme.",
    groups: [ICE_CREAM_SYRUP],
  },
  {
    id: 21, cat: "Sobremesas", name: "Brownie com Sorvete", price: 18.9,
    img: unsplash("photo-1606884285898-277317a7bf12"),
    desc: "Brownie macio acompanhado de uma bola de sorvete.",
    groups: [single("Escolha o sorvete", [opt("Chocolate"), opt("Creme")])],
  },
];

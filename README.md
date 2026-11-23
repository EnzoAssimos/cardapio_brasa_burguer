# Brasa Burger — Cardápio digital

🔗 **Ver o site:** https://enzoassimos.github.io/cardapio_brasa_burguer/

Cardápio digital de hamburgueria (loja fictícia) com pedido completo pelo celular.

**Destaques**
- Carrinho com adicionais, contador e pedido mínimo
- Entrega ou retirada, com taxa calculada no total
- Endereço preenchido sozinho pelo CEP (ViaCEP)
- Pagamento via Pix e pedido enviado pronto pelo WhatsApp
- Tema claro e escuro, layout pensado para celular

**Tecnologias:** HTML, CSS e JavaScript puro

---


Site estático (HTML, CSS e JavaScript puros, sem instalar nada). Para ver, basta abrir o `index.html` no navegador.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | Estrutura da página (topo, cardápio, carrinho, janelas) e os ícones |
| `style.css` | Visual. As cores dos temas claro/escuro ficam no começo do arquivo |
| `dados.js` | **O que você edita**: Pix, WhatsApp, endereço, horário, taxa, pedido mínimo e produtos |
| `app.js` | Lógica do site (busca, carrinho, entrega, pagamento). Normalmente não precisa mexer |

## Configuração

Abra `dados.js` e altere o bloco `CONFIG`:

```js
const CONFIG = {
  storeName: "Brasa Burger",
  pixKey: "SUA_CHAVE_PIX",
  whatsapp: "55SEUNUMERO",        // DDI + DDD + número, só dígitos
  address: "Endereço real aqui",  // também aparece como local de retirada
  minOrder: 20,                   // pedido mínimo, em reais
  deliveryFee: 5,                 // taxa de entrega, em reais (0 = entrega grátis)
  hours: { open: "19:00", close: "00:00" },
  timeZone: "America/Sao_Paulo",
};
```

O nome da loja que aparece no topo da página fica no `index.html` (procure por `Brasa Burger`).

## Editar o cardápio

Cada produto em `dados.js` segue este formato:

```js
{
  id: 27, cat: "Porções", name: "Nome do produto", price: 24.9,
  img: unsplash("photo-XXXX"),          // ou "fotos/nome.jpg" (arquivo seu) ou uma URL
  desc: "Descrição curta.",
  groups: [
    without("Sem cebola", "Sem tomate"),                        // caixinhas: remover ingredientes
    extras("Adicionais", [opt("Bacon", 5), opt("Queijo", 4)]),  // − número + (padrão: até 5 de cada)
    single("Escolha o sabor", [opt("Laranja"), opt("Limão")]),  // escolhe 1, obrigatório
  ],
},
```

- `extras(título, opções, máximo)` mostra o contador − número + em cada opção. O terceiro parâmetro é opcional (ex.: `extras("Molhos", [...], 3)`).
- `multi(...)` mostra caixinhas de marcar; `single(...)` obriga a escolher uma opção.
- O `id` precisa ser único.
- As categorias do site são criadas sozinhas a partir de `cat`; a ordem dos produtos no arquivo é a ordem no site.
- Grupos repetidos (molhos, bebidas do combo etc.) ficam definidos uma vez no topo do arquivo e são reaproveitados.

## Como funciona o pedido

1. O cliente monta o carrinho (pedido mínimo configurável).
2. **Entrega ou retirada.** Na retirada não há taxa. Na entrega soma-se `deliveryFee`.
3. Se for entrega, preenche o endereço (CEP, rua, número, complemento, bairro, cidade, UF e ponto de referência). Ao digitar o CEP, rua, bairro, cidade e UF são preenchidos sozinhos pelo serviço gratuito ViaCEP. Se a consulta falhar, o cliente preenche à mão. O endereço fica salvo no navegador para os próximos pedidos.
4. **Pagamento.** O resumo mostra cada item com seus adicionais, o subtotal, a taxa de entrega (ou "Retirada na loja: grátis") e o total a pagar. O cliente faz o Pix com a chave mostrada.
5. Ao clicar em "Paguei — enviar pedido e comprovante", o WhatsApp abre com o pedido pronto (itens, subtotal, taxa, total e endereço); o cliente anexa o comprovante e envia.

## Avisos importantes

- As fotos são de demonstração (Unsplash). Para um cliente real, troque por fotos que você tenha autorização para usar e que mostrem o prato de verdade.
- O Pix **não é verificado automaticamente**; a confirmação é manual pelo WhatsApp.
- A taxa de entrega é única para qualquer endereço; o site não calcula distância nem bloqueia CEPs fora da área de entrega.
- O endereço da loja é fictício e deve ser trocado pelo real.
- O "Aberto/Fechado" é só um indicador visual (usa o horário de `America/Sao_Paulo`); ele não bloqueia pedidos.
- O carrinho fica salvo no navegador do cliente: se ele recarregar a página, não perde os itens.
- A busca de CEP precisa de internet e do serviço ViaCEP no ar; sem isso o preenchimento manual continua funcionando.

## O que mudou nesta versão

- **Celular: cardápio em 2 colunas**, com cards menores (foto quadrada, descrição em até 2 linhas, botão **+** de 36px). Em celulares comuns cabem 4 produtos inteiros na tela; em telas bem curtas (como 375×667) aparecem 2 inteiros e o resto aparece ao rolar.
- **Aba "Todos" separada por categoria**: cada categoria ganha um título em maiúsculas (HAMBÚRGUERES, COMBOS, PORÇÕES...) acima dos seus produtos, na ordem em que estão no `dados.js`. Ao escolher uma categoria específica, o título some e só aparecem os produtos dela. A busca também agrupa os resultados por categoria.
- **Carrinho fecha com o dedo (celular)**: com o carrinho aberto, arrastar da esquerda para a direita fecha. A gaveta acompanha o dedo; se soltar depois de arrastar mais de ~90px (ou num movimento rápido) ela fecha, senão volta ao lugar. O botão **×** e o toque no fundo continuam funcionando, e rolar a lista de itens para cima e para baixo não é afetado.
- **Foto do produto sem degradê**: removido o degradê branco (tema claro) / preto (tema escuro) e a sombra que cobriam a parte de baixo da foto na janela do produto.
- No PC continuam 3 colunas, agora também com os títulos de categoria.

### Versão anterior

- Topo sem o texto grande; o "Aberto/Fechado" ficou ao lado do nome da loja, sem fundo.
- Botão **+** vermelho no lugar de "Adicionar".
- Emojis trocados por ícones de uma cor só, que seguem o tema claro/escuro.
- Adicionais, molhos e complementos com contador − número +; no carrinho e nos adicionais o número "rola" ao mudar (sobe ao somar, desce ao tirar).
- Bolinha do "adicionar ao carrinho" maior, em arco e com rastro; o número do carrinho só sobe quando ela chega.
- Novas telas: Entrega ou retirada → Endereço → Pagamento, com taxa e cobranças explícitas.
- Lupa da busca centralizada com o texto; "Refrigerante Lata" removido; fotos trocadas.

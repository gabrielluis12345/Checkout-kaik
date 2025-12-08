// ⚡ server.js corrigido para Railway + Mercado Pago

import express from "express";
const app = express();

app.use(express.json());
app.use(express.static("."));

// CONFIG SUA
const ACCESS_TOKEN = "APP_USR-7919662293588734-120813-aad15c42e877020e9ff8a910e1f4173b-749376790";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzSZI_jlMYTzeq2KraMaSirAUpHhWM7LGwtIbnd-xhU2vnPSQP7pPdvZYzSXQn7VYqO2A/exec";


// ===========================
// 1. CRIAR PREFERÊNCIA
// ===========================
app.post("/criar-preferencia", async (req, res) => {

  const dados = req.body;

  try {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{
          title: "Produto",
          quantity: Number(dados.quantidade),
          unit_price: Number(dados.valor)
        }],
        metadata: dados,
        back_urls: {
          success: "https://checkout-kaik-production-4bce.up.railway.app/sucesso.html",
          failure: "https://checkout-kaik-production-4bce.up.railway.app/falha.html",
          pending: "https://checkout-kaik-production-4bce.up.railway.app/pendente.html"
        },
        auto_return: "approved"
      })
    });

    const data = await response.json();

    res.json({ init_point: data.init_point });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ error: "Erro no servidor" });
  }
});


// ===========================
// 2. WEBHOOK DO MERCADO PAGO
// ===========================
app.post("/notificacao", async (req, res) => {

  console.log("Webhook recebido:", req.body);

  try {
    const paymentId =
      req.body.data?.id || req.query['data.id'];

    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
    });

    const pagamento = await resp.json();

    const dados = pagamento.metadata || {};

    await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: dados.nome || "",
        cpf: dados.cpf || "",
        telefone: dados.telefone || "",
        quantidade: dados.quantidade || "",
        valor: dados.valor || "",
        status: pagamento.status,
        payment_id: pagamento.id
      })
    });

    res.sendStatus(200);

  } catch (erro) {
    console.error("Erro no webhook:", erro);
    res.sendStatus(500);
  }
});


// Porta
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));





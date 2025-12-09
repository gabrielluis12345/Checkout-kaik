// ⚡ server.js corrigido para Railway + Mercado Pago

import express from "express";
const app = express();

app.use(express.json());
app.use(express.static("."));

// CONFIG SUA
const ACCESS_TOKEN = "APP_USR-5555886528536836-120817-65519b58bbfe00e9d566f1e1c795ac69-749376790";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzoY1EQg1_94KDH_iV03i0j04ICjxmHK-bks2AuxTE2ujJA8ygp8JKbnvHTOhQ9IaQolQ/exec";

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

        notification_url: "https://checkout-kaik-production-4bce.up.railway.app/notificacao",

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
  console.log("📩 Webhook recebido:", req.body);

  try {
    let paymentId = null;

    if (req.body.type === "payment" || req.body.action === "payment.updated") {
      paymentId = req.body.data?.id;
    }

    if (!paymentId && (req.body.type === "merchant_order" || req.body.topic === "merchant_order")) {
      const orderId = req.body.id;

      const orderResp = await fetch(`https://api.mercadopago.com/merchant_orders/${orderId}`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
      });

      const orderData = await orderResp.json();
      console.log("🧾 Dados da merchant order:", orderData);

      if (orderData.payments?.length > 0) {
        paymentId = orderData.payments[0].id;
      }
    }

    if (!paymentId) {
      console.log("⚠ Nenhum paymentId encontrado.");
      return res.sendStatus(200);
    }

    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
    });

    const pagamento = await resp.json();
    console.log("💰 Pagamento encontrado:", pagamento);

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

    console.log("📊 Enviado para planilha.");
    res.sendStatus(200);

  } catch (erro) {
    console.error("❌ Erro no webhook:", erro);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));










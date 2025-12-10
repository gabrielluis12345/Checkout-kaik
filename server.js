// ⚡ server.js corrigido para Railway + Mercado Pago

const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔵 Servir toda a pasta pública (HTML, CSS, JS, imagens)
app.use(express.static(__dirname));

// TOKEN MP
const TOKEN = "";

// Google Planilha
const PLANILHA_URL = "https://script.google.com/macros/s/AKfycbzoY1EQg1_94KDH_iV03i0j04ICjxmHK-bks2AuxTE2ujJA8ygp8JKbnvHTOhQ9IaQolQ/exec";

// 🔵 Rota inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 🔵 Tela de sucesso
app.get("/sucesso", (req, res) => {
  res.sendFile(path.join(__dirname, "sucesso.html"));
});

// 🔵 Criar pagamento PIX
app.post("/criar-pagamento", async (req, res) => {
  const data = req.body;

  // Salvar na planilha como pending
  await fetch(PLANILHA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      status: "pending",
      payment_id: "aguardando"
    })
  });

  // Criar pagamento PIX
  const pagamento = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${Date.now()}-${Math.random()}`
    },
    body: JSON.stringify({
      transaction_amount: Number(data.valor),
      description: "Rifa Viva Sorte",
      payment_method_id: "pix",
      notification_url: "https://checkout-kaik-production-4bce.up.railway.app/notificacao",
      payer: {
        email: data.email,
        first_name: data.nome
      }
    })
  });

  const r = await pagamento.json();

  if (r.error) {
    console.log("ERRO MERCADO PAGO:", r);
    return res.json({ erro: r });
  }

  return res.json({
    id: r.id,
    qr: r.point_of_interaction?.transaction_data?.qr_code_base64,
    code: r.point_of_interaction?.transaction_data?.qr_code
  });
});

// 🔵 Verificar pagamento
app.get("/verificar/:id", async (req, res) => {
  const id = req.params.id;

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { "Authorization": `Bearer ${TOKEN}` }
  });

  const pag = await r.json();
  return res.json({ status: pag.status });
});

// 🔵 Webhook Mercado Pago
app.post("/notificacao", async (req, res) => {
  try {
    const id = req.body.data?.id;
    if (!id) return res.sendStatus(200);

    const mp = await fetch(
      `https://api.mercadopago.com/v1/payments/${id}`,
      { headers: { "Authorization": `Bearer ${TOKEN}` } }
    );

    const pag = await mp.json();

    if (pag.status === "approved") {
      await fetch(PLANILHA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: pag.payer.first_name,
          email: pag.payer.email,
          valor: pag.transaction_amount,
          status: "approved",
          payment_id: id
        })
      });
    }
  } catch (error) {
    console.log("Erro no webhook:", error);
  }

  res.sendStatus(200);
});

// 🔵 Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("SERVIDOR RODANDO NA PORTA " + PORT));


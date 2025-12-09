// ⚡ server.js corrigido para Railway + Mercado Pago

const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Servir o index
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// TOKEN Mercado Pago
const TOKEN = "APP_USR-5555886528536836-120817-65519b58bbfe00e9d566f1e1c795ac69-749376790";

// Google Planilha (Apps Script)
const PLANILHA_URL = "https://script.google.com/macros/s/AKfycbzoY1EQg1_94KDH_iV03i0j04ICjxmHK-bks2AuxTE2ujJA8ygp8JKbnvHTOhQ9IaQolQ/exec";


// =====================================================
// 🔵 CRIAR PAGAMENTO PIX
// =====================================================
app.post("/criar-pagamento", async (req, res) => {
  const data = req.body;

  // 🛑 Verificação simples de e-mail
  if (!data.email || !data.email.includes("@")) {
    return res.json({ erro: "E-mail inválido ou não enviado!" });
  }

  // 🔹 Salvar na planilha como pendente
  await fetch(PLANILHA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      status: "pending",
      payment_id: "aguardando"
    })
  });

  // 🔹 Criar PIX no Mercado Pago
  const pagamento = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transaction_amount: Number(data.valor),
      description: "Rifa Viva Sorte",
      payment_method_id: "pix",
      notification_url: "https://checkout-kaik-production-4bce.up.railway.app/notificacao",

      payer: {
        email: data.email || "cliente@teste.com",
        first_name: data.nome || "Cliente"
      }
    })
  });

  const r = await pagamento.json();

  // Se der erro, retornar
  if (r.error) {
    console.log("ERRO MERCADO PAGO:", r);
    return res.json({ erro: r });
  }

  // 🔹 Retorna QR Code para o front
  return res.json({
    id: r.id,
    qr: r.point_of_interaction?.transaction_data?.qr_code_base64,
    code: r.point_of_interaction?.transaction_data?.qr_code
  });
});


// =====================================================
// 🔵 ROTA PARA O FRONT VERIFICAR STATUS DO PIX
// =====================================================
app.get("/verificar/:id", async (req, res) => {
  const id = req.params.id;

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { "Authorization": `Bearer ${TOKEN}` }
  });

  const pag = await r.json();

  return res.json({ status: pag.status });
});


// =====================================================
// 🔵 WEBHOOK (Mercado Pago → Seu servidor)
// =====================================================
app.post("/notificacao", async (req, res) => {
  try {
    const id = req.body.data?.id;
    if (!id) return res.sendStatus(200);

    // Consulta o pagamento no MP
    const mp = await fetch(
      `https://api.mercadopago.com/v1/payments/${id}`,
      { headers: { "Authorization": `Bearer ${TOKEN}` } }
    );

    const pag = await mp.json();

    // Se aprovado → salva na planilha
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

  // Sempre responder 200 OK
  res.sendStatus(200);
});


// =====================================================
// 🔵 INICIAR SERVIDOR
// =====================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));

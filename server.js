// ⚡ server.js corrigido para Railway + Mercado Pago

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const TOKEN = "APP_USR-5555886528536836-120817-65519b58bbfe00e9d566f1e1c795ac69-749376790";
const PLANILHA_URL = "https://script.google.com/macros/s/AKfycbzoY1EQg1_94KDH_iV03i0j04ICjxmHK-bks2AuxTE2ujJA8ygp8JKbnvHTOhQ9IaQolQ/exec";

// =====================================================
// 🔵 CRIAR PAGAMENTO PIX
// =====================================================
app.post("/criar-pagamento", async (req, res) => {
  const data = req.body;

  //–– Criar pagamento PIX
  const mp = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transaction_amount: Number(data.valor),
      description: "Produto Exemplo",
      payment_method_id: "pix",
      payer: {
        email: data.email,
        first_name: data.nome
      },
      metadata: data
    })
  });

  const r = await mp.json();

  // Resposta para o front
  res.json({
    id: r.id,
    qr: "data:image/png;base64," + r.point_of_interaction.transaction_data.qr_code_base64,
    code: r.point_of_interaction.transaction_data.qr_code
  });
});

// =====================================================
// 🔵 VERIFICAR STATUS DO PIX
// =====================================================
app.get("/verificar/:id", async (req, res) => {
  const id = req.params.id;

  const mp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { "Authorization": `Bearer ${TOKEN}` }
  });

  const r = await mp.json();
  res.json({ status: r.status });
});

// =====================================================
// 🔵 WEBHOOK OFICIAL DO MERCADO PAGO
// =====================================================
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.type !== "payment") return res.sendStatus(200);

    const id = req.body.data.id;

    const mp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { "Authorization": `Bearer ${TOKEN}` }
    });

    const pag = await mp.json();

    if (pag.status === "approved") {
      await fetch(PLANILHA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pag.metadata,
          status: "approved",
          payment_id: id
        })
      });
    }

    res.sendStatus(200);
  } catch (e) {
    console.log("Erro webhook:", e);
    res.sendStatus(500);
  }
});


// =====================================================
// SERVIDOR
// =====================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✔ Servidor rodando porta " + PORT));

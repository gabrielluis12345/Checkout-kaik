// ⚡ server.js corrigido para Railway + Mercado Pago

import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const TOKEN = "APP_USR-5555886528536836-120817-65519b58bbfe00e9d566f1e1c795ac69-749376790";
const PLANILHA_URL = "https://script.google.com/macros/s/AKfycbzoY1EQg1_94KDH_iV03i0j04ICjxmHK-bks2AuxTE2ujJA8ygp8JKbnvHTOhQ9IaQolQ/exec";

// 🔵 Criar pagamento PIX interno
app.post("/criar-pagamento", async (req, res) => {
  const data = req.body;

  // salva como "pending" na planilha
  await fetch(PLANILHA_URL, {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify({
      nome: data.nome,
      cpf: data.cpf,
      email: data.email,
      nascimento: data.nascimento,
      telefone: data.telefone,
      quantidade: data.quantidade,
      valor: data.valor,
      status: "pending",
      payment_id: "aguardando"
    })
  });

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
      payer: { email: data.email }
    })
  });

  const r = await mp.json();

  res.json({
    id: r.id,
    qr: r.point_of_interaction.transaction_data.qr_code_base64,
    code: r.point_of_interaction.transaction_data.qr_code
  });
});

// 🔵 VERIFICAR STATUS DO PAGAMENTO
app.get("/verificar/:id", async (req, res) => {
  const id = req.params.id;

  const mp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { "Authorization": `Bearer ${TOKEN}` }
  });

  const r = await mp.json();
  res.json({ status: r.status });
});

// 🔵 WEBHOOK DO MERCADO PAGO
app.post("/webhook", async (req, res) => {
  if (req.body.type === "payment") {
    const id = req.body.data.id;

    const mp = await fetch(
      `https://api.mercadopago.com/v1/payments/${id}`,
      { headers: { "Authorization": `Bearer ${TOKEN}` } }
    );

    const pag = await mp.json();

    if (pag.status === "approved") {
      await fetch(PLANILHA_URL, {
        method: "POST",
        contentType: "application/json",
        payload: JSON.stringify({
          nome: pag.payer.first_name || "",
          cpf: "",
          email: pag.payer.email,
          nascimento: "",
          telefone: "",
          quantidade: 1,
          valor: pag.transaction_amount,
          status: "approved",
          payment_id: id
        })
      });
    }
  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));


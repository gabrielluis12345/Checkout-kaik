// ⚡ server.js corrigido para Railway + Mercado Pago

const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔵 Servir index.html na raiz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 🔵 Seu token do Mercado Pago
const TOKEN = "APP_USR-5555886528536836-120817-65519b58bbfe00e9d566f1e1c795ac69-749376790";

// 🔵 URL do Apps Script da planilha
const PLANILHA_URL = "https://script.google.com/macros/s/AKfycbzoY1EQg1_94KDH_iV03i0j04ICjxmHK-bks2AuxTE2ujJA8ygp8JKbnvHTOhQ9IaQolQ/exec";


// ===============================================
// 🔵 1 — CRIAR PAGAMENTO PIX (checkout interno)
// ===============================================
app.post("/criar-pagamento", async (req, res) => {
  const data = req.body;

  // Salva na planilha como pending
  await fetch(PLANILHA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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

  // Criar pagamento PIX pelo Mercado Pago
  const mp = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transaction_amount: 2.00,
      description: "Produto Exemplo",
      payment_method_id: "pix",
      payer: { email: data.email }
    })
  });

  const r = await mp.json();

  console.log("Pagamento criado:", r);

  return res.json({
    id: r.id,
    qr: r.point_of_interaction.transaction_data.qr_code_base64,
    code: r.point_of_interaction.transaction_data.qr_code
  });
});


// ===============================================
// 🔵 2 — VERIFICAR STATUS DO PAGAMENTO
// ===============================================
app.get("/verificar/:id", async (req, res) => {
  const id = req.params.id;

  const mp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { "Authorization": `Bearer ${TOKEN}` }
  });

  const r = await mp.json();

  return res.json({ status: r.status });
});


// ===============================================
// 🔵 3 — WEBHOOK (MP envia confirmação automática)
// ===============================================
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.type === "payment") {
      const id = req.body.data.id;

      const mp = await fetch(
        `https://api.mercadopago.com/v1/payments/${id}`,
        { headers: { "Authorization": `Bearer ${TOKEN}` } }
      );

      const pag = await mp.json();

      // Se aprovado, salva na planilha
      if (pag.status === "approved") {
        await fetch(PLANILHA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: pag.payer.first_name || "",
            cpf: "",
            email: pag.payer.email || "",
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
  } catch (err) {
    console.log("Erro webhook:", err);
  }

  return res.sendStatus(200);
});


// ===============================================
// 🔵 4 — INICIAR SERVIDOR
// ===============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));


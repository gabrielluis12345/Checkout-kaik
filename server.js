// ⚡ server.js corrigido para Railway + Mercado Pago

const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const TOKEN = "APP_USR-5555886528536836-120817-65519b58bbfe00e9d566f1e1c795ac69-749376790";
const PLANILHA_URL = "https://script.google.com/macros/s/AKfycbzoY1EQg1_94KDH_iV03i0j04ICjxmHK-bks2AuxTE2ujJA8ygp8JKbnvHTOhQ9IaQolQ/exec";

// 🔵 Criar pagamento PIX
app.post("/criar-pagamento", async (req, res) => {
  const data = req.body;

  try {
    // Salva como pending
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

    const mp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        transaction_amount: Number(data.valor),
        description: "Produto",
        payment_method_id: "pix",
        payer: { email: data.email }
      })
    });

    const r = await mp.json();

    return res.json({
      id: r.id,
      qr: r.point_of_interaction.transaction_data.qr_code_base64,
      code: r.point_of_interaction.transaction_data.qr_code
    });

  } catch (error) {
    console.error("ERRO /criar-pagamento:", error);
    res.status(500).send("Erro interno");
  }
});

// 🔵 Verificar status
app.get("/verificar/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const mp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { "Authorization": `Bearer ${TOKEN}` }
    });

    const r = await mp.json();
    return res.json({ status: r.status });

  } catch (error) {
    console.error("ERRO /verificar:", error);
    res.status(500).json({ status: "erro" });
  }
});

// 🔵 WEBHOOK Mercado Pago
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.type === "payment") {
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

  } catch (error) {
    console.error("ERRO /webhook:", error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));


import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());
app.use(express.static("."));

// CONFIG SUA
const ACCESS_TOKEN = "APP_USR-4470259940372106-120813-e8e508187572339bf7d5027a95dfcd70-3049555673";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzSZI_jlMYTzeq2KraMaSirAUpHhWM7LGwtIbnd-xhU2vnPSQP7pPdvZYzSXQn7VYqO2A/exec";

app.post("/criar-preferencia", async (req, res) => {

  const { nome, cpf, telefone, quantidade, valor } = req.body;

  console.log("Dados recebidos do front:", req.body);

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
          quantity: Number(quantidade),
          unit_price: Number(valor)
        }],

        // 🔥 **CORREÇÃO AQUI**
        back_urls: {
          success: "http://localhost:3000/sucesso.html",
          failure: "http://localhost:3000/falha.html",
          pending: "http://localhost:3000/pendente.html"
        },
        auto_return: "approved"

      }),
    });

    const data = await response.json();
    console.log("Resposta do Mercado Pago:", data);

    if (!data.init_point) {
      return res.status(500).json({ error: "Erro ao criar link de pagamento", data: data });
    }

    // SALVAR NO GOOGLE SHEETS
    await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, cpf, telefone, quantidade, valor })
    });

    res.json({ init_point: data.init_point });

  } catch (erro) {
    console.error("ERRO GERAL:", erro);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.listen(3000, () => {
  console.log("Backend rodando em http://localhost:3000");
});

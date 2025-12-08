// ⚡ server.js corrigido para Railway + Mercado Pago

import express from "express";
import fetch from "node-fetch";

const app = express();

// Configurações do express
app.use(express.json()); // Substitui bodyParser
app.use(express.static("."));

// CONFIG SUA
const ACCESS_TOKEN = "APP_USR-4470259940372106-120813-e8e508187572339bf7d5027a95dfcd70-3049555673";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzSZI_jlMYTzeq2KraMaSirAUpHhWM7LGwtIbnd-xhU2vnPSQP7pPdvZYzSXQn7VYqO2A/exec";

// Rota para criar preferência do Mercado Pago
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
          quantity: Number(quantidade) || 1,   // Garantindo número válido
          unit_price: Number(valor) || 1       // Garantindo número válido
        }],
        back_urls: {
          success: "https://checkout-kaik-production.up.railway.app/sucesso.html",
          failure: "https://checkout-kaik-production.up.railway.app/falha.html",
          pending: "https://checkout-kaik-production.up.railway.app/pendente.html"
        },
        auto_return: "approved"
      }),
    });

    const data = await response.json();
    console.log("Resposta do Mercado Pago:", data);

    if (!data.init_point) {
      return res.status(500).json({ error: "Erro ao criar link de pagamento", data });
    }

    // Salvar no Google Sheets
    await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, cpf, telefone, quantidade, valor })
    });

    // Retornar link do Mercado Pago para o frontend
    res.json({ init_point: data.init_point });

  } catch (erro) {
    console.error("ERRO GERAL:", erro);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});

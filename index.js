const express = require('express');
const axios   = require('axios');
const app     = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const TWILIO_SID    = process.env.TWILIO_SID;
const TWILIO_TOKEN  = process.env.TWILIO_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

const SYSTEM_PROMPT = `Eres el Asesor Constitucional oficial de Colombia. Responde SIEMPRE en español. Eres experto en la Constitución Política de Colombia de 1991. Cita siempre el artículo exacto. Máximo 200 palabras por respuesta.`;

const memoria = {};

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const from    = req.body.From;
    const mensaje = req.body.Body;
    if (!from || !mensaje) return;

    if (!memoria[from]) memoria[from] = [];
    memoria[from].push({ role: 'user', content: mensaje });
    if (memoria[from].length > 10) memoria[from].shift();

    const aiRes = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: memoria[from]
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    const respuesta = aiRes.data.content[0].text;
    memoria[from].push({ role: 'assistant', content: respuesta });

    const twilio = require('twilio')(TWILIO_SID, TWILIO_TOKEN);
    await twilio.messages.create({
      from: TWILIO_NUMBER,
      to:   from,
      body: respuesta
    });

  } catch (e) {
    console.error('Error:', e.message);
  }
});

app.get('/', (req, res) => res.send('🇨🇴 Bot Constitucional activo ✅'));

app.listen(process.env.PORT || 3000, () =>
  console.log('✅ Bot activo'));

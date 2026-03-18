const express = require('express');
const axios   = require('axios');
const twilio  = require('twilio');
const app     = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const ANTHROPIC_KEY  = process.env.ANTHROPIC_KEY;
const TWILIO_SID     = process.env.TWILIO_SID;
const TWILIO_TOKEN   = process.env.TWILIO_TOKEN;
const TWILIO_NUMBER  = process.env.TWILIO_NUMBER; // whatsapp:+14155238886

const SYSTEM_PROMPT = `Eres el Asesor Constitucional oficial de Colombia.
Eres un experto jurídico especializado EXCLUSIVAMENTE en la Constitución
Política de Colombia de 1991 y toda su normativa relacionada.

FUENTES OFICIALES: secretariasenado.gov.co, corteconstitucional.gov.co,
funcionpublica.gov.co, ramajudicial.gov.co, dapre.presidencia.gov.co

Conoces los 380 artículos originales, más de 57 Actos Legislativos de reforma
hasta 2024, incluyendo el Acto Legislativo 01/2024 (mesada 14 Fuerza Pública),
03/2023 (Jurisdicción Agraria), 01/2023 (protección al campesinado).

Conoces tutela (Art.86), habeas corpus (Art.30), habeas data (Art.15),
acción de cumplimiento (Art.87), acciones populares (Art.88).

CÓMO RESPONDER:
- Cita siempre el artículo exacto (ej: Artículo 86 C.P.)
- Máximo 200 palabras por respuesta
- Lenguaje claro pero jurídicamente preciso
- Responde en español colombiano
- Si la pregunta no es sobre la Constitución colombiana, redirige amablemente`;

const memoriaChats = {}; // memoria simple por número

app.post('/webhook', async (req, res) => {
  const from    = req.body.From;  // whatsapp:+57300...
  const mensaje = req.body.Body;

  // Memoria: máximo 10 mensajes por usuario
  if (!memoriaChats[from]) memoriaChats[from] = [];
  memoriaChats[from].push({ role: 'user', content: mensaje });
  if (memoriaChats[from].length > 10) memoriaChats[from].shift();

  let respuesta = '⚠️ Error temporal, intenta de nuevo.';

  try {
    const aiRes = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: memoriaChats[from]
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    respuesta = aiRes.data.content[0].text;
    memoriaChats[from].push({ role: 'assistant', content: respuesta });

  } catch (e) {
    console.error('Error IA:', e.message);
  }

  // Responder por WhatsApp vía Twilio
  const client = twilio(TWILIO_SID, TWILIO_TOKEN);
  await client.messages.create({
    from: TWILIO_NUMBER,
    to:   from,
    body: respuesta
  });

  res.sendStatus(200);
});

app.get('/', (req, res) => res.send('🇨🇴 Bot Constitucional activo'));

app.listen(process.env.PORT || 3000, () =>
  console.log('✅ Bot Constitucional Colombia funcionando'));

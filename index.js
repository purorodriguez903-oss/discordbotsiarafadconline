require('dotenv').config();
const http = require('http');
const { createBot1 } = require('./bots/bot1_shield');
const { createBot2 } = require('./bots/bot2_tts');
const { createBot3 } = require('./bots/bot3_music');

function cleanEnv(val, fallback = '') {
  if (!val) return fallback;
  return String(val).trim().replace(/[\r\n\t]/g, '');
}

const WEBHOOK_URL = cleanEnv(process.env.WEBHOOK_URL);
const PORT = cleanEnv(process.env.PORT, 8080);
const startTimestamp = Date.now();

/**
 * Envia notificaciones centralizadas por Webhook
 */
async function sendWebhook(title, description, color = 0x00ff88) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `🤖 ${title}`,
          description,
          color,
          timestamp: new Date().toISOString(),
          footer: { text: 'Rafa Discord Tri-Bot Hub 24/7 • Railway' }
        }]
      })
    });
  } catch (err) {
    console.error('[Webhook Error]:', err.message);
  }
}

console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         🚀 INICIANDO RAFA DISCORD 3-BOTS HUB 24/7        ║
║                                                          ║
║   • Bot 1: Escudo 24/7 (Meta: 1 Billón de Horas)         ║
║   • Bot 2: Lector TTS en Voz (Lee chats en voz alta)     ║
║   • Bot 3: Música & Radio 24/7 (Lo-Fi, Reggaeton, etc.)  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);

// Iniciar Bot 1
const bot1Status = createBot1({
  token: cleanEnv(process.env.BOT1_TOKEN),
  channelId: cleanEnv(process.env.BOT1_VOICE_CHANNEL_ID, '1542358479270846565')
}, sendWebhook);

// Iniciar Bot 2
const bot2Status = createBot2({
  token: cleanEnv(process.env.BOT2_TOKEN),
  appId: cleanEnv(process.env.BOT2_APP_ID, '1564177861349474407'),
  channelId: cleanEnv(process.env.BOT2_VOICE_CHANNEL_ID, '1556120992579846224')
}, sendWebhook);

// Iniciar Bot 3
const bot3Status = createBot3({
  token: cleanEnv(process.env.BOT3_TOKEN),
  appId: cleanEnv(process.env.BOT3_APP_ID, '1564178086487003177'),
  channelId: cleanEnv(process.env.BOT3_VOICE_CHANNEL_ID, '1557674216340586507')
}, sendWebhook);

/**
 * Formatea tiempo en días, horas, minutos
 */
function getUptimeString() {
  const diffSec = Math.floor((Date.now() - startTimestamp) / 1000);
  const d = Math.floor(diffSec / 86400);
  const h = Math.floor((diffSec % 86400) / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

// Servidor Web central para Railway y UptimeRobot
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      uptime: getUptimeString(),
      bot1: bot1Status,
      bot2: bot2Status,
      bot3: bot3Status
    }));
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Rafa 3-Bots Hub 24/7</title>
      <meta http-equiv="refresh" content="20">
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #090d16;
          color: #f1f5f9;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          width: 100%;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        h1 { margin: 0 0 10px; font-size: 28px; color: #fff; }
        p.sub { color: #94a3b8; font-size: 14px; margin: 0; }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .card {
          background: #111827;
          border: 1px solid #1f2937;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 15px 30px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          margin-bottom: 12px;
          width: fit-content;
        }
        .badge.online { background: #064e3b; color: #34d399; }
        .badge.offline { background: #7f1d1d; color: #f87171; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot.online { background: #10b981; animation: pulse 1.5s infinite; }
        .dot.offline { background: #ef4444; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .bot-title { font-size: 18px; font-weight: 700; margin: 0 0 6px; color: #fff; }
        .bot-role { font-size: 12px; color: #38bdf8; font-weight: 600; margin-bottom: 15px; }
        .info-row { font-size: 13px; color: #94a3b8; margin-bottom: 8px; display: flex; justify-content: space-between; }
        .info-row span { color: #f1f5f9; font-weight: 600; }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 13px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🤖 Rafa Discord 3-Bots Hub 24/7</h1>
          <p class="sub">Tiempo de Actividad General: <b>${getUptimeString()}</b> • Servidor RAFA PANEL</p>
        </div>

        <div class="grid">
          <!-- BOT 1 -->
          <div class="card">
            <div>
              <div class="badge ${bot1Status.connected ? 'online' : 'offline'}">
                <div class="dot ${bot1Status.connected ? 'online' : 'offline'}"></div>
                ${bot1Status.connected ? '24/7 Conectado' : 'Conectando'}
              </div>
              <div class="bot-title">${bot1Status.tag !== 'Desconectado' ? bot1Status.tag : 'Rafa craker'}</div>
              <div class="bot-role">🛡️ Escudo 24/7 (Meta: 1B Horas)</div>
              <div class="info-row">Canal: <span>${bot1Status.channelName}</span></div>
              <div class="info-row">Expulsiones evitadas: <span>${bot1Status.kicksBlocked}</span></div>
            </div>
          </div>

          <!-- BOT 2 -->
          <div class="card">
            <div>
              <div class="badge ${bot2Status.connected ? 'online' : 'offline'}">
                <div class="dot ${bot2Status.connected ? 'online' : 'offline'}"></div>
                ${bot2Status.connected ? '24/7 Conectado' : 'Conectando'}
              </div>
              <div class="bot-title">${bot2Status.tag !== 'Desconectado' ? bot2Status.tag : 'RafaModzYT TTS'}</div>
              <div class="bot-role">🗣️ Lector TTS de Chat en Voz</div>
              <div class="info-row">Canal: <span>${bot2Status.channelName}</span></div>
              <div class="info-row">Mensajes leídos: <span>${bot2Status.messagesSpoken}</span></div>
            </div>
          </div>

          <!-- BOT 3 -->
          <div class="card">
            <div>
              <div class="badge ${bot3Status.connected ? 'online' : 'offline'}">
                <div class="dot ${bot3Status.connected ? 'online' : 'offline'}"></div>
                ${bot3Status.connected ? '24/7 Conectado' : 'Esperando Invitación'}
              </div>
              <div class="bot-title">${bot3Status.tag !== 'Desconectado' ? bot3Status.tag : 'RafaModzYT Music'}</div>
              <div class="bot-role">📻 Música & Radio 24/7</div>
              <div class="info-row">Canal: <span>${bot3Status.channelName}</span></div>
              <div class="info-row">Estado: <span>${bot3Status.currentTrack}</span></div>
            </div>
          </div>
        </div>

        <div class="footer">
          Auto-reconexión 500ms • Transmisión silenciosa continua Opus • Desplegado en Railway
        </div>
      </div>
    </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`🌐 Servidor de monitoreo central activo en puerto: ${PORT}`);
});

// Manejo de errores globales
process.on('unhandledRejection', reason => {
  console.error('[Unhandled Rejection]:', reason);
});
process.on('uncaughtException', err => {
  console.error('[Uncaught Exception]:', err);
});

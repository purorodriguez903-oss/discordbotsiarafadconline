require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActivityType
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const { Readable } = require('stream');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuración
const TOKEN = process.env.DISCORD_TOKEN;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID || '1542358479270846565';
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 8080;
const UPTIME_FILE = path.join(__dirname, 'uptime.json');

// Marco de silencio Opus (3 bytes) para mantener activa la transmisión de voz
const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

class ContinuousSilenceStream extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
  }
}

// Variables de estado
let connection = null;
let audioPlayer = null;
let reconnectCount = 0;
let blockedKicksCount = 0;
let connectedSince = Date.now();
let cumulativeSeconds = 0;

// Cargar o inicializar estadísticas de tiempo acumulado
try {
  if (fs.existsSync(UPTIME_FILE)) {
    const raw = fs.readFileSync(UPTIME_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    cumulativeSeconds = parsed.cumulativeSeconds || 0;
  }
} catch (_) {}

// Guardar cada 60 segundos el progreso
setInterval(() => {
  if (connection && connection.state.status === VoiceConnectionStatus.Ready) {
    cumulativeSeconds += 60;
    try {
      fs.writeFileSync(UPTIME_FILE, JSON.stringify({
        cumulativeSeconds,
        lastUpdated: new Date().toISOString()
      }, null, 2));
    } catch (_) {}
  }
}, 60000);

/**
 * Formatea segundos a texto legible
 */
function formatUptime(totalSec) {
  const years = Math.floor(totalSec / (3600 * 24 * 365));
  const days = Math.floor((totalSec % (3600 * 24 * 365)) / (3600 * 24));
  const hours = Math.floor((totalSec % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const parts = [];
  if (years > 0) parts.push(`${years}a`);
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h ${minutes}m ${seconds}s`);
  return parts.join(' ');
}

/**
 * Envia notificaciones por Webhook
 */
async function sendWebhook(title, description, color = 0x00ff88) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `🔊 ${title}`,
          description,
          color,
          timestamp: new Date().toISOString(),
          footer: { text: 'Rafa Voice 24/7 Shield • Meta: 1,000,000,000 Horas' }
        }]
      })
    });
  } catch (err) {
    console.error('Error enviando webhook:', err.message);
  }
}

// Inicializar cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/**
 * Conecta y asegura el canal de voz 24/7
 */
async function connectVoice() {
  try {
    const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);
    if (!channel) {
      console.error(`❌ No se encontró el canal de voz con ID: ${VOICE_CHANNEL_ID}`);
      return;
    }

    console.log(`📡 Conectando a canal de voz: [${channel.name}] en servidor: [${channel.guild.name}]...`);

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false
    });

    // Crear reproductor de silencio continuo
    if (!audioPlayer) {
      audioPlayer = createAudioPlayer();
      const resource = createAudioResource(new ContinuousSilenceStream(), { inputType: 'opus' });
      audioPlayer.play(resource);

      audioPlayer.on(AudioPlayerStatus.Idle, () => {
        try {
          const nextRes = createAudioResource(new ContinuousSilenceStream(), { inputType: 'opus' });
          audioPlayer.play(nextRes);
        } catch (_) {}
      });

      audioPlayer.on('error', err => {
        console.error('Audio player warning:', err.message);
      });
    }

    connection.subscribe(audioPlayer);

    // Eventos de estado de conexión de voz
    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log(`✅ ¡Conexión de voz ESTABLECIDA en "${channel.name}"!`);
      updatePresence(channel.name);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      reconnectCount++;
      console.log(`⚠️ Desconexión detectada. Intentando reconectar de inmediato (#${reconnectCount})...`);
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000)
        ]);
      } catch (_) {
        setTimeout(connectVoice, 1000);
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.log('⚠️ Conexión destruida. Reconectando...');
      setTimeout(connectVoice, 1000);
    });

  } catch (err) {
    console.error('Error al conectar al canal de voz:', err.message);
    setTimeout(connectVoice, 3000);
  }
}

/**
 * Actualiza la presencia del bot en Discord
 */
function updatePresence(channelName = 'BOTS SERVIDOR') {
  if (!client.user) return;
  const currentTotalHours = ((cumulativeSeconds + Math.floor((Date.now() - connectedSince) / 1000)) / 3600).toFixed(1);
  const progressPercent = ((currentTotalHours / 1000000000) * 100).toFixed(6);

  client.user.setPresence({
    status: 'online',
    activities: [{
      name: `24/7 en ${channelName} | ${currentTotalHours}h / 1B h (${progressPercent}%)`,
      type: ActivityType.Custom,
      state: `🔴 24/7 en ${channelName} | Meta: 1B Horas`
    }]
  });
}

// Evento: Bot listo
client.once('ready', async () => {
  connectedSince = Date.now();
  console.log(`====================================================`);
  console.log(`   🤖 Bot iniciado como: ${client.user.tag}`);
  console.log(`   🎯 Canal Objetivo: ${VOICE_CHANNEL_ID}`);
  console.log(`   🚀 Objetivo: 1,000,000,000 Horas Online 24/7`);
  console.log(`====================================================`);

  await connectVoice();

  // Notificar al Webhook de Discord
  sendWebhook(
    'Bot 24/7 Activado y Conectado',
    `**Bot:** ${client.user.tag}\n**Canal de Voz:** <#${VOICE_CHANNEL_ID}>\n**Estado:** 🟢 Conexión Permanente Blindada\n**Meta:** 1,000,000,000 Horas sin apagarse.`
  );
});

// ESCUDO ANTI-KICK: Si alguien saca o mueve al bot, se reconecta en 500ms
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.member?.id === client.user?.id) {
    // Si fue desconectado del canal de voz
    if (!newState.channelId) {
      blockedKicksCount++;
      console.log(`🛡️ [ESCUDO] Intento de expulsión/desconexión detectado (#${blockedKicksCount}). Reconectando...`);
      setTimeout(connectVoice, 500);

      sendWebhook(
        'Intento de Desconexión Neutralizado',
        `Alguien intentó sacar al bot del canal de voz.\n🛡️ **Escudo Activado:** Reconectado automáticamente en 500ms.\n**Expulsiones bloqueadas:** ${blockedKicksCount}`,
        0xffaa00
      );
    }
    // Si lo movieron a otro canal distinto al objetivo
    else if (newState.channelId !== VOICE_CHANNEL_ID) {
      console.log(`🛡️ [ESCUDO] El bot fue movido a otro canal. Regresando a canal objetivo...`);
      setTimeout(connectVoice, 500);
    }
  }
});

// Guardián recurrente cada 15 segundos (vigilancia de canal)
setInterval(() => {
  if (!client.isReady()) return;

  const channel = client.channels.cache.get(VOICE_CHANNEL_ID);
  const isMemberInChannel = channel?.members?.has(client.user?.id);

  if (!isMemberInChannel || !connection || connection.state.status !== VoiceConnectionStatus.Ready) {
    console.log('🔄 [GUARDIÁN] El bot no está en el canal objetivo. Forzando reconexión...');
    connectVoice();
  } else {
    updatePresence(channel.name);
  }
}, 15000);

// Reporte periódico al webhook cada 12 horas
setInterval(() => {
  const currentTotalSec = cumulativeSeconds + Math.floor((Date.now() - connectedSince) / 1000);
  const formatted = formatUptime(currentTotalSec);
  const hours = (currentTotalSec / 3600).toFixed(2);

  sendWebhook(
    'Reporte de Tiempo 24/7',
    `⏱️ **Tiempo Acumulado:** ${formatted} (${hours} Horas)\n🛡️ **Intentos de expulsión bloqueados:** ${blockedKicksCount}\n🎯 **Progreso a 1 Billón:** ${((hours / 1000000000) * 100).toFixed(6)}%`
  );
}, 12 * 3600 * 1000);

// Servidor Web para Railway / Monitoreo / UptimeRobot
const server = http.createServer((req, res) => {
  const currentTotalSec = cumulativeSeconds + Math.floor((Date.now() - connectedSince) / 1000);
  const formattedTime = formatUptime(currentTotalSec);
  const currentHours = (currentTotalSec / 3600).toFixed(2);
  const progress = ((currentHours / 1000000000) * 100).toFixed(8);

  if (req.url === '/health' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      connected: !!connection && connection.state.status === VoiceConnectionStatus.Ready,
      hours: currentHours,
      uptime: formattedTime,
      blockedKicks: blockedKicksCount
    }));
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Rafa 24/7 Voice Bot • 1B Hours Shield</title>
      <meta http-equiv="refresh" content="30">
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
          background: #111827;
          border: 1px solid #1f2937;
          padding: 35px;
          border-radius: 20px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.6);
          max-width: 500px;
          width: 100%;
          text-align: center;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #064e3b;
          color: #34d399;
          padding: 6px 16px;
          border-radius: 30px;
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        h1 { margin: 0 0 8px; font-size: 26px; color: #fff; }
        p.sub { color: #94a3b8; font-size: 14px; margin: 0 0 25px; }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 25px;
        }
        .box {
          background: #1e293b;
          padding: 16px;
          border-radius: 12px;
          text-align: left;
        }
        .box .label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .box .val { font-size: 18px; color: #f8fafc; font-weight: 700; margin-top: 4px; word-break: break-all; }
        .progress-box {
          background: #1e293b;
          padding: 18px;
          border-radius: 12px;
          margin-bottom: 20px;
          text-align: left;
        }
        .progress-bar-bg {
          background: #334155;
          height: 10px;
          border-radius: 10px;
          overflow: hidden;
          margin-top: 10px;
        }
        .progress-bar-fill {
          background: linear-gradient(90deg, #10b981, #06b6d4);
          height: 100%;
          width: ${Math.max(0.1, parseFloat(progress))}%;
        }
        .footer { font-size: 12px; color: #475569; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="status-badge">
          <div class="status-dot"></div>
          24/7 Conectado y Blindado
        </div>
        <h1>Rafa Voice 24/7</h1>
        <p class="sub">Canal de Voz Permanente • Servidor RAFA PANEL</p>

        <div class="grid">
          <div class="box">
            <div class="label">Canal Objetivo</div>
            <div class="val">BOTS SERVIDOR</div>
          </div>
          <div class="box">
            <div class="label">Expulsiones Evitadas</div>
            <div class="val" style="color: #38bdf8;">${blockedKicksCount}</div>
          </div>
        </div>

        <div class="progress-box">
          <div style="display:flex; justify-content:space-between; font-size:13px;">
            <span style="color:#94a3b8;">Progreso hacia 1 Billón de Horas</span>
            <span style="color:#10b981; font-weight:bold;">${currentHours}h</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill"></div>
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
            Tiempo en vivo: <b>${formattedTime}</b> (${progress}%)
          </div>
        </div>

        <div class="footer">
          Auto-reconexión activa • Transmisión silenciosa continua Opus
        </div>
      </div>
    </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`🌐 Servidor de monitoreo y Railway activo en puerto: ${PORT}`);
});

// Manejo de errores no capturados para que el proceso NUNCA muera
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection detectado (ignorado para mantener 24/7):', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception detectado (ignorado para mantener 24/7):', err);
});

// Iniciar sesión en Discord
client.login(TOKEN).catch(err => {
  console.error('Error fatal al iniciar sesión en Discord:', err);
});

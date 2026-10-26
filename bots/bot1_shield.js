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

const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

class ContinuousSilenceStream extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
  }
}

function createBot1(config, sendWebhook) {
  const status = {
    name: 'Bot 1 - Escudo 24/7',
    tag: 'Desconectado',
    channelName: 'BOTS SERVIDOR',
    channelId: config.channelId,
    connected: false,
    kicksBlocked: 0,
    startTime: Date.now()
  };

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

  let connection = null;
  let audioPlayer = null;

  async function connectVoice() {
    try {
      const channel = await client.channels.fetch(config.channelId).catch(() => null);
      if (!channel) {
        console.error(`[Bot 1] No se encontró el canal de voz: ${config.channelId}`);
        return;
      }

      status.channelName = channel.name;

      if (connection) {
        if (connection.state.status === VoiceConnectionStatus.Ready) {
          status.connected = true;
          return;
        }
        if (connection.state.status === VoiceConnectionStatus.Connecting || connection.state.status === VoiceConnectionStatus.Signalling) {
          return;
        }
        try { connection.destroy(); } catch (_) {}
      }

      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
      });

      if (!audioPlayer) {
        audioPlayer = createAudioPlayer();
        const resource = createAudioResource(new ContinuousSilenceStream(), { inputType: 'opus' });
        audioPlayer.play(resource);

        audioPlayer.on(AudioPlayerStatus.Idle, () => {
          try {
            audioPlayer.play(createAudioResource(new ContinuousSilenceStream(), { inputType: 'opus' }));
          } catch (_) {}
        });

        audioPlayer.on('error', () => {});
      }

      connection.subscribe(audioPlayer);

      connection.on(VoiceConnectionStatus.Ready, () => {
        status.connected = true;
        console.log(`✅ [Bot 1] Conectado 24/7 en voz: "${channel.name}"`);
        updatePresence(channel.name);
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        status.connected = false;
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
        status.connected = false;
        setTimeout(connectVoice, 1000);
      });

    } catch (err) {
      console.error('[Bot 1] Error conectando voz:', err.message);
      setTimeout(connectVoice, 3000);
    }
  }

  function updatePresence(chName) {
    if (!client.user) return;
    client.user.setPresence({
      status: 'online',
      activities: [{
        name: `🔴 24/7 en ${chName} | Meta: 1B Horas`,
        type: ActivityType.Custom,
        state: `🔴 24/7 en ${chName} | Meta: 1B Horas`
      }]
    });
  }

  client.once('ready', async () => {
    status.tag = client.user.tag;
    console.log(`🤖 [Bot 1] Listo como: ${client.user.tag}`);
    await connectVoice();

    sendWebhook(
      'Bot 1 Conectado 24/7',
      `**Bot:** ${client.user.tag}\n**Canal:** <#${config.channelId}>\n**Función:** Escudo 24/7 Permanente (Meta 1B Horas)`
    );
  });

  // Escudo anti-kick
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.member?.id === client.user?.id) {
      if (!newState.channelId) {
        status.kicksBlocked++;
        console.log(`🛡️ [Bot 1] Intento de expulsión neutralizado (#${status.kicksBlocked}). Reconectando en 500ms...`);
        setTimeout(connectVoice, 500);
        sendWebhook(
          '[Bot 1] Intento de Expulsión Bloqueado',
          `Alguien intentó sacar a **${client.user?.tag}** del canal de voz.\n🛡️ **Escudo Activado:** Reconectado en 500ms.\n**Total bloqueados:** ${status.kicksBlocked}`,
          0xffaa00
        );
      } else if (newState.channelId !== config.channelId) {
        setTimeout(connectVoice, 500);
      }
    }
  });

  // Guardián cada 15 segundos
  setInterval(() => {
    if (!client.isReady()) return;
    const channel = client.channels.cache.get(config.channelId);
    const inChannel = channel?.members?.has(client.user?.id);
    if (!inChannel || !connection || (connection.state.status !== VoiceConnectionStatus.Ready && connection.state.status !== VoiceConnectionStatus.Connecting && connection.state.status !== VoiceConnectionStatus.Signalling)) {
      connectVoice();
    }
  }, 15000);

  client.login(config.token).catch(err => {
    console.error('[Bot 1] Error en login:', err.message);
  });

  return status;
}

module.exports = { createBot1 };

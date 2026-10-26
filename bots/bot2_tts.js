const {
  Client,
  GatewayIntentBits,
  ActivityType,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const { Readable } = require('stream');

const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

class ContinuousSilenceStream extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
  }
}

function createBot2(config, sendWebhook) {
  const status = {
    name: 'Bot 2 - Lector TTS 24/7',
    tag: 'Desconectado',
    channelName: 'General Voz',
    channelId: config.channelId,
    connected: false,
    kicksBlocked: 0,
    messagesSpoken: 0,
    startTime: Date.now()
  };

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages
    ]
  });

  let connection = null;
  let audioPlayer = null;
  const ttsQueue = [];
  let isSpeaking = false;

  async function connectVoice() {
    try {
      const channel = await client.channels.fetch(config.channelId).catch(() => null);
      if (!channel) {
        console.error(`[Bot 2 - TTS] No se encontró el canal de voz: ${config.channelId}`);
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
        selfDeaf: false,
        selfMute: false
      });

      if (!audioPlayer) {
        audioPlayer = createAudioPlayer();

        audioPlayer.on(AudioPlayerStatus.Idle, () => {
          isSpeaking = false;
          // Procesar siguiente mensaje en cola o reanudar silencio continuo
          if (ttsQueue.length > 0) {
            playNextTTS();
          } else {
            playSilence();
          }
        });

        audioPlayer.on('error', err => {
          console.error('[Bot 2 - TTS] Error en reproductor:', err.message);
          isSpeaking = false;
          if (ttsQueue.length > 0) playNextTTS();
          else playSilence();
        });
      }

      connection.subscribe(audioPlayer);

      connection.on(VoiceConnectionStatus.Ready, () => {
        status.connected = true;
        console.log(`✅ [Bot 2 - TTS] Conectado en voz: "${channel.name}"`);
        updatePresence(channel.name);
        if (!isSpeaking) playSilence();
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
      console.error('[Bot 2 - TTS] Error conectando:', err.message);
      setTimeout(connectVoice, 3000);
    }
  }

  function playSilence() {
    if (!audioPlayer || isSpeaking) return;
    try {
      const resource = createAudioResource(new ContinuousSilenceStream(), { inputType: 'opus' });
      audioPlayer.play(resource);
    } catch (_) {}
  }

  function playNextTTS() {
    if (ttsQueue.length === 0 || !audioPlayer) {
      isSpeaking = false;
      playSilence();
      return;
    }

    isSpeaking = true;
    const item = ttsQueue.shift();

    try {
      const textToSpeak = `${item.username} dice: ${item.text}`.slice(0, 190);
      const url = googleTTS.getAudioUrl(textToSpeak, {
        lang: 'es',
        slow: false,
        host: 'https://translate.google.com'
      });

      const resource = createAudioResource(url);
      audioPlayer.play(resource);
      status.messagesSpoken++;
      console.log(`🗣️ [Bot 2 - TTS] Hablando: "${textToSpeak}"`);
    } catch (err) {
      console.error('[Bot 2 - TTS] Error al generar voz:', err.message);
      isSpeaking = false;
      playNextTTS();
    }
  }

  function queueTTS(username, text) {
    if (!text || text.trim().length === 0) return;
    ttsQueue.push({ username, text: text.trim() });
    if (!isSpeaking) {
      playNextTTS();
    }
  }

  function updatePresence(chName) {
    if (!client.user) return;
    client.user.setPresence({
      status: 'online',
      activities: [{
        name: `🗣️ Leyendo chat en ${chName}`,
        type: ActivityType.Custom,
        state: `🗣️ Lector TTS 24/7 en ${chName}`
      }]
    });
  }

  // Registrar Slash Command /tts
  async function registerSlashCommands() {
    try {
      const rest = new REST({ version: '10' }).setToken(config.token);
      const commands = [
        new SlashCommandBuilder()
          .setName('tts')
          .setDescription('Hace que el bot hable tu mensaje en voz alta en el canal')
          .addStringOption(option =>
            option.setName('mensaje')
              .setDescription('El mensaje que el bot dirá en voz alta')
              .setRequired(true)
          )
      ];

      await rest.put(
        Routes.applicationCommands(config.appId),
        { body: commands }
      );
      console.log('✅ [Bot 2 - TTS] Slash Command /tts registrado con éxito.');
    } catch (e) {
      console.error('[Bot 2 - TTS] Advertencia al registrar Slash Commands:', e.message);
    }
  }

  client.once('ready', async () => {
    status.tag = client.user.tag;
    console.log(`🤖 [Bot 2 - TTS] Listo como: ${client.user.tag}`);
    await registerSlashCommands();
    await connectVoice();

    sendWebhook(
      'Bot 2 (Lector TTS) Conectado',
      `**Bot:** ${client.user.tag}\n**Canal:** <#${config.channelId}>\n**Función:** Lee en voz alta lo que escriban en el chat.`
    );
  });

  // Manejar Slash Command /tts
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'tts') {
      const text = interaction.options.getString('mensaje');
      const authorName = interaction.member?.displayName || interaction.user.username;

      queueTTS(authorName, text);

      await interaction.reply({
        content: `🔊 **${authorName}**, tu mensaje se está leyendo en voz alta en el canal de voz.`,
        ephemeral: true
      });
    }
  });

  // Manejar mensajes de texto en el canal de voz o menciones
  client.on('messageCreate', message => {
    if (message.author.bot) return;

    const isMentioned = message.mentions.has(client.user);
    const isInVoiceChannelChat = message.channel.id === config.channelId;

    if (isInVoiceChannelChat || isMentioned) {
      let cleanText = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
      if (cleanText.length > 0) {
        const authorName = message.member?.displayName || message.author.username;
        queueTTS(authorName, cleanText);
      }
    }
  });

  // Escudo anti-kick
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.member?.id === client.user?.id) {
      if (!newState.channelId) {
        status.kicksBlocked++;
        console.log(`🛡️ [Bot 2 - TTS] Intento de expulsión neutralizado (#${status.kicksBlocked}). Reconectando...`);
        setTimeout(connectVoice, 500);
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
    console.error('[Bot 2 - TTS] Error en login:', err.message);
  });

  return status;
}

module.exports = { createBot2 };

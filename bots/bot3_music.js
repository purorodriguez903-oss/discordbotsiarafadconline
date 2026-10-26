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
const { Readable } = require('stream');

const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

class ContinuousSilenceStream extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
  }
}

// Estaciones de radio 24/7 verificadas en streaming continuo
const RADIO_STATIONS = {
  lofi: {
    name: 'Lo-Fi Chill Beats 24/7 ☕',
    url: 'https://streams.ilovemusic.de/iloveradio17.mp3'
  },
  reggaeton: {
    name: 'Reggaeton & Latin Hits 🔥',
    url: 'https://stream.zeno.fm/0r0xa792kwzuv'
  },
  pop: {
    name: 'Top 40 Pop Hits 🎵',
    url: 'https://streams.ilovemusic.de/iloveradio1.mp3'
  },
  electro: {
    name: 'Electronic & Dance ⚡',
    url: 'https://streams.ilovemusic.de/iloveradio2.mp3'
  },
  rock: {
    name: 'Rock Classics 🎸',
    url: 'https://streams.ilovemusic.de/iloveradio4.mp3'
  }
};

function createBot3(config, sendWebhook) {
  const status = {
    name: 'Bot 3 - Música & Radio 24/7',
    tag: 'Desconectado',
    channelName: 'Música',
    channelId: config.channelId,
    connected: false,
    kicksBlocked: 0,
    currentTrack: 'Ninguna (Silencio 24/7)',
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
  let isPlayingMusic = false;

  async function connectVoice() {
    try {
      const channel = await client.channels.fetch(config.channelId).catch(() => null);
      if (!channel) {
        console.error(`[Bot 3 - Música] No se encontró o falta acceso al canal de voz: ${config.channelId}`);
        console.log(`👉 Asegúrate de invitar al Bot 3 con este enlace:\nhttps://discord.com/api/oauth2/authorize?client_id=${config.appId}&permissions=8&scope=bot%20applications.commands`);
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
          isPlayingMusic = false;
          status.currentTrack = 'Silencio 24/7';
          playSilence();
        });

        audioPlayer.on('error', err => {
          console.error('[Bot 3 - Música] Error reproduciendo:', err.message);
          isPlayingMusic = false;
          playSilence();
        });
      }

      connection.subscribe(audioPlayer);

      connection.on(VoiceConnectionStatus.Ready, () => {
        status.connected = true;
        console.log(`✅ [Bot 3 - Música] Conectado en voz: "${channel.name}"`);
        updatePresence();
        if (!isPlayingMusic) playSilence();
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
      console.error('[Bot 3 - Música] Error conectando voz:', err.message);
      setTimeout(connectVoice, 3000);
    }
  }

  function playSilence() {
    if (!audioPlayer || isPlayingMusic) return;
    try {
      const resource = createAudioResource(new ContinuousSilenceStream(), { inputType: 'opus' });
      audioPlayer.play(resource);
    } catch (_) {}
  }

  function playStream(url, name) {
    if (!audioPlayer) return;
    try {
      const resource = createAudioResource(url);
      audioPlayer.play(resource);
      isPlayingMusic = true;
      status.currentTrack = name;
      updatePresence(name);
      console.log(`🎵 [Bot 3 - Música] Reproduciendo: "${name}"`);
    } catch (err) {
      console.error('[Bot 3 - Música] Fallo al iniciar stream:', err.message);
    }
  }

  function stopMusic() {
    isPlayingMusic = false;
    status.currentTrack = 'Silencio 24/7';
    updatePresence();
    playSilence();
  }

  function updatePresence(trackName) {
    if (!client.user) return;
    const activityText = trackName ? `🎶 ${trackName}` : `📻 Música 24/7 en ${status.channelName}`;

    client.user.setPresence({
      status: 'online',
      activities: [{
        name: activityText,
        type: ActivityType.Custom,
        state: activityText
      }]
    });
  }

  // Registrar Slash Commands
  async function registerSlashCommands() {
    try {
      const rest = new REST({ version: '10' }).setToken(config.token);
      const commands = [
        new SlashCommandBuilder()
          .setName('radio')
          .setDescription('Reproduce una estación de música 24/7 en el canal de voz')
          .addStringOption(option =>
            option.setName('estacion')
              .setDescription('Elige el género musical')
              .setRequired(true)
              .addChoices(
                { name: 'Lo-Fi Chill Beats 24/7 ☕', value: 'lofi' },
                { name: 'Reggaeton & Latin Hits 🔥', value: 'reggaeton' },
                { name: 'Top 40 Pop Hits 🎵', value: 'pop' },
                { name: 'Electronic & Dance ⚡', value: 'electro' },
                { name: 'Rock Classics 🎸', value: 'rock' }
              )
          ),
        new SlashCommandBuilder()
          .setName('play')
          .setDescription('Reproduce un enlace de audio directo (MP3/Stream)')
          .addStringOption(opt =>
            opt.setName('url')
              .setDescription('Enlace directo del audio o stream')
              .setRequired(true)
          ),
        new SlashCommandBuilder()
          .setName('stop')
          .setDescription('Detiene la música y regresa al modo 24/7 en silencio')
      ];

      await rest.put(
        Routes.applicationCommands(config.appId),
        { body: commands }
      );
      console.log('✅ [Bot 3 - Música] Slash Commands de música registrados con éxito.');
    } catch (e) {
      console.error('[Bot 3 - Música] Advertencia al registrar Slash Commands:', e.message);
    }
  }

  client.once('ready', async () => {
    status.tag = client.user.tag;
    console.log(`🤖 [Bot 3 - Música] Listo como: ${client.user.tag}`);
    await registerSlashCommands();
    await connectVoice();

    sendWebhook(
      'Bot 3 (Música & Radio) Conectado',
      `**Bot:** ${client.user.tag}\n**Canal:** <#${config.channelId}>\n**Función:** Música y Radio 24/7 en canal de voz.`
    );
  });

  // Manejador de Slash Commands
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'radio') {
      const choice = interaction.options.getString('estacion');
      const station = RADIO_STATIONS[choice];

      if (station) {
        playStream(station.url, station.name);
        await interaction.reply({
          content: `🎶 **Sintonizando:** ${station.name}\n_La música sonará de forma continua en el canal de voz._`
        });
      }
    } else if (interaction.commandName === 'play') {
      const url = interaction.options.getString('url');
      playStream(url, 'Audio personalizado');
      await interaction.reply({ content: `▶️ Reproduciendo stream desde enlace.` });
    } else if (interaction.commandName === 'stop') {
      stopMusic();
      await interaction.reply({ content: `⏹️ Música detenida. El bot se mantiene en el canal de voz 24/7.` });
    }
  });

  // Manejador de comandos con prefijo (!radio, !stop)
  client.on('messageCreate', message => {
    if (message.author.bot) return;

    const content = message.content.trim().toLowerCase();
    if (content.startsWith('!radio')) {
      const parts = content.split(/\s+/);
      const genre = parts[1] || 'lofi';
      const station = RADIO_STATIONS[genre] || RADIO_STATIONS.lofi;
      playStream(station.url, station.name);
      message.reply(`🎶 **Sintonizando:** ${station.name}`);
    } else if (content === '!stop') {
      stopMusic();
      message.reply(`⏹️ Música detenida.`);
    }
  });

  // Escudo anti-kick
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.member?.id === client.user?.id) {
      if (!newState.channelId) {
        status.kicksBlocked++;
        console.log(`🛡️ [Bot 3 - Música] Intento de expulsión neutralizado (#${status.kicksBlocked}). Reconectando...`);
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
    console.error('[Bot 3 - Música] Error en login:', err.message);
  });

  return status;
}

module.exports = { createBot3 };

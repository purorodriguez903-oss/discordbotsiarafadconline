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
        console.error(`[Bot 3 - Música] No se encontró o falta invitar al bot al canal: ${config.channelId}`);
        return;
      }

      status.channelName = channel.name;

      // Si ya está conectado y en el canal correcto, salir
      if (connection && connection.joinConfig?.channelId === config.channelId && connection.state.status === VoiceConnectionStatus.Ready) {
        status.connected = true;
        return;
      }

      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
        group: client.user.id
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

      entersState(connection, VoiceConnectionStatus.Ready, 15000)
        .then(() => {
          status.connected = true;
          console.log(`✅ [Bot 3 - Música] Conectado en canal exclusivo: "${channel.name}" (${config.channelId})`);
          updatePresence();
          if (!isPlayingMusic) playSilence();
        })
        .catch(err => {
          console.error('[Bot 3 - Música] Error esperando estado Ready:', err.message);
        });

      if (!connection._hasListeners) {
        connection._hasListeners = true;

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
      }

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

  client.on('guildCreate', async (guild) => {
    console.log(`🎉 [Bot 3 - Música] Bot añadido a servidor: ${guild.name}. Conectando a canal de voz...`);
    await connectVoice();
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

  // Escudo anti-kick y anti-movimiento no autorizado
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.id !== client.user?.id) return;

    const currentChannelId = newState.channelId;

    if (!currentChannelId) {
      status.kicksBlocked++;
      status.connected = false;
      console.log(`🛡️ [Bot 3 - Música] Expulsión detectada (#${status.kicksBlocked}). Reconectando a ${config.channelId}...`);
      setTimeout(connectVoice, 500);
    } else if (currentChannelId !== config.channelId) {
      status.kicksBlocked++;
      console.log(`🛡️ [Bot 3 - Música] Movimiento no autorizado a ${currentChannelId}. Regresando a canal objetivo ${config.channelId}...`);
      setTimeout(connectVoice, 500);
    } else {
      status.connected = true;
    }
  });

  // Guardián cada 10 segundos
  setInterval(async () => {
    if (!client.isReady()) return;
    try {
      const channel = await client.channels.fetch(config.channelId).catch(() => null);
      const isHere = channel?.members?.has(client.user?.id);
      if (!isHere || !connection || connection.state.status !== VoiceConnectionStatus.Ready) {
        connectVoice();
      }
    } catch (_) {}
  }, 10000);

  client.login(config.token).catch(err => {
    console.error('[Bot 3 - Música] Error en login:', err.message);
  });

  return status;
}

module.exports = { createBot3 };

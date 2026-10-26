# 🤖 Rafa Discord 3-Bots Hub 24/7 (Multi-Channel Blindado)

Hub central para ejecutar **3 Bots de Discord simultáneos y permanentes 24/7/365** en el servidor `RAFA PANEL`, con **aislamiento de voz por grupo**, **soporte para protocolo E2EE DAVE**, **escudo anti-kick**, y panel de monitoreo web.

---

## 👥 Resumen de los 3 Bots

| Bot | Tag | Canal de Voz Objetivo | Función |
| :--- | :--- | :--- | :--- |
| **Bot 1** | `Rafa craker#2586` | `BOTS SERVIDOR` (`1542358479270846565`) | 🛡️ Escudo 24/7 permanente (Meta: 1 Billón de Horas) |
| **Bot 2** | `RafaModzYT TTS#9987` | `general` (`1556120992579846224`) | 🗣️ Lector TTS (Lee chats de voz en voz alta con `/tts` o mención) |
| **Bot 3** | `RafaModzYT Music#0218` | Canal ID: `1557674216340586507` | 📻 Radio & Música 24/7 (Lo-Fi, Reggaeton, Pop, Rock, etc.) |

---

## 🛡️ Características Principales

1. **Aislamiento de Voz por Grupo (`group: client.user.id`):** Cada bot opera en su propio canal de voz sin interferir ni sobreescribir la conexión de los demás.
2. **Auto-Reconexión Anti-Kick (500ms):** Si un usuario desconecta o mueve a cualquiera de los bots, el bot regresa de inmediato a su canal asignado.
3. **Protocolo DAVE / E2EE Compatible:** Totalmente adaptado a las nuevas exigencias de encriptación punto a punto de Discord con `@snazzah/davey` y `@discordjs/voice`.
4. **Transmisión de Silencio Continuo:** Paquetes Opus silenciosos que evitan que Discord marque a los bots como inactivos.
5. **Dashboard Web en Vivo:** Monitoreo en el puerto `8080` (endpoint `/health`) con vista HTML y estado en tiempo real.

---

## 🚀 Despliegue 24/7 en la Nube (Railway)

Para que los bots se queden **online para siempre sin depender de que tu PC esté encendida**:

### 1. Conectar Repositorio
1. Entra a [Railway.app](https://railway.app).
2. Toca **+ New Project** > **Deploy from GitHub repo**.
3. Selecciona: `purorodriguez903-oss/discordbotsiarafadconline`.

### 2. Configurar Variables de Entorno
En el servicio creado en Railway, entra a la pestaña **Variables** y agrega:

```env
BOT1_TOKEN=tu_token_del_bot1
BOT1_APP_ID=1564175866920050718
BOT1_VOICE_CHANNEL_ID=1542358479270846565

BOT2_TOKEN=tu_token_del_bot2
BOT2_APP_ID=1564177861349474407
BOT2_VOICE_CHANNEL_ID=1556120992579846224

BOT3_TOKEN=tu_token_del_bot3
BOT3_APP_ID=1564178086487003177
BOT3_VOICE_CHANNEL_ID=1557674216340586507

WEBHOOK_URL=tu_webhook_de_discord
PORT=8080
```

¡Listo! Railway compilará el proyecto usando `nixpacks.toml` con Node.js 20 y FFmpeg, e iniciará todos los bots automáticamente.

---

## 💻 Ejecución Local en Windows

Si prefieres correrlo en tu computadora:
Doble clic en **`iniciar_discord_bot.bat`**.

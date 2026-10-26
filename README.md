# 🔊 Rafa Discord 24/7 Voice Bot (Blindado)

Bot de Discord diseñado para mantenerse conectado **24/7/365 en un canal de voz específico** con sistema de **auto-reconexión instantánea**, **escudo anti-expulsión** y transmisión continua de silencio Opus para evitar que Discord lo desconecte por inactividad.

🎯 **Meta:** Alcanzar 1,000,000,000 (1 Billón) de horas conectado sin apagarse.

---

## 🛡️ Características del Sistema Blindado

1. **Auto-Reconexión Instantánea (Anti-Kick):**
   - Si un usuario o administrador intenta desconectar al bot, el evento `voiceStateUpdate` lo detecta y se **reconecta en 500ms automáticamente**.
   - Si alguien mueve al bot a otro canal de voz, regresa de inmediato al canal objetivo.
2. **Guardián de Canal Recurrente:**
   - Cada 15 segundos revisa si el bot sigue en el canal. Si por alguna razón la conexión se perdió, se re-establece de inmediato.
3. **Transmisión de Silencio Opus Continua:**
   - Discord desconecta bots de voz si no hay actividad de audio. Este bot transmite paquetes continuos de silencio Opus (3 bytes) que no se escuchan pero mantienen la conexión de voz activa 24/7.
4. **Contador de Tiempo Acumulado:**
   - Guarda el tiempo en `uptime.json` para que nunca se pierda el progreso hacia el billón de horas.
5. **Servidor Web de Monitoreo:**
   - Corre en el puerto `8080` (compatible con Railway / Render / UptimeRobot) con un panel en HTML que muestra las horas acumuladas, estado en vivo y estadísticas de expulsiones evitadas.
6. **Alertas a Discord por Webhook:**
   - Envía alertas automáticas cuando se inicia, cuando neutraliza un intento de desconexión y reportes de estado periódicos.

---

## 🚀 Despliegue en Railway (Desde GitHub)

Este repositorio está conectado a:
`https://github.com/purorodriguez903-oss/discordbotsiarafadconline.git`

### Pasos para activar en Railway 24/7:
1. Entra a [Railway.app](https://railway.app).
2. Toca **+ New Project** > **Deploy from GitHub repo**.
3. Selecciona tu repositorio: `purorodriguez903-oss/discordbotsiarafadconline`.
4. Ve a la pestaña **Variables** en Railway y agrega estas 4 variables:
   - `DISCORD_TOKEN`: Tu token de bot de Discord
   - `VOICE_CHANNEL_ID`: `1542358479270846565`
   - `WEBHOOK_URL`: Tu webhook de Discord para alertas
   - `PORT`: `8080`
5. ¡Listo! Railway desplegará el bot automáticamente y se mantendrá en línea 24/7 en la nube.

---

## 💻 Ejecución Local en Windows

Haz doble clic en:
**`iniciar_discord_bot.bat`**

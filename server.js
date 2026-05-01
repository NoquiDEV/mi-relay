const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const https = require('https');

app.use(express.json());

app.post('/token', async (req, res) => {
    const { code } = req.body;

    const body = new URLSearchParams({
        client_id:     '1290495318248390768',
        client_secret: 'gusYHg96PnDcnEn4L23FVVNzp--2lURU',
        grant_type:    'authorization_code',
        code:          code,
    });

    const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    const data = await response.json();
    res.json({ access_token: data.access_token });
});

app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 🔥 ESTO ES LO QUE TE FALTA
    res.setHeader(
        'Content-Security-Policy',
        "frame-ancestors https://discord.com https://*.discord.com"
    );

    // 🔥 Por si algún proxy mete esto
    res.removeHeader('X-Frame-Options');

    next();
});

// Servir los archivos de la Activity
app.use(express.static(path.join(__dirname, '../mi-activity/dist')));

const activityClients = new Set();
let unityClient = null;

wss.on('connection', (ws, req) => {
    console.log('Nueva conexión, URL:', req.url);

    if (req.url === '/unity') {
        console.log('✅ Unity conectado');
        unityClient = ws;

        ws.on('message', (data) => {
            console.log('📦 Mensaje de Unity, clientes:', activityClients.size);
            for (const client of activityClients) {
                if (client.readyState === 1) {
                    client.send(data.toString());
                }
            }
        });

        ws.on('close', () => {
            console.log('❌ Unity desconectado');
            unityClient = null;
        });

    } else if (req.url === '/activity') {
        console.log('✅ Activity conectada');
        activityClients.add(ws);

        // Reenviar comandos de la Activity a Unity
        ws.on('message', (data) => {
            console.log('🎮 Comando de Activity:', data.toString());
            if (unityClient && unityClient.readyState === 1) {
                unityClient.send(data.toString());
            }
        });

        ws.on('close', () => {
            console.log('❌ Activity desconectada');
            activityClients.delete(ws);
        });
    }
});

const PORT = 3000;
server.listen(PORT, () => console.log(`✅ Servidor corriendo en puerto ${PORT}`));
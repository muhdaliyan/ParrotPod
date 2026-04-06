console.log('BRIDGE_BOOT: Loading dependencies...');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

console.log('BRIDGE_BOOT: Dependencies loaded successfully');

let socket;
let isInitialized = false;

async function startWhatsApp() {
    console.log('STATE: INITIALIZING');
    try {
        const sessionDir = path.join(__dirname, 'whatsapp_sessions');
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir);

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`STATE: INITIALIZING - version: ${version.join('.')}, isLatest: ${isLatest}`);

        socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            version,
            browser: ["Windows", "Chrome", "11.0.0"],
            logger: pino({ level: 'info' })
        });
        
        setupEventListeners(socket, saveCreds);

    } catch (err) {
        console.error('Initialization error:', err);
        setTimeout(startWhatsApp, 5000);
    }
}

function setupEventListeners(sock, saveCreds) {
    // Only add these listeners once if possible, but Baileys sockets are new every time
    // So we add them to the NEW socket instance
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        console.log(`STATE: UPDATING - connection: ${connection || 'not specified'}, has_qr: ${!!qr}`);
        
        if (qr) {
            try {
                const qrDataUrl = await QRCode.toDataURL(qr);
                console.log(`QR_CODE: ${qrDataUrl}`);
            } catch (err) {
                console.error('Failed to generate QR:', err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`STATE: DISCONNECTED - reason: ${lastDisconnect?.error?.message || 'unknown'}`);
            if (shouldReconnect) {
                console.log('Attempting to reconnect in 3s...');
                setTimeout(startWhatsApp, 3000);
            }
        } else if (connection === 'open') {
            console.log('STATE: CONNECTED');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message) {
                    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
                    if (text) {
                        console.log(`MESSAGE: ${JSON.stringify({ 
                            from: msg.key.remoteJID, 
                            pushName: msg.pushName, 
                            text: text 
                        })}`);
                    }
                }
            }
        }
    });
}

// Global stdin listener (ONLY ONCE)
if (!isInitialized) {
    process.stdin.on('data', async (data) => {
        if (!socket) return;
        try {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                const cmd = JSON.parse(line.trim());
                if (cmd.type === 'send' && cmd.to && cmd.text) {
                    await socket.sendMessage(cmd.to, { text: cmd.text });
                    console.log(`SENT: ${cmd.to}`);
                }
                if (cmd.type === 'logout') {
                    await socket.logout();
                    console.log('STATE: LOGGED_OUT');
                    process.exit(0);
                }
            }
        } catch (e) {
            // Silently ignore
        }
    });
    
    // Heartbeat
    setInterval(() => {
        console.log(`STATE: PING - ${new Date().toISOString()}`);
    }, 10000);
    
    isInitialized = true;
}

// Handle errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

startWhatsApp();

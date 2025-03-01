const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys')
const { Boom } = require('@hapi/boom')
const express = require('express')
const qrcode = require('qrcode')
const { verifLien } = require('./function.js')

const app = express()
const port = 3000
let qrCodeData = ''

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

    const sock = makeWASocket({
        auth: state
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log('QR Code mis à jour.')
            qrCodeData = await qrcode.toDataURL(qr)
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error instanceof Boom
                ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
                : true;

            console.log('Connexion fermée en raison de :', lastDisconnect?.error, ', reconnexion :', shouldReconnect)
            if (shouldReconnect) {
                connectToWhatsApp()
            }
        } else if (connection === 'open') {
            console.log('✅ Connexion ouverte à WhatsApp')
        }
    })

    sock.ev.on('messages.upsert', async (event) => {
        let m = event.messages[0]
        if (!m.message || !m.key.remoteJid) return
        if (m.key.fromMe) return
        const groups = await sock.groupFetchAllParticipating()
        console.log(groups)
        // if (m.key.remoteJid && m.key.remoteJid.includes("@g.us")) {
            // let text = (m.message.extendedTextMessage) ? m.message.extendedTextMessage.text.trim().toLowerCase() : m.message.conversation.trim().toLowerCase()
            // if (verifLien(text)) {
                // await sock.sendMessage(m.key.remoteJid, {
                //     text: "Oups ! 😅 Ce lien a été supprimé. N'oubliez pas, les liens externes ne sont pas autorisés ici. Merci de votre compréhension !\n \n> Kira",
                // }, { quoted: m })
                // await sock.sendMessage(m.key.remoteJid, { delete: m.key })
                // await sock.sendMessage("243839264674@s.whatsapp.net", { text: m.key.remoteJid })
                // await sock.sendMessage("1234@s.whatsapp.net", { forward: msg });
            // }
        // }
    })

    sock.ev.on('creds.update', saveCreds)
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

app.get('/qr', (req, res) => {
    if (qrCodeData) {
        res.send(`<img src="${qrCodeData}" alt="QR Code WhatsApp">`)
    } else {
        res.send('QR Code en attente...')
    }
})
app.listen(port, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${port}`)
})

connectToWhatsApp()
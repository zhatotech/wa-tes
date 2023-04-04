const express = require("express");
const app = express();
const port = 3000;
const { body, validationResult } = require('express-validator');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require("whatsapp-web.js");
// const { Client, Location, List, Buttons, LocalAuth } = require('./index');
const { phoneNumberFormatter } = require('./helpers/formatter');
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.initialize();

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    qrcode.generate(qr, {small: true});
    // console.log('QR RECEIVED', qr);
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('READY');
});

client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);

    if (msg.body === '!ping reply') {
        // Send a new message as a reply to the current one
        msg.reply('pong');

    } else if (msg.body === '!ping') {
        // Send a new message to the same chat
        client.sendMessage(msg.from, 'pong');

    } else if (msg.body.startsWith('!sendto ')) {
        // Direct send a new message to specific id
        let number = msg.body.split(' ')[1];
        let messageIndex = msg.body.indexOf(number) + number.length;
        let message = msg.body.slice(messageIndex, msg.body.length);
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        let chat = await msg.getChat();
        chat.sendSeen();
        client.sendMessage(number, message);
    } 
});

// Change to false if you don't want to reject incoming calls
let rejectCalls = true;

client.on('call', async (call) => {
    console.log('Call received, rejecting. GOTO Line 261 to disable', call);
    if (rejectCalls) await call.reject();
    await client.sendMessage(call.from, `[${call.fromMe ? 'Outgoing' : 'Incoming'}] Phone call from ${call.from}, type ${call.isGroup ? 'group' : ''} ${call.isVideo ? 'video' : 'audio'} call. ${rejectCalls ? 'Panggilan ini Otomatis ditolak oleh SISTEM.!!!' : ''}`);
});

//cek nomornya terdaftar atau tidak
const checkRegisteredNumber = async function(number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
  }


app.get("/", (req, res) => {
    res.send("hello bro");
});

app.get("/send-message",async (req, res) => {
    let tujuan = phoneNumberFormatter(req.query.tujuan);
    let pesan = req.query.pesan;
    // const tujuan = phoneNumberFormatter(req.query.tujuan);

    const isRegisteredNumber = await checkRegisteredNumber(tujuan);
  
    if (!isRegisteredNumber) {
      return res.status(422).json({
        status: false,
        message: 'The number is not registered'
      });
    }

    client.sendMessage(tujuan, pesan).then(response => {
        res.status(200).json({
          status: true,
          response: response
        });
    }).catch(err => {
        res.status(500).json({
          status: false,
          response: err
        });
    });
});


app.listen(port, () => {
    console.log('Example app listening on port ${port}');
});
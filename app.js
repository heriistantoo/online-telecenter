const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(fileUpload({
  debug: false
}));

const db = require('./helpers/db.js');

(async () => {
  app.get('/', (req, res) => {
    res.sendFile('index.html', {
      root: __dirname
    });
  });

  const savedSession = await db.readSession();
  const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // <- this one doesn't works in Windows
        '--disable-gpu'
      ],
    },
    session: savedSession
  });

  client.on('message', msg => {
    if (msg.body == '!ping') {
      msg.reply('Anda sudah terkoneksi dengan telecenter Dinas Kesehatan Kabupaten Blitar');
    }  else if (msg.body == '!groups') {
      client.getChats().then(chats => {
        const groups = chats.filter(chat => chat.isGroup);

        if (groups.length == 0) {
          msg.reply('You have no group yet.');
        } else {
          let replyMsg = '*YOUR GROUPS*\n\n';
          groups.forEach((group, i) => {
            replyMsg += `ID: ${group.id._serialized}\nName: ${group.name}\n\n`;
          });
          replyMsg += '_You can use the group id to send a message to the group._'
          msg.reply(replyMsg);
        }
      });

    } else if (msg.body == '1') {
      msg.reply('1. Ketik angka *1.1* jika saya tidak mempunya gejala\n\n2. Ketik angka *1.2* jika saya mempunyai gejala (demam, batuk, pilek, lemas, dsb)');
    } else if (msg.body == '1.1') {
      msg.reply('Anda menjalani isolasi selama 10 HARI sejak isolasi mandiri atau sejak hasil swab keluar');
    } else if (msg.body == '1.2') {
      msg.reply('Anda menjalani isolasi selama 14 HARI sejak isolasi mandiri atau sejak hasil swab keluar');
    } else if (msg.body == '2') {
      msg.reply('1. Ketik angka *2.1* jika saya tidak mempunya gejala\n\n2. Ketik angka *2.2* jika saya mempunyai gejala batuk dan demam');
    } else if (msg.body == '2.1') {
      msg.reply('Anda harus banyak makan makanan yang bergizi, istirahat teratur dan mengkonsumsi multivitamin serta suplemen seperti vitamin C, vitamin D, Tablet Zinc. Jangan lupa untuk selalu menerapkan protokol kesehatan meski menjalani isolasi di rumah');
    } else if (msg.body == '2.2') {
      msg.reply('Anda disarankan untuk mendapatkan obat batuk yang dijual secara bebas di apotek untuk meredakan batuk dan paracetamol untuk meredakan demam. Jangan lupa untuk banyak makan makanan yang bergizi, istirahat teratur serta mengkonsumsi multivitamin dan suplemen seperti vitamin C, vitamin D, Tablet Zinc. Jangan lupa untuk selalu menerapkan protokol kesehatan meski menjalani isolasi di rumah');
    }
    else{
      msg.reply('SELAMAT DATANG DI TELECENTER DINAS KESEHATAN KABUPATEN BLITAR\n\n*MENU LAYANAN*\n\n1. Ketik angka *1* jika anda ingin mengetahui berapa lama anda harus menjalani isolasi\n\n2. Ketik angka *2* jika anda ingin mengetahui obat apa yang harus dikonsumsi selama menjalani masa isolasi\n\n3. Ketik *3* jika anda ingin mengetahui info edukasi terkait COVID19\n\n4. Ketik angka *4* jika anda mengalami sesak nafas atau gejala semakin memberat');
    }
  });

  client.initialize();

  // Socket IO
  io.on('connection', function (socket) {
    socket.emit('message', 'Connecting...');

    client.on('qr', (qr) => {
      console.log('QR RECEIVED', qr);
      qrcode.toDataURL(qr, (err, url) => {
        socket.emit('qr', url);
        socket.emit('message', 'QR Code received, scan please!');
      });
    });

    client.on('ready', () => {
      socket.emit('ready', 'Whatsapp Telecenter is ready!');
      socket.emit('message', 'Whatsapp Telecenter is ready!');
    });

    client.on('authenticated', (session) => {
      socket.emit('authenticated', 'Whatsapp Telecenter is authenticated!');
      socket.emit('message', 'Whatsapp Telecenter is authenticated!');
      console.log('AUTHENTICATED', session);
      // Save session to DB
      db.saveSession(session);
    });

    client.on('auth_failure', function (session) {
      socket.emit('message', 'Auth failure, restarting...');
    });

    client.on('disconnected', (reason) => {
      socket.emit('message', 'Whatsapp Telecenter is disconnected!');
      // Remove session from DB
      db.removeSession();
      client.destroy();
      client.initialize();
    });
  });


  const checkRegisteredNumber = async function (number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
  }

  // Send message
  app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
  ], async (req, res) => {
    const errors = validationResult(req).formatWith(({
      msg
    }) => {
      return msg;
    });

    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped()
      });
    }

    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await checkRegisteredNumber(number);

    if (!isRegisteredNumber) {
      return res.status(422).json({
        status: false,
        message: 'The number is not registered'
      });
    }

    client.sendMessage(number, message).then(response => {
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

  // Send media
  app.post('/send-media', async (req, res) => {
    const number = phoneNumberFormatter(req.body.number);
    const caption = req.body.caption;
    const fileUrl = req.body.file;

    // const media = MessageMedia.fromFilePath('./image-example.png');
    // const file = req.files.file;
    // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
    let mimetype;
    const attachment = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    }).then(response => {
      mimetype = response.headers['content-type'];
      return response.data.toString('base64');
    });

    const media = new MessageMedia(mimetype, attachment, 'Media');

    client.sendMessage(number, media, {
      caption: caption
    }).then(response => {
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

  const findGroupByName = async function (name) {
    const group = await client.getChats().then(chats => {
      return chats.find(chat =>
        chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
      );
    });
    return group;
  }

  // Send message to group
  // You can use chatID or group name, yea!
  app.post('/send-group-message', [
    body('id').custom((value, { req }) => {
      if (!value && !req.body.name) {
        throw new Error('Invalid value, you can use `id` or `name`');
      }
      return true;
    }),
    body('message').notEmpty(),
  ], async (req, res) => {
    const errors = validationResult(req).formatWith(({
      msg
    }) => {
      return msg;
    });

    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped()
      });
    }

    let chatId = req.body.id;
    const groupName = req.body.name;
    const message = req.body.message;

    // Find the group by name
    if (!chatId) {
      const group = await findGroupByName(groupName);
      if (!group) {
        return res.status(422).json({
          status: false,
          message: 'No group found with name: ' + groupName
        });
      }
      chatId = group.id._serialized;
    }

    client.sendMessage(chatId, message).then(response => {
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

  server.listen(port, function () {
    console.log('App running on *: ' + port);
  });
})();
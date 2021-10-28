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
      msg.reply('Anda sudah terkoneksi dengan ISO KONSUL Dinas Kesehatan Kabupaten Blitar');
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

    } 
    else if (msg.body == '1') {
      msg.reply('*Kriteria seseorang yang seharusnya menjalani isolasi mandiri:*'+
      '\n\n1. Orang dengan hasil tes antigen atau PCR positif COVID-19'+
      '\n\n2. Orang dengan hasil tes PCR positif COVID-19, baik bergejala ringan maupun tanpa gejala'+
      '\n\n3. Orang dengan hasil tes antigen positif COVID-19, dengan minimal 3 gejala COVID-19 ringan'+
      '\n\n4. Orang dengan hasil tes antigen positif COVID-19 setelah kontak erat tanpa masker (tatap muka dengan penderita COVID-19 atau memiliki gejala COVID-19 dalam radius 1 meter selama 15 menit), bersentuhan fisik dengan pasien COVID-19 atau gejala mengarah COVID-19, merawat pasien COVID-19 atau gejala COVID-19 tanpa masker standar medis'+
      '\n\n5. Orang dengan hasil tes antigen positif COVID-19 dan baru kontak dengan 2 orang bergejala COVID-19'+
      '\n\n6. Orang yang belum tes antigen atau PCR COVID-19 tapi pernah kontak erat dengan pengidap COVID-19'+
      '\n\nBalas angka *2* untuk melihat kategori gejala COVID-19');
    }
    else if (msg.body == '2') {
      msg.reply(MessageMedia.fromFilePath('./sources/gambar2.png'));
    } 
    else if (msg.body == '3') {
      msg.reply('*Lama isolasi mandiri pasien COVID-19 dapat dibedakan menjadi 3:*'+
      '\n\n1. Pasien *TANPA GEJALA* COVID-19 membutuhkan *10 Hari* sejak tes antigen atau PCR positif COVID-19'+
      '\n\n2. Pasien *GEJALA RINGAN* COVID-19 membutuhkan *10 Hari* ditambah *3 Hari* sejak bebas demam dan gangguan pernafasan'+
      '\n\n3. Orang *KONTAK ERAT* dengan pasien COVID-19 membutuhkan *14 Hari* sejak kontak pertama (Sebaiknya dipastikan dengan RT PCR)');
    }
    else if (msg.body == '4') {
      msg.reply(MessageMedia.fromFilePath('./sources/gambar1.png'));
    }
    else if (msg.body == '5') {
      msg.reply('Bagi pasien positif COVID-19 *TANPA GEJALA* obat yang dapat dikonsumsi adalah:'+
      '\n\n1. Vitamin C 250-500 mg 1x1 Tablet selama 10 Hari'+
      '\n\n2. Vitamin D3 1000 IU 1x1 Tablet selama 10 Hari'+
      '\n\n3. Zinc 20 mg 1x1 Tablet selama 10 Hari');

      msg.reply('Bagi pasien positif COVID-19 *GEJALA RINGAN* obat yang dapat dikonsumsi adalah:'+
      '\n\n1. Antibiotik (Harus disertai dengan resep dokter, silahkan hubungi dokter)'+
      '\n\n2. Antivirus (Harus disertai dengan resep dokter, silahkan hubungi dokter)'+
      '\n\n3. Anti Batuk : Acetylsystein 200 mg 3x1, Bromhexine 3x1 masing-masing selama 5 Hari'+
      '\n\n4. Anti Radang : Dexamethasone 0.5 2x1 Tablet selama 5 Hari'+
      '\n\n5. Penurun Panas : Paracetamol 500 mg 3x1 selama 5 Hari (Jika Demam)'+
      '\n\n6. Vit E 1x1'+
      '\n\n7. Vit B Kompleks 1x1'+
      '\n\n8. Vit D3 dan Zinc 1x1'+
      '\n\n9. Vit C 250 mg 1x1'+
      '\n\nVitamin nomor 6 hingga 9 di atas dapat langsung dibeli dalam bentuk multivitamin yang berisi vitamin-vitamin tersebut, atau dibeli secara terpisah'+
      '\n\n10. Usahakan berjemur di bawah sinar matahari pagi setidaknya selama 10-15 Menit pada pukul 09.00 - 10.30 WIB');
    
      msg.reply('Bagi pasien positif COVID-19 *GEJALA SEDANG, BERAT-KRITIS* harap segera mendapatkan bantuan oksigen dan pelayanan kesehatan di Rumah Sakit'+
      '\n\nJangan panik, selalu berdoa, tetap bersyukur, semangat, dan selalu gembira. Karena hati yang gembira adalah obat. Selalu percaya dan yakin dengan kesembuhan. 🙏🙏🙏');
    
    }
    else if (msg.body == '6') {
      msg.reply('Berikut media informasi yang dapat diakses:'+
      '\n\n1. https://tanggapcorona.blitarkab.go.id/'+
      '\n\n2. https://www.youtube.com/channel/UCTkLICaGftR_fksyLFKdanw/videos'+
      '\n\n3. https://tanggapcorona.blitarkab.go.id/commandcenter/');
    }
    else if (msg.body == '7') {
      msg.reply('Tenaga medis yang dapat melayani konsultasi:'+
      '\n\n*PUSKESMAS BACEM*'+
      '\n\n1. dr. Purna ☎️ 081334514615'+
      '\n\n*PUSKESMAS BAKUNG*'+
      '\n\n1. dr. Ichsan ☎️ 08113000523'+
      '\n2. dr. Hendri ☎️ 085648498187'+
      '\n\n*PUSKESMAS BINANGUN*'+
      '\n\n1. dr. Dewi ☎️ 082131978797'+
      '\n\n*PUSKESMAS BORO*'+
      '\n\n1. dr. Zuniarsih ☎️ 085649440150'+
      '\n\n*PUSKESMAS DOKO*'+
      '\n\n1. dr. Anggrita ☎️ 081553636000'+
      '\n2. dr. Eko ☎️ 081328578032'+
      '\n\n*PUSKESMAS GANDUSARI*'+
      '\n\n1. dr. Muhammad Farid ☎️ 082231922108'+
      '\n2. dr. Vladimir ☎️ 08113291992'+
      '\n\n*PUSKESMAS GARUM*'+
      '\n\n1. dr. Arne ☎️ 081334767659'+
      '\n2. dr. Arsinta ☎️ 082134868365'+
      '\n\n*PUSKESMAS KADEMANGAN*'+
      '\n\n1. dr. Silvia ☎️ 08563085300'+
      '\n2. dr. Rurin ☎️ 085731950306'+
      '\n\n*PUSKESMAS KANIGORO*'+
      '\n\n1. dr. Deny ☎️ 082282195339'+
      '\n\n*PUSKESMAS KESAMBEN*'+
      '\n\n1. dr. Rofiq ☎️ 085234287530'+
      '\n2. dr. Evi ☎️ 082231649558'+
      '\n\n*PUSKESMAS NGLEGOK*'+
      '\n\n1. dr. Kentik ☎️ 081334533444'+
      '\n\n*PUSKESMAS PANGGUNGREJO*'+
      '\n\n1. dr. Yeni ☎️ 08121669683'+
      '\n\n*PUSKESMAS PONGGOK*'+
      '\n\n1. dr. Rabitha ☎️ 085871189997'+
      '\n2. dr. Inaka ☎️ 082141117800'+
      '\n\n*PUSKESMAS SANANKULON*'+
      '\n\n1. dr. Evi ☎️ 087753810268'+
      '\n\n*PUSKESMAS SELOPURO*'+
      '\n\n1. dr. Adi ☎️ 08123310818'+
      '\n\n*PUSKESMAS SLUMBUNG*'+
      '\n\n1. dr. Agus ☎️ 082230369373'+
      '\n\n*PUSKESMAS SRENGAT*'+
      '\n\n1. dr. Puspa ☎️ 081235134910'+
      '\n\n*PUSKESMAS SUTOJAYAN*'+
      '\n\n1. dr. Erwin ☎️ 089646399338'+
      '\n2. dr. Mohammad Rizza ☎️ 082233666511'+
      '\n\n*PUSKESMAS TALUN*'+
      '\n\n1. dr. Desy ☎️ 081231735567'+
      '\n\n*PUSKESMAS UDANAWU*'+
      '\n\n1. dr. Yunike ☎️ 08123273610'+
      '\n2. dr. Bagus ☎️ 085806952236'+
      '\n\n*PUSKESMAS WATES*'+
      '\n\n1. dr. Indah ☎️ 082231155373'+
      '\n2. dr. Ariesta ☎️ 081257447115'+
      '\n\n*PUSKESMAS WLINGI*'+
      '\n\n1. dr. Ainu ☎️ 082145044491'+
      '\n2. dr. Syamsudduha ☎️ 082329442984'+
      '\n\n*PUSKESMAS WONODADI*'+
      '\n\n1. dr. Edwin ☎️ 081238392569'+
      '\n\n*PUSKESMAS WONOTIRTO*'+
      '\n\n1. dr. Oscar ☎️ 081559800096'+
      '\n2. dr. Izhaca ☎️ 085645185045');
    }
    else if (msg.body == '8') {
      msg.reply('*Tindakan yang harus dilakukan setelah masa isolasi selesai / dinyatakan sembuh dari COVID-19:*'+
      '\n\n1. Boleh kembali beraktivitas seperti sediakala dengan tetap mematuhi protokol kesehatan'+
      '\n\n2. Bila masih merasa lemas, hindari beraktivitas secara normal. Lakukan peningkatan intentistas aktivitas secara bertahap mulai dari ringan hingga kondisi kembali normal'+
      '\n\n3. Bila masih merasakan gejala sisa, dapat melakukan pemeriksaan secara rutin ke dokter sesuai gejala yang dialami'+
      '\n\n4. Bila sudah tidak ada gejala sisa, dapat dilakukan check up rutin untuk melihat adakah gangguan organ yang diakibatkan oleh COVID-19'+
      '\n\n5. Bila sudah dinyatakan sembuh, tidak perlu melakukan tes swab PCR berkala bila tidak ada indikasi terinfeksi kembali (Reinfeksi)'+
      '\n\n6. Tetap patuhi protokol kesehatan dan jaga imun tubuh karena masih terdapat kemungkinan terinfeksi kembali'
        );
    }
    else if (msg.body == '9') {
      msg.reply('*Untuk bisa mendapatkan vaksinasi ada beberapa syarat yang perlu dipenuhi saat penyuntikan:*'+
        '\n\n1. Kondisi sehat'+
        '\n\n2. Berusia > 12 Tahun'+
        '\n\n3. Tidak sedang demam (>37.5°C)'+
        '\n\n4. Tekanan darah < 180/110 mmHg'+
        '\n\n5. Tidak memiliki riwayat alergi berat'+
        '\n\n6. Bagi yang memiliki riwayat asma dengan kondisi terkontrol'+
        '\n\n7. Bagi yang memiliki riwayat penyakit berat dengan kondisi terkontrol'+
        '\n\n8. Ibu hamil atau menyusui harus pada kondisi sehat'
      );
    }
    else if (msg.body == '10') {
      msg.reply('*Untuk melakukan pendaftaran mendapatkan vaksin dapat dilakukan dengan cara:*'+
        '\n\n1. Pendaftaran vaksin gratis dapat dilakukan dengan mendatangi puskesmas atau rumah sakit terdekat'+
        '\n\n2. Bagi masyarakat yang ingin mendapatkan vaksinasi segera tanpa menunggu bisa menghubungi rumah sakit tertentu untuk mendapatkan vaksin gotong royong atau pra bayar'
      );
    }
    else if (msg.body == '11') {
      msg.reply('*Terdapat beberapa efek samping vaksin / KIPI yang mungkin bisa terjadi:*'+
        '\n\n1. Nyeri ringan pada bekas suntikan'+
        '\n\n2. Sakit kepala atau nyeri otot dan sendi'+
        '\n\n3. Menggigill'+
        '\n\n4. Rasa lelah'+
        '\n\n5. Demam hingga >37.5°C'
      );
    }
    else if (msg.body == '12') {
      msg.reply('*Terdapat beberapa cara yang bisa dilakukan untuk mengatasi efek samping vaksin / KIPI:*'+
        '\n\n1. Untuk efek samping ringan seperti pusing, mual, nyeri pada bekas suntikan, kelelahan, dan demam (>37.5°C) tidak perlu datang ke fasilitas kesehatan atau nakes terdekat'+
        '\n\n2. Jika keluhan berkelanjutan atau berat seperti sesak nafas, demam tinggi hingga kejang bisa mendatangi puskesmas, tempat fasilitas kesehatan terdekat, atau menghubungi nomor yang tertera pada kartu vaksin'
      );
    }
    else if (msg.body == '13') {
      msg.reply('*Efek samping vaksin atau KIPI dapat dilaporkan dengan datang langsung ke puskesmas, rumah sakit terdekat, atau menghubungi nomor yang tertera pada kartu vaksin*'
      );
    }
    else if (msg.body == '14') {
      msg.reply('*Terdapat beberapa jenis vaksin yang sudah bisa digunakan:*'+
        '\n\n1. CoronaVac'+
        '\n\n2. Sinopharm'+
        '\n\n3. AstraZeneca'+
        '\n\n4. Moderna'
      );
    }
    else if (msg.body == '15') {
      msg.reply('*Terdapat beberapa kondisi yang menyebabkan penundaan atau pembatalan pemberian vaksin:*'+
        '\n\n1. Kondisi sakit'+
        '\n\n2. Berusia < 12 Tahun'+
        '\n\n3. Sedang demam (>37.5°C)'+
        '\n\n4. Tekanan darah > 180/110 mmHg'+
        '\n\n5. Memiliki riwayat alergi berat'+
        '\n\n6. Memiliki riwayat asma dengan kondisi tidak terkontrol'+
        '\n\n7. Memiliki riwayat penyakit berat dengan kondisi tidak terkontrol'+
        '\n\n8. Ibu hamil atau menyusui dengan kondisi tidak sehat atau tidak memenuhi syarat'
      );
    }
    else if (msg.body == 'Menu'){
      msg.reply('Silahkan balas dengan angka sesuai menu di bawah ini jika anda butuh informasi layanan lebih lanjut:'+
      '\n\n👉 Balas angka *1* jika anda ingin mengetahui kriteria orang yang harus menjalani isolasi mandiri'+
      '\n\n👉 Balas angka *2* jika anda ingin mengetahui kategori / kriteria pasien isolasi mandiri'+
      '\n\n👉 Balas angka *3* jika anda ingin mengetahui berapa lama masa isolasi yang harus dilakukan'+
      '\n\n👉 Balas angka *4* jika anda ingin mengetahui apa yang harus dilakukan selama menjalani masa isolasi mandiri'+
      '\n\n👉 Balas angka *5* jika anda ingin mengetahui obat apa yang dapat dikonsumsi selama masa isolasi mandiri'+
      '\n\n👉 Balas angka *6* jika anda ingin mengetahui info edukasi terkait COVID-19'+
      '\n\n👉 Balas angka *7* jika anda mengalami sesak nafas atau gejala semakin memberat dan membutuhkan bantuan konsultasi tenaga medis'+
      '\n\n👉 Balas angka *8* jika anda ingin mengetahui apa saja yang harus dilakukan setelah masa isolasi selesai / telah dinyatakan sembuh dari COVID-19'+
      '\n\n💉 Balas angka *9* jika anda ingin mengetahui syarat mendapatkan vaksin'+
      '\n\n💉 Balas angka *10* jika anda ingin mengetahui cara mendaftarkan diri untuk mendapatkan vaksin'+
      '\n\n💉 Balas angka *11* jika anda ingin mengetahui efek samping yang mungkin timbul dari vaksin / KIPI'+
      '\n\n💉 Balas angka *12* jika anda ingin mengetahui cara mengatasi efek samping vaksin / KIPI'+
      '\n\n💉 Balas angka *13* jika anda ingin mengetahui tata cara pelaporan efek samping vaksin atau KIPI'+
      '\n\n💉 Balas angka *14* jika anda ingin mengetahui jenis vaksin yang sudah bisa digunakan'+
      '\n\n💉 Balas angka *15* jika anda ingin mengetahui syarat terjadi penundaan atau pembatalan pemberian vaksin'
      );
    } else{
      msg.reply('Salam Sehat, selamat datang di *ISO KONSUL* COVID-19 yang dikelola oleh Dinas Kesehatan Kabupaten Blitar. ISO KONSUL ini dibuat sebagai sarana informasi dan konsultasi yang diperuntukan bagi warga yang saat ini sedang menjalani isolasi mandiri COVID-19 di rumah.'+
      '\nBalas dengan pesan *Menu* untuk melihat daftar layanan.');
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
      socket.emit('ready', 'Whatsapp Iso Konsul is ready!');
      socket.emit('message', 'Whatsapp Iso Konsul is ready!');
    });

    client.on('authenticated', (session) => {
      socket.emit('authenticated', 'Whatsapp Iso Konusl is authenticated!');
      socket.emit('message', 'Whatsapp Iso Konsul is authenticated!');
      console.log('AUTHENTICATED', session);
      // Save session to DB
      db.saveSession(session);
    });

    client.on('auth_failure', function (session) {
      socket.emit('message', 'Auth failure, restarting...');
    });

    client.on('disconnected', (reason) => {
      socket.emit('message', 'Whatsapp Iso Konsul is disconnected!');
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
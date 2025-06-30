const express = require('express');
const ytdl = require("@distube/ytdl-core");
const path = require('path');
const fs = require('fs')

const app = express();
const PORT = 3000;
const ipAddress = "192.168.0.13"
const videoPath = path.join(__dirname, 'video');
const audioPath = path.join(__dirname, 'audio');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use('/video', express.static(videoPath, {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Disposition', 'attachment');
  }
}));
app.use('/audio', express.static(audioPath, {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Disposition', 'attachment');
  }
}));

app.get('/', (req, res) => {
  res.render('index', { videoInfo: null, error: null });
});

app.post('/download', async (req, res) => {
  const videoURL = req.body.url;

  if (!videoURL) return res.status(400).json({ message: "Um link válido precisa ser fornecido" })

  try {
    const videoData = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoURL)}&format=json`)
    const data = await videoData.json()

    res.render('index',
      {
        videoInfo:
        {
          url: videoURL,
          title: data.title,
          channel: data.author_name,
          thumbnail: data.thumbnail_url
        },
        error: null
      }
    );
  } catch (err) {
    res.render('index', { videoInfo: null, error: 'Erro ao obter o vídeo' });
  }
});

app.get('/mp4', async (req, res) => {
  const videoURL = req.query.url;
  const title = req.query.title.replace(/[<>:"/\\|?*]+/g, '_');

  if (!videoURL) {
    return res.status(400).send('URL inválida');
  }

  try {
    const filePath = __dirname + '/video/' + title + '.mp4';
    const writeStream = fs.createWriteStream(filePath)
    const videoStream = ytdl(videoURL, { quality: "highest", filter: 'videoandaudio' })

    videoStream.pipe(writeStream)

    writeStream.on('finish', async () => {
      console.log('Sucesso em baixar o vídeo');
      res.redirect(`http://${ipAddress}:3000/video/${encodeURIComponent(title)}.mp4`);
    })
  } catch (error) {
    console.error('Erro no /mp4:', error);
    res.status(500).send('Erro ao baixar o vídeo', error);
  }
});

app.get('/mp3', async (req, res) => {
  const videoURL = req.query.url;
  const title = req.query.title.replace(/[<>:"/\\|?*]+/g, '_');

  if (!videoURL) {
    return res.status(400).send('URL inválida');
  }

  try {
    const filePath = __dirname + '/audio/' + title + '.mp3';
    const writeStream = fs.createWriteStream(filePath)
    const audioStream = ytdl(videoURL, { quality: 'highestaudio', filter: 'audioonly' })

    audioStream.pipe(writeStream)

    writeStream.on('finish', async () => {
      console.log('Sucesso em baixar o áudio');
      res.redirect(`http://${ipAddress}:3000/audio/${encodeURIComponent(title)}.mp3`);
    })
  } catch (error) {
    console.error('Erro no /mp3:', error);
    res.status(500).send('Erro ao baixar o áudio');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

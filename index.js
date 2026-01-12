const express = require("express");
const { YtDlp } = require("ytdlp-nodejs");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;
const videoPath = path.join(__dirname, "video");
const audioPath = path.join(__dirname, "audio");

const ytdlp = new YtDlp();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(
  "/video",
  express.static(videoPath, {
    setHeaders: (res, filePath) => {
      res.setHeader("Content-Disposition", "attachment");
    },
  })
);
app.use(
  "/audio",
  express.static(audioPath, {
    setHeaders: (res, filePath) => {
      res.setHeader("Content-Disposition", "attachment");
    },
  })
);

app.get("/", (req, res) => {
  res.render("index", { videoInfo: null, error: null });
});

app.post("/download", async (req, res) => {
  const videoURL = req.body.url;

  if (!videoURL)
    return res
      .status(400)
      .json({ message: "Um link válido precisa ser fornecido" });

  try {
    const videoData = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        videoURL
      )}&format=json`
    );
    const data = await videoData.json();

    res.render("index", {
      videoInfo: {
        url: videoURL,
        title: data.title,
        channel: data.author_name,
        thumbnail: data.thumbnail_url,
      },
      error: null,
    });
  } catch (err) {
    res.render("index", { videoInfo: null, error: "Erro ao obter o vídeo" });
  }
});

app.get("/mp4", async (req, res) => {
  const videoURL = req.query.url;
  const title = req.query.title.replace(/[<>:"/\\|?*]+/g, "_");
  const outputFile = path.join(videoPath, `${title}.webm`);

  try {
    await ytdlp.downloadAsync(videoURL, {
      format: "bestvideo+bestaudio",
      output: outputFile,
    });

    console.log("Sucesso em baixar o vídeo");

    res.download(outputFile, `${title}.webm`, (err) => {
      if (err) {
        console.error("Erro no download:", err);
      }
      fs.unlink(outputFile, (unlinkErr) => {
        if (unlinkErr) console.error("Erro ao excluir:", unlinkErr);
        else console.log("Arquivo de vídeo excluído:", outputFile);
      });
    });
  } catch (error) {
    console.error("Erro no /mp4:", error);
    res.status(500).send("Erro ao baixar o vídeo");
  }
});

app.get("/mp3", async (req, res) => {
  const videoURL = req.query.url;
  const title = req.query.title.replace(/[<>:"/\\|?*]+/g, "_");
  const outputFile = path.join(audioPath, `${title}.mp3`);

  try {
    await ytdlp.downloadAsync(videoURL, {
      format: "bestaudio",
      output: outputFile,
      postProcess: [
        {
          key: "FFmpegExtractAudio",
          preferredcodec: "mp3",
          preferredquality: "192",
        },
      ],
    });

    console.log("Sucesso em baixar o áudio");

    res.download(outputFile, `${title}.mp3`, (err) => {
      if (err) {
        console.error("Erro no download:", err);
      }
      fs.unlink(outputFile, (unlinkErr) => {
        if (unlinkErr) console.error("Erro ao excluir:", unlinkErr);
        else console.log("Arquivo de áudio excluído:", outputFile);
      });
    });
  } catch (error) {
    console.error("Erro no /mp3:", error);
    res.status(500).send("Erro ao baixar o áudio");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

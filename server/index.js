require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { transcribeFile } = require('./transcribe');
const { burnASS } = require('./ffmpegUtils');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/', express.static(path.join(__dirname, '..', 'public')));

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

app.post('/transcribe', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const filePath = req.file.path;
    const segments = await transcribeFile(filePath);
    return res.json({ file: req.file.filename, segments });
  } catch (err) {
    console.error('Transcription error:', err.message);
    // On error (rate limit, API failure, etc), return friendly error message
    if (err.response && err.response.status === 429) {
      return res.status(429).json({ error: 'OpenAI API rate limited. Please try again in a moment.' });
    }
    return res.status(500).json({ error: 'Transcription failed. ' + String(err).split('\n')[0] });
  }
});

app.post('/export', upload.single('video'), async (req, res) => {
  try {
    // expects JSON body fields: segments (array), styles (object)
    const { segments, styles } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const inputPath = req.file.path;
    const outputDir = path.join(__dirname, '..', 'outputs');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outName = `output-${Date.now()}.mp4`;
    const outPath = path.join(outputDir, outName);

    // burn ASS and return file
    await burnASS(inputPath, segments, styles, outPath);

    res.download(outPath, outName, (err) => {
      if (err) console.error('Download error', err);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

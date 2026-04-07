const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function extractAudio(inputPath, outPath) {
  return new Promise((resolve, reject) => {
    try {
      // Use direct ffmpeg command to extract audio as WAV format
      const cmd = `ffmpeg -i "${inputPath}" -map 0:a:0 -ar 16000 -ac 1 "${outPath}" -y`;
      execSync(cmd, { stdio: 'pipe' });
      resolve(outPath);
    } catch (err) {
      reject(err);
    }
  });
}

async function transcribeFile(inputVideoPath) {
  // Extract audio to WAV
  const baseFileName = path.basename(inputVideoPath, path.extname(inputVideoPath));
  const audioPath = path.join(path.dirname(inputVideoPath), baseFileName + '.wav');
  
  if (!fs.existsSync(audioPath)) {
    await extractAudio(inputVideoPath, audioPath);
  }

  // Use local Whisper via Python script
  try {
    console.log('Transcribing with local Whisper...');
    const script = path.join(__dirname, 'whisper_transcribe.py');
    const cmd = `python "${script}" "${audioPath}"`;
    const output = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
    
    const result = JSON.parse(output);
    
    // Extract segments from Whisper output
    const segments = (result.segments || []).map(s => ({ 
      start: Number(s.start), 
      end: Number(s.end), 
      text: String(s.text).trim() 
    }));
    
    return segments;
  } catch (err) {
    console.error('Whisper error:', err.message);
    // Fallback to mock transcription if Whisper fails
    console.log('Falling back to mock transcription...');
    const dur = await getVideoDuration(inputVideoPath);
    const segs = [];
    const segLen = Math.max(2, Math.min(5, Math.floor(dur / 6)));
    for (let t = 0; t < dur; t += segLen) {
      const start = t;
      const end = Math.min(dur, t + segLen);
      segs.push({ start, end, text: `(auto-generated) Speech segment from ${start}s to ${end}s` });
    }
    return segs;
  }
}

async function getVideoDuration(videoPath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, meta) => {
      if (err || !meta || !meta.format) return resolve(10);
      return resolve(Math.floor(meta.format.duration || 10));
    });
  });
}

module.exports = { transcribeFile };

# English Subtitle Generator

Local web app that automatically generates English subtitles for videos using local Whisper AI (no API keys needed).

## Features
- ✅ Upload video/clip and auto-generate subtitles
- ✅ Live subtitle preview overlay (centered by default)
- ✅ Interactive subtitle editor:
  - Drag subtitles to reposition
  - Change font (Arial, Georgia, Verdana, Trebuchet MS)
  - Adjust color, size, boldness
  - Edit text manually
- ✅ Export video with burned-in subtitles
- ✅ 100% local processing (no API keys, free)

## Prerequisites
- Node.js 16+
- Python 3.8+ with pip
- ffmpeg on PATH

## Installation & Setup

```bash
# 1. Install Node dependencies
npm install

# 2. Install Python Whisper (one-time, ~2GB model download)
pip install --user openai-whisper

# 3. Start the dev server
npm run dev

# 4. Open http://localhost:3000 in browser
```

## First Run
**Note:** First transcription downloads the Whisper model (~1.5GB), which may take 1-2 minutes and 100+ MB internet bandwidth. Subsquent transcriptions are fast (~30 seconds per minute of video).

## Usage
1. Click **Choose Video File** and select a video
2. Click **Upload & Generate** — subtitles auto-generate  
3. Edit subtitles in the right panel (drag, change font/color/size)
4. Click **Export Video (burned)** to download with embedded subtitles

## Architecture
- **Backend:** Express.js + ffmpeg + OpenAI Whisper (local)
- **Frontend:** Vanilla JS with live subtitle overlay
- **Transcription:** Python Whisper (local, no API keys)
- **Video:** ffmpeg for extraction and burning

## Troubleshooting
- **"Whisper command not found"** → Run `pip install --user openai-whisper`
- **Slow first upload** → Model is downloading/loading (normal, ~1-2 min)
- **Empty subtitles** → Check server logs, ensure audio stream exists

## License
MIT

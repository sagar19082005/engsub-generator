# Render Deployment Guide - English Subtitle Generator

## Environment Variables to Set on Render

When deploying to Render, add these environment variables in your Render dashboard:

### **Required Variables**

| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `3000` | Server port (Render will assign dynamically) |
| `NODE_ENV` | `production` | Set environment to production |

### **Optional Variables**

| Variable | Default | Description |
|----------|---------|-------------|
| `UPLOAD_DIR` | `uploads` | Directory for uploaded video files |
| `OUTPUT_DIR` | `outputs` | Directory for exported video files |
| `MAX_FILE_SIZE` | `500` | Maximum file size in MB |
| `WHISPER_MODEL` | `base` | Whisper model size (tiny, base, small, medium, large) |
| `WHISPER_LANGUAGE` | `en` | Language code for transcription |
| `CORS_ORIGIN` | `*` | CORS origin (restrict in production) |

---

## Steps to Deploy on Render

### 1. **Connect GitHub Repository**
- Go to [Render Dashboard](https://dashboard.render.com)
- Click "New +" → "Web Service"
- Connect your GitHub account and select `sagar19082005/engsub-generator`

### 2. **Configure the Service**
- **Name:** `engsub-generator`
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Standard (minimum required for video processing)

### 3. **Add Environment Variables**
In the "Environment" section, add:

```
PORT=3000
NODE_ENV=production
WHISPER_MODEL=base
MAX_FILE_SIZE=500
```

### 4. **Configure Disk**
Since the app processes videos, you may need:
- Persistent disk for `/uploads` and `/outputs` directories
- Add Persistent Disk: `/var/data` mounted to store files

### 5. **System Dependencies**
Add a `build.sh` script (optional, if FFmpeg not available):

```bash
#!/bin/bash
apt-get update
apt-get install -y ffmpeg
pip install openai-whisper
npm install
```

### 6. **Deploy**
- Click "Create Web Service"
- Render will automatically deploy from the master branch
- View logs to monitor the deployment

---

## Important Notes

⚠️ **Video Processing Requirements:**
- Render free tier may have limitations for large video processing
- Recommended: Use Standard tier or higher
- FFmpeg and Python/Whisper must be available

⚠️ **Storage:**
- Uploaded files and outputs need persistent storage
- Configure a persistent disk to avoid data loss

⚠️ **File Size Limits:**
- Set `MAX_FILE_SIZE` based on your plan limits
- Monitor disk space usage

⚠️ **API Quotas:**
- If using OpenAI Whisper API, set appropriate rate limits
- Local Whisper doesn't require API keys

---

## Local .env Example

For local development, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your local values:
```
PORT=3000
NODE_ENV=development
WHISPER_MODEL=base
```

---

## Troubleshooting

**FFmpeg not found:**
- Install FFmpeg system package on Render
- Or add to build script

**Whisper module not found:**
- Ensure Python is available
- Add to build script: `pip install openai-whisper`

**Port not accessible:**
- Render assigns PORT dynamically, your app must use `process.env.PORT`
- Already configured in your `server/index.js` ✅

**Uploads/Outputs directory errors:**
- Create directories if they don't exist (already done in code) ✅
- Use persistent disk for storage

---

## Summary

Your app is already configured to use environment variables correctly! 🎉

**Minimal Config for Render:**
```
PORT=3000
NODE_ENV=production
```

Add more as needed based on your deployment requirements.

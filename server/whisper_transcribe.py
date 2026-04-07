#!/usr/bin/env python3
import sys
import json
import whisper

def transcribe(audio_path):
    model = whisper.load_model("base")
    result = model.transcribe(audio_path, language="en")
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Audio path required"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    try:
        result = transcribe(audio_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

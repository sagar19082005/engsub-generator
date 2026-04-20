const fs = require('fs');
let code = fs.readFileSync('server/ffmpegUtils.js', 'utf8');

const regex = /segments\.forEach\(segment => \{[\s\S]*?            bold: segment\.bold\n          \}\);\n        \}\n      \}\n    \}\);/m;

const replacement = \segments.forEach(segment => {
      const segType = segment.subtitleType || 'full';

      if (segType === 'word-type' && segment.words && segment.words.length > 0) {
        const duration = segment.end - segment.start;
        const timePerWord = duration / segment.words.length;

        segment.words.forEach((word, idx) => {
          const wordStart = segment.start + (idx * timePerWord);
          const wordEnd = segment.end;

          events.push({
            start: wordStart,
            end: wordEnd,
            text: escapeASS(word.text),
            x: word.assX != null ? word.assX : (segment.assX != null ? segment.assX : 640),
            y: word.assY != null ? word.assY : (segment.assY != null ? segment.assY : 360),
            color: hexToASS(word.color || segment.color || '#ffffff'),
            bgColor: hexToASS(word.bgColor || segment.bgColor || '#000000'),
            font: word.font || segment.font || 'Arial',
            size: word.size || segment.size || 36,
            bold: word.bold !== undefined ? word.bold : segment.bold
          });
        });
      } else if (segType === 'word-studio') {
        const words = segment.text.split(' ');
        const duration = segment.end - segment.start;
        const timePerWord = duration / words.length;

        for (let i = 0; i < words.length; i++) {
          const slotStart = segment.start + (i * timePerWord);
          const slotEnd = segment.start + ((i + 1) * timePerWord);

          const baseColor = segment.color || '#ffffff';
          const highlightColor = segment.studioHighlightColor || '#2196F3';
          
          let displayText = '';
          for (let j = 0; j < words.length; j++) {
            if (j > 0) displayText += ' ';
            if (j === i) {
               displayText += XXX{\\\\c\}\{\\\\c\}XXX;
            } else {
               displayText += escapeASS(words[j]);
            }
          }

          events.push({
            start: slotStart,
            end: slotEnd,
            text: displayText,
            x: segment.assX != null ? segment.assX : 640,
            y: segment.assY != null ? segment.assY : 360,
            color: hexToASS(baseColor),
            bgColor: hexToASS(segment.bgColor || '#000000'),
            font: segment.font || 'Arial',
            size: segment.size || 36,
            bold: segment.bold
          });
        }
      } else if (segType === 'typing-word') {
        const words = segment.text.split(' ');
        const duration = segment.end - segment.start;
        const timePerWord = duration / words.length;

        for (let i = 0; i < words.length; i++) {
          const slotStart = segment.start + (i * timePerWord);
          const slotEnd = segment.start + ((i + 1) * timePerWord);

          let displayText = '';
          for (let j = 0; j <= i; j++) {
            if (j > 0) displayText += ' ';
            displayText += words[j];
          }

          events.push({
            start: slotStart,
            end: slotEnd,
            text: escapeASS(displayText),
            x: segment.assX != null ? segment.assX : 640,
            y: segment.assY != null ? segment.assY : 360,
            color: hexToASS(segment.color || '#ffffff'),
            bgColor: hexToASS(segment.bgColor || '#000000'),
            font: segment.font || 'Arial',
            size: segment.size || 36,
            bold: segment.bold
          });
        }
      } else {
        events.push({
          start: segment.start,
          end: segment.end,
          text: escapeASS(segment.text),
          x: segment.assX != null ? segment.assX : 640,
          y: segment.assY != null ? segment.assY : 360,
          color: hexToASS(segment.color || '#ffffff'),
          bgColor: hexToASS(segment.bgColor || '#000000'),
          font: segment.font || 'Arial',
          size: segment.size || 36,
          bold: segment.bold
        });
      }
    });\;

if (code.match(regex)) {
   code = code.replace(regex, replacement.replace(/XXX/g, '\'));
   fs.writeFileSync('server/ffmpegUtils.js', code, 'utf8');
   console.log('REPLACED SUCCESSFULLY');
} else {
   console.log('REGEX DID NOT MATCH');
}

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function run(){
  const form = new FormData();
  form.append('video', fs.createReadStream('server/sample_with_audio.mp4'));
  try{
    const res = await axios.post('http://localhost:3000/transcribe', form, { headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity });
    console.log('status', res.status);
    console.log(JSON.stringify(res.data, null, 2));
  }catch(e){
    if(e.response){ console.error('ERR', e.response.status, e.response.data); }
    else console.error(e.message);
  }
}

run();

const ttsGoogle = require('@google-cloud/text-to-speech');
const sttGoogle = require('@google-cloud/speech').v1p1beta1;
const Polly = require('aws-sdk/clients/polly');
const AWS = require('aws-sdk');
const bent = require('bent');
const fs = require('fs');

const testNuanceTts = async(logger, getTtsVoices, credentials) => {
  const voices = await getTtsVoices({vendor: 'nuance', credentials});
  return voices;
};
const testNuanceStt = async(logger, credentials) => {
  //TODO
  return true;
};


const testGoogleTts = async(logger, credentials) => {
  const client = new ttsGoogle.TextToSpeechClient({credentials});
  await client.listVoices();
};

const testGoogleStt = async(logger, credentials) => {
  const client = new sttGoogle.SpeechClient({credentials});
  const config = {
    sampleRateHertz: 8000,
    languageCode: 'en-US',
    model: 'default',
  };
  const audio = {
    content: fs.readFileSync(`${__dirname}/../../data/test_audio.wav`).toString('base64'),
  };
  const request = {
    config: config,
    audio: audio,
  };

  // Detects speech in the audio file
  const [response] = await client.recognize(request);
  if (!Array.isArray(response.results) || 0 === response.results.length) {
    throw new Error('failed to transcribe speech');
  }
};

const testAwsTts = (logger, credentials) => {
  const polly = new Polly(credentials);
  return new Promise((resolve, reject) => {
    polly.describeVoices({LanguageCode: 'en-US'}, (err, data) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const testAwsStt = (logger, credentials) => {
  const transcribeservice = new AWS.TranscribeService(credentials);
  return new Promise((resolve, reject) => {
    transcribeservice.listVocabularies((err, data) => {
      if (err) return reject(err);
      logger.info({data}, 'retrieved language models');
      resolve();
    });
  });
};

const testMicrosoftTts = async(logger, credentials) => {
  const {
    api_key,
    region,
    // eslint-disable-next-line no-unused-vars
    use_custom_tts,
    // eslint-disable-next-line no-unused-vars
    custom_tts_endpoint,
    // eslint-disable-next-line no-unused-vars
    use_custom_stt,
    // eslint-disable-next-line no-unused-vars
    custom_stt_endpoint
  } = credentials;

  logger.info({
    api_key,
    region,
    use_custom_tts,
    custom_tts_endpoint,
    use_custom_stt,
    custom_stt_endpoint
  }, 'testing microsoft tts');
  if (!api_key) throw new Error('testMicrosoftTts: credentials are missing api_key');
  if (!region) throw new Error('testMicrosoftTts: credentials are missing region');
  try {
    const getJSON = bent('json', {
      'Ocp-Apim-Subscription-Key': api_key
    });
    const response = await getJSON(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`);
    return response;
  } catch (err) {
    logger.info({err}, `testMicrosoftTts - failed to list voices for region ${region}`);
    throw err;
  }
};

const testMicrosoftStt = async(logger, credentials) => {
  //TODO
  return true;
};

const testWellSaidTts = async(logger, credentials) => {
  const {api_key} = credentials;
  try {
    const post = bent('https://api.wellsaidlabs.com', 'POST', 'buffer', {
      'X-Api-Key': api_key,
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json'
    });
    const mp3 = await post('/v1/tts/stream', {
      text: 'Hello, world',
      speaker_id: '3'
    });
    return mp3;
  } catch (err) {
    logger.info({err}, 'testWellSaidTts returned error');
    throw err;
  }
};

const testWellSaidStt = async(logger, credentials) => {
  //TODO
  return true;
};

module.exports = {
  testGoogleTts,
  testGoogleStt,
  testAwsTts,
  testWellSaidTts,
  testAwsStt,
  testMicrosoftTts,
  testMicrosoftStt,
  testWellSaidStt,
  testNuanceTts,
  testNuanceStt
};

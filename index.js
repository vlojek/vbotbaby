const rwClient = require('./twitterClient.js');
const CronJob = require('cron').CronJob;
const axios = require('axios');
const qs = require('qs');
const skz = ['🐺', '🐰', '🐷🐰', '🥟', '🐥', '🐶', '🦊'];
let randomSkz = skz[Math.floor(Math.random() * skz.length)];

const client_id = '4e1009ef493441ce890eb3f17716f2cc';
const client_secret = 'af53c639a0154bffb90e7488cb7f1fb9';
const auth_token = Buffer.from(
  `${client_id}:${client_secret}`,
  'utf-8'
).toString('base64');

// Get Spotify Access Token:
const getAuth = async () => {
  const BASE64_ENCODED_AUTH_CODE = auth_token;
  const headers = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${BASE64_ENCODED_AUTH_CODE}`,
    },
  };
  const data = {
    grant_type: 'client_credentials',
  };

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      qs.stringify(data),
      headers
    );
    return response.data.access_token;
  } catch (error) {
    console.log(error);
  }
};

// Use Spotify Recommended:
const getAudioFeatures_Track = async (energy) => {
  const access_token = await getAuth();
  console.log('Access Token: ' + access_token);

  const api_url =
    `https://api.spotify.com/v1/recommendations?limit=3&market=DE&seed_artists=` +
    `4D9foUQxTrsS0w2BeyCD16` +
    `&seed_genres=k-pop&seed_tracks=` +
    `279HOB7dgskHprPl4W4zAb` +
    `&target_energy=` +
    energy;
  try {
    const response = await axios.get(api_url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    // console.log(response.data);
    // console.log('output: ' + response.data.tracks[0].artists[0].name);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

// Define Tweet Contents:
const tweet = async () => {
  try {
    // Get weather (Temp + Daylight):
    const { data } = await axios(
      'https://api.openweathermap.org/data/2.5/weather?q=berlin&units=metric&appid=b72392f28d8647a7b1bae67aff19abc1'
    );
    const temp = data.main.temp;
    const weather = data.weather[0].description;
    const time = new Date(data.dt * 1000).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Calculate energy based on time of day:
    const currentHours = new Date(data.dt * 1000).getHours();
    const sunsetHours = new Date(data.sys.sunset * 1000).getHours();
    const sunriseHours = new Date(data.sys.sunrise * 1000).getHours();
    const zenithHours = new Date(
      (data.sys.sunset - data.sys.sunrise) * 1000
    ).getHours();
    let energy = 0; // Declare baseline + fallback for minus energy levels in early morning hours
    if (1 - Math.abs(currentHours - zenithHours) / 10 > 0) {
      energy = 1 - Math.abs(currentHours - zenithHours) / 10;
    }
    console.log('Energy: ' + energy);

    // Run Spotify functions:
    const recommended = await getAudioFeatures_Track(energy);
    const recommendedArtist = recommended.tracks[0].artists[0].name;
    const recommendedTrack = recommended.tracks[0].name;
    const recommendedUrl = recommended.tracks[0].external_urls.spotify;
    console.log(
      'Artist Output: ' + recommendedArtist,
      recommendedTrack,
      recommendedUrl
    );

    // Define tweet content:
    await rwClient.v2.tweet(
      randomSkz +
        ' It is ' +
        time +
        '. Looks like the weather is ' +
        weather +
        ' at ' +
        temp +
        '°C. Based on that, I recommend you listen to: ' +
        recommendedTrack +
        ' by ' +
        recommendedArtist +
        '. Here is a link! ' +
        recommendedUrl +
        '.'
    );
    console.log('Tweet Tweet');
  } catch (error) {
    console.error(error);
  }
};
tweet();

// Cron job:
const job = new CronJob('0,15,30, 35, 45 * * * *', () => {
  console.log('Cron job starting!');
  tweet();
});
job.start();

const rwClient = require('./twitterClient.js');
const CronJob = require('cron').CronJob;
const axios = require('axios');
const qs = require('qs');

// Run Cron Job for scheduled runs. Guide: https://crontab.guru/#0,30_*_*_*_*
const cronJob = new CronJob('0,30 * * * *', () => {
  console.log('CronJob starting!');
  tweet();
});

// Build Spotify Auth Token
const client_id = '4e1009ef493441ce890eb3f17716f2cc';
const client_secret = 'af53c639a0154bffb90e7488cb7f1fb9';
const auth_token = Buffer.from(
  `${client_id}:${client_secret}`,
  'utf-8'
).toString('base64');

// Refresh Spotify Access Token:
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
// Atributes Info: https://ahsieh53632.github.io/music-attributes-and-popularity/
const getAudioFeatures_Track = async (energy, valence) => {
  const access_token = await getAuth();
  console.log('Access Token: ' + access_token);
  const api_url =
    `https://api.spotify.com/v1/recommendations?limit=3&market=DE&seed_artists=` +
    `4D9foUQxTrsS0w2BeyCD16` + // SKZ
    `&seed_genres=k-pop&seed_tracks=` +
    `279HOB7dgskHprPl4W4zAb` + // Placebo <3
    `&target_energy=` +
    energy +
    `&target_valence=` +
    valence;
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
    let weather = data.weather[0].description;
    // Calculate valence ('happiness') based on current weather. Weather Conditions: https://openweathermap.org/weather-conditions
    let valenceOptions = [];
    if ((weather === 'clear sky') | (weather === 'few clouds')) {
      valenceOptions = [1, 0.975, 0.95, 0.925, 0.9, 0.875, 0.85, 0.825];
    }
    if ((weather === 'scattered clouds') | (weather === 'broken clouds')) {
      valenceOptions = [0.8, 0.775, 0.75, 0.725, 0.7, 0.675, 0.65, 0.625];
    }
    if ((weather === 'shower rain') | (weather === 'rain')) {
      valenceOptions = [0.6, 0.575, 0.55, 0.525, 0.5, 0.475, 0.45, 0.425];
    }
    if ((weather === 'thunderstorm') | (weather === 'rain')) {
      valenceOptions = [0.4, 0.375, 0.35, 0.325, 0.3, 0.275, 0.25, 0.225];
    }
    if ((weather === 'snow') | (weather === 'mist')) {
      valenceOptions = [0.2, 0.175, 0.15, 0.125, 0.1, 0.075, 0.05, 0.025, 0];
    }
    const valence =
      valenceOptions[Math.floor(Math.random() * valenceOptions.length)];
    console.log('Valence: ' + valenceOptions + ', Random: ' + valence);
    // Calculate energy based on time of day - the closer to midday based on sunlight hours, the more energy:
    const countryInfo = await axios(
      'http://worldtimeapi.org/api/timezone/Europe/Berlin'
    );
    let date = new Date(countryInfo.data.unixtime).getTime();
    console.log('date: ' + date);
    let time = new Date(countryInfo.data.unixtime * 1000).toLocaleTimeString(
      'de-DE',
      {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'CET', // Force Berlin time from UNIX for Heroku
      }
    );
    const currentHours = new Date(countryInfo.data.unixtime * 1000).getHours();
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
    const recommended = await getAudioFeatures_Track(energy, valence);
    const recommendedArtist = recommended.tracks[0].artists[0].name;
    const recommendedTrack = recommended.tracks[0].name;
    const recommendedUrl = recommended.tracks[0].external_urls.spotify;
    console.log(
      `Artist Output: ${recommendedArtist}, ${recommendedTrack}, ${recommendedUrl}.`
    );

    // Draft final tweet:
    await rwClient.v2.tweet(
      `It's ${time}, and the weather is a dose of ${weather} at ${temp}°C. ` +
        `Based on that (Energy: ${energy.toFixed(1)}, ` +
        `Valence: ${valence.toFixed(1)}), I think you might like: ` +
        ` ${recommendedTrack} by ${recommendedArtist}. Here is a link! ${recommendedUrl}.`
    );
    console.log('Tweet Tweet');
  } catch (error) {
    console.error(error);
  }
};
tweet(); // Manual tweet job from localhost & heroku start.
cronJob.start(); // Automated every 30 min tweet job.

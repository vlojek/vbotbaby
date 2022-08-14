const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: '8TacoPWC9xMFw0vwNDuzfhgZD',
  appSecret: 'tiIAzaD4GMtWd5fgLvILluTOHJBbLINLoCvovujRflwcvPivTb',
  accessToken: '1557373229911638017-quI3Wq82ZIrnlLxW5qmw0LsYrUebEL',
  accessSecret: 'VpMOYnx43RyTmGFyz2MjevV6c1MJV9Q9rrysUcv3gn7Bp',
});

const rwClient = client.readWrite;

module.exports = rwClient;

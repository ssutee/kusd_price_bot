require('dotenv').config();

const bluebird = require('bluebird');
const redis = require("redis");
bluebird.promisifyAll(redis.RedisClient.prototype);
const client = redis.createClient();

const { toWei, fromWei } = require("web3-utils");

const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Matches "/kusd"
bot.onText(/\/kusd/, async (msg) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;

  const usd = await client.getAsync('usd');
  const busd = await client.getAsync('busd');
  const usdt = await client.getAsync('usdt');
  const usdc = await client.getAsync('usdc');
  const totalSupply = await client.getAsync('total-supply');
  const collateralRatio = await client.getAsync('collateral-ratio');
  const growthRatio = await client.getAsync('growth-ratio');
  const timestamp = await client.getAsync('timestamp');
  const date = new Date();
  date.setTime(parseInt(timestamp)*1000);

  const text = `
oracle price: $${parseFloat(fromWei(usd)).toFixed(4)}

swap price: 
   ${parseFloat(fromWei(busd)).toFixed(4)} BUSD
   ${parseFloat(fromWei(usdt)).toFixed(4)} USDT
   ${parseFloat(fromWei(usdc)).toFixed(4)} USDC

total supply: ${parseFloat(fromWei(totalSupply)).toLocaleString()}

collateral ratio: ${(parseFloat(fromWei(collateralRatio))*100).toLocaleString()}%
growth ratio: ${(parseFloat(fromWei(growthRatio))*100).toLocaleString()}%

⏱ ${date.toLocaleDateString('th-TH')} ${date.toLocaleTimeString('th-TH')}
`
  bot.sendMessage(chatId, text);
});


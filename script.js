require('dotenv').config(); // Load environment variables from .env

const mineflayer = require('mineflayer');
const readline = require('readline');
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');

// === CONFIGURATION ===
const MINECRAFT_USERNAME = "blackfromlack";
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // Loaded from .env
const ALLOWED_CHANNEL_ID = '1372077415634960445';

// === MINECRAFT BOT SETUP ===
const bot = mineflayer.createBot({
  host: 'buzzu.pika.host',
  port: 25565,
  username: MINECRAFT_USERNAME,
  version: '1.20.4',
});

// Console input setup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Log chat to file
const chatLogStream = fs.createWriteStream('chat-log.txt', { flags: 'a' });

bot.on('spawn', () => {
  console.log('Bot has spawned into the world.');

  rl.on('line', (input) => {
    if (input.startsWith('/say ')) {
      const message = input.slice(5).trim();
      if (message) {
        bot.chat(message);
        console.log(`Bot ran from console (/say): ${message}`);
      }
    } else {
      bot.chat(input);
      console.log(`Bot ran from console: ${input}`);
    }
  });
});

bot.on('chat', (username, message) => {
  if (username === bot.username) return;

  const timestamp = new Date().toLocaleTimeString();
  const logLine = `[${timestamp}] <${username}> ${message}\n`;

  console.log(logLine.trim());
  chatLogStream.write(logLine);
});

bot.on('whisper', (username, message) => {
  if (username === bot.username) return;

  if (message.startsWith('/say ')) {
    const realCommand = message.slice(5).trim();
    if (realCommand) {
      bot.chat(realCommand);
      console.log(`Bot ran from whisper (/say): ${realCommand}`);
    }
  } else {
    console.log(`Ignored whisper: not a /say command`);
  }
});

// === DISCORD BOT SETUP ===
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

discordClient.once('ready', () => {
  console.log(`Logged into Discord as ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', message => {
  if (message.channel.id !== ALLOWED_CHANNEL_ID || message.author.bot) return;

  if (message.content.startsWith('!say ')) {
    const msg = message.content.slice(5).trim();
    if (msg) {
      bot.chat(msg);
      console.log(`[Discord -> Minecraft] ${msg}`);
      message.react('✅');
    }
  }

  if (!message.content.startsWith('!')) {
    bot.chat(message.content);
    console.log(`[Discord -> Minecraft] ${message.content}`);
  }
});

bot.on('chat', (username, message) => {
  if (username === bot.username) return;

  const discordChannel = discordClient.channels.cache.get(ALLOWED_CHANNEL_ID);
  if (discordChannel) {
    discordChannel.send(`**${username}**: ${message}`);
  }
});

bot.on('message', (jsonMsg) => {
  const rawText = jsonMsg.toString();
  console.log('[Minecraft Server Message] ', rawText);

  const discordChannel = discordClient.channels.cache.get(ALLOWED_CHANNEL_ID);
  if (discordChannel) {
    discordChannel.send(`**Server**: ${rawText}`);
  }
});

// Error handling
bot.on('error', err => console.log('Minecraft bot error:', err));
bot.on('kicked', (reason, loggedIn) => {
  console.log('Minecraft bot kicked:', reason);
});
bot.on('end', () => {
  console.log('Bot has left the world.');
  chatLogStream.end();
});

discordClient.on('error', err => console.log('Discord bot error:', err));
discordClient.login(DISCORD_TOKEN);

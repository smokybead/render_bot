const mineflayer = require('mineflayer');
const readline = require('readline');
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');

// === CONFIGURATION ===
const MINECRAFT_USERNAME = "blackfromlack";
const DISCORD_TOKEN = 'MTM3MTgxMjg5ODY2NTQwMjQ0OA.GPMVai.Pe6VGzgXXAf2OQSlr5INl1Ha4Se45bE27fT77s'; // Your Discord bot token
const ALLOWED_CHANNEL_ID = '1372077415634960445'; // Your Discord channel ID for control

// === MINECRAFT BOT SETUP ===
const bot = mineflayer.createBot({
  host: 'buzzu.pika.host',
  port: 25565,
  username: MINECRAFT_USERNAME,
  version: '1.20.4',
});

// Create readline interface for console input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Log chat to file
const chatLogStream = fs.createWriteStream('chat-log.txt', { flags: 'a' });

// When bot joins the world
bot.on('spawn', () => {
  console.log('Bot has spawned into the world.');

  // Console input handler
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

// Log all public chat messages to file
bot.on('chat', (username, message) => {
  if (username === bot.username) return; // Don't log bot's own messages

  const timestamp = new Date().toLocaleTimeString();
  const logLine = `[${timestamp}] <${username}> ${message}\n`;

  console.log(logLine.trim());
  chatLogStream.write(logLine);
});

// ✅ Handle whispers with /say commands
bot.on('whisper', (username, message) => {
  if (username === bot.username) return; // Don't process own whispers

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

// Listen to incoming messages from Discord
discordClient.on('messageCreate', message => {
  if (message.channel.id !== ALLOWED_CHANNEL_ID || message.author.bot) return;

  // Command: !say Hello world
  if (message.content.startsWith('!say ')) {
    const msg = message.content.slice(5).trim();
    if (msg) {
      bot.chat(msg);  // Send the message to Minecraft
      console.log(`[Discord -> Minecraft] ${msg}`);
      message.react('✅');  // React with a checkmark
    }
  }

  // Normal chat forwarding from Discord to Minecraft
  if (!message.content.startsWith('!')) {
    bot.chat(message.content);  // Forward the message to Minecraft
    console.log(`[Discord -> Minecraft] ${message.content}`);
  }
});

// Relay Minecraft chat messages to Discord
bot.on('chat', (username, message) => {
  if (username === bot.username) return;

  const discordChannel = discordClient.channels.cache.get(ALLOWED_CHANNEL_ID);
  if (discordChannel) {
    discordChannel.send(`**${username}**: ${message}`);
  }
});

// Capture all server/system messages (like /tpa)
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

// === DISCORD LOGIN ===
discordClient.on('error', err => console.log('Discord bot error:', err));

discordClient.login(DISCORD_TOKEN);

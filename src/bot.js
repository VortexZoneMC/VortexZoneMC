require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const commandHandler = require('./handlers/commandHandler');
const GuildConfig = require('./models/GuildConfig');
const onMemberAdd = require('./events/guildMemberAdd');
const onMemberRemove = require('./events/guildMemberRemove');
const { scanAll } = require('./services/ytRssWatcher');

async function start() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/discordbot');
  console.log('MongoDB conectado');
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  });
  client.on('ready', () => {
    console.log('Bot pronto', client.user.tag);
    // start RSS polling every 2 minutes
    setInterval(() => scanAll(client), 2 * 60 * 1000);
  });

  // events
  client.on('guildMemberAdd', member => onMemberAdd(member));
  client.on('guildMemberRemove', member => onMemberRemove(member));

  // commands
  commandHandler(client);

  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Erro ao logar bot:', err);
    process.exit(1);
  });
}

start().catch(console.error);

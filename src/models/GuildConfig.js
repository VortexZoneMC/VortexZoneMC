const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: process.env.PREFIX || '!vtx' },
  welcome: {
    enabled: { type: Boolean, default: true },
    channelId: { type: String, default: null },
    message: { type: String, default: 'Bem-vindo {user} ao servidor {server}!' }
  },
  goodbye: {
    enabled: { type: Boolean, default: true },
    channelId: { type: String, default: null },
    message: { type: String, default: 'Até mais {user}!' }
  },
  logs: { channelId: { type: String, default: null }, enabled: { type: Boolean, default: true } },
  tickets: { categoryId: { type: String, default: null }, enabled: { type: Boolean, default: false } },
  notifications: {
    youtube: [{ channelId: String, lastVideoId: String }],
    twitch: [{ userName: String, streaming: Boolean }]
  },
  customCommands: [
    {
      category: String,
      name: String,
      response: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);

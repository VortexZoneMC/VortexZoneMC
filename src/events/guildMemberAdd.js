const GuildConfig = require('../models/GuildConfig');

module.exports = async (member) => {
  const cfg = await GuildConfig.findOne({ guildId: member.guild.id });
  if (!cfg || !cfg.welcome?.enabled) return;
  const ch = member.guild.channels.cache.get(cfg.welcome.channelId);
  if (!ch) return;
  const msg = (cfg.welcome.message || 'Bem-vindo {user} ao servidor {server}!').replace('{user}', `<@${member.id}>`).replace('{server}', member.guild.name);
  ch.send({ content: msg }).catch(console.error);
};

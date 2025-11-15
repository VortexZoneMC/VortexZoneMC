const GuildConfig = require('../models/GuildConfig');

module.exports = async (member) => {
  const cfg = await GuildConfig.findOne({ guildId: member.guild.id });
  if (!cfg || !cfg.goodbye?.enabled) return;
  const ch = member.guild.channels.cache.get(cfg.goodbye.channelId);
  if (!ch) return;
  const msg = (cfg.goodbye.message || 'Até mais {user}!').replace('{user}', `<@${member.id}>`);
  ch.send({ content: msg }).catch(console.error);
};

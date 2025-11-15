// Simple RSS watcher for YouTube channels (no googleapis)
const axios = require('axios');
const xml2js = require('xml2js');
const GuildConfig = require('../models/GuildConfig');

async function checkChannel(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const data = await xml2js.parseStringPromise(res.data);
    const entry = data.feed.entry?.[0];
    if (!entry) return null;
    const videoId = entry['yt:videoId']?.[0];
    const title = entry.title?.[0];
    const published = entry.published?.[0];
    return { videoId, title, published, url: `https://youtu.be/${videoId}` };
  } catch (err) {
    console.error('Erro RSS', err.message);
    return null;
  }
}

async function scanAll(client) {
  const allGuilds = await GuildConfig.find({ 'notifications.youtube.0': { $exists: true } });
  for (const g of allGuilds) {
    for (const yt of (g.notifications.youtube || [])) {
      try {
        const info = await checkChannel(yt.channelId);
        if (!info) continue;
        if (yt.lastVideoId !== info.videoId) {
          // update DB
          await GuildConfig.updateOne(
            { guildId: g.guildId, 'notifications.youtube.channelId': yt.channelId },
            { $set: { 'notifications.youtube.$.lastVideoId': info.videoId } }
          );
          // notify in all guild channels that match (we'll send to logs channel if configured)
          const guild = client.guilds.cache.get(g.guildId);
          if (!guild) continue;
          const ch = guild.channels.cache.get(g.logs?.channelId) || guild.systemChannel;
          if (!ch) continue;
          const embed = {
            title: 'Novo vídeo publicado!',
            description: `**${info.title}**\nPublicado em: ${info.published}`,
            url: info.url
          };
          ch.send({ embeds: [embed] }).catch(console.error);
        }
      } catch (err) {
        console.error('Erro no watcher', err);
      }
    }
  }
}

module.exports = { scanAll };

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const GuildConfig = require('../src/models/GuildConfig');

const ADMIN_TOKEN = process.env.ADMIN_PANEL_TOKEN || 'troque_para_algo_secreto_local';
const ADMIN_GUILD_IDS = (process.env.ADMIN_GUILD_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/discordbot');

function authMiddleware(req, res, next) {
  const t = req.headers['x-admin-token'] || req.query.token;
  if (!t || t !== ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// list guild configs (optionally filter by guild)
app.get('/api/guild/:guildId', authMiddleware, async (req, res) => {
  const guildId = req.params.guildId;
  let cfg = await GuildConfig.findOne({ guildId });
  if (!cfg) {
    cfg = new GuildConfig({ guildId });
    await cfg.save();
  }
  res.json(cfg);
});

app.post('/api/guild/:guildId', authMiddleware, async (req, res) => {
  const guildId = req.params.guildId;
  const body = req.body;
  // sanitize a bit
  const allowed = {
    welcome: { enabled: body.welcome?.enabled, channelId: body.welcome?.channelId, message: body.welcome?.message },
    goodbye: { enabled: body.goodbye?.enabled, channelId: body.goodbye?.channelId, message: body.goodbye?.message },
    logs: { channelId: body.logs?.channelId, enabled: body.logs?.enabled },
    tickets: { categoryId: body.tickets?.categoryId, enabled: body.tickets?.enabled },
    prefix: body.prefix,
    notifications: body.notifications
  };
  const update = { $set: allowed };
  const cfg = await GuildConfig.findOneAndUpdate({ guildId }, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json(cfg);
});

app.get('/api/search-youtube', authMiddleware, async (req, res) => {
  // simple proxy to validate a channel id via RSS fetch
  const axios = require('axios');
  const xml2js = require('xml2js');
  const channelId = req.query.channelId;
  if (!channelId) return res.status(400).json({ error: 'missing channelId' });
  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const r = await axios.get(url, { timeout: 10000 });
    const data = await xml2js.parseStringPromise(r.data);
    const entry = data.feed.entry?.[0];
    if (!entry) return res.status(404).json({ error: 'no-videos' });
    const videoId = entry['yt:videoId']?.[0];
    const title = entry.title?.[0];
    return res.json({ ok: true, videoId, title });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.DASHBOARD_PORT || 3001;
app.listen(PORT, () => console.log('Dashboard rodando em', PORT));

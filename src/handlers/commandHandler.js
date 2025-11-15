const GuildConfig = require('../models/GuildConfig');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const guildCfg = (await GuildConfig.findOne({ guildId: message.guild.id })) || {};
    const prefix = guildCfg.prefix || process.env.PREFIX || '!vtx';
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const category = args.shift()?.toLowerCase();
    const cmd = args.shift()?.toLowerCase();

    if (!category) return message.reply(`Use: \`${prefix} <categoria> <comando>\``);

    // Config commands (admin only)
    if (category === 'config') {
      if (!message.member.permissions.has('ManageGuild')) return message.reply('Você precisa de permissões de gerenciar servidor para isso.');
      const sub = cmd;
      if (sub === 'set-welcome') {
        const channel = message.mentions.channels.first();
        const text = args.slice(channel ? 0 : 0).join(' ');
        const cfg = await GuildConfig.findOneAndUpdate(
          { guildId: message.guild.id },
          { $set: { 'welcome.channelId': channel ? channel.id : null, 'welcome.message': text || undefined } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return message.reply('Configuração de boas-vindas atualizada.');
      }
      if (sub === 'set-goodbye') {
        const channel = message.mentions.channels.first();
        const text = args.slice(channel ? 0 : 0).join(' ');
        const cfg = await GuildConfig.findOneAndUpdate(
          { guildId: message.guild.id },
          { $set: { 'goodbye.channelId': channel ? channel.id : null, 'goodbye.message': text || undefined } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return message.reply('Configuração de saída atualizada.');
      }
      if (sub === 'prefix') {
        const newp = args[0];
        if (!newp) return message.reply('Forneça o novo prefixo.');
        await GuildConfig.findOneAndUpdate({ guildId: message.guild.id }, { $set: { prefix: newp } }, { upsert: true });
        return message.reply(`Prefixo atualizado para \`${newp}\``);
      }
      return message.reply('Subcomando de config inválido. Exemplos: set-welcome, set-goodbye, prefix');
    }

    // Ticket commands (simple)
    if (category === 'ticket') {
      if (cmd === 'abrir') {
        const reason = args.join(' ') || 'Sem motivo informado';
        const cat = (await GuildConfig.findOne({ guildId: message.guild.id }))?.tickets?.categoryId;
        try {
          const channel = await message.guild.channels.create({
            name: `ticket-${message.author.username}`.toLowerCase().slice(0, 90),
            type: 0, // GUILD_TEXT in v14 maps to 0 in enums; use ChannelType if needed
            parent: cat || undefined,
            permissionOverwrites: [
              { id: message.guild.roles.everyone.id, deny: ['ViewChannel'] },
              { id: message.author.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
              { id: client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
            ]
          });
          await channel.send(`Ticket aberto por <@${message.author.id}>\nMotivo: ${reason}`);
          return message.reply(`Ticket criado: ${channel}`);
        } catch (err) {
          console.error(err);
          return message.reply('Não foi possível criar o ticket. Verifique permissões.');
        }
      }
      if (cmd === 'fechar') {
        if (message.channel.name?.startsWith('ticket-')) {
          await message.channel.delete();
        } else {
          return message.reply('Este comando só funciona dentro de um canal de ticket.');
        }
      }
      return;
    }

    // Custom commands
    const custom = (guildCfg.customCommands || []).find(c => c.category === category && c.name === cmd);
    if (custom) return message.channel.send(custom.response);

    return message.reply(`Comando não encontrado: categoria=${category} comando=${cmd}`);
  });
};

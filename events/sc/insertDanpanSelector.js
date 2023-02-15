const { Events, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const ScMatch = require('../../schemas/scmatch.js');
const ScSetResult = require('../../schemas/scsetresult.js');
const ScMap = require('../../schemas/scmap.js');
const gcUtils = require('../../gcbotutils.js');
const moment = gcUtils.getMoment();
const fetch = gcUtils.getFetch();

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {

        if (!interaction.isStringSelectMenu()) {
            return;
        }

        const today = moment().format('YYYY/MM/DD HH:mm:ss');
        const key = interaction.customId.split('||')[1];

        const guildId = interaction.guildId;
        const guild = await interaction.client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        if (interaction.customId === 'completeSelectUsers') {
            const maps = await ScMap.find({ 'isUsing': true }).sort({ 'people': 1, 'description': 'asc' });

            const values = interaction.values;
            const match = new ScMatch();
            match.aPlyr = values[0];
            match.bPlyr = values[1];

            match.save(err => {
                if (err) {
                    throw 'id save error';
                }
            });

            const options = [];

            maps.forEach((map) => {
                const option = {}

                option.label = map.name;
                option.value = String(map._id);

                options.push(option);
            });

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('completeSelectMap||' + match._id)
                        .setPlaceholder('진행된 맵 선택')
                        .addOptions(options)
                );

            await interaction.reply({ components: [row] });
        }

        if (interaction.customId.indexOf('completeSelectMap') != -1) {
            const mapId = interaction.values;
            const map = await ScMap.findOne({ 'isUsing': true, '_id': mapId });
            const key = interaction.customId.indexOf('completeSelectMap').split('||')[1];

            await ScMatch.updateOne({ _id: key }, { 'maps': [ map ] });

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('completeWinner||' + key)
                        .setPlaceholder('진행된 맵 선택')
                        .addOptions(options)
                );
        }
    }
}
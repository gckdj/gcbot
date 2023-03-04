const { Events, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const ScFm = require('../../schemas/scfriendlymatch.js');
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
            const scFm = new ScFm();
            scFm.aPlyr = values[0];
            scFm.bPlyr = values[1];

            scFm.save(err => {
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
                        .setCustomId('completeSelectMap||' + scFm._id)
                        .setPlaceholder('맵 리스트')
                        .addOptions(options)
                );

            await interaction.reply({ content: '매치가 진행된 맵을 선택하세요.', components: [row] });
        }

        if (interaction.customId.indexOf('completeSelectMap') != -1) {
            const mapId = interaction.values;
            const map = await ScMap.findOne({ 'isUsing': true, '_id': mapId });
            const key = interaction.customId.split('||')[1];

            await ScFm.updateOne({ _id: key }, { 'maps': map });
            const fMatch = await ScFm.findOne({ _id: key });

            const someMembers = [];
            someMembers.push(members.get(fMatch.aPlyr));
            someMembers.push(members.get(fMatch.bPlyr));

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('completeWinner||' + key)
                        .setPlaceholder('플레이어 리스트')
                        .addOptions(gcUtils.getPlayerOptions(someMembers))
                );

            await interaction.reply({ content: '승리한 플레이어를 선택하세요.', components: [row] });
        }

        if (interaction.customId.indexOf('completeWinner') != -1) {
            const winnerId = interaction.values[0];
            const key = interaction.customId.split('||')[1];

            console.log(winnerId);

            await ScFm.updateOne({ _id: key }, { 'finalWinner': winnerId, 'savedAt': new Date(), 'isComplete': true });

            await interaction.reply({ content: '저장이 완료되었습니다.' });
        }
    }
}
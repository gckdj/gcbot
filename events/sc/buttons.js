const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const ScMap = require('../../schemas/scmap.js');
const ScMatch = require('../../schemas/scmatch.js');
const gcUtils = require('../../gcbotutils.js');
const fetch = gcUtils.getFetch();
const random = gcUtils.getRandom();

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {

        if (!interaction.isButton()) {
            return;
        }

        const guildId = interaction.guildId;
        const guild = await interaction.client.guilds.fetch(guildId);
        const members = await guild.members.fetch();
        const selectValues = interaction.values;

        if (interaction.customId === 'noban') {
            let maps = await ScMap.find({ 'isUsing': true }).sort({ 'people': 1, 'description': 'asc' });
            let matchMaps = [];

            let peopleFlag = false;

            while (matchMaps.length < 3) {
                let n = random.integer(0, maps.length - 1);
                let map = maps[n];

                if (map.isUniq === true) {
                    if (random.integer(1, 100) >= 70 ? true : false) {
                        map.name = map.name + ' 유니크';
                    }
                }

                if (map.people === 2) {
                    if (peopleFlag === false) {
                        peopleFlag = true;
                    } else {
                        maps.splice(n, 1);
                        continue;
                    }
                }

                matchMaps.push(map);
                maps.splice(n, 1);
            }

            const nice = new EmbedBuilder()
                .setColor('Red')
                .setURL('https://910map.tistory.com/')
                .setTitle('맵 선택결과')
                .addFields(
                    { name: '1경기', value: matchMaps[0].name },
                    { name: '2경기', value: matchMaps[1].name },
                    { name: '3경기', value: matchMaps[2].name },
                )
                .setDescription('Good Luck 🍀');

            let match = new ScMatch();
            match.maps = matchMaps;
            match.save(err => {
                if (err) {
                    throw 'id save error';
                }
            });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('insertResultStart||' + match._id)
                        .setLabel('이 매치의 결과를 입력할게요')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🖋')
                );

            await interaction.reply({ embeds: [nice], components: [row] });
        }

        if (interaction.customId.split('||')[0] === 'insertResultStart') {

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('selectPlayer1||' + interaction.customId.split('||')[1])
                        .setPlaceholder('플레이어1 선택')
                        .addOptions(gcUtils.getPlayerOptions(members))
                );

            await interaction.reply({ content: '플레이어1을 선택하세요', components: [row] });
        }
    },
};
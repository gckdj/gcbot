const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ScMap = require('../../schemas/scmap.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('슷뽑기')
        .setDescription('랜덤으로 슷맵을 선정합니다.'),
    async execute(interaction) {
        const maps = await ScMap.find({ 'isUsing': true }).sort({ 'people': 1, 'description': 'asc' });

        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('맵 리스트')
            .setURL('https://910map.tistory.com/');

        maps.forEach(map => {
            const field = {
                'name': map.name,
                'value': map.description,
                'inline': false,
            }

            embed.addFields(field);
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('noban')
                    .setLabel('맵 뽑기')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🏹')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
}
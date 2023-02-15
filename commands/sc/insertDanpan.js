const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const ScMap = require('../../schemas/scmap.js');
const gcUtils = require('../../gcbotutils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('슷단판')
        .setDescription('슷단판 입력'),
    async execute(interaction) {
        const maps = await ScMap.find({ 'isUsing': true }).sort({ 'people': 1, 'description': 'asc' });

        const guildId = interaction.guildId;
        const guild = await interaction.client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('completeSelectUsers')
                    .setPlaceholder('참여한 유저선택')
                    .setMinValues(2)
                    .setMaxValues(2)
                    .addOptions(gcUtils.getPlayerOptions(members))
            );

        await interaction.reply({ components: [row] });
    }
}
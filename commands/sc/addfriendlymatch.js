const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const ScMap = require('../../schemas/scmap.js');
const gcUtils = require('../../gcbotutils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('슷친선')
        .setDescription('친선매치를 입력합니다.'),
    async execute(interaction) {
        const guildId = interaction.guildId;
        const guild = await interaction.client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('completeSelectUsers')
                    .setPlaceholder('플레이어 리스트')
                    .setMinValues(2)
                    .setMaxValues(2)
                    .addOptions(gcUtils.getPlayerOptions(members))
            );

        await interaction.reply({ content: '매치를 진행한 2명의 플레이어를 선택하세요.', components: [row] });
    }
}
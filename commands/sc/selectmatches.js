const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ScMatch = require('../../schemas/scmatch.js');
const gcUtils = require('../../gcbotutils.js');
const fetch = gcUtils.getFetch();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('슷조회')
        .setDescription('최근 슷매치를 조회합니다.'),
    async execute(interaction) {

        const guildId = interaction.guildId;
        const guild = await interaction.client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        const matches = await ScMatch.find({ 'isComplete': true }).sort({ 'savedAt': -1 }).limit(10);
        const result = gcUtils.getMatchesResults(matches, members);

        let notice = null;

        if (matches.length === 0) {
            notice = '조회된 결과가 없습니다.';
        } else {
            notice = '최근 매치결과입니다.';
        }

        let matchList = new EmbedBuilder()
            .setColor('Red')
            .setTitle('매치 결과조회')
            .setDescription(notice)
            .setTimestamp();

        result.forEach(item => {
            matchList.addFields(item);
        });

        interaction.reply({ embeds: [matchList] });
    }
}
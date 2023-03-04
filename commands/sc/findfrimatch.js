const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ScFm = require('../../schemas/scfriendlymatch.js');
const gcUtils = require('../../gcbotutils.js');
const fetch = gcUtils.getFetch();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('슷친조')
        .setDescription('저장된 친선매치를 조회합니다.'),
    async execute(interaction) {

        const guildId = interaction.guildId;
        const guild = await interaction.client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        const fMatch = await ScFm.find({ 'isComplete': true }).sort({ 'savedAt': -1 }).limit(10);

        let notice = null;

        if (fMatch.length === 0) {
            notice = '조회된 결과가 없습니다.';
        } else {
            notice = '최근 친선매치결과입니다.';
        }

        const result = gcUtils.getFMatchResult(fMatch, members);

        const matchList = new EmbedBuilder()
            .setColor('Green')
            .setTitle('친선매치 결과')
            .setDescription(notice)
            .setTimestamp();

        result.forEach(item => {
             matchList.addFields(item);
        });

        interaction.reply({ embeds: [matchList] });
    }
}
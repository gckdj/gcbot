const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ScSetResult = require('../../schemas/scsetresult.js');
const ScMatch = require('../../schemas/scmatch.js');
const gcUtils = require('../../gcbotutils.js');
const fetch = gcUtils.getFetch();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('슷통계')
        .setDescription('모든 플레이어의 전적 및 이달의 슷플레이어를 조회합니다.'),
    async execute(interaction) {

        const guildId = interaction.guildId;
        const guild = await interaction.client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const result = await ScSetResult.aggregate([
            {
                '$match': {
                    'savedAt': { '$gte': firstDay, '$lt': lastDay }
                }
            },
            {
                '$group': {
                    '_id': '$plyr',
                    'total': { '$sum': 1 },
                    'win': {
                        '$sum': '$isWin'
                    }
                },
            },
            {
                '$addFields': {
                    'winPercent': {
                        '$divide':
                            ['$win', '$total']
                    }
                },
            },
            {
                '$sort': {
                    'winPercent': -1
                }
            }
        ]);

        const fMem = members.get(result[0]._id);
        const fMemName = gcUtils.getPlayerName(fMem);

        // todo: 기간 조건절 추가
        // todo: 경기없는 경우의 메세지 출력
        const fMatches = await ScMatch.find({
            '$or': [
                { 'aPlyr': fMem.user.id },
                { 'bPlyr': fMem.user.id }
            ]
        });

        let firstEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`1위: ${fMemName}`)
            .setDescription(`이 플레이어는 지난 ${result[0].total}세트 중 ${result[0].win}세트를 승리하며 ${Math.round(result[0].winPercent * 1000) / 10}%의 승률을 기록했습니다.`);

        const fResults = gcUtils.getMatchesResults(fMatches, members);
        fResults.forEach(item => {
            firstEmbed.addFields(item);
        });

        let secondEmbed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle('다른 플레이어들')
            .setDescription('이번달 매치를 진행한 모든 플레이어의 통계입니다.');

        for (let idx = 1; idx < result.length; idx++) {
            const user = members.get(result[idx]._id);
            const userName = gcUtils.getPlayerName(user);

            secondEmbed.addFields({ 'name': `${idx + 1}위: ${userName}`, 'value': `${result[idx].total}전 ${result[idx].win}승, 승률: ${Math.round(result[idx].winPercent * 1000) / 10}%` });
        }

        await interaction.reply({ embeds: [firstEmbed, secondEmbed] });
    }
}
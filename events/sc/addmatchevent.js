const { Events, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const ScMatch = require('../../schemas/scmatch.js');
const ScSetResult = require('../../schemas/scsetresult.js');
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
        const selectValues = interaction.values;

        if (interaction.customId.split('||')[0] === 'selectPlayer1') {

            await ScMatch.updateOne({ _id: key }, { 'aPlyr': members.get(selectValues[0]).user.id });

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('selectPlayer2||' + key)
                        .setPlaceholder('플레이어 리스트')
                        .addOptions(gcUtils.getPlayerOptions(members))
                );

            await interaction.reply({ content: '두번째 플레이어를 선택하세요.', components: [row] });
        }

        if (interaction.customId.split('||')[0] === 'selectPlayer2') {

            await ScMatch.updateOne({ _id: key }, { 'bPlyr': members.get(selectValues[0]).user.id });

            const match = await ScMatch.findOne({ _id: key });
            let someMembers = [];

            someMembers.push(members.get(match.aPlyr));
            someMembers.push(members.get(match.bPlyr));

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('firstGameWinner||' + interaction.customId.split('||')[1])
                        .setPlaceholder('플레이어 리스트')
                        .addOptions(gcUtils.getPlayerOptions(someMembers))
                );

            await interaction.reply({ content: '첫번째 세트 승리 플레이어를 선택하세요.', components: [row] });
        }

        if (interaction.customId.split('||')[0] === 'firstGameWinner') {

            await ScMatch.updateOne({ _id: key }, { 'aGm': members.get(selectValues[0]).user.id });

            const match = await ScMatch.findOne({ _id: key });
            let someMembers = [];

            someMembers.push(members.get(match.aPlyr));
            someMembers.push(members.get(match.bPlyr));

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('secondGameWinner||' + interaction.customId.split('||')[1])
                        .setPlaceholder('플레이어 리스트')
                        .addOptions(gcUtils.getPlayerOptions(someMembers))
                );

            await interaction.reply({ content: '두번째 세트 승리 플레이어를 선택하세요.', components: [row] });
        }

        if (interaction.customId.split('||')[0] === 'secondGameWinner') {

            await ScMatch.updateOne({ _id: key }, { 'bGm': members.get(selectValues[0]).user.id });

            const match = await ScMatch.findOne({ _id: key });
            let someMembers = [];

            someMembers.push(members.get(match.aPlyr));
            someMembers.push(members.get(match.bPlyr));

            let options = gcUtils.getPlayerOptions(someMembers);
            options.push({
                label: '경기없음',
                value: 'nogame',
            })

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('insertResultEnd||' + interaction.customId.split('||')[1])
                        .setPlaceholder('플레이어 리스트')
                        .addOptions(options)
                );

            await interaction.reply({ content: '세번째 세트 승리 플레이어를 선택하세요.', components: [row] });
        }

        if (interaction.customId.split('||')[0] === 'insertResultEnd') {

            const match = await ScMatch.findOne({ _id: key });

            const aPlyr = members.get(match.aPlyr);
            const bPlyr = members.get(match.bPlyr);

            const aName = gcUtils.getPlayerName(aPlyr);
            const bName = gcUtils.getPlayerName(bPlyr);

            let lSco = 0;
            let rSco = 0;

            let fWinner = null;
            let sWinner = null;
            let tWinner = null;

            let finalWinnerId = null;
            let finalWinnerName = null;

            let cGame = null;

            let setResults = [];

            if (match.aPlyr === match.aGm) {
                fWinner = aName;
                lSco += 1;

                setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 1, 'set': 1, 'savedAt': new Date() });
                setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 0, 'set': 1, 'savedAt': new Date() });
            } else {
                fWinner = bName;
                rSco += 1;

                setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 0, 'set': 1, 'savedAt': new Date() });
                setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 1, 'set': 1, 'savedAt': new Date() });
            }

            if (match.aPlyr === match.bGm) {
                sWinner = aName;
                lSco += 1;

                setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 1, 'set': 2, 'savedAt': new Date() });
                setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 0, 'set': 2, 'savedAt': new Date() });
            } else {
                sWinner = bName;
                rSco += 1;

                setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 0, 'set': 2, 'savedAt': new Date() });
                setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 1, 'set': 2, 'savedAt': new Date() });
            }

            const sv = selectValues[0];

            if (sv != 'nogame') {
                cGame = members.get(sv).user.id;

                if (match.aPlyr === cGame) {
                    tWinner = aName;
                    lSco += 1;

                    setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 1, 'set': 3, 'savedAt': new Date() });
                    setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 0, 'set': 3, 'savedAt': new Date() });
                } else {
                    tWinner = bName;
                    rSco += 1;

                    setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 0, 'set': 3, 'savedAt': new Date() });
                    setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 1, 'set': 3, 'savedAt': new Date() });
                }
            } else {
                cGame = null;
                tWinner = '경기없음';
            }

            if (lSco >= 2) {
                finalWinnerId = match.aPlyr;
                finalWinnerName = gcUtils.getPlayerName(aPlyr);
            } else if (lSco === 1 && rSco === 1) {
                finalWinnerId = 'draw';
                finalWinnerName = '무승부';
            } else {
                finalWinnerId = match.bPlyr;
                finalWinnerName = gcUtils.getPlayerName(bPlyr);
            }

            await ScMatch.updateOne({ _id: key }, { 'cGm': cGame, 'isComplete': true, 'savedAt': new Date(), 'lSco': lSco, 'rSco': rSco, 'finalWinner': finalWinnerId });

            ScSetResult.insertMany(setResults, (err, docs) => {
                if (err) {
                    console.log(err);
                }
            });

            const resultEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('저장된 매치결과입니다.')
                .setDescription(today)
                .addFields(
                    { name: '매치업', value: `${aName} vs ${bName}` },
                    { name: '1세트: ' + match.maps[0].name, value: fWinner },
                    { name: '2세트: ' + match.maps[1].name, value: sWinner },
                    { name: '3세트: ' + match.maps[2].name, value: tWinner },
                    { name: '승자', value: `${finalWinnerName} 🔥` },
                )
                .setTimestamp();

            interaction.reply({ embeds: [resultEmbed] });
        }
    }
}
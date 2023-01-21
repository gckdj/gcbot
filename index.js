const { Client, GatewayIntentBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle, interaction, EmbedBuilder, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { commands } = require('./command.js');
const { Random } = require("random-js");
const random = new Random();
const keepAlive = require('./server.js');
const fetch = require('@replit/node-fetch');
const moment = require('moment');
require('moment-timezone');
moment.locale('ko');
moment.tz.setDefault("Asia/Seoul");

const mongoose = require('mongoose');
const ScMatch = require('./schemas/scmatch.js');
const ScMap = require('./schemas/scmap.js');
const ScSetResult = require('./schemas/scsetresult.js');
const LolSet = require('./schemas/lolset.js');

const applicaitonId = process.env['application_id'];
const token = process.env['token'];
const clientId = process.env['client_id'];
const uri = process.env['uri'];
const kakao = process.env['kakaoAPI'];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const rest = new REST({ version: '10' }).setToken(token);

mongoose.connect(uri, {
    dbName: 'Gcbot',
    useNewUrlParser: true,
}, (err) => {
    if (err) {
        console.error('mongodb connection error', err);
    }
});

mongoose.connection.on('open', async function() {
    console.log('mongoose opened');
});

(async () => {
    try {
        await rest.put(Routes.applicationCommands(clientId, applicaitonId), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) {
        return;
    }

    const guildId = interaction.guildId;
    const guild = await client.guilds.fetch(guildId);
    const members = await guild.members.fetch();

    if (interaction.commandName === '뽑기') {

        const maps = await ScMap.find({ 'isUsing': true }).sort({ 'people': 1, 'description': 'asc' });

        let embed = new EmbedBuilder()
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

    if (interaction.commandName === '조회') {

        const guildId = interaction.guildId;
        const guild = await client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        const matches = await ScMatch.find({ 'isComplete': true }).sort({ 'savedAt': -1 }).limit(10);

        const result = getMatchesResults(matches, members);

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

    if (interaction.commandName === '카페' || interaction.commandName === '맛집') {

        let searchSize = 5;
        let randomPage = 1;
        let embed = null;
        let keyword = null;

        if (interaction.commandName === '카페') {
            keyword = '거창 카페';
        } else {
            const keywords = ['거창 고기, 거창 한식', '거창 중식', '거창 일식', '거창 맛집'];
            keyword = keywords[random.integer(0, keywords.length - 1)];
        }

        let uri = `https://dapi.kakao.com/v2/local/search/keyword.json?page=${randomPage}&size=${searchSize}&sort=accuracy&query=${keyword}`;

        let query = encodeURI(uri);

        await fetch(query, {
            'headers': {
                Authorization: `KakaoAK ${kakao}`,
            }
        })
            .then(res => {
                return res.json()
            })
            .then(data => {
                const maxPageCount = Math.ceil(data.meta.pageable_count / searchSize);
                randomPage = random.integer(1, maxPageCount);
            });

        uri = `https://dapi.kakao.com/v2/local/search/keyword.json?page=${randomPage}&size=${searchSize}&sort=accuracy&query=${keyword}`;
        query = encodeURI(uri);

        await fetch(query, {
            'headers': {
                Authorization: `KakaoAK ${kakao}`,
            }
        })
            .then(res => {
                return res.json();
            })
            .then(data => {
                embed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('검색된 결과')

                data.documents.forEach(item => {
                    embed.addFields({ name: item.place_name, value: item.place_url });
                });
            });

        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === '이달슷') {

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
        const fMemName = getPlayerName(fMem);

        // todo: 기간 조건절 추가
        // todo: 경기없는 경우의 메세지 출력
        const fMatches = await ScMatch.find({
            '$or': [
                {'aPlyr': fMem.user.id},
                {'bPlyr': fMem.user.id}
            ]
        });
        
        let firstEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`1위: ${fMemName}`)
        	.setDescription(`이 플레이어는 지난 ${result[0].total}세트 중 ${result[0].win}세트를 승리하며 ${Math.round(result[0].winPercent * 1000) / 10}%의 승률을 기록했습니다.`);

        const fResults = getMatchesResults(fMatches, members);
        fResults.forEach(item => {
           firstEmbed.addFields(item); 
        });

        let secondEmbed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle('다른 플레이어들')
        	.setDescription('이번달 매치를 진행한 모든 플레이어의 통계입니다.');

        for (let idx = 1; idx < result.length; idx++) {
            const user = members.get(result[idx]._id);
            const userName = getPlayerName(user);
            
            secondEmbed.addFields({'name': `${idx + 1}위: ${userName}`, 'value': `${result[idx].total}전 ${result[idx].win}승, 승률: ${Math.round(result[idx].winPercent * 1000) / 10}%`});
        }

        await interaction.reply({ embeds: [firstEmbed, secondEmbed] });
    }

    if (interaction.commandName === '롤내입') {
        const modal = new ModalBuilder()
			.setCustomId('insertLoLInnerMatchModal')
			.setTitle('내전결과 입력');

        const othersideInput = new TextInputBuilder()
			.setCustomId('othersideInput')
			.setLabel('내전명을 입력하세요.')
            .setPlaceholder('거상팀 1세트 or 팽실딱팀 2세트...')
			.setStyle(TextInputStyle.Short);

        const membersInput = new TextInputBuilder()
			.setCustomId('membersInput')
			.setLabel('아군멤버를 입력하세요. * 탑 ~ 서폿순 // "," 구분')
            .setPlaceholder('김동진,김웅비,박태진,변현성,남기준')
			.setStyle(TextInputStyle.Short);

        const resultInput = new TextInputBuilder()
			.setCustomId('resultInput')
			.setLabel('승패여부를 입력하세요')
            .setPlaceholder('승리 or 패배')
			.setStyle(TextInputStyle.Short);

        const urlInput = new TextInputBuilder()
			.setCustomId('urlInput')
			.setLabel('경기결과 캡쳐링크를 첨부하세요.')
            .setPlaceholder('discord 내 업로드된 이미지링크')
			.setStyle(TextInputStyle.Short);

		const fActionRow = new ActionRowBuilder().addComponents(othersideInput);
		const sActionRow = new ActionRowBuilder().addComponents(membersInput);
        const tActionRow = new ActionRowBuilder().addComponents(resultInput);
        const urlActionRow = new ActionRowBuilder().addComponents(urlInput);
        
		modal.addComponents(fActionRow, sActionRow, tActionRow, urlActionRow);
        
        await interaction.showModal(modal);
    }
});

// 모달 서브밋 이벤트
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isModalSubmit()) {
        return;  
    }
    
	if (interaction.customId === 'insertLoLInnerMatchModal') {

        const res = interaction.get('fields');

        console.log('res', res.fields;
        
        const mems = res.membersInput.value.split(',');

        let isWin = 0;

        if (res.resultInput.value === '승리') {
            isWin = 1;
        }
        const data = { 'top': mems[0], 'jug': mems[1], 'mid': mems[2], 'adc': mems[3], 'spt': mems[4], 'name': res.othersideInput.value, 'isWin': isWin, 'captureUrl': res.urlInput.value, 'savedAt': new Date() }

        await LolSet.insertOne(data, (err, docs) => {
            if (err) {
                console.log(err);
            }
        });

		await interaction.reply({ content: '기록 입력이 완료되었습니다.' });
	}
});

// 버튼 상호작용
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isButton()) {
        return;
    }

    const guildId = interaction.guildId;
    const guild = await client.guilds.fetch(guildId);
    const members = await guild.members.fetch();

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
                    .addOptions(getPlayerOptions(members))
            );

        await interaction.reply({ content: '플레이어1을 선택하세요', components: [row] });
    }
});

// select 상호작용
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isStringSelectMenu()) {
        return;
    }

    const today = moment().format('YYYY/MM/DD HH:mm:ss');

    const key = interaction.customId.split('||')[1];

    const guildId = interaction.guildId;
    const guild = await client.guilds.fetch(guildId);
    const members = await guild.members.fetch();
    const selectValues = interaction.values;

    if (interaction.customId.split('||')[0] === 'selectPlayer1') {

        await ScMatch.updateOne({ _id: key }, { 'aPlyr': members.get(selectValues[0]).user.id });

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectPlayer2||' + key)
                    .setPlaceholder('플레이어2 선택')
                    .addOptions(getPlayerOptions(members))
            );

        await interaction.reply({ content: '플레이어2를 선택하세요', components: [row] });
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
                    .setPlaceholder('1세트 승자')
                    .addOptions(getPlayerOptions(someMembers))
            );

        await interaction.reply({ content: '1세트 승자를 선택하세요', components: [row] });
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
                    .setPlaceholder('2세트 승자')
                    .addOptions(getPlayerOptions(someMembers))
            );

        await interaction.reply({ content: '2세트 승자를 선택하세요', components: [row] });
    }

    if (interaction.customId.split('||')[0] === 'secondGameWinner') {

        await ScMatch.updateOne({ _id: key }, { 'bGm': members.get(selectValues[0]).user.id });

        const match = await ScMatch.findOne({ _id: key });
        let someMembers = [];

        someMembers.push(members.get(match.aPlyr));
        someMembers.push(members.get(match.bPlyr));

        let options = getPlayerOptions(someMembers);
        options.push({
            label: '경기없음',
            value: 'nogame',
        })

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('insertResultEnd||' + interaction.customId.split('||')[1])
                    .setPlaceholder('3세트 승자')
                    .addOptions(options)
            );

        await interaction.reply({ content: '3세트 승자를 선택하세요', components: [row] });
    }

    if (interaction.customId.split('||')[0] === 'insertResultEnd') {

        const match = await ScMatch.findOne({ _id: key });

        const aPlyr = members.get(match.aPlyr);
        const bPlyr = members.get(match.bPlyr);

        const aName = getPlayerName(aPlyr);
        const bName = getPlayerName(bPlyr);

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
            finalWinnerName = getPlayerName(aPlyr);
        } else if (lSco === 1 && rSco === 1) {
            finalWinnerId = 'draw';
            finalWinnerName = '무승부';
        } else {
            finalWinnerId = match.bPlyr;
            finalWinnerName = getPlayerName(bPlyr);
        }

        await ScMatch.updateOne({ _id: key }, { 'cGm': cGame, 'isComplete': true, 'savedAt': new Date(), 'lSco': lSco, 'rSco': rSco, 'finalWinner': finalWinnerId });

        await ScSetResult.insertMany(setResults, (err, docs) => {
            if (err) {
                console.log(err);
            }
        });
        
        const resultEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('저장된 매치결과')
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
});

keepAlive();
client.login(token);

function getPlayerName(member) {

    if (member.nickname == null) {
        return member.user.username;
    } else {
        return member.nickname;
    }
}

function getPlayerOptions(members) {
    let plyrs = [];

    members.forEach(member => {
        let plyr = {};

        if (member.nickname == null) {
            plyr.label = member.user.username;
        } else {
            plyr.label = member.nickname;
        }

        plyr.value = member.user.id;
        plyrs.push(plyr);
    });

    return plyrs;
}

function getMatchesResults(matches, members) {

    let result = [];
    
    matches.forEach(match => {
        const aP = members.get(match.aPlyr);
        const bP = members.get(match.bPlyr);

        const aName = getPlayerName(aP);
        const bName = getPlayerName(bP);

        let finalWinner = null;

        if (match.aPlyr === match.finalWinner) {
            finalWinner = aName;
        } else if (match.finalWinner === 'draw') {
            finalWinner = '무승부';
        } else {
            finalWinner = bName;
        }

        const nowMoment = moment(match.savedAt);
        const today = nowMoment.format('YYYY/MM/DD HH:mm:ss');

        const content = {
            'name': `${today}, 승리: ${finalWinner})`,
            'value': `대진: ${aName} vs ${bName}, 스코어: [${match.lSco} : ${match.rSco}]`
        }

        result.push(content);
    });

    return result;
}
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, } = require('discord.js');
const LOLSet = require('../../schemas/lolset.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('롤내전')
        .setDescription('롤 내전기록을 입력합니다.'),
    async execute(interaction) {

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

        const res = interaction;
        const mems = res.get('membersInput').value.split(',');
        let isWin = 0;

        if (res.get('resultInput').value === '승리') {
            isWin = 1;
        }
        const data = { 'top': mems[0], 'jug': mems[1], 'mid': mems[2], 'adc': mems[3], 'spt': mems[4], 'name': res.get('othersideInput').value, 'isWin': isWin, 'captureUrl': res.get('urlInput').value, 'savedAt': new Date() }

        await LOLSet.insertOne(data, (err, docs) => {
            if (err) {
                console.log(err);
            }
        });

        await interaction.reply({ content: '기록 입력이 완료되었습니다.' });
    }
}
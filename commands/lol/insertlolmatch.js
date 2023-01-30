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

        const fields = {
            othersideInput: new TextInputBuilder()
                .setCustomId('othersideInput')
                .setLabel('내전명을 입력하세요.')
                .setPlaceholder('거상팀 1세트 or 팽실딱팀 2세트...')
                .setStyle(TextInputStyle.Short),
            membersInput: new TextInputBuilder()
                .setCustomId('membersInput')
                .setLabel('아군멤버를 입력하세요. * 탑 ~ 서폿순 // "," 구분')
                .setPlaceholder('김동진,김웅비,박태진,변현성,남기준')
                .setStyle(TextInputStyle.Short),
            resultInput: new TextInputBuilder()
                .setCustomId('resultInput')
                .setLabel('승패여부를 입력하세요')
                .setPlaceholder('승리 or 패배')
                .setStyle(TextInputStyle.Short),
            urlInput: new TextInputBuilder()
                .setCustomId('urlInput')
                .setLabel('경기결과 캡쳐링크를 첨부하세요.')
                .setPlaceholder('discord 내 업로드된 이미지링크')
                .setStyle(TextInputStyle.Short)
        }
        
        const fActionRow = new ActionRowBuilder().addComponents(fields.othersideInput);
        const sActionRow = new ActionRowBuilder().addComponents(fields.membersInput);
        const tActionRow = new ActionRowBuilder().addComponents(fields.resultInput);
        const urlActionRow = new ActionRowBuilder().addComponents(fields.urlInput);

        modal.addComponents(fActionRow, sActionRow, tActionRow, urlActionRow);

        await interaction.showModal(modal);
    }
}
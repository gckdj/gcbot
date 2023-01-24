const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('@replit/node-fetch');
const kakao = process.env['kakaoAPI'];
const { Random } = require("random-js");
const random = new Random();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('맛집')
        .setDescription('거창 소재의 맛집을 추천합니다.'),
    async execute (interaction) {

        let searchSize = 5;
        let randomPage = 1;
        let embed = null;
        
        const keyword = '거창 맛집';
        
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
}
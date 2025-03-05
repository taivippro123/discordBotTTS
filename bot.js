const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const textToSpeech = require('@google-cloud/text-to-speech');
require('dotenv').config();

// 🟢 Lấy credentials từ biến môi trường (Render)
const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
const ttsClient = new textToSpeech.TextToSpeechClient({
    credentials: credentials
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

let connection = null;
let player = createAudioPlayer();
const targetChannelId = '1319723648822808638'; // 🛑 Thay bằng ID kênh bot sẽ đọc tin nhắn
//Kênh khó nói Addcict
// 🟢 Bot khởi động
client.once('ready', () => {
    console.log(`✅ Bot đã đăng nhập thành công với tên: ${client.user.tag}`);
});

// 🟢 Khi có tin nhắn trong kênh chỉ định, bot đọc bằng Google TTS
client.on('messageCreate', async message => {
    if (message.channel.id === targetChannelId && !message.author.bot) {
        if (!connection) {
            const voiceChannel = message.guild.members.me.voice.channel || message.member.voice.channel;
            if (voiceChannel) {
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: voiceChannel.guild.id,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator
                });
                console.log('🔊 Bot đã tự động vào voice channel:', voiceChannel.name);
            } else {
                console.log('⚠️ Không tìm thấy voice channel.');
                return;
            }
        }
        console.log(`💬 Tin nhắn từ ${message.author.username}: ${message.content}`);
        await playTTS(message.content);
    }
});

// 🟢 Lệnh /cut để bot rời khỏi voice channel
client.on('messageCreate', message => {
    if (message.content === '/cut') {
        if (connection) {
            connection.destroy();
            connection = null;
            console.log('🚪 Bot đã rời khỏi voice channel.');
            message.reply('❌ Bot đã rời khỏi voice channel.');
        } else {
            message.reply('⚠️ Bot chưa ở trong voice channel.');
        }
    }
});

async function playTTS(text) {
    if (!connection) {
        console.log('❌ Bot chưa kết nối voice channel hoặc đã rời đi.');
        return;
    }

    console.log('🔍 Đang gửi yêu cầu tới Google TTS...');
    const request = {
        input: { text: text },
        voice: { languageCode: 'vi-VN', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' }
    };

    const [response] = await ttsClient.synthesizeSpeech(request);

    if (!response.audioContent) {
        console.error('❌ Google TTS không trả về dữ liệu âm thanh');
        return;
    }

    const filePath = path.join(__dirname, 'tts.mp3');
    fs.writeFileSync(filePath, response.audioContent);
    console.log('✅ File TTS đã được lưu:', filePath);

    // 🔹 Kiểm tra lại kết nối trước khi phát
    if (!connection) {
        console.log('⚠️ Bot đã rời khỏi voice channel, không thể phát âm thanh.');
        return;
    }

    const resource = createAudioResource(filePath, {
        inlineVolume: true
    });

    player.play(resource);
    connection.subscribe(player);

    console.log('🔊 Đang phát âm thanh...');
}

// 🟢 Thêm server Express để giữ bot luôn online trên Render
const express = require("express");
const app = express();

app.get("/ping", (req, res) => {
    res.send("Bot is alive");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Ping server đang chạy tại cổng ${PORT}`));

// 🟢 Đăng nhập bot
client.login(process.env.TOKEN);

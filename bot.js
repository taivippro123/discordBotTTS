const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');
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
const targetChannelIds = ['1319723648822808638', '716700036339335189', '1346977312196788316'];// 🛑 Danh sách ID kênh bot sẽ đọc tin nhắn, chuột phải ở kênh -> sao chép ID kênh
                        // khó nói addict         bot-chat taivippro123  khó nói addict

// 🟢 Bot khởi động
client.once('ready', () => {
    console.log(`✅ Bot đã đăng nhập thành công với tên: ${client.user.tag}`);
});

// 🟢 Khi có tin nhắn trong kênh chỉ định, bot đọc bằng Google TTS
client.on('messageCreate', async message => {
    if (targetChannelIds.includes(message.channel.id) && !message.author.bot) {
        const userVoiceChannel = message.member.voice.channel; // 🔹 Kênh voice của người gửi

        if (!userVoiceChannel) {
            console.log(`⚠️ ${message.author.username} không ở trong voice channel.`);
            return;
        }

        // 🔹 Nếu bot đang ở một kênh voice khác -> Rời kênh cũ
        if (connection && connection.joinConfig.channelId !== userVoiceChannel.id) {
            console.log('🔄 Chuyển kênh: Bot rời kênh cũ và vào kênh mới.');
            connection.destroy();
            connection = null;
        }

        // 🔹 Nếu bot chưa kết nối -> Tham gia voice channel của người gửi
        if (!connection) {
            connection = joinVoiceChannel({
                channelId: userVoiceChannel.id,
                guildId: userVoiceChannel.guild.id,
                adapterCreator: userVoiceChannel.guild.voiceAdapterCreator
            });
            console.log('🔊 Bot đã vào voice channel:', userVoiceChannel.name);
        }

        console.log(`💬 Tin nhắn từ ${message.author.username}: ${message.content}`);
        await playTTS(message.content);
    }
});

// 🟢 Tự động rời kênh nếu không còn ai (sự kiện voiceStateUpdate)
client.on('voiceStateUpdate', (oldState, newState) => {
    if (!connection) return;

    const voiceChannel = newState.guild.channels.cache.get(connection.joinConfig.channelId);
    if (!voiceChannel) return;

    const members = voiceChannel.members.filter(member => !member.user.bot); // Lọc ra người dùng (không phải bot)

    if (members.size === 0) {
        console.log('🔕 Không còn ai trong kênh, bot sẽ rời.');
        connection.destroy();
        connection = null;
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

    if (!connection) {
        console.log('⚠️ Bot đã rời khỏi voice channel, không thể phát âm thanh.');
        return;
    }

    const resource = createAudioResource(filePath, { inlineVolume: true });

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

// 🟢 Tự ping chính mình mỗi 4 phút để giữ bot luôn hoạt động (Render Free Tier sẽ auto-sleep nếu không có request)
setInterval(() => {
    fetch(`https://discordbottts.onrender.com/ping`)
        .then(res => res.text())
        .then(data => console.log("✅ Self-ping thành công:", data))
        .catch(err => console.error("❌ Self-ping lỗi:", err.message));
}, 4 * 60 * 1000);

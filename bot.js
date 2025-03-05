const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
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
//Kênh khó nói Addict 
// 🟢 Bot khởi động
client.once('ready', () => {
    console.log(`✅ Bot đã đăng nhập thành công với tên: ${client.user.tag}`);
});

// 🟢 Lệnh /tai để bot tham gia voice channel
client.on('messageCreate', async message => {
    if (message.content === '/tai' && message.member.voice.channel) {
        const voiceChannel = message.member.voice.channel;
        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });
        console.log('🔊 Bot đã tham gia voice channel:', voiceChannel.name);
        message.reply('✅ Bot đã vào voice channel!');
    }
});

// 🟢 Khi có tin nhắn trong kênh chỉ định, bot đọc bằng Google TTS
client.on('messageCreate', async message => {
    if (message.channel.id === targetChannelId && !message.author.bot) {
        console.log(`💬 Tin nhắn từ ${message.author.username}: ${message.content}`);
        await playTTS(message.content);
    }
});

async function playTTS(text) {
    if (!connection) {
        console.log('❌ Bot chưa kết nối voice channel.');
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

    const resource = createAudioResource(filePath, {
        inlineVolume: true
    });

    player.play(resource);
    connection.subscribe(player);

    console.log('🔊 Đang phát âm thanh...');
}

// 🟢 Đăng nhập bot
client.login(process.env.TOKEN);

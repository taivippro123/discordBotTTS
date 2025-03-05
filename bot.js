const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const textToSpeech = require('@google-cloud/text-to-speech');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

const ttsClient = new textToSpeech.TextToSpeechClient();
let connection = null;
let player = createAudioPlayer();
const targetChannelId = '716700036339335189'; // 🛑 Thay bằng ID kênh chat bot sẽ đọc tin nhắn

// 🟢 Bot khởi động
client.once('ready', () => {
    console.log(`✅ Bot đã đăng nhập thành công với tên: ${client.user.tag}`);
});

// 🟢 Lệnh /start để bot tham gia voice channel
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

// 📌 Hàm phát TTS
async function playTTS(text) {
    if (!connection) return;

    const request = {
        input: { text: text },
        voice: { languageCode: 'vi-VN', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' }
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    const filePath = path.join(__dirname, 'tts.mp3');
    fs.writeFileSync(filePath, response.audioContent);

    const resource = createAudioResource(filePath);
    player.play(resource);
    connection.subscribe(player);
}

// 🟢 Đăng nhập bot
client.login(process.env.TOKEN);

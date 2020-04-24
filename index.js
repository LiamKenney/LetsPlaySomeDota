require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client();
const token = process.env.TOKEN;
const tlobcId = process.env.TLOBCID;
const botTestId = process.env.BOTTESTID;
const audioFiles = require("./audio/soundPaths");
let isReady = false;
let response = {};
let botTest;

client.on("ready", () => {
  isReady = true;
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(
    "Servicing:\n" +
      client.guilds.cache
        .map((server) => server.id + ": " + server.name)
        .join("\n")
  );
  botTest = client.guilds.cache.find((guild) => +guild.id === +botTestId);
  let botGeneral = botTest.channels.cache.find(
    (channel) => channel.name === "General"
  );
  botGeneral.join().catch((err) => console.log(err));
  console.log("BotTest permissions: \n");
  console.log(botTest.me.permissions.serialize());
});

// client.on("guildMemberSpeaking", (guildMember, speaking) => {
//   if (speaking.bitfield) {
//     console.log(guildMember.displayName + " started talking");
//   } else {
//     console.log(guildMember.displayName + " stopped talking");
//   }
// });

client.on("presenceUpdate", (oldPres, newPres) => {
  if (
    newPres.guild.name !== "Quarantine the Italians" ||
    (oldPres && oldPres.guild.name !== "Quarantine the Italians")
  ) {
    if (newPres.activities[0]) {
      console.log("Started: ", {
        name: newPres.activities.map(getProp("name")).join(", "),
        details: newPres.activities.map(getProp("details")).join(", "),
        state: newPres.activities.map(getProp("state")).join(", "),
        totalActivities: newPres.activities.length,
      });
    } else if (oldPres && oldPres.activities[0]) {
      console.log(`Stopped ${oldPres.activities[0]}`);
    }
    const newDotaActivity = newPres.activities.find(
      (activity) => activity.name === "Dota 2"
    );
    const oldDotaActivity = oldPres
      ? oldPres.activities.find((activity) => activity.name === "Dota 2")
      : undefined;
    if (newDotaActivity && !oldDotaActivity) {
      console.log("New dota activity", newDotaActivity, oldDotaActivity);
      const assocVoiceState = newPres.guild.voiceStates.cache.find(
        (voiceState) => voiceState.member.id === newPres.member.id
      );
      if (assocVoiceState) {
        const response = {
          voiceChannel: assocVoiceState.channel,
          audioKey: "letsplay",
        };
        getAudioFileName(response);
        playAudioFile(response);
      }
    }
  }
});

client.on("message", (msg) => {
  const args = msg.content.split(/ +/);
  const signal = args.shift();
  const audioKey = args.shift();
  if (signal === "-d") {
    response = {
      signal,
      audioKey,
      args,
      audioFile: {},
    };
    console.log("New message:", response);
    if (audioKey === "help") {
      response.error = replyWithKeys();
    } else {
      if (!isReady) {
        response.error = replyWithNotReady();
      } else {
        if (!audioFiles.hasOwnProperty(audioKey)) {
          response.error = replyWithHelp();
        } else {
          const voiceChannel = msg.member.voice.channel;
          if (!voiceChannel) {
            response.error = replyWithMissingVoiceChannel();
          } else {
            getAudioFileName(response);
            response.voiceChannel = voiceChannel;
          }
        }
      }
    }
    handleResponse(msg, response);
  }
});

client.on("voiceStateUpdate", (oldState, newState) => {
  const newChannelID = newState.channelID;
  const oldChannelID = oldState.channelID;
  const voiceChannel = newState.channel || oldState.channel;
  if (
    oldChannelID === null &&
    newChannelID !== null &&
    voiceChannel !== null &&
    !newState.member.user.bot &&
    voiceChannel.members.size > 1
  ) {
    // User Joins a voice channel
    // setTimeout(() => {playAudioFile(voiceChannel, "letsplay")}, 2000);
  } else if (newChannelID === null) {
    // User leaves a voice channel
  }
});

client.login(token);

function getAudioFileName(response) {
  const { audioKey } = response;
  response.audioFile = audioFiles.hasOwnProperty(audioKey)
    ? { ...audioFiles[audioKey] }
    : "NONE_FOUND";
  owenCheck(response);
}

function handleResponse(msg, response) {
  if (response.error) {
    msg.reply(response.error);
    return;
  }
  playAudioFile(response);
}

function playAudioFile(response) {
  console.log("Playing audiofile:", response);
  const { voiceChannel, audioFile } = response;
  isReady = false;
  voiceChannel
    .join()
    .then((connection) => {
      const dispatcher = connection.play(
        `F:/Projects/DiscordBot/LETSPLAYSOMEDOTA/audio/${audioFile.folder}/${audioFile.file}.${audioFile.mime}`
      );
      if (audioFile.volume) {
        dispatcher.setVolume(audioFile.volume);
      }
      dispatcher.on("finish", () => {
        voiceChannel.leave();
      });
    })
    .catch((err) => console.log(err))
    .finally(() => {
      isReady = true;
      response = {};
    });
}

function replyWithHelp() {
  return "I could not find that sound :( Type '-d help' for options";
}

function replyWithKeys() {
  let replyString =
    "type '-d' followed by one of the possible sounds listed below:\n";
  Object.keys(audioFiles).forEach((key) => {
    replyString = replyString.concat(key + "\n");
  });
  return replyString;
}

function replyWithNotReady() {
  return "sorry, I'm busy right now :(";
}

function replyWithMissingVoiceChannel() {
  return "you need to be in voice chat to play sounds :(";
}

function replyWithInvalidArgs() {
  return "invalid args :(";
}

function owenCheck(response) {
  const { audioKey, args } = response;
  if (audioKey === "owow") {
    if (args[0] && !args[0].match(/^[1-9]\d?$/)) {
      response.error = replyWithInvalidArgs();
    } else {
      response.audioFile.file += String.fromCharCode(
        97 + (args[0] ? +args[0] : Math.floor(Math.random() * 26))
      );
    }
  }
}

function getProp(propName) {
  return (entity) => entity[propName];
}

module.exports = function(passthrough) {
	let { Discord, client, config, utils, db, commands, reloadEvent } = passthrough;
	let stdin = process.stdin;
	let prefixes = [];
	let statusPrefix = "&";

	if (config.dbl_key) {
		const dbl = require("dblapi.js");
		const poster = new dbl(config.dbl_key, client);
		poster.once("posted", () => console.log("Server count posted"));
		poster.on("error", reason => console.error(reason));
	} else console.log("No DBL API key. Server count posting is disabled.");

	reloadEvent.once(__filename, () => {
		client.removeListener("message", manageMessage);
		client.removeListener("messageUpdate", manageEdit);
		client.removeListener("disconnect", manageDisconnect);
		client.removeListener("error", manageError);
		client.removeListener("voiceStateUpdate", manageVoiceStateUpdate);
		process.removeListener("unhandledRejection", manageRejection);
		stdin.removeListener("data", manageStdin);
	});
	client.on("message", manageMessage);
	client.on("messageUpdate", manageEdit);
	client.once("ready", manageReady);
	client.on("disconnect", manageDisconnect);
	client.on("voiceStateUpdate", manageVoiceStateUpdate);
	process.on("unhandledRejection", manageRejection);
	stdin.on("data", manageStdin);

	async function manageStdin(input) {
		input = input.toString();
		try { console.log(await utils.stringify(eval(input))); } catch (e) { console.log(e.stack); }
	}

	async function manageMessage(msg) {
		if (msg.author.bot) return;
		let prefix = prefixes.find(p => msg.content.startsWith(p));
		if (!prefix) return;
		let cmdTxt = msg.content.substring(prefix.length).split(" ")[0];
		let suffix = msg.content.substring(cmdTxt.length + prefix.length + 1);
		let cmd = Object.values(commands).find(c => c.aliases.includes(cmdTxt));
		if (cmd) {
			try {
				await cmd.process(msg, suffix);
			} catch (e) {
				let msgTxt = `command ${cmdTxt} failed <:rip:401656884525793291>\n`+(await utils.stringify(e));
				const embed = new Discord.RichEmbed()
				.setDescription(msgTxt)
				.setColor("B60000")
				msg.channel.send({embed});
			}
		} else {
			if (msg.content.startsWith(`<@${client.user.id}>`) || msg.content.startsWith(`<@!${client.user.id}>`)) {
				let username = msg.guild ? msg.guild.me.displayName : client.user.username;
				let chat = msg.cleanContent.replace(new RegExp('@' + username + ',?'), '').trim();
				if (!chat) return;
				msg.channel.sendTyping();
				let owner = await client.fetchUser("320067006521147393");
				try {
					require("request-promise")(`http://ask.pannous.com/api?input=${encodeURIComponent(chat)}`).then(async res => {
						let data = JSON.parse(res);
						if (!data.sp("output.0.actions")) return msg.channel.send("Unfortunately, my speech API is currently having a bad time. Try again in a while? :3");
						let text = data.output[0].actions.say.text.replace(/Jeannie/gi, client.user.username).replace(/Master/gi, msg.member ? msg.member.displayName : msg.author.username).replace(/Pannous/gi, owner.username);
						if (text.length >= 2000) text = text.slice(0, 1999)+"…";
						if (chat.toLowerCase().includes("ip") && text.match(/(\d{1,3}\.){3}\d{1,3}/)) return msg.channel.send("no");
						if (text == "IE=edge,chrome=1 (Answers.com)" && data.sp("output.0.actions.source.url")) text = "I believe you can find the answer here: "+data.output[0].actions.source.url
						msg.channel.send(text);
					});
				} catch (error) { msg.channel.send(error); };
			} else return;
		}
	}

	function manageEdit(oldMessage, data) {
		if (data.constructor.name == "Message") manageMessage(data);
		else if (data.content) {
			let channel = client.channels.get(data.channel_id);
			let message = new Discord.Message(channel, data, client);
			manageMessage(message);
		}
	}

	function manageReady() {
		console.log(`Successfully logged in as ${client.user.username}`);
		process.title = client.user.username;
		utils.sql.all("SELECT * FROM AccountPrefixes WHERE userID = ?", [client.user.id]).then(result => {
			prefixes = result.map(r => r.prefix);
			statusPrefix = result.find(r => r.status).prefix;
			console.log("Loaded "+prefixes.length+" prefixes");
			update();
			client.setInterval(update, 300000);
		});
	}

	function manageDisconnect(reason) {
		console.log(`Disconnected with ${reason.code} at ${reason.path}\n\nReconnecting in 6sec`);
		setTimeout(() => client.login(config.bot_token), 6000);
	}

	function manageError(reason) {
		console.error(reason);
	}

	function manageRejection(reason) {
		if (reason && reason.code) {
			if (reason.code == 10008) return;
			if (reason.code == 50013) return;
		}
		console.error(reason);
	}

	function manageVoiceStateUpdate(oldMember, newMember) {
		if (newMember.id == client.user.id) return;
		let channel = oldMember.voiceChannel || newMember.voiceChannel;
		if (!channel || !channel.guild) return;
		let queue = utils.queueStorage.storage.get(channel.guild.id);
		if (!queue) return;
		queue.voiceStateUpdate(oldMember, newMember);
	}

	const presences = {
		yearly: [
			['alone', 'PLAYING'], ['in a box', 'PLAYING'], ['with fire 🔥', 'PLAYING'], ['dead', 'PLAYING'],
			['anime', 'WATCHING'], ['Netflix', 'WATCHING'], ['YouTube', 'WATCHING'], ['bots take over the world', 'WATCHING'], ['endless space go by', 'WATCHING'], ['cute cat videos', 'WATCHING'],
			['music', 'LISTENING'], ['Spotify', 'LISTENING'],
			['Netflix for ∞ hours', 'STREAMING']
		],
		halloween: [
			["Silent Hill", "PLAYING"],
			["scary movies", "WATCHING"], ["Halloween decor being hung", "WATCHING"],
			["Thriller by M.J.", "LISTENING"], ["the screams of many", "LISTENING"],
			["Halloween on Netflix", "STREAMING"]
		],
		christmas: [
			["in the snow", "PLAYING"],
			["Christmas carols", "LISTENING"],
			["The Night before Christmas", "WATCHING"], ["snow fall", "WATCHING"]
			["Christmas movies", "STREAMING"]
		]
	};

	const update = () => {
		let now = new Date(Date.now()).toUTCString().toLowerCase();
		let choice;
		if (now.includes("oct")) choice = presences.halloween;
		else if (now.includes("dec")) choice = presences.christmas;
		else choice = presences.yearly;
		const [name, type] = choice[Math.floor(Math.random() * choice.length)];
		client.user.setActivity(`${name} | ${statusPrefix}help`, { type, url: 'https://www.twitch.tv/papiophidian/' });
	};

}

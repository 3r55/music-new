// @ts-check

const types = require("../../typings")

const path = require("path")
const Discord = require("discord.js")

const passthrough = require("../../passthrough")
const { client, reloader, ipc } = passthrough

const utils = require("../utilities.js")
reloader.useSync("./modules/utilities.js", utils)

const Replier = require("./ipcreplier")
utils.addTemporaryListener(reloader.reloadEvent, "ipcreplier.js", path.basename(__filename), () => {
	setImmediate(() => { // event is emitted synchronously before decache, so wait for next event loop
		reloader.forceResync("./modules/ipc/ipcbotreplier.js")
	})
}, "once")

/**
 * @param {Discord.Guild} guild
 * @returns {types.FilteredGuild}
 */
function filterGuild(guild) {
	return {
		id: guild.id,
		name: guild.name,
		icon: guild.icon,
		nameAcronym: guild.nameAcronym
	}
}

function getQueue(guildID) {
	const queueStore = passthrough.queueStore
	if (!queueStore) return null
	const queue = queueStore.get(guildID)
	if (!queue) return null
	return queue
}

/**
 * - RECEIVE
 * - REPLY
 * - REQUEST
 * - SEND
 */
class ClientReplier extends Replier {
	constructor() {
		super()
		this.ipc = ipc
	}

	onMessage(raw) {
		this.baseOnMessage(raw, rawReply => this.ipc.send(rawReply))
	}

	request(op, data) {
		return this.baseRequest(op, data, raw => {
			this.ipc.send(raw)
		})
	}

	/**
	 * @param {string} guildID
	 */
	REPLY_GET_GUILD(guildID) {
		const guild = client.guilds.get(guildID)
		if (guild) return filterGuild(guild)
		else return null
	}

	/**
	 * @param {object} input
	 * @param {string} input.userID
	 * @param {boolean} input.np
	 */
	REPLY_GET_DASH_GUILDS({ userID, np }) {
		const queueStore = passthrough.queueStore
		const guilds = []
		const npguilds = []
		for (const guild of client.guilds.values()) {
			if (guild.members.has(userID)) {
				let isNowPlaying = false
				if (np) {
					if (queueStore && queueStore.store.has(guild.id)) isNowPlaying = true
					if (guild.members.get(userID).voice.channelID) isNowPlaying = true
				}
				if (isNowPlaying) npguilds.push(filterGuild(guild))
				else guilds.push(filterGuild(guild))
			}
		}
		return { guilds, npguilds }
	}

	/**
	 * @param {object} input
	 * @param {string} input.userID
	 * @param {string} input.guildID
	 */
	REPLY_GET_GUILD_FOR_USER({ userID, guildID }) {
		const guild = client.guilds.get(guildID)
		if (!guild) return null
		if (!guild.members.has(userID)) return null
		return filterGuild(guild)
	}

	/**
	 * @param {string} guildID
	 */
	REPLY_GET_QUEUE_STATE(guildID) {
		const queue = getQueue(guildID)
		if (!queue) return null
		return queue.wrapper.getState()
	}

	/**
	 * @param {string} guildID
	 */
	REPLY_TOGGLE_PLAYBACK(guildID) {
		const queue = getQueue(guildID)
		if (!queue) return false
		return queue.wrapper.togglePlaying("web")
	}

	/**
	 * @param {string} guildID
	 */
	REPLY_SKIP(guildID) {
		const queue = getQueue(guildID)
		if (!queue) return false
		queue.wrapper.skip()
		return true
	}

	/**
	 * @param {string} guildID
	 */
	REPLY_STOP(guildID) {
		const queue = getQueue(guildID)
		if (!queue) return false
		queue.wrapper.stop()
		return true
	}

	/**
	 * @param {object} input
	 * @param {string} input.guildID
	 * @param {number} input.index
	 */
	REPLY_REMOVE_SONG({ guildID, index }) {
		const queue = getQueue(guildID)
		if (!queue) return false
		return queue.wrapper.removeSong(index, "web")
	}

	/**
	 * @param {string} guildID
	 */
	REPLY_TOGGLE_AUTO(guildID) {
		const queue = getQueue(guildID)
		if (!queue) return false
		return queue.wrapper.toggleAuto("web")
	}

	REPLY_GET_STATS() {
		return utils.getStats()
	}

	REPLY_PING() {
		return true
	}

	async requestPing() {
		const d = Date.now()
		await this.request("PING")
		return Date.now() - d
	}

	/**
	 * @return {Promise<import("snowtransfer/src/methods/Guilds").GuildMember>}
	 */
	requestGetGuildMember(guildID, userID) {
		return this.request("GET_GUILD_MEMBER", { guildID, userID })
	}

	/**
	 * @param {import("../../commands/music/queue").Queue} queue
	 */
	sendNewQueue(queue) {
		this.ipc.send({ op: "NEW_QUEUE", data: { guildID: queue.guildID, state: queue.wrapper.getState() } })
	}

	sendDeleteQueue(guildID) {
		this.ipc.send({ op: "NEW_QUEUE", data: { guildID, state: null } })
	}

	/**
	 * @param {import("../../commands/music/queue").Queue} queue
	 * @param {import("../../commands/music/songtypes").Song} song
	 */
	sendAddSong(queue, song, position) {
		this.ipc.send({ op: "ADD_SONG", data: { guildID: queue.guildID, position, song: song.getState() } })
	}

	/**
	 * @param {import("../../commands/music/queue").Queue} queue
	 */
	sendTimeUpdate(queue) {
		this.ipc.send({ op: "TIME_UPDATE", data: { guildID: queue.guildID, songStartTime: queue.songStartTime, playing: !queue.isPaused } })
	}

	/**
	 * @param {import("../../commands/music/queue").Queue} queue
	 */
	sendNextSong(queue) {
		this.ipc.send({ op: "NEXT_SONG", data: { guildID: queue.guildID } })
	}

	/**
	 * @param {import("../../commands/music/queue").Queue} queue
	 * @param {import("../../commands/music/songtypes").Song} song
	 * @param {number} index
	 */
	sendSongUpdate(queue, song, index) {
		this.ipc.send({ op: "SONG_UPDATE", data: { guildID: queue.guildID, song: song.getState(), index: index } })
	}

	/**
	 * @param {import("../../commands/music/queue").Queue} queue
	 * @param {number} index
	 */
	sendRemoveSong(queue, index) {
		this.ipc.send({ op: "REMOVE_SONG", data: { guildID: queue.guildID, index: index } })
	}

	/**
	 * @param {import("../../commands/music/queue").Queue} queue
	 */
	sendMembersUpdate(queue) { // TODO: this is jank
		this.ipc.send({ op: "MEMBERS_UPDATE", data: { guildID: queue.guildID, members: queue.wrapper.getMembers() } })
	}

	/**
	 * @param {import("../../commands/music/queue").Queue} queue
	 */
	sendAttributesChange(queue) {
		this.ipc.send({ op: "ATTRIBUTES_CHANGE", data: { guildID: queue.guildID, attributes: queue.wrapper.getAttributes() } })
	}
}

const replier = new ClientReplier()
const oldReplier = ipc.replier
if (oldReplier) {
	replier.receivers = oldReplier.receivers
	replier.outgoing = oldReplier.outgoing
}
ipc.setReplier(replier)

module.exports = ClientReplier
const Discord = require("discord.js");
const events = require("events");

let Queue = require("./compiledtypings/queue.js");
let Game = require("./compiledtypings/game.js");

require("../types.js");

module.exports = {
	queueManager: {
		/**
		 * @type {Discord.Collection<String, Queue>}
		 */
		storage: new Discord.Collection(),
		songsPlayed: 0,
		/**
		 * @param {Queue} queue
		 */
		addQueue(queue) {
			this.storage.set(queue.id, queue);
			this.events.emit("new", queue);
		},
		removeQueue(queue) {
			this.storage.delete(queue.id)
			this.events.emit("remove")
		},
		events: new events.EventEmitter()
	},
	gameManager: {
		/**
		 * @type {Discord.Collection<String, Game>}
		 */
		storage: new Discord.Collection(),
		gamesPlayed: 0,
		/**
		 * @param {Game} game
		 */
		addGame: function(game) {
			this.storage.set(game.id, game);
		}
	}
}

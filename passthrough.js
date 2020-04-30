// @ts-check

// @ts-ignore
if (process._ptcreated) throw new Error("Do not reload the passthrough file.")
// @ts-ignore
process._ptcreated = true

/**
 * @typedef {Object} Passthrough
 * @property {import("./modules/structures/Discord/Amanda")} client
 * @property {import("./config")} config
 * @property {import("./constants")} constants
 * @property {import("@amanda/commandmanager")<[import("@amanda/lang").Lang]>} commands
 * @property {import("mysql2/promise").Pool} db
 * @property {import("@amanda/reloader")} reloader
 * @property {import("events").EventEmitter} reloadEvent
 * @property {import("./modules/managers/GameManager")} games
 * @property {Map<string, import("./modules/structures/Discord/ReactionMenu")>} reactionMenus
 * @property {import("./modules/managers/QueueManager")} queues
 * @property {import("./modules/structures/PeriodicHistory")} periodicHistory
 * @property {import("simple-youtube-api")} youtube
 * @property {import("ws").Server} wss
 * @property {Object<string, import("nedb-promises")>} nedb
 * @property {import("frisky-client")} frisky
 * @property {import("./modules/ipc/ipcbot")} ipc
 * @property {import("taihou")} weeb
 * @property {string} statusPrefix
 */

/**
 * @type {Passthrough}
 */
// @ts-ignore
const passthrough = {}

module.exports = passthrough

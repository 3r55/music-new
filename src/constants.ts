import config from "../config"
const baseURL = `${config.website_protocol}://${config.website_domain}`

export = {
	baseURL: baseURL,
	patreon: `${baseURL}/to/patreon`,
	paypal: `${baseURL}/to/paypal`,
	twitch: "https://www.twitch.tv/papiophidian",
	add: `${baseURL}/to/add`,
	server: `${baseURL}/to/server`,
	invite_link_for_help: "https://discord.gg/X5naRFu",
	stats: `${baseURL}/to/stats`,
	frisky_placeholder: `${baseURL}/images/frisky-small.png`,
	soundcloud_placeholder: `${baseURL}/images/soundcloud-logo-rectangle.jpg`,
	spotify_placeholder: `${baseURL}/images/spotify-logo.png`,
	local_placeholder: `${baseURL}/images/local.png`,
	listen_moe_placeholder: `${baseURL}/images/listen-moe-logo.png`,
	newgrounds_placeholder: `${baseURL}/images/ng-logo.png`,
	avatar: `${baseURL}/images/amanda.png`,
	chewey_api: "https://api.chewey-bot.top",
	money_embed_color: 0xf8e71c,
	standard_embed_color: 0x2f3136,
	discord_background_color: 0x36393f,
	fake_token: "(token)",
	lavalinkNodes: [] as Array<import("./typings/index").LavalinkNode>
}

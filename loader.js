const fs = require("fs");
const pj = require("path").join;
const http = require("http");
const WebSocket = require("ws");
const util = require("util");
require("./types.js");

const commandDirs = ["modules", "commands"];
let watched = [];

/**
 * @param {PassthroughType} passthrough
 */
module.exports = passthrough => new Promise((resolve, reject) => {
	let { config, utils } = passthrough;

	let mysql = require("mysql2/promise");
	let pool = mysql.createPool({
		host: "cadence.gq",
		user: "amanda",
		password: config.mysql_password,
		database: "money",
		connectionLimit: 5
	});

	pool.query("SET NAMES 'utf8mb4'").then(() => pool.query("SET CHARACTER SET utf8mb4")).then(async () => {
		console.log("Connected to MySQL database");
		passthrough.db = pool;

		for (let dir of commandDirs) {
			await util.promisify(fs.readdir)(dir).then(files => {
				files.filter(f => f.endsWith(".js")).forEach(f => {
					let filename = pj(__dirname, dir, f);
					loadFile(filename);
				});
			});
		}

		function loadFile(filename) {
			if (!watched.includes(filename)) {
				watched.push(filename);
				fs.watchFile(filename, { interval: 2018 }, () => { loadFile(filename); });
			}

			try {
				passthrough.reloadEvent.emit(filename);
				delete require.cache[require.resolve(filename)];
				let result = require(filename);
				if (typeof result == "function") setImmediate(() => Object.assign(passthrough.commands, result(passthrough)));
				console.log(`Loaded ${filename}`);
			} catch (e) { console.log(`Failed to load ${filename}\n${e.stack}`); }
		}

		let port = process.env.PORT || 8080;
		let server = http.createServer((req, res) => {
			if (utils.server) utils.server(req, res);
			else {
				res.writeHead(200, {"Content-Type": "text/plain"});
				res.end("Dashboard not initialised. Assign a function to utils.server to use it.");
			}
		});
		server.listen(port);

		let wss = new WebSocket.Server({server});
		wss.on("connection", ws => {
			if (utils.ws) utils.ws(ws);
		});

		resolve();
	}).catch(err => {
		console.log("Failed to connect to database\n", err);
		reject(err);
	});
});
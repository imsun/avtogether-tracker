var Server = require('bittorrent-tracker').Server
var http = require('http')
var WebSocketServer = require('ws').Server

var server = new Server({
	udp: false, // enable udp server? [default=true]
	http: false, // enable http server? [default=true]
	ws: false, // enable websocket server? [default=true]
	stats: false // enable web-based statistics? [default=true]
})

var httpServer = http.createServer(function(req, res) {
	console.log('http request:', req.url)
	var self = server

	// code from bittorrent-tracker/server.js
	var infoHashes = Object.keys(self.torrents)
	var activeTorrents = 0
	var allPeers = {}

	function countPeers (filterFunction) {
		var count = 0
		var key

		for (key in allPeers) {
			if (allPeers.hasOwnProperty(key) && filterFunction(allPeers[key])) {
				count++
			}
		}

		return count
	}

	function groupByClient () {
		var clients = {}
		for (var key in allPeers) {
			if (allPeers.hasOwnProperty(key)) {
				var peer = allPeers[key]

				if (!clients[peer.client.client]) {
					clients[peer.client.client] = {}
				}
				var client = clients[peer.client.client]
				// If the client is not known show 8 chars from peerId as version
				var version = peer.client.version || new Buffer(peer.peerId, 'hex').toString().substring(0, 8)
				if (!client[version]) {
					client[version] = 0
				}
				client[version]++
			}
		}
		return clients
	}

	function printClients (clients) {
		var html = '<ul>\n'
		for (var name in clients) {
			if (clients.hasOwnProperty(name)) {
				var client = clients[name]
				for (var version in client) {
					if (client.hasOwnProperty(version)) {
						html += '<li><strong>' + name + '</strong> ' + version + ' : ' + client[version] + '</li>\n'
					}
				}
			}
		}
		html += '</ul>'
		return html
	}

	if (req.method === 'GET' && (req.url === '/stats' || req.url === '/stats.json')) {
		infoHashes.forEach(function (infoHash) {
			var peers = self.torrents[infoHash].peers
			var keys = Object.keys(peers)
			if (keys.length > 0) activeTorrents++

			keys.forEach(function (peerId) {
				if (!allPeers.hasOwnProperty(peerId)) {
					allPeers[peerId] = {
						ipv4: false,
						ipv6: false,
						seeder: false,
						leecher: false
					}
				}
				var peer = peers[peerId]
				if (peer.ip.indexOf(':') >= 0) {
					allPeers[peerId].ipv6 = true
				} else {
					allPeers[peerId].ipv4 = true
				}
				if (peer.complete) {
					allPeers[peerId].seeder = true
				} else {
					allPeers[peerId].leecher = true
				}
				allPeers[peerId].peerId = peer.peerId
				allPeers[peerId].client = peerid(peer.peerId)
			})
		})

		var isSeederOnly = function (peer) { return peer.seeder && peer.leecher === false }
		var isLeecherOnly = function (peer) { return peer.leecher && peer.seeder === false }
		var isSeederAndLeecher = function (peer) { return peer.seeder && peer.leecher }
		var isIPv4 = function (peer) { return peer.ipv4 }
		var isIPv6 = function (peer) { return peer.ipv6 }

		var stats = {
			torrents: infoHashes.length,
			activeTorrents: activeTorrents,
			peersAll: Object.keys(allPeers).length,
			peersSeederOnly: countPeers(isSeederOnly),
			peersLeecherOnly: countPeers(isLeecherOnly),
			peersSeederAndLeecher: countPeers(isSeederAndLeecher),
			peersIPv4: countPeers(isIPv4),
			peersIPv6: countPeers(isIPv6),
			clients: groupByClient()
		}

		if (req.url === '/stats.json' || req.headers['accept'] === 'application/json') {
			res.write(JSON.stringify(stats))
			res.end()
		} else if (req.url === '/stats') {
			res.end('<h1>' + stats.torrents + ' torrents (' + stats.activeTorrents + ' active)</h1>\n' +
				'<h2>Connected Peers: ' + stats.peersAll + '</h2>\n' +
				'<h3>Peers Seeding Only: ' + stats.peersSeederOnly + '</h3>\n' +
				'<h3>Peers Leeching Only: ' + stats.peersLeecherOnly + '</h3>\n' +
				'<h3>Peers Seeding & Leeching: ' + stats.peersSeederAndLeecher + '</h3>\n' +
				'<h3>IPv4 Peers: ' + stats.peersIPv4 + '</h3>\n' +
				'<h3>IPv6 Peers: ' + stats.peersIPv6 + '</h3>\n' +
				'<h3>Clients:</h3>\n' +
				printClients(stats.clients)
			)
		}
	}
	res.end()
})

var socketServer = new WebSocketServer({ server: httpServer })
var onWebSocketConnection = server.onWebSocketConnection.bind(server)
socketServer.on('connection', function (socket) { onWebSocketConnection(socket) })

server.on('error', function (err) {
	// fatal server error!
	console.log(err.message)
})

server.on('warning', function (err) {
	// client sent bad data. probably not a problem, just a buggy client.
	console.log(err.message)
})

var port = process.env.LEANCLOUD_APP_PORT || 3000
// start tracker server listening! Use 0 to listen on a random free port.
httpServer.listen(port)

// listen for individual tracker messages from peers:

server.on('start', function (addr) {
	console.log('got start message from ' + addr)
})


server.on('complete', function (addr) {})
server.on('update', function (addr) {})
server.on('stop', function (addr) {})
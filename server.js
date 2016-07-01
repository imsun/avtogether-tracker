var Server = require('bittorrent-tracker').Server
var http = require('http')
var WebSocketServer = require('ws').Server

var server = new Server({
	udp: false, // enable udp server? [default=true]
	http: false, // enable http server? [default=true]
	ws: false, // enable websocket server? [default=true]
	stats: false // enable web-based statistics? [default=true]
})
var self = server

var httpServer = http.createServer(function(req, res) {
	console.log('http request:', req.url)

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

	if (req.method === 'GET' && req.url === '/stats') {
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
			})
		})

		var isSeederOnly = function (peer) { return peer.seeder && peer.leecher === false }
		var isLeecherOnly = function (peer) { return peer.leecher && peer.seeder === false }
		var isSeederAndLeecher = function (peer) { return peer.seeder && peer.leecher }
		var isIPv4 = function (peer) { return peer.ipv4 }
		var isIPv6 = function (peer) { return peer.ipv6 }

		res.end('<h1>' + infoHashes.length + ' torrents (' + activeTorrents + ' active)</h1>\n' +
			'<h2>Connected Peers: ' + Object.keys(allPeers).length + '</h2>\n' +
			'<h3>Peers Seeding Only: ' + countPeers(isSeederOnly) + '</h3>\n' +
			'<h3>Peers Leeching Only: ' + countPeers(isLeecherOnly) + '</h3>\n' +
			'<h3>Peers Seeding & Leeching: ' + countPeers(isSeederAndLeecher) + '</h3>\n' +
			'<h3>IPv4 Peers: ' + countPeers(isIPv4) + '</h3>\n' +
			'<h3>IPv6 Peers: ' + countPeers(isIPv6) + '</h3>\n')
	}
	res.end(JSON.stringify({
		"runtime": "nodejs-" + process.version,
		"version": "custom"
	}))
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
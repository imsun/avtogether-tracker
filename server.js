var Server = require('bittorrent-tracker').Server
var http = require('http')


var httpServer = http.createServer(function(req, res) {
	res.statusCode = 200;
	res.end()
})

httpServer.listen(80, '0.0.0.0', function() {
	console.log('listening on http port', 80)
})


var server = new Server({
	udp: false, // enable udp server? [default=true]
	http: false, // enable http server? [default=true]
	ws: true, // enable websocket server? [default=true]
	stats: true // enable web-based statistics? [default=true]
})

server.on('error', function (err) {
	// fatal server error!
	console.log(err.message)
})

server.on('warning', function (err) {
	// client sent bad data. probably not a problem, just a buggy client.
	console.log(err.message)
})

server.on('listening', function () {
	// fired when all requested servers are listening
	console.log('listening on websocket port:' + server.ws.address().port)
})

// start tracker server listening! Use 0 to listen on a random free port.
server.listen(3000)

// listen for individual tracker messages from peers:

server.on('start', function (addr) {
	console.log('got start message from ' + addr)
})

server.on('complete', function (addr) {})
server.on('update', function (addr) {})
server.on('stop', function (addr) {})
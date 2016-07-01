var Server = require('bittorrent-tracker').Server

var server = new Server({
	udp: false, // enable udp server? [default=true]
	http: true, // enable http server? [default=true]
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

var port = process.env.LEANCLOUD_APP_PORT
// start tracker server listening! Use 0 to listen on a random free port.
server.listen(port)

// listen for individual tracker messages from peers:

server.on('start', function (addr) {
	console.log('got start message from ' + addr)
})

server.on('complete', function (addr) {})
server.on('update', function (addr) {})
server.on('stop', function (addr) {})
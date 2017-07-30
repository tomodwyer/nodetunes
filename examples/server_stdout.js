const AirTunesServer = require("../index");

const server = new AirTunesServer({ serverName: "NodeTunes Stdout" });

server.on("clientConnected", stream => {
  stream.pipe(process.stdout);
});

server.start();

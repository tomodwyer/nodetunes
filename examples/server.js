const AirTunesServer = require("../index");
const Speaker = require("speaker");

const speaker = new Speaker({
  channels: 2,
  bitDepth: 16,
  sampleRate: 44100
});
const server = new AirTunesServer({ serverName: "NodeTunes Speaker" });

server.on("clientConnected", stream => {
  stream.pipe(speaker);
});

server.start();

const AirTunesServer = require("../index");

const server1 = new AirTunesServer({ serverName: "NodeTunes 1" });
const server2 = new AirTunesServer({ serverName: "NodeTunes 2" });

server1.on("clientConnected", stream => {
  stream.on("data", d => {
    process.stdout.write(
      `\rWriting for Server 1: ${d.length} bytes @ ${new Date().getTime()}\t`
    );
  });
});

server2.on("clientConnected", stream => {
  stream.on("data", d => {
    process.stdout.write(
      `\rWriting for Server 2: ${d.length} bytes @ ${new Date().getTime()}\t`
    );
  });
});

server1.start();
server2.start();

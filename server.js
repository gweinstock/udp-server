const dgram = require('dgram');
const server = dgram.createSocket('udp4');

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  server.send([Buffer.from('repl: ' + msg)],rinfo.port, rinfo.address, (err) => {
      console.log(`to: ${rinfo.address}:${rinfo.port}`);
  });
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.on('close', () => {
  console.log('socket close');
});

server.bind(41234);
// server listening 0.0.0.0:41234
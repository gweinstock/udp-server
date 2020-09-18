const dgram = require('dgram');
const server = dgram.createSocket('udp4');

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(msg.length);
  var s = Buffer.from(msg.toString('hex').replace(/cc/g, '').replace(/00/, ''), 'hex').toString();
  console.log(`server got: ${s} from ${rinfo.address}:${rinfo.port}`);
  var obj = JSON.parse(s);
  if (obj.msgType == 'connect') {
    console.log('got "connect"');
  }
  server.send([Buffer.from('{"msgType":"connect","seq":1}')],rinfo.port, rinfo.address, (err) => {
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
var fs = require('fs');
var ioredis = require('ioredis');

const dgram = require('dgram');
const server = dgram.createSocket('udp4');

// load redis:
var redis;

fs.readFile('redis-cfg.json', 'utf8', function(err, data) {
  var servers = JSON.parse(data.toString()).cache_servers;
  redis = new ioredis.Cluster(servers, { redisOptions: { password: '153aaa4ff88b9e54925777480b14652ed9822baf4363b1f35114f7c0d09a54c7' } });
});

var idSeq = 1;

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  var s = Buffer.from(msg.toString('hex'));
  console.log(s);
  var sz = s.indexOf('cc');
  console.log(sz);
  var hex = s.slice(0, sz);
  console.log(hex);
  s = Buffer.from(hex, 'hex').toString();
  //var s = Buffer.from(msg.toString('hex').replace(/cc/g, '').replace(/00/, ''), 'hex').toString();
  console.log(`server got: ${s} from ${rinfo.address}:${rinfo.port}`);
  var obj = JSON.parse(s);
  if (obj.msgType == 'connect') {
    console.log('connect');
    redis.get('udp-clients', function(err, clients) {
      var cli;
      if (clients) {
        cli = JSON.parse(clients);
        cli.push({id:idSeq,host:rinfo.address,port:rinfo.port});
      } else {
        cli = [{id:idSeq,host:rinfo.address,port:rinfo.port}];
      }
      idSeq++;
      redis.set('udp-clients', JSON.stringify(cli));
    });
    server.send([Buffer.from('{"msgType":"connect","id":' + idSeq + '}')],rinfo.port, rinfo.address, (err) => {
      console.log(`sent connect to: ${rinfo.address}:${rinfo.port}`);
    });
  } else {
    console.log('unknown command');
  }
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
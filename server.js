var fs = require('fs');
var ioredis = require('ioredis');

const dgram = require('dgram');
const server = dgram.createSocket('udp4');

// load redis:
var redis;
var ids = { id: 1 };

fs.readFile('redis-cfg.json', 'utf8', function(err, data) {
  var servers = JSON.parse(data.toString()).cache_servers;
  redis = new ioredis.Cluster(servers, { redisOptions: { password: '153aaa4ff88b9e54925777480b14652ed9822baf4363b1f35114f7c0d09a54c7' } });
});

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  var sz = 0;
  for (var i = 0; i < msg.length; i++) {
    if (msg[i] == 0) {
      sz = i;
      break;
    }
  }
  console.log(`idSeq: ${ids.id}`);
  console.log(`sz: ${sz}`);
  var hex = msg.toString().slice(0, sz);
  console.log(`got: ${hex} from ${rinfo.address}:${rinfo.port}`);
  var obj = JSON.parse(hex);
  if (obj.msgType == 'connect') {
    console.log('connect');
    redis.get('udp-clients', function(err, clients) {
      var cli;
      if (clients) {
        cli = JSON.parse(clients);
        cli.push({id:ids.id,host:rinfo.address,port:rinfo.port});
      } else {
        cli = [{id:ids.id,host:rinfo.address,port:rinfo.port}];
      }
      console.log(`udp-clients: ${JSON.stringify(cli)}`);
      redis.set('udp-clients', JSON.stringify(cli));
      var cn = {"msgType":"connect","id":ids.id};
      console.log(`cn: ${JSON.stringify(cn)}`);
      server.send([Buffer.from(JSON.stringify(cn))],rinfo.port, rinfo.address, (err) => {
        console.log(`sent connect to: ${rinfo.address}:${rinfo.port}`);
        ids.id++;
      });
    });
  } else if (obj.msgType == 'disconnect') {
    var idSeq = obj.id;
    console.log(`disconnect: ${idSeq}`);
    redis.get('udp-clients', function(err, clients) {
      if (clients) {
        var idx = 0;
        var cli = JSON.parse(clients);
        for (var i = 0; i < cli.length; i++) {
          if (cli.id == idSeq) {
            // splice out of array:
            idx = i;
            break;
          }
        }
        cli.splice(idx, 1);
        console.log(`udp-clients: ${JSON.stringify(cli)}`);
        redis.set('udp-clients', JSON.stringify(cli));
      } else {
        // no clients connected
      }
    });
  }
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
  var seq = 1;
  // start pinging clients:
  setInterval(function() {
    redis.get('udp-clients', function(err, clients) {
      if (clients) {
        var cli = JSON.parse(clients);
        for (var i = 0; i < cli.length; i++) {
          var ping = {msgType:'ping',seq:seq++};
          console.log(`cli[${i}]: ${JSON.stringify(cli[i])}: ${seq}`);
          server.send([Buffer.from(JSON.stringify(ping))],cli[i].port, cli[i].host, (err) => {
          });
        }
      }
    });
  }, 3000);
});

server.on('close', () => {
  console.log('socket close');
});

server.bind(41234);
// server listening 0.0.0.0:41234
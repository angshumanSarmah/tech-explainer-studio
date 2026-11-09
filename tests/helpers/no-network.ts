// Test-only preload: any attempted network connection aborts the CLI smoke test.
import dgram from 'node:dgram';
import dns from 'node:dns';
import http from 'node:http';
import http2 from 'node:http2';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import tls from 'node:tls';

function blocked(): never {
  throw new Error('Network is disabled in this test');
}

net.connect = blocked;
net.createConnection = blocked;
net.Socket.prototype.connect = blocked;
tls.connect = blocked;
http.request = blocked;
http.get = blocked;
https.request = blocked;
https.get = blocked;
http2.connect = blocked;
dgram.createSocket = blocked;
Object.assign(dns, { lookup: blocked, resolve: blocked });
dns.promises.lookup = blocked;
globalThis.fetch = blocked;
syncBuiltinESMExports();

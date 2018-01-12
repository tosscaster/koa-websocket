'use strict';

const url = require('url'),
  compose = require('koa-compose'),
  co = require('co'),
  ws = require('ws');
const WebSocketServer = ws.Server;
const debug = require('debug')('koa:websockets');

function KoaWebSocketServer(app) {
  this.app = app;
  this.middleware = [];
}

KoaWebSocketServer.prototype.listen = function (options) {
  this.server = new WebSocketServer(options);
  this.server.on('connection', this.onConnection.bind(this));
};

KoaWebSocketServer.prototype.onConnection = function (socket, req) {
  debug('Connection received');
  // alive check
  socket.isAlive = true;
  socket.on('pong', function () {
    socket.isAlive = true;
    debug('ws receive pong from client');
  });
  socket.on('error', function (err) {
    debug('Error occurred:', err);
  });
  const fn = co.wrap(compose(this.middleware));

  const context = this.app.createContext(req);
  context.websocket = socket;
  context.path = url.parse(req.url).pathname;

  fn(context).catch(function (err) {
    debug(err);
  });
};

KoaWebSocketServer.prototype.use = function (fn) {
  this.middleware.push(fn);
  return this;
};

function noop() { }

module.exports = function (app, wsOptions) {
  app.attach = function (server) {
    debug('Attaching server...');
    const options = {
      server
    };
    if (wsOptions) {
      for (var key in wsOptions) {
        if (wsOptions.hasOwnProperty(key)) {
          options[key] = wsOptions[key];
        }
      }
    }
    app.ws.listen(options);
    // send heart beat
    setInterval(() => { // ping
      app.ws.server.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          debug('ws terminate client');
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(noop);
        debug('send ws ping');
      });
    }, 3000);
  };
  app.ws = new KoaWebSocketServer(app);
  return app;
};

/*
module.exports = function (app, wsOptions) {
  const oldListen = app.listen;
  app.listen = function () {
    debug('Attaching server...');
    app.server = oldListen.apply(app, arguments);
    const options = { server: app.server};
    if (wsOptions) {
      for (var key in wsOptions) {
        if (wsOptions.hasOwnProperty(key)) {
          options[key] = wsOptions[key];
        }
      }
    }
    app.ws.listen(options);
    return app.server;
  };
  app.ws = new KoaWebSocketServer(app);
  return app;
};
*/

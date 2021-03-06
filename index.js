"use strict";

const url = require("url"),
  compose = require("koa-compose"),
  co = require("co"),
  ws = require("ws");
const WebSocketServer = ws.Server;
const debug = require("debug")("koa:websockets");

const ALIVE_CHECK_TIME = 5000; // 5 seconds
const MAX_ALIVE_COUNT = 9;

function KoaWebSocketServer(app) {
  this.app = app;
  this.middleware = [];
}

KoaWebSocketServer.prototype.listen = function(options) {
  this.server = new WebSocketServer(options);
  this.server.on("connection", this.onConnection.bind(this));
};

KoaWebSocketServer.prototype.onConnection = function(socket, req) {
  debug("Connection received");
  // alive check
  socket.isAlive = true;
  socket.checkCount = 0;
  socket.on("pong", function() {
    socket.isAlive = true;
    debug("ws receive pong from client");
    /*
    if (socket.hasOwnProperty("session")) {
      if (socket.session.hasOwnProperty("uname")) {
        console.log(
          `<<<<<<<<<< [${
            socket.session.uname
          }] ws receive pong from client: ${new Date()}`
        );
      }
    }
    */
  });
  socket.on("error", function(err) {
    debug("Error occurred:", err);
  });
  const fn = co.wrap(compose(this.middleware));

  const context = this.app.createContext(req);
  context.websocket = socket;
  context.path = url.parse(req.url).pathname;

  fn(context).catch(function(err) {
    debug(err);
  });
};

KoaWebSocketServer.prototype.use = function(fn) {
  this.middleware.push(fn);
  return this;
};

function noop() {}

module.exports = function(app, wsOptions) {
  app.attach = function(server) {
    debug("Attaching server...");
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
    setInterval(() => {
      // ping
      app.ws.server.clients.forEach(ws => {
        try {
          if (ws.isAlive === false) {
            ws.checkCount++;
            if (ws.checkCount > MAX_ALIVE_COUNT) {
              debug("ws terminate client");
              // console.log("*********** ws terminate client: " + new Date());
              return ws.terminate();
            }
          } else {
            ws.isAlive = false;
            ws.checkCount = 0; // reset
          }
          ws.ping(noop);
          debug("send ws ping");
          /*
          if (ws.hasOwnProperty("session")) {
            if (ws.session.hasOwnProperty("uname")) {
              console.log(
                `<<<<<<<<<< [${ws.session.uname}] send ws ping: ${new Date()}`
              );
            }
          }
          */
        } catch (e) {}
      });
    }, ALIVE_CHECK_TIME);
  };
  app.ws = new KoaWebSocketServer(app);
  return app;
};

/*
module.exports = function (app, wsOptions, httpsOptions) {
  const oldListen = app.listen;
  app.listen = function () {
    debug('Attaching server...');
    if (typeof httpsOptions === 'object') {
      const httpsServer = https.createServer(httpsOptions, app.callback());
      app.server = httpsServer.listen.apply(httpsServer, arguments);
    } else {
      app.server = oldListen.apply(app, arguments);
    }
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

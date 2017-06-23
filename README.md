# koa-websocket

[![Circle CI](https://circleci.com/gh/kudos/koa-websocket.svg?style=svg)](https://circleci.com/gh/kudos/koa-websocket)

> Koa v2 is now the default. For Koa v1 support install with koa-websocket@2 and see the `legacy` branch.

## Usage

```js
const http = require('http'),
  Koa = require('koa'),
  route = require('koa-route'),
  websockify = require('koa-websocket');

const app = websockify(new Koa());

// Regular middleware
// Note it's app.ws.use and not app.use
app.ws.use(function(ctx, next) {
  // return `next` to pass the context (ctx) on to the next ws middleware
  return next(ctx);
});

// Using routes
app.ws.use(route.all('/test/:id', function (ctx) {
  // `ctx` is the regular koa context created from the `ws` onConnection `socket.upgradeReq` object.
  // the websocket is added to the context on `ctx.websocket`.
  ctx.websocket.send('Hello World');
  ctx.websocket.on('message', function(message) {
    // do something with the message from client
        console.log(message);
  });
}));

const server = http.createServer(app.callback()).listen(3000);
app.attach(server);
```

With custom websocket options.

```js
const https = require('https'),
  fs = require('fs'),
  Koa = require('koa'),
  route = require('koa-route'),
  websockify = require('koa-websocket');

const wsOptions = {};
const app = websockify(new Koa(), wsOptions);

app.ws.use(route.all('/', function* (ctx) {
   // the websocket is added to the context as `this.websocket`.
  ctx.websocket.on('message', function(message) {
    // print message from the client
    console.log(message);
  });
}));

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  };
const server = https.createServer(options, app.callback()).listen(3000);
app.attach(server);
```

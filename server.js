var http = require("http");
var url = require("url");

function start(route, handle) {
  function onRequest(req, res) {
    var pathname = url.parse(req.url).pathname;
    console.log("pathname: " + pathname );

    route(handle, pathname, res, req);
  }

  http.createServer(onRequest).listen(process.env.PORT || 8000);
  console.log("Server has started");
}

exports.start = start;

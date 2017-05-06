var querystring = require("querystring"),
    fs = require("fs"),
    formidable = require("formidable"),
    PNG = require('png-js');
    
const KerasJS = require('keras-js');
var model = new KerasJS.Model({
    filepaths: {
        model: './data/mnist_cnn.json',
        weights: './data/mnist_cnn_weights.buf',
        metadata: './data/mnist_cnn_metadata.json'
    },
    filesystem: true
});

function start(response) {
  console.log("Request handler 'start' was called.");

  var body = '<html>'+
    '<head>'+
    '<meta http-equiv="Content-Type" '+
    'content="text/html; charset=UTF-8" />'+
    '</head>'+
    '<body>'+
    '<form action="/upload" enctype="multipart/form-data" '+
    'method="post">'+
    '<input type="file" name="upload" multiple="multiple">'+
    '<input type="submit" value="Upload file" />'+
    '</form>'+
    '</body>'+
    '</html>';

    response.writeHead(200, {"Content-Type": "text/html"});
    response.write(body);
    response.end();
}

function upload(response, request) {
  console.log("Request handler 'upload' was called.");

  var form = new formidable.IncomingForm();
  console.log("about to parse");
  form.parse(request, function(error, fields, files) {
    console.log("parsing done");

    /* Possible error on Windows systems:
       tried to rename to an already existing file */
    fs.rename(files.upload.path, "/tmp/test.png", function(err) {
      if (err) {
        fs.unlink("/tmp/test.png");
        fs.rename(files.upload.path, "/tmp/test.png");
      }
    });
    var myimage = new PNG.load("/tmp/test.png");
    var width  = myimage.width;
    var height = myimage.height;
    console.log(width, height);

    myimage.decode(function (pixels) {
        var raw = new Float32Array(pixels);
        var data = new Float32Array(784);
        for (let i = 0, len = raw.length; i < len; i += 4) {
               data[i/4] = (raw[i] - 127.5) / 127.5;
        }
    
        console.log(data.length);
        inputData = {"input": data};
        console.log(inputData.input.length);
        
        model.ready().then(() => {
            model.predict(inputData).then(outputData => {
                console.log(outputData);
                
                response.writeHead(200, {"Content-Type": "text/html"});
                response.write("received image:<br/>");
                response.log(outputData); // This can cause error
                response.write("<img src='/show' />");
                response.end();
            })
        });
    });
  });
}

function show(response) {
  console.log("Request handler 'show' was called.");
  fs.readFile("/tmp/test.png", "binary", function(error, file) {
    if(error) {
      response.writeHead(500, {"Content-Type": "text/plain"});
      response.write(error + "\n");
      response.end();
    } else {
      response.writeHead(200, {"Content-Type": "image/png"});
      response.write(file, "binary");
      response.end();
    }
  });
}

exports.start = start;
exports.upload = upload;
exports.show = show;

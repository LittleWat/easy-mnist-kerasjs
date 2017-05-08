var querystring = require("querystring"),
    fs = require("fs"),
    formidable = require("formidable"),
    Jimp = require('jimp'),
    argmax = require( 'compute-argmax' );

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
            
            var tmp;
            Jimp.read("/tmp/test.png", function (err, img) {
                if (err) throw err;
                resized_img = img.resize(28, 28) ;  // only for mnist
                
                var red_list = [];
                resized_img.scan(0, 0, resized_img.bitmap.width, resized_img.bitmap.height, function (x, y, idx) {
                        var red   = this.bitmap.data[ idx + 0 ];
                        var green = this.bitmap.data[ idx + 1 ];
                        var blue  = this.bitmap.data[ idx + 2 ];
                        var alpha = this.bitmap.data[ idx + 3 ];
                        red = (red - 127.5) / 127.5;
                        red_list.push(red);
                    });
                
                var  inputData = {"input": new Float32Array(red_list)};
                model.ready().then(() => {
                    model.predict(inputData).then(outputData => {
                        console.log(outputData);
                        response.writeHead(200, {"Content-Type": "text/html"});
                        response.write("received image:<br/>");
                        response.write("predicticted label is " + argmax(Array.from(outputData.output))[0] + "<br/>"); 
                        response.write("<img src='/show' />");
                        response.end();
                    })
                });
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

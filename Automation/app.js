/**
 *  IBM and/or HCL Confidential
 *  OCO Source Materials
 *  IBM Security AppScan
 *  (C) Copyright IBM Corp. 1991, 2016. All Rights Reserved.
 *  (C) Copyright HCL Technologies Ltd. 2017.  All Rights Reserved.
 *
 *  The source code for this program is not published or otherwise
 *  divested of its trade secrets, irrespective of what has been
 *  deposited with the U.S. Copyright Office.
 */

var chileProcess = require('child_process');
var spawn = chileProcess.spawn;

//var bodyParser = require('body-parser');

var fs = require('fs');

var express = require('express'), bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());

// //Import internal modules
var logger = require('./logger');
//var cloudWrapper = require('./cloudWrapper');


var recordingDir = __dirname + '/Recordings/';
var dastProxyJar = __dirname + '/DastProxy.jar';

//Set the Java path
var javaPath = "../../jre1.8.0_144/bin/java";
if (fs.existsSync(__dirname + '/../java/jre/bin')) {
    javaPath = __dirname + '/../java/jre/bin/java';
}


/**
 * @apiVersion 0.1.0
 * @api {get} /Certificate
 * @apiName Certificate
 * @apiGroup Certificate
 * @apiDescription Download the self-signed Root Certificate Authority, used by the AppScan Proxy Server, as a PEM file.
 *
 * @apiSuccess {file} Certificate file in PEM format
 *
 *
 * @apiErrorExample {json} Error-Response:
 *  HTTP/1.1 500 Internal Server Error
 *  {
 *      "success": false
 *      "message": "error message"
 *  }
 */
app.get('/automation/Certificate', function (req, res) {

    var pemFilePath = __dirname + '/rootCaPuKey.pem';

    if (fs.existsSync(pemFilePath)) {
        res.download(pemFilePath);
        return;
    }

    logger.info('Generate certificate was called');

    var outputStrings;
    var success = false;
    var commandArgs = ['-jar', dastProxyJar, '-mcm', '-gnrcin'];

    var proc = spawn(javaPath, commandArgs, { timeout: 8000 });

    proc.stdout.on('data', function (data) {
        outputStrings = data.toString().split(':');

        if (outputStrings[0].indexOf('SUCCESS') !== -1) {
            success = true;
        }

        msg = outputStrings[1] ? outputStrings[1] : '';
        logger.info('Certificate output: ' + data.toString());
    });

    proc.on('exit', function () {
        console.log('Generate certificate process exited');

        if (success && fs.existsSync(pemFilePath)) {
            res.download(pemFilePath);
            return res;
        } else {
            logger.error('Failed to generate certificate. Error: ' + msg);
            console.log('Failed to generate certificate. Error: ' + msg);
        }

        res.status(500).send(JSON.stringify({ 'success': success, 'message': msg }));
        return res;
    });
});


function startProxy(req, res) {
    console.log("proxy was called");
    var port = req.params.port;
    logger.info('[' + port + '] StartProxy called');

    var chainedProxy = req.body.chainedProxy;       // Optional value. format should be 'server:port'
    if (chainedProxy && chainedProxy.indexOf(':') == -1) {
        res.status(400).send(JSON.stringify({ 'success': false, 'message': 'ChainedProxy format should be [server:port]' }));
        return res;
    }

    //Set response content type
    res.setHeader('Content-Type', 'application/json');
    console.log("make dir");
    //create recordings directory
    if (!fs.existsSync(recordingDir)) {
        fs.mkdirSync(recordingDir);
    }

    if (isNaN(parseInt(req.params.port))) {
        console.log("Invalid port: " + port);
        res.statusCode = 403; //forbidden
        res.send("Invalid port!");
        return res;
    }

    var outputFilePath = recordingDir + port + '.dast.config';
console.log("command arg stuff");
    var commandArgs = ['-jar', dastProxyJar, '-mcm', 'start', '-p', port, '-sdcf', outputFilePath];
    if (chainedProxy && chainedProxy.length > 0) {
        commandArgs.push('-cp');
        commandArgs.push(chainedProxy);
    }
console.log("spawn java process");
console.log("javaPath: ", javaPath);
    var proc = spawn(javaPath, commandArgs, { timeout: 8000 });
console.log("waitinf for java process");
    proc.stdout.on('data', function (data) {
      console.log("callback from java porcess");
        logger.info('logger: ' + data);

        var outputStrings = data.toString().split(':');
        console.log("output", outputStrings);
        if (outputStrings[0].indexOf('SUCCESS') !== -1) {
            logger.info('Succeeded to open proxy on port ' + port);

            res.send(JSON.stringify({ 'success': true, 'message': outputStrings[1] }));
            return res;
        } else if (outputStrings[0].indexOf('FAILED') !== -1) {
            logger.error('Failed to open proxy on port ' + port + ' with error: ' + outputStrings[1]);

            res.send(JSON.stringify({ 'success': false, 'message': outputStrings[1] }));
            return res;
        }
    });

    proc.stderr.on('data', function (data) {
      console.log("callback from java porcess - stderr: " + data);
    });

    proc.on('close', function (data) {
      console.log("callback from java porcess - close: ", data);
    });
}


/**
 * @apiVersion 0.1.0
 * @api {post} /StartProxy/<port>
 * @apiName StartProxy
 * @apiGroup StartProxy
 * @apiDescription Start a proxy that listens on the specified port. If port = "0", a random port will be chosen, and the port number returned in the Response.
 * @apiParam {Integer} port Proxy listening port
 * @apiParam {String} [chainedProxy] Configure the upstream (chained) proxy using format [ip]:[port]. This will override the chained proxy rules file (proxy.chain).
 * @apiParamExample {json} Input
 * {
 *     "chainedProxy": "1.2.3.4:8080"
 * }
 *
 * @apiSuccess {json} success if proxy started
 *
 * @apiSuccessExample {json} Success-Response:
 *  HTTP/1.1 200 OK
 *  {
 *      "success": true,
 *      "message": ""
 *  }
 *
 * @apiErrorExample {json} Error-Response:
 *  HTTP/1.1 403 Forbidden
 *  {
 *      "success": false
 *      "message": "error message"
 *  }
 */
app.post('/automation/StartProxy/:port', function (req, res) {
    return startProxy(req, res);
});


/**
 * @apiVersion 0.1.0
 * @api {get} /StartProxy/<port>
 * @apiName StartProxy(Simple)
 * @apiGroup StartProxy
 * @apiDescription Simple API to start a proxy that listens on the specified port. If port = "0", a random port will be chosen, and the port number returned in the Response.
 * @apiParam {Integer} port Proxy listening port
 *
 * @apiSuccess {json} success if proxy started
 *
 * @apiSuccessExample {json} Success-Response:
 *  HTTP/1.1 200 OK
 *  {
 *      "success": true,
 *      "message": ""
 *  }
 *
 * @apiErrorExample {json} Error-Response:
 *  HTTP/1.1 403 Forbidden
 *  {
 *      "success": false
 *      "message": "error message"
 *  }
 */
app.get('/automation/StartProxy/:port', function (req, res) {
    return startProxy(req, res);
});


/**
 * @apiVersion 0.1.0
 * @api {get} /StopProxy/<port>
 * @apiName StopProxy
 * @apiGroup StopProxy
 * @apiDescription Stop the proxy that is listening on the specified port
 * @apiParam {Integer} port Proxy listening port
 *
 * @apiSuccess {json} success if proxy stopped
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": ""
 *     }
 *
* @apiErrorExample {json} Error-Response:
 *  HTTP/1.1 400 Not Found
 *  {
 *      "success": false
 *      "message": "error message"
 *  }
 */
app.get('/automation/StopProxy/:port', function (req, res) {
    var port = req.params.port;

    logger.info('[' + port + '] StopProxy called');

    var success = true;

    var proc = spawn(javaPath, ['-jar', dastProxyJar, '-mcm', 'stop', '-p', port], { timeout: 3000 });
    var outputStrings;
    var msg = '';

    //Set response content type
    res.setHeader('Content-Type', 'application/json');

    proc.stdout.on('data', function (data) {
        outputStrings = data.toString().split(':');

        if (outputStrings[0].indexOf('FAILED') !== -1) {
            success = false;
            logger.error('[' + port + '] StopProxy failed (see proxy log)');
        }

        msg = outputStrings[1] ? outputStrings[1] : '';

        logger.info('' + data.toString());
    });

    proc.on('exit', function () {
        console.log('process exit');

        res.setHeader('Content-Type', 'application/json');

        if (success) {
            logger.error('Stopping proxy succeeded (port ' + port + ')');
            console.log('Stopping proxy succeeded (port ' + port + ')');
        } else {
            res.status(400);
            errMsg = outputStrings[1];
            logger.error('Stopping proxy falied (port ' + port + ') Message: ' + errMsg);
            console.log('Stopping proxy falied (port ' + port + ')');
        }

        res.send(JSON.stringify({ 'success': success, 'message': msg }));
        return res;
    });
});


/**
 * @apiVersion 0.1.0
 * @api {get} /Traffic/<port>
 * @apiName Traffic
 * @apiGroup Traffic
 * @apiDescription Download recorded data from the proxy identified by the port as a .dast.config file.
 * @apiParam {Integer} port Traffic identifier (proxy port)
 *
 * @apiSuccess {string} download the .config file
 *
* @apiErrorExample {json} Error-Response:
 *  HTTP/1.1 410 Not Found
 *  {
 *      "success": false
 *      "message": "error message"
 *  }
 */
app.get('/automation/Traffic/:port', function (req, res) {
    var port = req.params.port;

    var filePath = recordingDir + port + '.dast.config';

    logger.info('[' + port + '] Traffic called');

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        logger.error('[' + port + '] Traffic failed. File not found');

        res.setHeader('Content-Type', 'application/json');
        res.status(410).send(JSON.stringify({ 'success': false, 'message': 'traffic file was not found' }));   // 410 Resource Gone
    }
});


//Node Server configuration
app.use(express.static(__dirname + '/apidocs'));
app.use('/automation', express.static(__dirname + '/apidocs'));

var initialPort = (process.argv.length == 3) ?
     process.argv[2] :
     process.env.PORT || 8383;


app.listen(initialPort, function () {
    console.log('Automation server is listening on port ' + initialPort);
    logger.info('Automation server is listening on port ' + initialPort);
}).on('error', function (err) {
    if (err.errno === 'EADDRINUSE') {
        console.log('Port ' + initialPort + ' is busy.\nTry to configure a different port.\nUsage: node app.js [port]');
    } else {
         console.log(err);
    }
});

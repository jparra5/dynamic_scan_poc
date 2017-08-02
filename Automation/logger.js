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

var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    //new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: 'Logs/automationServer.log', json: false })
  ],
  exceptionHandlers: [
    //new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: __dirname + 'Logs/automationServer.log', json: false })
  ],
  exitOnError: false
});

module.exports = logger;
/***********************************************
 Licensed Materials - Property of IBM
 Restricted Materials of IBM.  Reproduction, modification and redistribution are prohibited.

 DevOps Lifecycle Message Store - Results Service

 © Copyright IBM Corporation 2016.
 U.S. Government Users Restricted Rights:  Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 ************************************************/
(function() {
    'use strict';

    var fs = require('fs');
    var path = require('path');
    var REQUEST = require('request');
    var assert = require('chai').assert;
    var _ = require('lodash');
    var testutils = require('./testutils.js');

    var server = (process.env.DLMS_TEST || 'https://dlms-test.stage1.ng.bluemix.net');
    var toolchain_id = (process.env.TOOLCHAIN_ID || '4fa863ed');
    var build_artifact = (process.env.BUILD_ARTIFACT || 'ibmvmserver');
    var build_id = "dlmsfvttest:301";
    var org_name = (process.env.CF_ORG || 'ucparule@us.ibm.com');
    var accessToken = process.env.AUTH_TOKEN ;

    function login(cb) {
        if (accessToken) {
            cb(accessToken);
        } else {
            require('child_process').exec("cf oauth-token", function(err, stdout, stderr) {
                var token = stdout.toString();
                var re = /.*bearer (.*)/i;
                var at = token.match(re);
                accessToken = at[1];
                cb(accessToken);
            });
        }
    }

    function arestcall(options, callback) {
      options.proxy = "http://" + process.env.PROXY_SERVER_DOMAIN + ":" + process.env.PROXY_TARGET_PORT
        if ((typeof(process.env.FVT_DEBUG) !== 'undefined') && (process.env.FVT_DEBUG === "true")) {
            console.log("*************** Request ***********************");
            console.log("options - ", options);
            console.log("***********************************************");
        }
        request(options, function(err, resp, body) {
            if ((typeof(process.env.FVT_DEBUG) !== 'undefined') && (process.env.FVT_DEBUG === "true")) {
                console.log("*************** Response ***********************");
                console.log("Err Response - ", err);
                if (typeof(resp) !== 'undefined') {
                    console.log("Response status -", resp.statusCode);
                    console.log("Response body - ", resp.body);
                }
                console.log("************************************************");
            }
            if (err) {
                callback(err, resp, null);
            } else {
                callback(null, resp, body);
            }
        });
    }

    function getFilename(filename) {
        var file = path.join(__dirname, "data", filename);
        return file;
    }

    var request = REQUEST.defaults({
        strictSSL: false
    });

    var now = '2017-04-15T01:36:00.000Z';

    describe('Create toolchain', function() {
        this.timeout(30000);

        it("init", function(done) {
            login(function(accessToken) {
                testutils.createToolchain(accessToken, org_name, "GateServiceFVT", function(err, toolchainId) {
                    //console.log(JSON.stringify(err, null, 4), toolchainId);
                    toolchain_id = toolchainId;
                    assert.equal(err, null, "Received an error: " + JSON.stringify(err, null, 4));
                    done();
                });
            });
        });
    });

    describe('DLMS - Cycle Time', function() {
        this.timeout(10000);

        it('Delete toolchain records - start clean', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'DELETE',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("DELETE /toolchains response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    done();
                });
            });
        });

        it('Post a build record for current month', function(done) {
            var adate = new Date((new Date(now)).getTime() - (5 * 60 * 1000));
            var build_data = {
                status: "pass",
                build_id: build_id,
                job_url: "http://www.defined.com/3234234",
                timestamp: adate.toJSON(),
                repository: {
                    repository_url: "https://www.ucpa.com",
                    branch: "master",
                    commit_id: "123456"
                }
            };
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + "/builds",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: build_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /deployments response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(JSON.stringify(body), '{"status":"Accepted"}');
                    done();
                });
            });
        });

        it('Post a deploy record for current month', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "beta",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
                timestamp: now,
                custom_metadata: {
                    project_name: "Bluemix"
                }
            };
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                        build_id + "/deployments",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: deploy_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /deployments response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(JSON.stringify(body), '{"status":"Accepted"}');
                    done();
                });
            });
        });

        var new_build_id = "dlmsfvttest:302";
        it('Post a build record for last month', function(done) {
            var adate = new Date((new Date(now)).getTime() - (33 * 24 * 60 * 60 * 1000));
            var build_data = {
                status: "pass",
                build_id: new_build_id,
                job_url: "http://www.defined.com/3234234",
                timestamp: adate.toJSON(),
                repository: {
                    repository_url: "https://www.ucpa.com",
                    branch: "master",
                    commit_id: "123456"
                }
            };
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + "/builds",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: build_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /deployments response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(JSON.stringify(body), '{"status":"Accepted"}');
                    done();
                });
            });
        });

        it('Post a deploy record for last month', function(done) {
            var adate = new Date((new Date(now)).getTime() - ((33 * 24 * 60 * 60 * 1000) - (9 * 60 * 1000)));
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "beta",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
                timestamp: adate.toJSON(),
                custom_metadata: {
                    project_name: "Bluemix"
                }
            };
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                        new_build_id + "/deployments",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: deploy_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /deployments response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(JSON.stringify(body), '{"status":"Accepted"}');
                    done();
                });
            });
        });


        it('Get Deployment cycle time - daily', function(done) {
            var start = new Date((new Date(now)).getTime() - (40 * 24 * 60 * 60 * 1000));
            var end = new Date((new Date(now)).getTime() + (2 * 24 * 60 * 60 * 1000));
            login(function(accessToken) {
                var cycle_time = {
                    interval_start: start.toJSON(),
                    interval_end: end.toJSON(),
                    aggregation: {
                        frequency: 'DAILY'
                    }
                };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + "/cycletime",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: cycle_time
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /cycle (DAILY) response:", err, resp.statusCode, JSON.stringify(body, null, 4));
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.cycle_times[0].deployments.length,2);
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].month),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].date),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].year),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].build_to_deploy),'undefined');
                    assert.equal(body.cycle_times[0].deployments[0].year,2017);
                    assert.equal(body.cycle_times[0].deployments[0].month,2);
                    //assert.equal(body.cycle_times[0].deployments[0].date,12);
                    assert.isTrue(Math.abs(540000 - body.cycle_times[0].deployments[0].build_to_deploy) < 1000);   // one second diff
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].month),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].date),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].year),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].build_to_deploy),'undefined');
                    assert.equal(body.cycle_times[0].deployments[1].year,2017);
                    assert.equal(body.cycle_times[0].deployments[1].month,3);
                    //assert.equal(body.cycle_times[0].deployments[1].date,14);
                    assert.isTrue(Math.abs(300000 - body.cycle_times[0].deployments[1].build_to_deploy) < 1000);   // one second diff

                    done();
                });
            });
        });

        it('Get Deployment cycle time - weekly', function(done) {
            var start = new Date((new Date(now)).getTime() - (40 * 24 * 60 * 60 * 1000));
            var end = new Date((new Date(now)).getTime() + (2 * 24 * 60 * 60 * 1000));
            login(function(accessToken) {
                var cycle_time = {
                    interval_start: start.toJSON(),
                    interval_end: end.toJSON(),
                    aggregation: {
                        frequency: 'WEEKLY'
                    }
                };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + "/cycletime",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: cycle_time
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /cycle (WEEKLY) response:", err, resp.statusCode, JSON.stringify(body, null, 4));
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.cycle_times[0].deployments.length,2);
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].week),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].year),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].build_to_deploy),'undefined');
                    assert.equal(body.cycle_times[0].deployments[0].year,2017);
                    assert.equal(body.cycle_times[0].deployments[0].week,11);
                    assert.isTrue(Math.abs(540000 - body.cycle_times[0].deployments[0].build_to_deploy) < 1000);   // one second diff
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].week),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].year),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].build_to_deploy),'undefined');
                    assert.equal(body.cycle_times[0].deployments[1].year,2017);
                    assert.equal(body.cycle_times[0].deployments[1].week,15);
                    assert.isTrue(Math.abs(300000 - body.cycle_times[0].deployments[1].build_to_deploy) < 1000);   // one second diff
                    done();
                });
            });
        });

        it('Get Deployment cycle time - monthly', function(done) {
            var start = new Date((new Date(now)).getTime() - (40 * 24 * 60 * 60 * 1000));
            var end = new Date((new Date(now)).getTime() + (2 * 24 * 60 * 60 * 1000));
            login(function(accessToken) {
                var cycle_time = {
                    interval_start: start.toJSON(),
                    interval_end: end.toJSON(),
                    aggregation: {
                        frequency: 'MONTHLY'
                    }
                };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + "/cycletime",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: cycle_time
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /cycle (MONTHLY) response:", err, resp.statusCode, JSON.stringify(body, null, 4));
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.cycle_times[0].deployments.length,2);
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].month),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].year),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].build_to_deploy),'undefined');
                    assert.equal(body.cycle_times[0].deployments[0].year,2017);
                    assert.equal(body.cycle_times[0].deployments[0].month,2);
                    assert.isTrue(Math.abs(540000 - body.cycle_times[0].deployments[0].build_to_deploy) < 1000);   // one second diff
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].month),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].year),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].build_to_deploy),'undefined');
                    assert.equal(body.cycle_times[0].deployments[1].year,2017);
                    assert.equal(body.cycle_times[0].deployments[1].month,3);
                    assert.isTrue(Math.abs(300000 - body.cycle_times[0].deployments[1].build_to_deploy) < 1000);   // one second diff
                    done();
                });
            });
        });

        it('Get Deployment cycle time - yearly', function(done) {
            var start = new Date((new Date(now)).getTime() - (40 * 24 * 60 * 60 * 1000));
            var end = new Date((new Date(now)).getTime() + (2 * 24 * 60 * 60 * 1000));
            login(function(accessToken) {
                var cycle_time = {
                    interval_start: start.toJSON(),
                    interval_end: end.toJSON(),
                    aggregation: {
                        frequency: 'YEARLY'
                    }
                };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + "/cycletime",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: cycle_time
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /cycle (YEARLY) response:", err, resp.statusCode, JSON.stringify(body, null, 4));
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.cycle_times[0].deployments.length,1);
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].year),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].build_to_deploy),'undefined');
                    assert.equal(body.cycle_times[0].deployments[0].year,2017);
                    assert.isTrue(Math.abs(420000 - body.cycle_times[0].deployments[0].build_to_deploy) < 1000);   // one second diff
                    done();
                });
            });
        });

        it('Get Deployment cycle time - individual', function(done) {
            var start = new Date((new Date(now)).getTime() - (40 * 24 * 60 * 60 * 1000));
            var end = new Date((new Date(now)).getTime() + (2 * 24 * 60 * 60 * 1000));
            login(function(accessToken) {
                var cycle_time = {
                    interval_start: start.toJSON(),
                    interval_end: end.toJSON(),
                    aggregation: {
                        frequency: 'INDIVIDUAL'
                    }
                };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + "/cycletime",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: cycle_time
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /cycle (INDIVIDUAL) response:", err, resp.statusCode, JSON.stringify(body, null, 4));
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.cycle_times[0].deployments.length,2);
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].timestamp),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].build_to_deploy),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[0].build_id),'undefined');
                    assert.equal(body.cycle_times[0].deployments[0].timestamp,"2017-04-15T01:36:00.000Z");
                    assert.isTrue(Math.abs(300000 - body.cycle_times[0].deployments[0].build_to_deploy) < 1000);   // one second diff
                    assert.equal(body.cycle_times[0].deployments[0].build_id,"dlmsfvttest:301");
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].timestamp),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].build_to_deploy),'undefined');
                    assert.notEqual(typeof(body.cycle_times[0].deployments[1].build_id),'undefined');
                    assert.equal(body.cycle_times[0].deployments[1].timestamp,"2017-03-13T01:45:00.000Z");
                    assert.isTrue(Math.abs(540000 - body.cycle_times[0].deployments[1].build_to_deploy) < 1000);   // one second diff
                    assert.equal(body.cycle_times[0].deployments[1].build_id,"dlmsfvttest:302");
                    done();
                });
            });
        });

    });

}());

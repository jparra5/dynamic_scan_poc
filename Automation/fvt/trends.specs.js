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
    var async = require('async');
    var testutils = require('./testutils.js');

    var server = (process.env.DLMS_TEST || 'https://dlms-test.stage1.ng.bluemix.net');
    var toolchain_id = (process.env.TOOLCHAIN_ID || '4fa863ed');
    var build_artifact = (process.env.BUILD_ARTIFACT || 'ibmvmserver');
    var build_id = "dlmsfvttest:301";
    var org_name = (process.env.CF_ORG || 'ucparule@us.ibm.com');
    var accessToken = process.env.AUTH_TOKEN;

    function login(cb) {
        console.log("login");
        if (accessToken) {
            cb(accessToken);
        } else {console.log("else");
            require('child_process').exec("cf oauth-token", function(err, stdout, stderr) {
              console.log("returns", err, stdout, stderr);
                var token = stdout.toString();
                var re = /.*bearer (.*)/i;
                var at = token.match(re);
                accessToken = at[1];
                console.log("found bearer:", accessToken);
                cb(accessToken);
            });
        }
    }

    function arestcall(options, callback) {
      console.log("What is happeneing?");
      console.log("no proxy");
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

    function getFile(filename) {
        var filen = path.join(__dirname, "data", "testtrends", filename);
        var file = fs.readFileSync(filen);
        return file;
    }

    function getBuildData(branch, build_id, timestamp) {
        var build_time = (new Date((new Date(timestamp)).getTime() - ((Math.floor(Math.random() * 10) + 5) * 60 * 1000))).toJSON();

        var build_data = {
            status: "pass",
            build_id: build_id,
            job_url: "http://www.defined.com/3234234",
            timestamp: build_time,
            repository: {
                repository_url: "https://www.ucpa.com",
                branch: branch,
                commit_id: "123456"
            }
        };
        return build_data;
    }

    function getTestResult(timestamp, toolchainid, stage, filename) {
      var contenttype = "application/json";
      if(filename.indexOf(".xml") !== -1) {
          contenttype = "application/xml";
      }
      var result = {
          lifecycle_stage: stage,
          url: ['https://dev-console.stage1.ng.bluemix.net/devops/toolchains/' + toolchainid],
          timestamp: timestamp,
          test_artifact: filename,
          contents_type: contenttype,
          contents: (new Buffer(getFile(filename))).toString('base64')
      };
      return result;
    }

    function getDeployData(timestamp, env, status) {
      var deploy_time = (new Date((new Date(timestamp)).getTime() + ((Math.floor(Math.random() * 10) + 5) * 60 * 1000))).toJSON();

      var deploy_data = {
          app_url: "http://www.ucp.com",
          status: status,
          environment_name: env,
          deployable_id: "adeployable",
          job_url: "http://www.defined.com/3234234",
          timestamp: deploy_time,
          custom_metadata: {
              project_name: "Bluemix"
          }
      };
      return deploy_data;
    }

    var request = REQUEST.defaults({
        strictSSL: false
    });
    var now = '2017-03-15T05:00:00.000Z';

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
            // uncomment the below and comment the above lines to spead up the testing
            //toolchain_id = "e4846573-6cb2-4278-b141-d27699842378";
            //done();
        });
    });

    describe('DLMS - Deployment Trends', function() {
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

        it('Post a deploy record for last month', function(done) {
            var n = new Date(now);
            n.setDate(n.getDate() -1 );
            n.setMonth(n.getMonth() -1 );
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "beta",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
                timestamp: n.toJSON(),
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

        it('Get Deployments', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/deployments",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /deployments for toolchain response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0].toolchain_id, toolchain_id);
                    assert.equal(body[0].deployable_id, "adeployable");
                    done();
                });
            });
        });

        it('Get buildartifacts', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/buildartifacts",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /buildartifacts response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0], "ibmvmserver");
                    done();
                });
            });
        });

        it('Get Environments', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/environments",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /environments response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0], "beta");
                    done();
                });
            });
        });

        it('Get Deployment Frequencies - daily', function(done) {
            login(function(accessToken) {
                var trend_components = {
                    environment_name: 'beta',
                    interval_start: "2017-02-01T05:00:00.000Z",
                    interval_end: "2017-03-31T05:00:00.000Z",
                    aggregation: {
                        frequency: 'DAILY'
                    }
                };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/buildartifacts/" + build_artifact + "/deployment_trends",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: trend_components
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /deployment_trends response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.deployments.length,2);
                    assert.notEqual(typeof(body.deployments[0].month),'undefined');
                    assert.notEqual(typeof(body.deployments[0].date),'undefined');
                    assert.notEqual(typeof(body.deployments[0].year),'undefined');
                    assert.equal(body.deployments[0].year,2017);
                    assert.equal(body.deployments[0].month,1);
                    assert.equal(body.deployments[0].date,14);
                    assert.equal(body.deployments[0].total,1);
                    assert.equal(body.deployments[1].year,2017);
                    assert.equal(body.deployments[1].month,2);
                    assert.equal(body.deployments[1].date,15);
                    assert.equal(body.deployments[1].total,1);
                    done();
                });
            });
        });

        it('Get Deployment Frequencies - monthly', function(done) {
            login(function(accessToken) {
                var trend_components = {
                    environment_name: 'beta',
                    interval_start: "2017-02-01T05:00:00.000Z",
                    interval_end: "2017-03-31T05:00:00.000Z",
                    aggregation: {
                        frequency: 'MONTHLY'
                    }
                };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/buildartifacts/" + build_artifact + "/deployment_trends",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: trend_components
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /deployment_trends response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(typeof(body.deployments[0].date),'undefined'); // Only year and month
                    assert.equal(typeof(body.deployments[1].date),'undefined'); // Only year and month
                    assert.equal(body.deployments[0].year,2017);
                    assert.equal(body.deployments[0].month,1);
                    assert.equal(body.deployments[0].total,1);
                    assert.equal(body.deployments[1].year,2017);
                    assert.equal(body.deployments[1].month,2);
                    assert.equal(body.deployments[1].total,1);
                    done();
                });
            });
        });

        it('Get Deployment Frequencies - weekly', function(done) {
            login(function(accessToken) {
                var trend_components = {
                    environment_name: 'beta',
                    interval_start: "2017-02-01T05:00:00.000Z",
                    interval_end: "2017-03-31T05:00:00.000Z",
                    aggregation: {
                        frequency: 'WEEKLY'
                    }
                };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/buildartifacts/" + build_artifact + "/deployment_trends",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: trend_components
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /deployment_trends response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(typeof(body.deployments[0].date),'undefined'); // Only year and month
                    assert.equal(typeof(body.deployments[0].month),'undefined'); // Only year and month
                    assert.notEqual(typeof(body.deployments[0].week),'undefined'); // Only year and month
                    assert.equal(body.deployments[0].year,2017);
                    assert.equal(body.deployments[0].week,7);
                    assert.equal(body.deployments[0].total,1);
                    assert.equal(body.deployments[1].year,2017);
                    assert.equal(body.deployments[1].week,11);
                    assert.equal(body.deployments[1].total,1);
                    done();
                });
            });
        });
    });

    describe('DLMS - Test Trends', function() {
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

        it('upload test data', function(done) {
            this.timeout(100000);
            var uploaddata = [
                {
                    time: '2017-04-28T05:00:00.000Z',
                    branch: "master",
                    build_id: 'dlmsfvttest:401',
                    mocha: 'mochaResult0.json',
                    istanbul: 'istanbulResult0.json',
                    blanket: 'blanketjsResult0.json',
                    xunit: 'xunitResult0.json',
                    sonarqube: 'sonarqubeResult0.json',
                    env: 'STAGING',
                    deploy_status: 'fail'
                },
                {
                    time: '2017-04-29T05:00:00.000Z',
                    branch: "master",
                    build_id: 'dlmsfvttest:402',
                    mocha: 'mochaResult1.json',
                    istanbul: 'istanbulResult1.json',
                    blanket: 'blanketjsResult1.json',
                    xunit: 'xunitResult1.json',
                    sonarqube: 'sonarqubeResult1.json',
                    env: 'STAGING',
                    deploy_status: 'pass'
                },
                {
                    time: '2017-04-30T05:00:00.000Z',
                    branch: "release",
                    build_id: 'dlmsfvttest:403',
                    mocha: 'mochaResult2.json',
                    istanbul: 'istanbulResult2.json',
                    blanket: 'blanketjsResult2.json',
                    xunit: 'xunitResult2.json',
                    sonarqube: 'sonarqubeResult2.json',
                    env: 'PRODUCTION',
                    deploy_status: 'fail'
                },
                {
                    time: '2017-05-01T05:00:00.000Z',
                    branch: "release",
                    build_id: 'dlmsfvttest:404',
                    mocha: 'mochaResult3.json',
                    istanbul: 'istanbulResult3.json',
                    blanket: 'blanketjsResult3.json',
                    xunit: 'xunitResult3.json',
                    sonarqube: 'sonarqubeResult3.json',
                    env: 'PRODUCTION',
                    deploy_status: 'pass'
                },
                {
                    time: '2017-05-02T05:00:00.000Z',
                    branch: "release",
                    build_id: 'dlmsfvttest:405',
                    mocha: 'mochaResult4.json',
                    istanbul: 'istanbulResult4.json',
                    blanket: 'blanketjsResult4.json',
                    xunit: 'xunitResult8.xml',
                    sonarqube: 'sonarqubeResult4.json',
                    env: 'PRODUCTION',
                    deploy_status: 'pass'
                }
            ];
            async.auto({
                accessToken: function(cb) {
                    login(function(token){
                        cb(null, token);
                    });
                },
                build: ['accessToken', function(results, cb1) {
                    async.eachSeries(uploaddata, function(udata, cb) {
                        var options = {
                            method: 'POST',
                            url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                toolchain_id + '/buildartifacts/' + build_artifact + '/builds',
                            headers: {
                                Authorization: 'bearer ' + results.accessToken
                            },
                            json: true,
                            body: getBuildData(udata.branch, udata.build_id, udata.time)
                        };
                        //console.log(JSON.stringify(options, null, 4));
                        //console.log("uploading build " + udata.build_id + "...");
                        arestcall(options, function(err, resp, body) {
                            if (process.env.FVT_DEBUG === 'true') {
                                console.log("POST /results response:", err, body);
                            }
                            if(resp.statusCode !== 200) {
                                cb("Failed to upload mocha record");
                            } else {
                                cb(null);
                            }
                        });
                    }, function(err) {
                        if(err) {
                            cb1(err, null);
                        } else {
                            cb1(null, "done");
                        }
                    });
                }],
                mocha: ['accessToken', 'build', function(results, cb1) {
                    async.eachSeries(uploaddata, function(udata, cb) {
                        var options = {
                            method: 'POST',
                            url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                udata.build_id + "/results",
                            headers: {
                                Authorization: 'bearer ' + results.accessToken
                            },
                            json: true,
                            body: getTestResult(udata.time, toolchain_id, 'unittest', udata.mocha)
                        };
                        //console.log(JSON.stringify(options, null, 4));
                        //console.log("uploading " + udata.mocha + "...");
                        arestcall(options, function(err, resp, body) {
                            if (process.env.FVT_DEBUG === 'true') {
                                console.log("POST /results response:", err, body);
                            }
                            if(resp.statusCode !== 200) {
                                cb("Failed to upload mocha record");
                            } else {
                                cb(null);
                            }
                        });
                    }, function(err) {
                        if(err) {
                            cb1(err, null);
                        } else {
                            cb1(null, "done");
                        }
                    });
                }],
                istanbul: ['accessToken', 'build', 'mocha', function(results, cb1) {
                    async.eachSeries(uploaddata, function(udata, cb) {
                        var options = {
                            method: 'POST',
                            url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                udata.build_id + "/results",
                            headers: {
                                Authorization: 'bearer ' + results.accessToken
                            },
                            json: true,
                            body: getTestResult(udata.time, toolchain_id, 'code', udata.istanbul)
                        };
                        //console.log(JSON.stringify(options, null, 4));
                        //console.log("uploading " + udata.istanbul + "...");
                        arestcall(options, function(err, resp, body) {
                            if (process.env.FVT_DEBUG === 'true') {
                                console.log("POST /results response:", err, body);
                            }
                            if(resp.statusCode !== 200) {
                                cb("Failed to upload istanbul record");
                            } else {
                                cb(null);
                            }
                        });
                    }, function(err) {
                        if(err) {
                            cb1(err, null);
                        } else {
                            cb1(null, "done");
                        }
                    });
                }],
                blanket: ['accessToken', 'build', 'mocha', 'istanbul', function(results, cb1) {
                    async.eachSeries(uploaddata, function(udata, cb) {
                        var options = {
                            method: 'POST',
                            url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                udata.build_id + "/results",
                            headers: {
                                Authorization: 'bearer ' + results.accessToken
                            },
                            json: true,
                            body: getTestResult(udata.time, toolchain_id, 'code', udata.blanket)
                        };
                        //console.log(JSON.stringify(options, null, 4));
                        //console.log("uploading " + udata.blanket + "...");
                        arestcall(options, function(err, resp, body) {
                            if (process.env.FVT_DEBUG === 'true') {
                                console.log("POST /results response:", err, body);
                            }
                            if(resp.statusCode !== 200) {
                                cb("Failed to upload blanket record");
                            } else {
                                cb(null);
                            }
                        });
                    }, function(err) {
                        if(err) {
                            cb1(err, null);
                        } else {
                            cb1(null, "done");
                        }
                    });
                }],
                xunit: ['accessToken', 'build', 'mocha', 'istanbul', 'blanket', function(results, cb1) {
                    async.eachSeries(uploaddata, function(udata, cb) {
                        var options = {
                            method: 'POST',
                            url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                udata.build_id + "/results",
                            headers: {
                                Authorization: 'bearer ' + results.accessToken
                            },
                            json: true,
                            body: getTestResult(udata.time, toolchain_id, 'unittest', udata.xunit)
                        };
                        //console.log(JSON.stringify(options, null, 4));
                        //console.log("uploading " + udata.xunit + "...");
                        arestcall(options, function(err, resp, body) {
                            if (process.env.FVT_DEBUG === 'true') {
                                console.log("POST /results response:", err, body);
                            }
                            if(resp.statusCode !== 200) {
                                cb("Failed to upload xunit record");
                            } else {
                                cb(null);
                            }
                        });
                    }, function(err) {
                        if(err) {
                            cb1(err, null);
                        } else {
                            cb1(null, "done");
                        }
                    });
                }],
                sonarqube: ['accessToken', 'build', 'mocha', 'istanbul', 'blanket', 'xunit', function(results, cb1) {
                    async.eachSeries(uploaddata, function(udata, cb) {
                        var options = {
                            method: 'POST',
                            url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                udata.build_id + "/results",
                            headers: {
                                Authorization: 'bearer ' + results.accessToken
                            },
                            json: true,
                            body: getTestResult(udata.time, toolchain_id, 'sonarqube', udata.sonarqube)
                        };
                        //console.log(JSON.stringify(options, null, 4));
                        //console.log("uploading " + udata.sonarqube + "...");
                        arestcall(options, function(err, resp, body) {
                            if (process.env.FVT_DEBUG === 'true') {
                                console.log("POST /results response:", err, body);
                            }
                            if(resp.statusCode !== 200) {
                                cb("Failed to upload sonarqube record");
                            } else {
                                cb(null);
                            }
                        });
                    }, function(err) {
                        if(err) {
                            cb1(err, null);
                        } else {
                            cb1(null, "done");
                        }
                    });
                }],
                fvt: ['accessToken', 'build', 'mocha', 'istanbul', 'blanket', 'xunit', 'sonarqube', function(results, cb1) {
                    async.eachSeries(uploaddata, function(udata, cb) {
                        var options = {
                            method: 'POST',
                            url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                udata.build_id + "/results",
                            headers: {
                                Authorization: 'bearer ' + results.accessToken
                            },
                            json: true,
                            body: getTestResult(udata.time, toolchain_id, 'fvt', udata.xunit)
                        };
                        //console.log(JSON.stringify(options, null, 4));
                        //console.log("uploading " + udata.mocha + "...");
                        arestcall(options, function(err, resp, body) {
                            if (process.env.FVT_DEBUG === 'true') {
                                console.log("POST /results response:", err, body);
                            }
                            if(resp.statusCode !== 200) {
                                cb("Failed to upload mocha record");
                            } else {
                                cb(null);
                            }
                        });
                    }, function(err) {
                        if(err) {
                            cb1(err, null);
                        } else {
                            cb1(null, "done");
                        }
                    });
                }],
                deployRecords: ['accessToken', 'build', 'mocha', 'istanbul', 'blanket', 'xunit', 'fvt', function(results, cb1) {
                    async.eachSeries(uploaddata, function(udata, cb) {
                        var options = {
                            method: 'POST',
                            url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                udata.build_id + "/deployments",
                            headers: {
                                Authorization: 'bearer ' + results.accessToken
                            },
                            json: true,
                            body: getDeployData(udata.time, udata.env, udata.deploy_status)
                        };
                        //console.log(JSON.stringify(options.body, null, 4));
                        //console.log("uploading deployments to " + udata.env + "... status " + udata.deploy_status);
                        arestcall(options, function(err, resp, body) {
                            if (process.env.FVT_DEBUG === 'true') {
                                console.log("POST /results response:", err, body);
                            }
                            if(resp.statusCode !== 200) {
                                cb("Failed to upload deploy record");
                            } else {
                                cb(null);
                            }
                        });
                    }, function(err) {
                        if(err) {
                            cb1(err, null);
                        } else {
                            cb1(null, "done");
                        }
                    });

                }]
            }, function(err, results) {
                //console.log("-----", err, results);
                if (err) {
                    console.log("Failed to upload test data:");
                    assert.fail("Failed to upload test data");
                }
                done();
            });
        });

        it('verify mocha trends', function(done) {
            var postdata = {
                interval_start: "2017-04-01T16:09:34.164Z",
                interval_end: "2017-05-02T16:09:34.164Z",
                lifecycle_stage: "unittest"
            };
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + "/test_trends",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: postdata
              };
              //console.log(JSON.stringify(options, null, 4));
              arestcall(options, function(err, resp, body) {
                  if (process.env.FVT_DEBUG === 'true') {
                      console.log("POST /test_trends response:", err, JSON.stringify(body));
                  }
                  assert.equal(resp.statusCode, 200);
                  assert.equal(body.data.length,2);
                  for(var i=0; i<body.data.length; i++){
                      assert.notEqual(typeof(body.data[i].environment_name),"undefined");
                      assert.notEqual(typeof(body.data[i].unittest),"undefined");
                  }
                  done();
              });
          });
        });
        it('verify istanbul trends', function(done) {
            var postdata = {
                interval_start: "2017-04-01T16:09:34.164Z",
                interval_end: "2017-05-02T16:09:34.164Z",
                lifecycle_stage: "code"
            };
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + "/test_trends",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: postdata
              };
              //console.log(JSON.stringify(options, null, 4));
              arestcall(options, function(err, resp, body) {
                  if (process.env.FVT_DEBUG === 'true') {
                      console.log("POST /test_trends response:", err, JSON.stringify(body));
                  }
                  assert.equal(resp.statusCode, 200);
                  assert.equal(body.data.length,2);
                  for(var i=0; i<body.data.length; i++){
                      assert.notEqual(typeof(body.data[i].environment_name),"undefined");
                      assert.notEqual(typeof(body.data[i].code),"undefined");
                      for(var k=0; k<body.data[i].code.length; k++){
                          assert.notEqual(typeof(body.data[i].code[k].total_lines),"undefined");
                          assert.notEqual(typeof(body.data[i].code[k].covered_lines),"undefined");
                      }
                  }
                  done();
              });
          });
        });
        it('verify xunit trends - FVT', function(done) {
            var postdata = {
                interval_start: "2017-04-01T16:09:34.164Z",
                interval_end: "2017-05-02T16:09:34.164Z",
                lifecycle_stage: "fvt"
            };
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + '/buildartifacts/' + build_artifact + "/test_trends",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: postdata
              };
              //console.log(JSON.stringify(options, null, 4));
              arestcall(options, function(err, resp, body) {
                  if (process.env.FVT_DEBUG === 'true') {
                      console.log("POST /test_trends response:", err, JSON.stringify(body));
                  }
                  assert.equal(resp.statusCode, 200);
                  assert.equal(body.data.length,2);
                  for(var i=0; i<body.data.length; i++){
                      assert.notEqual(typeof(body.data[i].environment_name),"undefined");
                      assert.notEqual(typeof(body.data[i].fvt),"undefined");
                      for(var k=0; k<body.data[i].fvt.length; k++){
                          assert.notEqual(typeof(body.data[i].fvt[k].total),"undefined");
                          assert.notEqual(typeof(body.data[i].fvt[k].passed),"undefined");
                          assert.notEqual(typeof(body.data[i].fvt[k].failed),"undefined");
                          assert.notEqual(typeof(body.data[i].fvt[k].build_id),"undefined");
                          assert.notEqual(typeof(body.data[i].fvt[k].timestamp),"undefined");
                      }
                  }
                  done();
              });
          });
        });

        describe('DLMS - Test Trends (Case where artifacts are uploaded without artifact names)',function() {
          /*
          This test is to verify the scenario when user does not provide artifact names while uploading results.
          In such cases, the API will gather all artifacts and artifacts without names are considered unique and used in calculating trend metrics.
          In this test, scenario is tested only for one test type - unit test. Coverage and FVT test types expected to behave in same manner due to shared functions.
          */
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

          it('upload test data', function(done) {
              this.timeout(100000);
              /*
              Uploading 2 test results without an artifact name.
              While calculating trends, pick up the latest artifact of the two for trending.
              As opposed to considering the 2 artifacts unique & their individual metrics to be used.
              Since both artifacts don't have a name, the code assigns a placeholder value uses for trends.
              */
              var uploaddata = [
                  {
                      time: '2017-04-28T05:00:00.000Z',
                      branch: "master",
                      build_id: 'dlmsfvttest:401',
                      mocha: 'mochaResult0.json',
                      env: 'STAGING',
                      deploy_status: 'fail'
                  },
                  { //The most recent artifact in this test. This will be picked for trending.
                      time: '2017-04-29T05:00:00.000Z',
                      branch: "master",
                      build_id: 'dlmsfvttest:401',
                      mocha: 'mochaResult1.json',
                      env: 'STAGING',
                      deploy_status: 'pass'
                  }
              ];
              async.auto({
                  accessToken: function(cb) {
                      login(function(token){
                          cb(null, token);
                      });
                  },
                  build: ['accessToken', function(results, cb1) {
                      async.eachSeries(uploaddata, function(udata, cb) {
                          var options = {
                              method: 'POST',
                              url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact + '/builds',
                              headers: {
                                  Authorization: 'bearer ' + results.accessToken
                              },
                              json: true,
                              body: getBuildData(udata.branch, udata.build_id, udata.time)
                          };
                          //console.log(JSON.stringify(options, null, 4));
                          //console.log("uploading build " + udata.build_id + "...");
                          arestcall(options, function(err, resp, body) {
                              if (process.env.FVT_DEBUG === 'true') {
                                  console.log("POST /results response:", err, body);
                              }
                              if(resp.statusCode !== 200) {
                                  cb("Failed to upload mocha record");
                              } else {
                                  cb(null);
                              }
                          });
                      }, function(err) {
                          if(err) {
                              cb1(err, null);
                          } else {
                              cb1(null, "done");
                          }
                      });
                  }],
                  mocha: ['accessToken', 'build', function(results, cb1) {
                      async.eachSeries(uploaddata, function(udata, cb) {
                        var noartifactnamebody = getTestResult(udata.time, toolchain_id, 'unittest', udata.mocha);
                        delete noartifactnamebody.test_artifact; // Removing the artifact name.
                          var options = {
                              method: 'POST',
                              url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                  udata.build_id + "/results",
                              headers: {
                                  Authorization: 'bearer ' + results.accessToken
                              },
                              json: true,
                              body: noartifactnamebody
                          };
                          //console.log(JSON.stringify(options, null, 4));
                          //console.log("uploading " + udata.mocha + "...");
                          arestcall(options, function(err, resp, body) {
                              if (process.env.FVT_DEBUG === 'true') {
                                  console.log("POST /results response:", err, body);
                              }
                              if(resp.statusCode !== 200) {
                                  cb("Failed to upload mocha record");
                              } else {
                                  cb(null);
                              }
                          });
                      }, function(err) {
                          if(err) {
                              cb1(err, null);
                          } else {
                              cb1(null, "done");
                          }
                      });
                  }],
                  deployRecords: ['accessToken', 'build', 'mocha', function(results, cb1) {
                      async.eachSeries(uploaddata, function(udata, cb) {
                          var options = {
                              method: 'POST',
                              url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                  udata.build_id + "/deployments",
                              headers: {
                                  Authorization: 'bearer ' + results.accessToken
                              },
                              json: true,
                              body: getDeployData(udata.time, udata.env, udata.deploy_status)
                          };
                          //console.log(JSON.stringify(options.body, null, 4));
                          //console.log("uploading deployments to " + udata.env + "... status " + udata.deploy_status);
                          arestcall(options, function(err, resp, body) {
                              if (process.env.FVT_DEBUG === 'true') {
                                  console.log("POST /results response:", err, body);
                              }
                              if(resp.statusCode !== 200) {
                                  cb("Failed to upload deploy record");
                              } else {
                                  cb(null);
                              }
                          });
                      }, function(err) {
                          if(err) {
                              cb1(err, null);
                          } else {
                              cb1(null, "done");
                          }
                      });

                  }]
              }, function(err, results) {
                  //console.log("-----", err, results);
                  if (err) {
                      console.log("Failed to upload test data:");
                      assert.fail("Failed to upload test data");
                  }
                  done();
              });
          });

          it('verify mocha trends - verify if latest artifact is picked for trend metrics', function(done) {
              var postdata = {
                  interval_start: "2017-04-01T16:09:34.164Z",
                  interval_end: "2017-05-02T16:09:34.164Z",
                  lifecycle_stage: "unittest"
              };
              login(function(accessToken) {
                  var options = {
                      method: 'POST',
                      url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                          toolchain_id + '/buildartifacts/' + build_artifact + "/test_trends",
                      headers: {
                          Authorization: 'bearer ' + accessToken
                      },
                      json: true,
                      body: postdata
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /test_trends response:", err, JSON.stringify(body));
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.data.length,1);
                    for(var i=0; i<body.data.length; i++){
                        assert.notEqual(typeof(body.data[i].environment_name),"undefined");
                        assert.notEqual(typeof(body.data[i].unittest),"undefined");
                        assert.equal(body.data[i].unittest[0].total,100); // The most recent artifact had 100 total tests.
                        assert.equal(body.data[i].unittest[0].passed,60); // The most recent artifact had 60 passed tests.
                        assert.equal(body.data[i].unittest[0].failed,40); // The most recent artifact had 40 failed tests.
                    }
                    done();
                });
            });
          });

        });
    });

    describe('DLMS - Build Trends', function() {
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
            var build_data = {
                status: "pass",
                build_id: build_id,
                job_url: "http://www.defined.com/3234234",
                timestamp: now,
                repository: {
                    repository_url: "https://www.ucpa.com",
                    branch: "master",
                    commit_id: "123456"
                }
            };
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + '/buildartifacts/' + build_artifact + '/builds/',
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: build_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /builds response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(JSON.stringify(body), '{"status":"Accepted"}');
                    done();
                });
            });
        });

        it('Post a build record for last month', function(done) {
            var n = new Date(now);
            n.setDate(n.getDate() -1 );
            n.setMonth(n.getMonth() -1 );
            var build_data = {
                status: "pass",
                build_id: build_id,
                job_url: "http://www.defined.com/3234234",
                timestamp: n.toJSON(),
                repository: {
                    repository_url: "https://www.ucpa.com",
                    branch: "release",
                    commit_id: "123456"
                }
            };
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + '/buildartifacts/' + build_artifact + '/builds',
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: build_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /builds response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(JSON.stringify(body), '{"status":"Accepted"}');
                    done();
                });
            });
        });

        it('Get Builds', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + "/buildartifacts/" + build_artifact +"/builds",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builds for toolchain response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.length,2);
                    done();
                });
            });
        });

        it('Get Builds (pass branchname as optional query)', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + "/buildartifacts/" + build_artifact +"/builds?branch=master",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builds for toolchain response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.length,1);
                    assert.equal(body[0].branch,'master');
                    options.url = options.url.replace("master","release");
                    arestcall(options, function(err, resp, body) {
                        if (process.env.FVT_DEBUG === 'true') {
                            console.log("GET /builds for toolchain response:", err, body);
                        }
                        assert.equal(resp.statusCode, 200);
                        assert.equal(body.length,1);
                        assert.equal(body[0].branch,'release');
                        done();
                    });
                });
            });
        });

        it('Get Builds (pass an invalid date inteval)', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + "/buildartifacts/" + build_artifact +"/builds?interval_start=XXX&interval_end=YYY",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builds for toolchain response:", err, body);
                    }
                    assert.equal(resp.statusCode, 400);
                    done();
                });
            });
        });

        it('Get Builds (pass an interval start date greater than interval end date)', function(done) {
          var nowdate = new Date(now);
          var d1 = (new Date(nowdate.getFullYear(), nowdate.getMonth(), 1)).toJSON();
          var d2 = (new Date(nowdate.getFullYear(), nowdate.getMonth() + 1, 0)).toJSON();
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + "/buildartifacts/"
                    + build_artifact + "/builds?interval_start=" + d2 + "&interval_end=" + d1,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builds for toolchain response:", err, body);
                    }
                    assert.equal(resp.statusCode, 400);
                    assert.equal(body.user_error, 'Start date range cannot be greater than End date range.');
                    done();
                });
            });
        });

        it('Get Builds (pass interval to query builds in current month and previous month)', function(done) {
          var nowdate = new Date(now);
          var d1 = (new Date(nowdate.getFullYear(), nowdate.getMonth(), 1)).toJSON();
          var d2 = (new Date(nowdate.getFullYear(), nowdate.getMonth() + 1, 0)).toJSON();
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + "/buildartifacts/"
                    + build_artifact + "/builds?interval_start=" + d1 + "&interval_end=" + d2,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builds for toolchain response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.length,1);
                    assert.equal(body[0].branch,'master');
                    nowdate.setMonth(nowdate.getMonth() -1 );
                    var d3 = (new Date(nowdate.getFullYear(), nowdate.getMonth(), 1)).toJSON();
                    var d4 = (new Date(nowdate.getFullYear(), nowdate.getMonth() + 1, 0)).toJSON();
                    options.url = server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + "/buildartifacts/" + build_artifact + "/builds?interval_start=" + d3 + "&interval_end=" + d4;
                    arestcall(options, function(err, resp, body) {
                        if (process.env.FVT_DEBUG === 'true') {
                            console.log("GET /builds for toolchain response:", err, body);
                        }
                        assert.equal(resp.statusCode, 200);
                        assert.equal(body.length,1);
                        assert.equal(body[0].branch,'release');
                        done();
                    });
                });
            });
        });

        it('Get Builds (pass only one interval(start) and get all builds after that)', function(done) {
          var nowdate = new Date(now);
          nowdate.setMonth(nowdate.getMonth() -1 );
          var d1 = (new Date(nowdate.getFullYear(), nowdate.getMonth(), 1)).toJSON();
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + "/buildartifacts/"
                    + build_artifact + "/builds?interval_start=" + d1,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builds for toolchain response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.length,2);
                    done();
                });
            });
        });

        it('Get buildartifacts', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/buildartifacts",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /buildartifacts response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0], "ibmvmserver");
                    done();
                });
            });
        });

        it('Get Branches', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/branches",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /environments response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.length,2);
                    assert.notEqual(body.indexOf('master'),-1);
                    assert.notEqual(body.indexOf('release'),-1);
                    done();
                });
            });
        });

        it('Get Build Frequencies - daily', function(done) {
            login(function(accessToken) {
                var trend_components = {
                    branch: 'master',
                    interval_start: "2017-02-01T05:00:00.000Z",
                    interval_end: "2017-03-31T05:00:00.000Z",
                    aggregation: {
                        frequency: 'DAILY'
                    }
                };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/buildartifacts/" + build_artifact + "/build_trends",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: trend_components
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /build_trends response(master):", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.branch,trend_components.branch);
                    assert.equal(body.builds.length,1); // Only master branch
                    assert.equal(body.builds[0].date,15); // Only master branch
                    assert.equal(body.builds[0].month,2); // Only master branch
                    trend_components.branch = 'release';
                    arestcall(options, function(err, resp, body) {
                        if (process.env.FVT_DEBUG === 'true') {
                            console.log("GET /build_trends response(release):", err, resp.statusCode, body);
                        }
                        assert.equal(resp.statusCode, 200);
                        assert.equal(body.branch,trend_components.branch);
                        assert.equal(body.builds.length,1); // Only release branch
                        assert.equal(body.builds[0].date,14); // Only release branch
                        assert.equal(body.builds[0].month,1); // Only release branch
                        done();
                    });
                });
            });
        });

        it('Get Build Frequencies - monthly', function(done) {
            login(function(accessToken) {
              var trend_components = {
                  branch: 'master',
                  interval_start: "2017-02-01T05:00:00.000Z",
                  interval_end: "2017-03-31T05:00:00.000Z",
                  aggregation: {
                      frequency: 'MONTHLY'
                  }
              };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/buildartifacts/" + build_artifact + "/build_trends",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: trend_components
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /build_trends response(master):", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.branch,trend_components.branch);
                    assert.equal(body.builds.length,1); // Only master branch
                    assert.equal(body.builds[0].month,2); // Only master branch
                    trend_components.branch = 'release';
                    arestcall(options, function(err, resp, body) {
                        if (process.env.FVT_DEBUG === 'true') {
                            console.log("GET /build_trends response(release):", err, resp.statusCode, body);
                        }
                        assert.equal(resp.statusCode, 200);
                        assert.equal(body.branch,trend_components.branch);
                        assert.equal(body.builds.length,1); // Only release branch
                        assert.equal(body.builds[0].month,1); // Only release branch
                        done();
                    });
                });
            });
        });

        it('Get Build Frequencies - weekly', function(done) {
            login(function(accessToken) {
              var trend_components = {
                  branch: 'master',
                  interval_start: "2017-02-01T05:00:00.000Z",
                  interval_end: "2017-03-31T05:00:00.000Z",
                  aggregation: {
                      frequency: 'WEEKLY'
                  }
              };
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                        toolchain_id + "/buildartifacts/" + build_artifact + "/build_trends",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true,
                    body: trend_components
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /build_trends response(master):", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.branch,trend_components.branch);
                    assert.equal(body.builds.length,1); // Only master branch
                    assert.equal(body.builds[0].week,11); // Only master branch
                    trend_components.branch = 'release';
                    arestcall(options, function(err, resp, body) {
                        if (process.env.FVT_DEBUG === 'true') {
                            console.log("GET /build_trends response(release):", err, resp.statusCode, body);
                        }
                        assert.equal(resp.statusCode, 200);
                        assert.equal(body.branch,trend_components.branch);
                        assert.equal(body.builds.length,1); // Only release branch
                        assert.equal(body.builds[0].week,7); // Only release branch
                        done();
                    });
                });
            });
        });
    });

}());

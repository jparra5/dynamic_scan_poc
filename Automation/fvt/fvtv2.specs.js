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

    var post_results_fvt = fs.readFileSync(getFilename('post_results_fvt_v2.json'), 'utf8');
    var result_data = JSON.parse(post_results_fvt);
    var server = (process.env.DLMS_TEST || 'https://dlms-test.stage1.ng.bluemix.net');
    var toolchain_id = (process.env.TOOLCHAIN_ID || '4fa863ed');
    var build_artifact = (process.env.BUILD_ARTIFACT || 'ibmvmserver');
    var build_id = "dlmsfvttest:301";
    var org_name = (process.env.CF_ORG || 'ucparule@us.ibm.com');
    var accessToken = process.env.AUTH_TOKEN;

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

    describe('Test auth failures', function() {
        this.timeout(30000);

        it('Get with invalid bearer token', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + '/deployments',
                    headers: {
                        Authorization: 'bearer ' + accessToken + '1'
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /builds response:", err, body);
                    }
                    assert.equal(resp.statusCode, 403);
                    //assert.equal(body.indexOf('Error: Not Authenticated, token is not valid for region'), 0);
                    done();
                });
            });
        });

        it('Get with invalid org', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/org@us.i.com/toolchainids/' + toolchain_id + '/deployments',
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /builds response:", err, body);
                    }
                    assert.equal(resp.statusCode, 403);
                    //assert.equal(body.indexOf('Error: Not Authorized, token cannot access org'), 0);
                    done();
                });
            });
        });

        it('Get with invalid toolchainid', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + '1/deployments',
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /builds response:", err, body);
                    }
                    assert.equal(resp.statusCode, 403);
                    //assert.equal(body.indexOf('Error: Not Authorized, token cannot access toolchain'), 0);
                    done();
                });
            });
        });
    });

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

    describe('Test DLMS V2 APIs - test results has env name', function() {
        this.timeout(10000);

        it('Delete toolchain records - start clean', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'DELETE',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("DELETE /toolchains response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    done();
                });
            });
        });

        it('Post a build record', function(done) {
            login(function(accessToken) {
                var build_data = {
                    build_id: build_id,
                    repository: {
                        repository_url: 'https://github.ibm.com/oneibmcloud/dlms.git',
                        branch: 'dlmsfvttest',
                        commit_id: 'dff7884b9168168d91cb9e5aec78e93db0fa80d9'
                    },
                    status: 'pass'
                };
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

        it('Verify a posted build record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + '/buildartifacts/' + build_artifact + '/builds',
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builds response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0].toolchain_id, toolchain_id);
                    done();
                });
            });
        });

        it('Post a test record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true,
                    body: result_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.status, "Accepted", "invalid status returned");
                    done();
                });
            });
        });

        it('Get a test record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0].toolchain_id, toolchain_id);
                    done();
                });
            });
        });

        it('Post a deploy record - environment name missing', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                job_url: "http://www.defined.com/3234234",
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
                        console.log("POST /deployments response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 400);
                    assert.equal(body.user_error, "environment_name missing in body.");
                    done();
                });
            });
        });

        it('Post a deploy record', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "beta",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
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

        it('Verify a posted deploy record - with env_name in query', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                  build_id + "/deployments?environment_name=beta",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /deployments response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0].toolchain_id, toolchain_id);
                    assert.equal(body[0].environment_name, "beta");
                    assert.equal(body[0].deployable_id, "adeployable");
                    done();
                });
            });
        });

        it('Verify a posted deploy record - without env_name in query', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                  build_id + "/deployments",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /deployments response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0].toolchain_id, toolchain_id);
                    assert.equal(body[0].deployable_id, "adeployable", "received value of deployable_id was: " + body[0].deployable_id);
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

        it('Get Deployments - when build_artifact is passed as optional query parameter', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + "/deployments?build_artifact=" +  build_artifact,
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
                        console.log("GET /branches response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0], "dlmsfvttest");
                    done();
                });
            });
        });

        it('Get Branches - with build artifact name in query.', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + "/branches?build_artifact=" + build_artifact,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /branches response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0], "dlmsfvttest");
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

        it('Get buildartifacts with env_name', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + "/buildartifacts?environment_name=beta",
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

        it('Get a builddata record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/builddata",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builddata response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    //assert.equal(body[0].toolchain_id, toolchain_id);
                    done();
                });
            });
        });

        it('Get latestResults', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + "/latestResults",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /latestResults response:", err, resp.statusCode, JSON.stringify(body, null, 4));
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.test_results.length, 1);
                    assert.equal(body.latest_builds.length, 1);
                    assert.equal(body.latest_deployments.length, 1);
                    done();
                });
            });
        });
    });

    describe('Test DLMS V2 APIs - test results does not have env name', function() {
        this.timeout(10000);

        it('Delete toolchain records - start clean', function(done) {
            var expectedResponse = { status: 'Purged 7 record(s).', purge_count: 7 };
            login(function(accessToken) {
                var options = {
                    method: 'DELETE',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("DELETE /toolchains response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(_.isEqual(body, expectedResponse), true);
                    done();
                });
            });
        });

        it('Post a build record', function(done) {
            var expectedResponse = { status: 'Accepted' };
            login(function(accessToken) {
                var build_data = {
                    build_id: build_id,
                    repository: {
                        repository_url: 'https://github.ibm.com/oneibmcloud/dlms.git',
                        branch: 'dlmsfvttest',
                        commit_id: 'dff7884b9168168d91cb9e5aec78e93db0fa80d9'
                    },
                    status: 'pass'
                };
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
                    assert.equal(_.isEqual(body, expectedResponse), true);
                    done();
                });
            });
        });

        it('Post a test record', function(done) {
            var expectedResponse = { status: 'Accepted' };
            delete result_data.environment_name;
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true,
                    body: result_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(_.isEqual(body, expectedResponse), true);
                    done();
                });
            });
        });

        it('Post a test record without test artifact', function(done) {
            var expectedResponse = { status: 'Accepted' };
            delete result_data.environment_name;
            delete result_data.test_artifact;
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true,
                    body: result_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(_.isEqual(body, expectedResponse), true);
                    done();
                });
            });
        });

        it('Get a test record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /results response:", err, resp.statusCode);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.length, 2);
                    done();
                });
            });
        });

        it('Post a deploy record', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "beta",
                job_url: "http://www.defined.com/3234234",
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
                        console.log("GET /deployments response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0].toolchain_id, toolchain_id);
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
                        console.log("GET /branches response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0], "dlmsfvttest");
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

        it('Get a builddata record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/builddata",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builddata response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    //assert.equal(body[0].toolchain_id, toolchain_id);
                    done();
                });
            });
        });

        it('Get latestResults', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + "/latestResults",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /latestResults response:", err, resp.statusCode, JSON.stringify(body, null, 4));
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.test_results.length, 1);
                    assert.equal(body.latest_builds.length, 1);
                    assert.equal(body.latest_deployments.length, 1);
                    done();
                });
            });
        });
    });

    describe('Test DLMS V2 APIs - verify env_name change when it matches branch name', function() {
        this.timeout(10000);

        it('Delete toolchain records - start clean', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'DELETE',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("DELETE /toolchains response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    done();
                });
            });
        });

        it('Post a build record', function(done) {
            login(function(accessToken) {
                var build_data = {
                    build_id: build_id,
                    repository: {
                        repository_url: 'https://github.ibm.com/oneibmcloud/dlms.git',
                        branch: 'dlmsfvttest',
                        commit_id: 'dff7884b9168168d91cb9e5aec78e93db0fa80d9'
                    },
                    status: 'pass'
                };
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

        it('Post a test record', function(done) {
            result_data.environment_name = 'dlmsfvttest';
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true,
                    body: result_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.status, "Accepted", "invalid status returned");
                    done();
                });
            });
        });

        it('Get a test record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /results response:", err, body[0].environment_name);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0].toolchain_id, toolchain_id);
                    assert.equal(body[0].environment_name, "");
                    done();
                });
            });
        });
    });

    describe('Test DLMS V2 APIs - verify env_name does not change when it does not match branch name', function() {
        this.timeout(10000);

        it('Delete toolchain records - start clean', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'DELETE',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("DELETE /toolchains response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    done();
                });
            });
        });

        it('Post a build record', function(done) {
            login(function(accessToken) {
                var build_data = {
                    build_id: build_id,
                    repository: {
                        repository_url: 'https://github.ibm.com/oneibmcloud/dlms.git',
                        branch: 'dlmsfvttest',
                        commit_id: 'dff7884b9168168d91cb9e5aec78e93db0fa80d9'
                    },
                    status: 'pass'
                };
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

        it('Post a test record', function(done) {
          result_data.environment_name = 'beta';
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true,
                    body: result_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.status, "Accepted", "invalid status returned");
                    done();
                });
            });
        });

        it('Get a test record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /results response:", err, body[0].environment_name);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0].toolchain_id, toolchain_id);
                    assert.equal(body[0].environment_name, "beta");
                    done();
                });
            });
        });
    });

    describe('Test DLMS V2 APIs - verify env_name does not change when empty string', function() {
        this.timeout(10000);

        it('Delete toolchain records - start clean', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'DELETE',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("DELETE /toolchains response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    done();
                });
            });
        });

        it('Post a build record', function(done) {
            login(function(accessToken) {
                var build_data = {
                    build_id: build_id,
                    repository: {
                        repository_url: 'https://github.ibm.com/oneibmcloud/dlms.git',
                        branch: 'dlmsfvttest',
                        commit_id: 'dff7884b9168168d91cb9e5aec78e93db0fa80d9'
                    },
                    status: 'pass'
                };
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

        it('Post a test record', function(done) {
            delete result_data.environment_name;
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true,
                    body: result_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.status, "Accepted", "invalid status returned");
                    done();
                });
            });
        });

        it('Get a test record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /results response:", err, body[0].environment_name);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0].toolchain_id, toolchain_id);
                    assert.equal(body[0].environment_name, "");
                    done();
                });
            });
        });
    });

    describe('Test DLMS V2 APIs - deployment records have STAGING information in PRODUCTION types only', function() {
        this.timeout(10000);

        it('Delete toolchain records - start clean', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'DELETE',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("DELETE /toolchains response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    done();
                });
            });
        });

        it('Post a build record', function(done) {
            login(function(accessToken) {
                var build_data = {
                    build_id: build_id,
                    repository: {
                        repository_url: 'https://github.ibm.com/oneibmcloud/dlms.git',
                        branch: 'dlmsfvttest',
                        commit_id: 'dff7884b9168168d91cb9e5aec78e93db0fa80d9'
                    },
                    status: 'pass'
                };
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

        it('Verify a posted build record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id + '/buildartifacts/' + build_artifact + '/builds',
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builds response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0].toolchain_id, toolchain_id);
                    done();
                });
            });
        });

        it('Post a deploy record - deploying to DEV', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "DEV",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
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

        it('Post a deploy record - deploying to STAGING', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "STAGING",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
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

        it('Post a deploy record - deploying to PRODUCTION', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "PRODUCTION",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
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

        it('Verify all posted deployments.', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                  build_id + "/deployments",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /deployments response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.length,3);
                    done();
                });
            });
        });

        it('Verify posted deployments for env', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                  build_id + "/deployments?environment_name=STAGING",
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /deployments response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.length,1);
                    done();
                });
            });
        });

        it('Verify posted deployments for env and past interval', function(done) {
            var past_start = new Date((new Date()).getTime() - (1000 * 60 * 60 * 24)).toJSON();
            var past_end = new Date((new Date()).getTime() - (1000 * 60 * 60 * 23)).toJSON();
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                  build_id + "/deployments?environment_name=STAGING&interval_start=" + past_start + "&interval_end=" + past_end,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /deployments response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.length,0);
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
                        console.log("GET /branches response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body[0], "dlmsfvttest");
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
                    assert.equal(body.length,3);
                    done();
                });
            });
        });

        it('Get a builddata record', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/builddata",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /builddata response:", err, resp.statusCode, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    //assert.equal(body[0].toolchain_id, toolchain_id);
                    done();
                });
            });
        });

        it('Get latestResults', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + "/latestResults",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /latestResults response:", err, resp.statusCode, JSON.stringify(body, null, 4));
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.test_results.length, 0);
                    assert.equal(body.latest_builds.length, 1);
                    assert.equal(body.latest_deployments.length, 3);
                    for(var k=0; k<body.latest_deployments.length; k++){
                        if(body.latest_deployments[k].environment_name === "PRODUCTION")
                            assert.notEqual(body.latest_deployments[k].staging_info, null);
                        else
                            assert.equal(body.latest_deployments[k].staging_info, null);
                    }
                    done();
                });
            });
        });
    });

    describe('Test DLMS V2 APIs - timeline API returns build, test and deployment information.', function() {
        this.timeout(10000);

        it('Delete toolchain records - start clean', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'DELETE',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' + toolchain_id,
                    headers: {
                        Authorization: 'bearer ' + accessToken
                    },
                    json: true                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("DELETE /toolchains response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    done();
                });
            });
        });

        it('Post a build record', function(done) {
            login(function(accessToken) {
                var build_data = {
                    build_id: build_id,
                    repository: {
                        repository_url: 'https://github.ibm.com/oneibmcloud/dlms.git',
                        branch: 'dlmsfvttest',
                        commit_id: 'dff7884b9168168d91cb9e5aec78e93db0fa80d9'
                    },
                    status: 'pass'
                };
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

        it('Post a test record - UNIT TEST', function(done) {
            login(function(accessToken) {
                result_data.test_artifact = 'mocha.json';
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true,
                    body: result_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.status, "Accepted", "invalid status returned");
                    done();
                });
            });
        });

        it('Post a test record AGAIN - UNIT TEST', function(done) {
            result_data.test_artifact = 'mocha.json';
            login(function(accessToken) {
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true,
                    body: result_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.status, "Accepted", "invalid status returned");
                    done();
                });
            });
        });

        it('Post a test record - COVERAGE', function(done) {
            login(function(accessToken) {
                result_data.lifecycle_stage = 'code';
                result_data.test_artifact = 'istanbul.json';
                result_data.contents = 'ew0KICAgICJ0b3RhbCI6IHsNCiAgICAgICAgImxpbmVzIjogew0KICAgICAgICAgICAgInRvdGFsIjogMzM4MiwNCiAgICAgICAgICAgICJjb3ZlcmVkIjogMjM5NSwNCiAgICAgICAgICAgICJza2lwcGVkIjogMCwNCiAgICAgICAgICAgICJwY3QiOiA3MC44Mg0KICAgICAgICB9LA0KICAgICAgICAic3RhdGVtZW50cyI6IHsNCiAgICAgICAgICAgICJ0b3RhbCI6IDMzOTQsDQogICAgICAgICAgICAiY292ZXJlZCI6IDI0MDUsDQogICAgICAgICAgICAic2tpcHBlZCI6IDAsDQogICAgICAgICAgICAicGN0IjogNzAuODYNCiAgICAgICAgfSwNCiAgICAgICAgImZ1bmN0aW9ucyI6IHsNCiAgICAgICAgICAgICJ0b3RhbCI6IDMzOSwNCiAgICAgICAgICAgICJjb3ZlcmVkIjogMjg4LA0KICAgICAgICAgICAgInNraXBwZWQiOiAwLA0KICAgICAgICAgICAgInBjdCI6IDg0Ljk2DQogICAgICAgIH0sDQogICAgICAgICJicmFuY2hlcyI6IHsNCiAgICAgICAgICAgICJ0b3RhbCI6IDEzNTksDQogICAgICAgICAgICAiY292ZXJlZCI6IDc5OSwNCiAgICAgICAgICAgICJza2lwcGVkIjogMCwNCiAgICAgICAgICAgICJwY3QiOiA1OC43OQ0KICAgICAgICB9DQogICAgfSwNCiAgICAiY29udHJvbGxlcnMvRGVmYXVsdC5qcyI6IHsNCiAgICAgICAgImxpbmVzIjogew0KICAgICAgICAgICAgInRvdGFsIjogMjE2LA0KICAgICAgICAgICAgImNvdmVyZWQiOiAxODQsDQogICAgICAgICAgICAic2tpcHBlZCI6IDAsDQogICAgICAgICAgICAicGN0IjogODUuMTkNCiAgICAgICAgfSwNCiAgICAgICAgInN0YXRlbWVudHMiOiB7DQogICAgICAgICAgICAidG90YWwiOiAyMTYsDQogICAgICAgICAgICAiY292ZXJlZCI6IDE4NCwNCiAgICAgICAgICAgICJza2lwcGVkIjogMCwNCiAgICAgICAgICAgICJwY3QiOiA4NS4xOQ0KICAgICAgICB9LA0KICAgICAgICAiZnVuY3Rpb25zIjogew0KICAgICAgICAgICAgInRvdGFsIjogMjAsDQogICAgICAgICAgICAiY292ZXJlZCI6IDE3LA0KICAgICAgICAgICAgInNraXBwZWQiOiAwLA0KICAgICAgICAgICAgInBjdCI6IDg1DQogICAgICAgIH0sDQogICAgICAgICJicmFuY2hlcyI6IHsNCiAgICAgICAgICAgICJ0b3RhbCI6IDE0NSwNCiAgICAgICAgICAgICJjb3ZlcmVkIjogMTIzLA0KICAgICAgICAgICAgInNraXBwZWQiOiAwLA0KICAgICAgICAgICAgInBjdCI6IDg0LjgzDQogICAgICAgIH0NCiAgICB9DQp9';
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true,
                    body: result_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.status, "Accepted", "invalid status returned");
                    done();
                });
            });
        });

        it('Post a test record AGAIN - COVERAGE', function(done) {
            login(function(accessToken) {
                result_data.lifecycle_stage = 'code';
                result_data.test_artifact = 'istanbul.json';
                result_data.contents = 'ew0KICAgICJ0b3RhbCI6IHsNCiAgICAgICAgImxpbmVzIjogew0KICAgICAgICAgICAgInRvdGFsIjogMzM4MiwNCiAgICAgICAgICAgICJjb3ZlcmVkIjogMjM5NSwNCiAgICAgICAgICAgICJza2lwcGVkIjogMCwNCiAgICAgICAgICAgICJwY3QiOiA3MC44Mg0KICAgICAgICB9LA0KICAgICAgICAic3RhdGVtZW50cyI6IHsNCiAgICAgICAgICAgICJ0b3RhbCI6IDMzOTQsDQogICAgICAgICAgICAiY292ZXJlZCI6IDI0MDUsDQogICAgICAgICAgICAic2tpcHBlZCI6IDAsDQogICAgICAgICAgICAicGN0IjogNzAuODYNCiAgICAgICAgfSwNCiAgICAgICAgImZ1bmN0aW9ucyI6IHsNCiAgICAgICAgICAgICJ0b3RhbCI6IDMzOSwNCiAgICAgICAgICAgICJjb3ZlcmVkIjogMjg4LA0KICAgICAgICAgICAgInNraXBwZWQiOiAwLA0KICAgICAgICAgICAgInBjdCI6IDg0Ljk2DQogICAgICAgIH0sDQogICAgICAgICJicmFuY2hlcyI6IHsNCiAgICAgICAgICAgICJ0b3RhbCI6IDEzNTksDQogICAgICAgICAgICAiY292ZXJlZCI6IDc5OSwNCiAgICAgICAgICAgICJza2lwcGVkIjogMCwNCiAgICAgICAgICAgICJwY3QiOiA1OC43OQ0KICAgICAgICB9DQogICAgfSwNCiAgICAiY29udHJvbGxlcnMvRGVmYXVsdC5qcyI6IHsNCiAgICAgICAgImxpbmVzIjogew0KICAgICAgICAgICAgInRvdGFsIjogMjE2LA0KICAgICAgICAgICAgImNvdmVyZWQiOiAxODQsDQogICAgICAgICAgICAic2tpcHBlZCI6IDAsDQogICAgICAgICAgICAicGN0IjogODUuMTkNCiAgICAgICAgfSwNCiAgICAgICAgInN0YXRlbWVudHMiOiB7DQogICAgICAgICAgICAidG90YWwiOiAyMTYsDQogICAgICAgICAgICAiY292ZXJlZCI6IDE4NCwNCiAgICAgICAgICAgICJza2lwcGVkIjogMCwNCiAgICAgICAgICAgICJwY3QiOiA4NS4xOQ0KICAgICAgICB9LA0KICAgICAgICAiZnVuY3Rpb25zIjogew0KICAgICAgICAgICAgInRvdGFsIjogMjAsDQogICAgICAgICAgICAiY292ZXJlZCI6IDE3LA0KICAgICAgICAgICAgInNraXBwZWQiOiAwLA0KICAgICAgICAgICAgInBjdCI6IDg1DQogICAgICAgIH0sDQogICAgICAgICJicmFuY2hlcyI6IHsNCiAgICAgICAgICAgICJ0b3RhbCI6IDE0NSwNCiAgICAgICAgICAgICJjb3ZlcmVkIjogMTIzLA0KICAgICAgICAgICAgInNraXBwZWQiOiAwLA0KICAgICAgICAgICAgInBjdCI6IDg0LjgzDQogICAgICAgIH0NCiAgICB9DQp9';
                var options = {
                    method: 'POST',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact +
                                  '/builds/' + build_id + "/results",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true,
                    body: result_data
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("POST /results response:", err, body);
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.status, "Accepted", "invalid status returned");
                    done();
                });
            });
        });

        it('Post a deploy record - STAGING', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "STAGING",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
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

        it('Post a deploy record AGAIN - STAGING', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "STAGING",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
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

        it('Post a deploy record AGAIN - STAGING', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "STAGING",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
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

        it('Post a deploy record AGAIN - STAGING', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "STAGING",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
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

        it('Post a deploy record - PRODUCTION', function(done) {
            var deploy_data = {
                app_url: "http://www.ucp.com",
                status: "pass",
                environment_name: "PRODUCTION",
                deployable_id: "adeployable",
                job_url: "http://www.defined.com/3234234",
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

        it('Get all results for the Build ID', function(done) {
            login(function(accessToken) {
                var options = {
                    method: 'GET',
                    url: server + '/v2/organizations/' + org_name + '/toolchainids/' +
                                  toolchain_id + '/buildartifacts/' + build_artifact + '/builds/' +
                                  build_id + "/buildresults",
                    headers: {
                        Authorization: 'bearer ' + accessToken                    },
                    json: true
                };
                arestcall(options, function(err, resp, body) {
                    if (process.env.FVT_DEBUG === 'true') {
                        console.log("GET /buildresults response:", err, resp.statusCode, JSON.stringify(body, null, 4));
                    }
                    assert.equal(resp.statusCode, 200);
                    assert.equal(body.build_information.length, 1);
                    assert.equal(body.test_information.length, 4);
                    assert.equal(body.deployment_information.length, 5);
                    done();
                });
            });
        });
    });

}());

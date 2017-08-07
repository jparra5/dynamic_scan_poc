#  IBM and/or HCL Confidential
#  OCO Source Materials
#  IBM Security AppScan
#  (C) Copyright IBM Corp. 1991, 2016. All Rights Reserved.
#  (C) Copyright HCL Technologies Ltd. 2017.  All Rights Reserved.
#
#  The source code for this program is not published or otherwise
#  divested of its trade secrets, irrespective of what has been
#  deposited with the U.S. Copyright Office.
#
#
#
#
#
#  AppScan Proxy Server Demo Script
#  --------------------------------
#  This script is a sample workflow of using the AppScan Proxy Server.
#  For running this script Python must be installed,
#  and the Python library "Requests: HTTP for Humans" must also
#  be installed (it can be found at: http://docs.python-requests.org).
#
# This demo script starts the proxy, sends a request through the proxy,
# stops the proxy, and downloads the recorded traffic file.
#

from __future__ import absolute_import
import re
import os
import signal
import subprocess
import json
import requests
import zipfile
from time import sleep
from subprocess import call, Popen, PIPE
from io import open


class ConfigData(object):
    def __init__(self):
        ########   Please fill out the following details:   ########
        self.proxy_server_port = os.environ[u'PROXY_SERVER_PORT']
        self.proxy_server_domain = os.environ[u'PROXY_SERVER_DOMAIN']
        self.proxy_port = os.environ[u'PROXY_TARGET_PORT']
        ############################################################

        ########   Please fill out the following details for ASoC upload example:   ########
        self.web_application_username = u""
        self.web_application_password = u""
        self.asoc_base_url = u"https://appscan.ibmcloud.com:443"
        self.asoc_key_id = os.environ[u'APPSCAN_KEY_ID']
        self.asoc_key_secret = os.environ[u'APPSCAN_KEY_SECRET']
        self.asoc_application_id = os.environ[u'APPSCAN_APP_ID']
        #If pss isn't required then leave the presence id blank ("")
        self.asoc_presence_id = os.environ[u'APPSCAN_PRESENCE_ID']
        self.asoc_presence_dir = "../AppscanPresence"

        self.asoc_scan_starting_point_url = os.environ[u'APP_URL']
        self.asoc_scan_name = os.environ[u'APPSCAN_SCAN_NAME']
        ############################################################


class ProxyServer(object):
    def __init__(self, config):
        self.config = config
        self.process = None;
        self.base_url = u"http://" + self.config.proxy_server_domain + u":" + config.proxy_server_port + u"/automation/"

    def is_proxy_server_running(self):
        try:
            response = requests.get(self.base_url, verify=False)
        except:
            return False
        return response != None and response.status_code == 200

    def download_root_ca(self):
        print u"** Downloading self signed root certificate (needed if we are working with https and want to avoid SSL errors)"
        url = self.base_url + u"Certificate/"
        response = requests.get(url, verify=False)
        pem_root_ca_str = response.content.decode(u"utf-8")
        pem_root_ca_file_name = u"rootCaPuKey.pem"
        pem_file = open(pem_root_ca_file_name, u"w")
        pem_file.write(pem_root_ca_str)
        pem_file.close()
        print u"*** Self signed root certificate has been saved as file '" + pem_root_ca_file_name + u"'"

    def start_proxy(self):
        print u"** Starting proxy on port '%s'" % (self.config.proxy_port)
        url = self.base_url + u"StartProxy/" + self.config.proxy_port
        response = requests.get(url, verify=False)
        print u"*** Proxy Server Response:" + unicode(response.json())

    def stop_proxy(self):
        print u"** Stopping proxy"
        url = self.base_url + u"StopProxy/" + self.config.proxy_port
        response = requests.get(url, verify=False)
        print u"*** Proxy Server Response:" + unicode(response.json())

    def download_traffic(self):
        print u"** Downloading the traffic file"
        url = self.base_url + u"Traffic/" + self.config.proxy_port
        response = requests.get(url, verify=False)
        self.config.traffic_file_name = u"scan.dast.config"
        traffic_file = open(self.config.traffic_file_name, u"wb")
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:
                traffic_file.write(chunk)
        traffic_file.close()
        print u"*** The traffic has been saved as file '" + self.config.traffic_file_name + u"'"


class PublishSettingsData(object):
    def __init__(self, config):
        self.KeyId = config.asoc_key_id
        self.KeySecret = config.asoc_key_secret
        self.ScanName = config.asoc_scan_name
        self.Stp = config.asoc_scan_starting_point_url
        self.AppId = config.asoc_application_id
        self.AppUserName = config.web_application_username
        self.AppPassword = config.web_application_password

class AsocLoginWithKeyApiData(object):
    def __init__(self, config):
        self.KeyId = config.asoc_key_id
        self.KeySecret = config.asoc_key_secret

class CreateScanWithFileData(object):
    def __init__(self, config):
        self.ScanFileId = config.traffic_file_id
        self.TestOnly = True
        self.StartingUrl = config.asoc_scan_starting_point_url
        self.PresenceId = config.asoc_presence_id
        self.ScanName = config.asoc_scan_name
        self.EnableMailNotification = False
        self.AppId = config.asoc_application_id
        self.LoginUser = config.web_application_username
        self.LoginPassword = config.web_application_password


class AsocRestApi(object):
    def __init__(self, config):
        self.config = config

    def getHeaders(self, withJsonContentType, withToken):
        if withJsonContentType and withToken:
            return {
                u'Content-type': u'application/json',
                u'Authorization': u'Bearer ' + self.asoc_token
            }
        elif withJsonContentType:
            return { u'Content-type': u'application/json' }
        else:
            return { u'Authorization': u'Bearer ' + self.asoc_token }

    def loginWithKeyId(self):
        print u"** Login into ASoC with API Key"
        url = self.config.asoc_base_url + u'/api/V2/Account/ApiKeyLogin'
        requestData = AsocLoginWithKeyApiData(self.config)
        requestBody = json.dumps(requestData.__dict__)
        response = requests.post(url=url, data=requestBody, headers=self.getHeaders(True, False), verify=False)
        response_str = unicode(response.json())
        print u"ASoC Server Response:" + response_str
        if (response.status_code == 200 and response_str.__len__() > 0):
            self.asoc_token = response.json()[u'Token']
            print u"*** Login has finished successfully"
        else:
            print u"XX Failed to login into ASoC"
            exit(1)

    def uploadTrafficFile(self):
        print u"** Uploading traffic dast.config file to ASoC"
        url = self.config.asoc_base_url + u'/api/V2/FileUpload'
        files = {u'Authorization' : (None, self.asoc_token, u'text/plain'), u'fileToUpload': (self.config.traffic_file_name, open(self.config.traffic_file_name, u'rb').read())}
        response = requests.post(url=url, headers=self.getHeaders(False, True), files=files, verify=False)
        response_str = unicode(response.json())
        print u"ASoC Server Response:" + response_str
        if (response.status_code == 201 and response_str.__len__() > 0):
            self.config.traffic_file_id = response.json()[u'FileId']
            print u"*** Traffic file has been uploaded successfully"
        else:
            print u"XX Failed to upload file to ASoC"
            exit(1)

    def createNewScanWithTraffic(self):
        print u"** Publishing scan with the recorded traffic to ASoC"
        url = self.config.asoc_base_url + u'/api/v2/Scans/DynamicAnalyzerWithFile'
        requestData = CreateScanWithFileData(self.config)
        requestBody = json.dumps(requestData.__dict__)
        response = requests.post(url=url, data=requestBody, headers=self.getHeaders(True, True), verify=False)
        response_str = unicode(response.json())
        print self.getHeaders(True, True)
        print "Body:" + requestBody
        print u"ASoC Server Response:" + response_str
        print response.json()[u'Id']
        if (response.status_code == 201 and response_str.__len__() > 0):
            print u"*** Scan with the recorded traffic has been published into ASoC successfully"
        else:
            print u"XX Failed to create scan in ASoC"
            exit(1)
        return response.json()[u'Id']

    def getStatus(self, scan_id):
        # print("** Publishing scan with the recorded traffic to ASoC")
        url = self.config.asoc_base_url + u'/api/v2/Scans/DynamicAnalyzer/' + scan_id
        # print("url" + url)
        # requestData = CreateScanWithFileData(self.config)
        # requestBody = json.dumps(requestData.__dict__)
        response = requests.get(url=url, headers=self.getHeaders(True, True), verify=False)
        # response_str = str(response.json())
        # print("ASoC Server Response:" + response_str)
        print "Status: {}, Progress: {}, Id: {}".format(
            response.json()[u"LatestExecution"][u"Status"],
            response.json()[u"LatestExecution"][u"Progress"],
            scan_id)
        return response.json()[u"LatestExecution"][u"Status"]

    def getXmlReport(self, scan_id):
        print "** Downloading xml report."
        url = self.config.asoc_base_url + u'/api/v2/Scans/' + scan_id + u'/Report/xml'
        # print("url" + url)
        # requestData = CreateScanWithFileData(self.config)
        # requestBody = json.dumps(requestData.__dict__)
        response = requests.get(url=url, headers=self.getHeaders(True, True), verify=False)
        # response_str = str(response.json())
        # print("ASoC Server Response:" + response_str)

        # content = response.text.encode('ascii', 'ignore');
        content = response.text
        xml_report = self.config.asoc_scan_name.replace(" ", "-") + u'.xml'
        print u"Saving the XML report to " + xml_report

        #
        # Store the appscan report

        f = open( xml_report,'w' )
        f.write( content )
        f.close()

    def downloadAppscanPresence(self):
        print "** Downloading Appscan Presence."
        url = self.config.asoc_base_url + u'/api/v2/Presences/' + self.config.asoc_presence_id + u'/Download/Linux_x86_64?access_token=' + self.asoc_token


        # body={
        #     "access_token": self.asoc_token
        # }
        # print body
        # print self.getHeaders(True, True)
        response = requests.post(url=url, headers=self.getHeaders(True, True), verify=False)
        #
        #
        # print response.status_code
        # print response.headers
        # print response.encoding
        #
        # presence_file = u"presence.zip"
        presence_file = open("presence.zip", u"wb")
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:
                presence_file.write(chunk)
        presence_file.close()


        zip_ref = zipfile.ZipFile("presence.zip", 'r')
        zip_ref.extractall(self.config.asoc_presence_dir)
        zip_ref.close()





def main():
    config = ConfigData()
    proxy_server = ProxyServer(config)
    asoc_rest_api = AsocRestApi(config)

    print "log in and download Appscan Presence"
    asoc_rest_api.loginWithKeyId()
    asoc_rest_api.downloadAppscanPresence()

    #
    presence_proc = Popen([u"chmod +x startPresence.sh"],
                      shell=True, cwd=config.asoc_presence_dir)

    print "Starting the Proxy Server and Appscan Presence"
    # # proxy_proc = Popen([u"node app.js > /dev/null 2>&1"],
    proxy_proc = Popen([u"node app.js"],
                      shell=True, cwd=u"{}/Automation/".format(
                            config.asoc_presence_dir))
    # # presence_proc = Popen([u"./startPresence.sh > /dev/null 2>&1"],
    presence_proc = Popen([u"./startPresence.sh"],
                      shell=True, cwd=config.asoc_presence_dir)

    # Wait for processes to start up.
    sleep(15)
    # exit()

    is_running = proxy_server.is_proxy_server_running()
    if is_running:
    # if True:
        # proxy_server.download_root_ca()
        proxy_server.start_proxy()
        run_traffic_script(config.proxy_port)
        proxy_server.stop_proxy()
        proxy_server.download_traffic()
        exit()
        # os.killpg(os.getpgid(proxy_proc.pid), signal.SIGTERM)
        # #Now that we have the traffic file, and we can use it with ASoC REST API or with ASE REST API
        # asoc_rest_api.loginWithKeyId()
        # asoc_rest_api.downloadAppscanPresence()
        # config.traffic_file_name="scan.dast.config"
        try:
            asoc_rest_api.uploadTrafficFile()
            scan_id = asoc_rest_api.createNewScanWithTraffic()
        except Exception as e:
            print "error:" + str(e)
            os.killpg(os.getpgid(presence_proc.pid), signal.SIGTERM)
        # scan_id="b80a1411-5579-e711-9aae-002590ac753d"
        # asoc_rest_api.getXmlReport(scan_id)
        sleep(5)
    else:
        print u"XX Proxy Server wasn't found on port '" + config.proxy_server_port + u"'"

    try:
        while True:
            status = asoc_rest_api.getStatus(scan_id)

            if status in [u"Ready", u"Failed"]:
                # os.killpg(os.getpgid(proxy_proc.pid), signal.SIGTERM)
                # os.killpg(os.getpgid(presence_proc.pid), signal.SIGTERM)
                print "Scan is complete"
                asoc_rest_api.getXmlReport(scan_id)
                break
            else:
                sleep(180)
    except Exception as e:
        print "There was an error"
        print str(e)
        # os.killpg(os.getpgid(proxy_proc.pid), signal.SIGTERM)
        os.killpg(os.getpgid(presence_proc.pid), signal.SIGTERM)

def run_traffic_script(proxy_port):
    #This function should start the script\program of sending the traffic through the proxy port (it can be a selenium script or in any other way)
    #input("Start manual browsing and press any key to stop the traffic recording...\n")
    print u"** Starting up the script."
    # http_proxy = "http://localhost:" + proxy_port
    # https_proxy = "https://localhost:" + proxy_port
    # ftp_proxy = "ftp://localhost:" + proxy_port
    # proxyDict = {
    #     "https": https_proxy,
    #     "http": http_proxy,
    #     "ftp": ftp_proxy
    # }
    # response = requests.get("http://demo.testfire.net/", proxies=proxyDict)



    proc = Popen([os.environ['APPSCAN_PRESENCE_TRAFFIC_SCRIPT']],
                    #   shell=True)
                      shell=True, stdout=PIPE, stderr=PIPE)
    out, err = proc.communicate();

    # print(out)
    # print(err)
    # if not "Authenticated successfully." in out:
        # raise Exception("Unable to login to Static Analysis service")
    print u"*** Finished running traffic through the proxy"


main()

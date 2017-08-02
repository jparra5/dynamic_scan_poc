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

import re
import os
import signal
import subprocess
import json
import requests
from time import sleep
from subprocess import call, Popen, PIPE


class ConfigData:
    def __init__(self):
        ########   Please fill out the following details:   ########
        self.proxy_server_port = os.environ['PROXY_SERVER_PORT']
        self.proxy_server_domain = os.environ['PROXY_SERVER_DOMAIN']
        self.proxy_port = os.environ['PROXY_TARGET_PORT']
        ############################################################

        ########   Please fill out the following details for ASoC upload example:   ########
        self.web_application_username = ""
        self.web_application_password = ""
        self.asoc_base_url = "https://appscan.ibmcloud.com:443"
        self.asoc_key_id = os.environ['APPSCAN_KEY_ID']
        self.asoc_key_secret = os.environ['APPSCAN_KEY_SECRET']
        self.asoc_application_id = os.environ['APPSCAN_APP_ID']
        #If pss isn't required then leave the presence id blank ("")
        self.asoc_presence_id = os.environ['APPSCAN_PRESENCE_ID']
        self.asoc_scan_starting_point_url = os.environ['APP_URL']
        self.asoc_scan_name = os.environ['APPSCAN_SCAN_NAME']
        ############################################################


class ProxyServer:
    def __init__(self, config: ConfigData):
        self.config = config
        self.process = None;
        self.base_url = "http://" + self.config.proxy_server_domain + ":" + config.proxy_server_port + "/automation/"

    def is_proxy_server_running(self):
        try:
            response = requests.get(self.base_url, verify=False)
        except:
            return False
        return response != None and response.status_code == 200

    def download_root_ca(self):
        print("** Downloading self signed root certificate (needed if we are working with https and want to avoid SSL errors)")
        url = self.base_url + "Certificate/"
        response = requests.get(url, verify=False)
        pem_root_ca_str = response.content.decode("utf-8")
        pem_root_ca_file_name = "rootCaPuKey.pem"
        pem_file = open(pem_root_ca_file_name, "w")
        pem_file.write(pem_root_ca_str)
        pem_file.close()
        print("*** Self signed root certificate has been saved as file '" + pem_root_ca_file_name + "'")

    def start_proxy(self):
        print("** Starting proxy on port '%s'" % (self.config.proxy_port))
        url = self.base_url + "StartProxy/" + self.config.proxy_port
        response = requests.get(url, verify=False)
        print("*** Proxy Server Response:" + str(response.json()))

    def stop_proxy(self):
        print("** Stopping proxy")
        url = self.base_url + "StopProxy/" + self.config.proxy_port
        response = requests.get(url, verify=False)
        print("*** Proxy Server Response:" + str(response.json()))

    def download_traffic(self):
        print("** Downloading the traffic file")
        url = self.base_url + "Traffic/" + self.config.proxy_port
        response = requests.get(url, verify=False)
        self.config.traffic_file_name = "scan.dast.config"
        traffic_file = open(self.config.traffic_file_name, "wb")
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:
                traffic_file.write(chunk)
        traffic_file.close()
        print("*** The traffic has been saved as file '" + self.config.traffic_file_name + "'")


class PublishSettingsData:
    def __init__(self, config: ConfigData):
        self.KeyId = config.asoc_key_id
        self.KeySecret = config.asoc_key_secret
        self.ScanName = config.asoc_scan_name
        self.Stp = config.asoc_scan_starting_point_url
        self.AppId = config.asoc_application_id
        self.AppUserName = config.web_application_username
        self.AppPassword = config.web_application_password

class AsocLoginWithKeyApiData:
    def __init__(self, config: ConfigData):
        self.KeyId = config.asoc_key_id
        self.KeySecret = config.asoc_key_secret

class CreateScanWithFileData:
    def __init__(self, config: ConfigData):
        self.ScanFileId = config.traffic_file_id
        self.TestOnly = True
        self.StartingUrl = config.asoc_scan_starting_point_url
        self.PresenceId = config.asoc_presence_id
        self.ScanName = config.asoc_scan_name
        self.EnableMailNotification = False
        self.AppId = config.asoc_application_id
        self.LoginUser = config.web_application_username
        self.LoginPassword = config.web_application_password


class AsocRestApi:
    def __init__(self, config: ConfigData):
        self.config = config

    def getHeaders(self, withJsonContentType, withToken):
        if withJsonContentType and withToken:
            return {
                'Content-type': 'application/json',
                'Authorization': 'Bearer ' + self.asoc_token
            }
        elif withJsonContentType:
            return { 'Content-type': 'application/json' }
        else:
            return { 'Authorization': 'Bearer ' + self.asoc_token }

    def loginWithKeyId(self):
        print("** Login into ASoC with API Key")
        url = self.config.asoc_base_url + '/api/V2/Account/ApiKeyLogin'
        requestData = AsocLoginWithKeyApiData(self.config)
        requestBody = json.dumps(requestData.__dict__)
        response = requests.post(url=url, data=requestBody, headers=self.getHeaders(True, False), verify=False)
        response_str = str(response.json())
        print("ASoC Server Response:" + response_str)
        if (response.status_code == 200 and response_str.__len__() > 0):
            self.asoc_token = response.json()['Token']
            print("*** Login has finished successfully")
        else:
            print("XX Failed to login into ASoC")
            exit(1)

    def uploadTrafficFile(self):
        print("** Uploading traffic dast.config file to ASoC")
        url = self.config.asoc_base_url + '/api/V2/FileUpload'
        files = {'Authorization' : (None, self.asoc_token, 'text/plain'), 'fileToUpload': (self.config.traffic_file_name, open(self.config.traffic_file_name, 'rb').read())}
        response = requests.post(url=url, headers=self.getHeaders(False, True), files=files, verify=False)
        response_str = str(response.json())
        print("ASoC Server Response:" + response_str)
        if (response.status_code == 201 and response_str.__len__() > 0):
            self.config.traffic_file_id = response.json()['FileId']
            print("*** Traffic file has been uploaded successfully")
        else:
            print("XX Failed to upload file to ASoC")
            exit(1)

    def createNewScanWithTraffic(self):
        print("** Publishing scan with the recorded traffic to ASoC")
        url = self.config.asoc_base_url + '/api/v2/Scans/DynamicAnalyzerWithFile'
        requestData = CreateScanWithFileData(self.config)
        requestBody = json.dumps(requestData.__dict__)
        response = requests.post(url=url, data=requestBody, headers=self.getHeaders(True, True), verify=False)
        response_str = str(response.json())
        print(response.json()['Id'])
        print("ASoC Server Response:" + response_str)
        if (response.status_code == 201 and response_str.__len__() > 0):
            print("*** Scan with the recorded traffic has been published into ASoC successfully")
        else:
            print("XX Failed to create scan in ASoC")
            exit(1)
        return response.json()['Id']

    def getStatus(self, scan_id):
        # print("** Publishing scan with the recorded traffic to ASoC")
        url = self.config.asoc_base_url + '/api/v2/Scans/DynamicAnalyzer/' + scan_id
        # print("url" + url)
        # requestData = CreateScanWithFileData(self.config)
        # requestBody = json.dumps(requestData.__dict__)
        response = requests.get(url=url, headers=self.getHeaders(True, True), verify=False)
        # response_str = str(response.json())
        # print("ASoC Server Response:" + response_str)
        print("Status: {}, Progress: {}, Id: {}".format(
            response.json()["LatestExecution"]["Status"],
            response.json()["LatestExecution"]["Progress"],
            scan_id))
        return response.json()["LatestExecution"]["Status"]


def main():
    config = ConfigData()
    proxy_server = ProxyServer(config)
    asoc_rest_api = AsocRestApi(config)

    proxy_proc = Popen(["node app.js"],
                      shell=True, cwd="{}Automation/".format(
                            os.environ['APPSCAN_PRESENCE_DIR']))
    presence_proc = Popen(["sudo ./startPresence.sh"],
                      shell=True, cwd=os.environ['APPSCAN_PRESENCE_DIR'])

    # Wait for processes to start up.
    sleep(10)
    print("\n\n\n")

    is_running = proxy_server.is_proxy_server_running()
    if is_running:
        # proxy_server.download_root_ca()
        proxy_server.start_proxy()
        run_traffic_script(config.proxy_port)
        proxy_server.stop_proxy()
        proxy_server.download_traffic()
        # #Now that we have the traffic file, and we can use it with ASoC REST API or with ASE REST API
        asoc_rest_api.loginWithKeyId()
        asoc_rest_api.uploadTrafficFile()
        scan_id = asoc_rest_api.createNewScanWithTraffic()
    else:
        print("XX Proxy Server wasn't found on port '" + config.proxy_server_port + "'")

    try:
        while True:
            status = asoc_rest_api.getStatus(scan_id)

            if status in ["Ready", "Failed"]:
                os.killpg(os.getpgid(proxy_proc.pid), signal.SIGTERM)
                os.killpg(os.getpgid(presence_proc.pid), signal.SIGTERM)
            else:
                sleep(180)
    except:
        os.killpg(os.getpgid(proxy_proc.pid), signal.SIGTERM)
        os.killpg(os.getpgid(presence_proc.pid), signal.SIGTERM)

def run_traffic_script(proxy_port):
    #This function should start the script\program of sending the traffic through the proxy port (it can be a selenium script or in any other way)
    #input("Start manual browsing and press any key to stop the traffic recording...\n")
    print("** Starting up the script.")
    # http_proxy = "http://localhost:" + proxy_port
    # https_proxy = "https://localhost:" + proxy_port
    # ftp_proxy = "ftp://localhost:" + proxy_port
    # proxyDict = {
    #     "https": https_proxy,
    #     "http": http_proxy,
    #     "ftp": ftp_proxy
    # }
    # response = requests.get("http://demo.testfire.net/", proxies=proxyDict)



    proc = Popen(["grunt dev-fvttest"],
                      shell=True, stdout=PIPE, stderr=PIPE)
    out, err = proc.communicate();

    # print(out)
    # print(err)
    # if not "Authenticated successfully." in out:
        # raise Exception("Unable to login to Static Analysis service")
    print("*** Finished running traffic through the proxy")


main()

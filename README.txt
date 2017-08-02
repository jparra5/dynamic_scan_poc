Description
===========
This ZIP file contains the files needed to set up an AppScan Presence on your network.

If your app is inaccessible from the Internet, you must create an AppScan Presence with access to the app and to the Internet that Application Security on Cloud can connect to. Proxy connections are supported.


Prerequisites
=============
For Windows Server, Windows Client, and Linux requirements, see:
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
The AppScan Presence supports 64-bit only.


Instructions
============
1. Extract the AppScan Presence files, and save them on a computer in the same network as your site. The computer must have access to the site and to the Internet.

2. If the presence connects to the app or Internet by proxy, configure as described in the next section.

3. In the root folder of the presence, locate and run startPresence.sh (Linux), or startPresence.vbs (Windows).

4. When you configure a Private site scan, select the presence to enable Application Security on Cloud to connect securely with your app.
	
	
Configure presence proxy settings
=================================
If your network requires a proxy for the presence to connect with the app (Internal proxy) or the Internet (Outgoing proxy), configure as follows:

1. In the root folder of the presence, locate config.properties and open it with a text editor.

2. Add the relevant settings (remove the "#" at the start of each relevant line), and save the file. (Note that "Host" can be a name or an IP address.)

For example, to configure internal proxy IP 192.168.1.100, and port 3128, change:

#internalProxyHost = 
#internalProxyPort =

to

internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. Start the presence by running startPresence.sh (Linux), or startPresence.vbs (Windows).
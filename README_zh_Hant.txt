說明
===========
這個 ZIP 檔包含在網路上設定 AppScan Presence 所需的檔案。

如果您的應用程式無法從網際網路存取，您必須建立 AppScan Presence，使其可存取應用程式以及 Application Security on Cloud 可連接至的網際網路。支援 Proxy 連線。


必要條件
=============
針對 Windows Server、Windows Client 和 Linux 需求，請參閱：
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
AppScan Presence 僅支援 64 位元。


指示
============
1. 解壓縮 AppScan Presence 檔案，將其儲存在與網站位於相同網路的電腦上。該電腦必須有權存取網站與網際網路。

2. 如果 Presence 透過 Proxy 連接至應用程式網際網路，請依下一節的說明進行配置。

3. 在 Presence 的根資料夾中，找出並執行 startPresence.sh (Linux) 或 startPresence.vbs (Windows)。

4. 當您配置私密網站掃描時，請選取 Presence 來啟用 Application Security on Cloud 以安全地連接應用程式。
	
	
配置 Presence Proxy 設定
=================================
如果網路需要 Proxy 讓 Presence 連接應用程式（內部 Proxy）或網際網路（外寄 Proxy），請依下列方式進行配置：

1. 在 Presence 的根資料夾中，找出 config.properties 並以文字編輯器開啟它。

2. 新增相關的設定（移除每一相關行開頭的 "#"），然後儲存檔案。（請注意，"Host" 可以是名稱或 IP 位址。）

例如，如果要配置內部 Proxy IP 192.168.1.100 以及埠 3128，請將：

#internalProxyHost =
#internalProxyPort =

變更為


internalProxyHost = 192.168.1.100
internalProxyPort = 3128

3. 執行 startPresence.sh (Linux) 或 startPresence.vbs (Windows) 來啟動 Presence。
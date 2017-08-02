描述
===========
该 ZIP 文件包含了在网络上设置 AppScan Presence 所需的文件。

如果应用程序无法从因特网访问，必须创建 Application Security on Cloud 可连接到的且具有应用程序和因特网访问权的 AppScan Presence。支持代理连接。


先决条件
=============
对于 Windows Server、Windows Client 和 Linux 需求，请参阅：
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
AppScan Presence 仅支持 64 位。


指示信息
============
1. 解压缩 AppScan Presence 文件，并将它们保存到与您的站点相同的网络中的计算机上。该计算机必须具有站点和因特网的访问权。

2. 如果 Presence 通过代理连接到应用程序或因特网，按下个步骤中的描述进行配置。

3. 在 Presence 的根文件夹中，找到并运行 startPresence.sh (Linux) 或 startPresence.vbs (Windows)。

4. 配置“专用”站点扫描时，选择 Presence 以使 Application Security on Cloud 能与应用程序安全地连接。
配置 Presence 代理设置
=================================
如果网络需要代理以使 Presence 能与应用程序（内部代理）或因特网（出局代理），按如下所示进行配置：

1. 在 Presence 的根文件夹中，找到 config.properties 并通过文本编辑器将其打开。

2. 添加相关设置（除去每个相关行开头的“#”），并保存文件。（请注意：“Host”可以是名称或 IP 地址。）

例如，要配置内部代理 IP  192.168.1.100 和端口 3128，将：

#internalProxyHost = 
#internalProxyPort =

 更改为


internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. 通过运行 startPresence.sh (Linux) 或 startPresence.vbs (Windows) 来启动 Presence。
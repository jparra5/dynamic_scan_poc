説明
===========
この ZIP ファイルには、ネットワーク上に AppScan プレゼンスをセットアップするために必要なファイルが含まれています。

ご使用のアプリがインターネットからアクセス不能な場合、アプリへのアクセス権とインターネットへのアクセス権を持つ AppScan プレゼンスを作成する必要があります。これには、Application Security on Cloud が接続できます。 プロキシー接続がサポートされています。 


前提条件
=============
Windows Server、Windows Client、および Linux の要件については、以下を参照してください。
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
AppScan プレゼンスは 64 ビットのみサポートします。


手順
============
1. AppScan プレゼンス・ファイルを解凍して、それらをご使用のサイトと同じネットワーク上にあるコンピューターに保存します。 そのコンピューターは、サイトおよびインターネットへのアクセス権がなければなりません。 

2. プレゼンスがプロキシーによってアプリやインターネットに接続する場合は、次のセクションの説明に従って構成します。

3. プレゼンスのルート・フォルダー内で、startPresence.sh (Linux)、または startPresence.vbs (Windows) を見つけて実行します。

4. プライベート・サイトのスキャンを構成する場合は、Application Security on Cloud をご使用のアプリに安全に接続できるようにプレゼンスを選択します。 	
	
プレゼンスのプロキシー設定の構成
=================================
ご使用のネットワークで、アプリに接続するためのプレゼンスのプロキシー (内部プロキシー) またはインターネットに接続するためのプレゼンスのプロキシー (発信プロキシー) が必要な場合、以下のように構成します。

1. プレゼンスのルート・フォルダーで、config.properties を検出し、テキスト・エディターで開きます。

2. 関連設定を追加 (各関連行の先頭にある "#" を削除）して、ファイルを保存します。 (「Host」には名前または IP アドレスを指定することに注意してください。)

例えば、内部プロキシー IP 192.168.1.100 とポート 3128 を構成するには、以下のように変更します。

#internalProxyHost = 
#internalProxyPort =

 から 

internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. startPresence.sh (Linux)、または startPresence.vbs (Windows) を実行してプレゼンスを開始します。
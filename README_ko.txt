설명
===========
이 Zip 파일에는 사용자 네트워크에 AppScan Presence를 설정하는 데 필요한 파일이 포함되어 있습니다.

앱이 인터넷에서 액세스 가능하지 않은 경우 Application Security on Cloud에서 연결할 수 있는 인터넷 및 앱에 대한 액세스로 AppScan Presence를 작성해야 합니다. 프록시 연결이 지원됩니다. 


필수 소프트웨어
=============
Windows 서버, Windows 클라이언트, Linux 요구사항의 경우
http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html을 참조하십시오.
AppScan Presence는 64비트만 지원합니다.


지시사항
============
1. AppScan Presence 파일의 압축을 풀고 사이트와 동일한 네트워크의 컴퓨터에 저장하십시오. 컴퓨터에는 해당 사이트와 인터넷에 대한
액세스 권한이 있어야 합니다. 

2. Presence에서 프록시로 앱 또는 인터넷에 연결한 경우 다음 섹션에 설명된 대로 구성하십시오.

3. Presence의 루트 폴더에서 startPresence.sh(Linux) 또는 startPresence.vbs(Windows)를 찾아서 실행하십시오.

4. 개인용 사이트 스캔을 구성하는 경우 Application Security on Cloud를 사용으로 설정하도록 Presence를 선택하여 앱으로 안전하게 연결하십시오.
	
	
Presence 프록시 설정 구성
=================================
사용자 네트워크에 앱(내부 프록시) 또는 인터넷(출력 프록시)으로 연결하기 위해 Presence에 대한 프록시가 필요한 경우 다음과 같이 구성하십시오.

1. Presence의 루트 폴더에서 config.properties를 찾아 문서 편집기로 여십시오. 

2. 관련 설정을 추가하고(각 관련 행의 시작 부분에서 "#" 제거) 파일을 저장하십시오("Host"는 이름이나 IP 주소가 될 수 있습니다.). 

예를 들어, 내부 프록시
IP 192.168.1.100 및 포트 3128을 구성하려면 다음을 수행하십시오. 

#internalProxyHost = 
#internalProxyPort =

를 다음으로 변경하십시오.


internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. startPresence.sh(Linux) 또는 startPresence.vbs(Windows)를 실행하여 Presence를 시작하십시오.
Descrição
===========
Este arquivo zip contém os arquivos necessários para configurar um AppScan Presence em sua rede.

Se seu app for inacessível na Internet, deve-se criar um AppScan Presence com acesso ao app e à Internet ao qual o Application Security on Cloud possa se conectar. As conexões proxy são suportadas.


Pré-requisitos
==============
Para requisitos do Windows Server, do Windows Client e de Linux, consulte:
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
O AppScan Presence suporta apenas 64 bits.


Instruções
==========
1. Extraia os arquivos do AppScan Presence e salve-os em um computador na mesma rede que seu site. O computador deve ter acesso ao site e à Internet.

2. Se o Presence se conectar ao app ou à Internet por proxy, configure conforme descrito na próxima seção.

3. Na pasta raiz do Presence, localize e execute startPresence.sh (Linux) ou startPresence.vbs (Windows).

4. Ao configurar uma varredura de site privada, selecione o Presence para que o Application Security on Cloud possa se conectar com segurança ao seu app.
	
	
Configurar definições de proxy do Presence
==========================================
Se sua rede requerer um proxy para que o Presence se conecte ao app (proxy interno) ou à Internet (proxy de saída), configure como a seguir:

1. Na pasta raiz do Presence, localize config.properties e abra-o com um editor de texto.

2. Inclua as configurações relevantes (remova o "#" no início de cada linha relevante) e salve o arquivo. (Observe que "Host" pode ser um nome ou um endereço IP).

Por exemplo, para configurar o IP do proxy interno 192.168.1.100 e a porta 3128, mude:

#internalProxyHost = 
#internalProxyPort =

para

internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. Inicie o Presence executando startPresence.sh (Linux) ou startPresence.vbs (Windows).
Descri��o
===========
Este arquivo zip cont�m os arquivos necess�rios para configurar um AppScan Presence em sua rede.

Se seu app for inacess�vel na Internet, deve-se criar um AppScan Presence com acesso ao app e � Internet ao qual o Application Security on Cloud possa se conectar. As conex�es proxy s�o suportadas.


Pr�-requisitos
==============
Para requisitos do Windows Server, do Windows Client e de Linux, consulte:
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
O AppScan Presence suporta apenas 64 bits.


Instru��es
==========
1. Extraia os arquivos do AppScan Presence e salve-os em um computador na mesma rede que seu site. O computador deve ter acesso ao site e � Internet.

2. Se o Presence se conectar ao app ou � Internet por proxy, configure conforme descrito na pr�xima se��o.

3. Na pasta raiz do Presence, localize e execute startPresence.sh (Linux) ou startPresence.vbs (Windows).

4. Ao configurar uma varredura de site privada, selecione o Presence para que o Application Security on Cloud possa se conectar com seguran�a ao seu app.
	
	
Configurar defini��es de proxy do Presence
==========================================
Se sua rede requerer um proxy para que o Presence se conecte ao app (proxy interno) ou � Internet (proxy de sa�da), configure como a seguir:

1. Na pasta raiz do Presence, localize config.properties e abra-o com um editor de texto.

2. Inclua as configura��es relevantes (remova o "#" no in�cio de cada linha relevante) e salve o arquivo. (Observe que "Host" pode ser um nome ou um endere�o IP).

Por exemplo, para configurar o IP do proxy interno 192.168.1.100 e a porta 3128, mude:

#internalProxyHost = 
#internalProxyPort =

para

internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. Inicie o Presence executando startPresence.sh (Linux) ou startPresence.vbs (Windows).
Descripci�n
===========
Este archivo ZIP contiene los archivos necesarios para configurar un AppScan Presence en la red.

Si no se puede acceder a su aplicaci�n desde Internet, debe crear un AppScan Presence con acceso a la aplicaci�n y a Internet al que se pueda conectar Application Security on Cloud. Se da soporte a las conexiones de proxy.


Requisitos previos
=============
Para los requisitos de Windows Server, Windows Client y Linux, consulte:
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
AppScan Presence s�lo da soporte a la versi�n de 64 bits.


Instrucciones
============
1. Extraiga los archivos de AppScan Presence y gu�rdelos en un sistema de la misma red que su sitio. El sistema debe tener acceso al sitio y a Internet.

2. Si la presencia se conecta a la aplicaci�n o a Internet mediante proxy, config�relo como se describe en la siguiente secci�n.

3. En la carpeta ra�z de la presencia, localice y ejecute startPresence.sh (Linux) o startPresence.vbs (Windows).

4. Cuando configure una escaneo de Sitio privado, seleccione la presencia para habilitar Application Security on Cloud y conectarse de forma segura a la aplicaci�n. 	
	
Configurar los valores del proxy de presencia
=================================
Si la red requiere un proxy para que la presencia se conecte con la aplicaci�n (Proxy interno) o Internet (Proxy saliente), config�rela como se indica a continuaci�n:

1. En la carpeta ra�z de la presencia, localice config.properties y �bralo con un editor de texto.

2. A�ada los valores relevantes (elimine el s�mbolo "#" que aparece al inicio de cada l�nea relevante) y guarde el archivo. (Tenga en cuenta que "anfitri�n" puede ser un nombre o una direcci�n IP.)

Por ejemplo, para configurar un proxy interno IP 192.168.1.100, y n�mero de puerto 3128, cambie:

#internalProxyHost = 
#internalProxyPort =

por


internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. Inicie la presencia ejecutando startPresence.sh (Linux), o startPresence.vbs (Windows).
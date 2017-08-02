Descripción
===========
Este archivo ZIP contiene los archivos necesarios para configurar un AppScan Presence en la red.

Si no se puede acceder a su aplicación desde Internet, debe crear un AppScan Presence con acceso a la aplicación y a Internet al que se pueda conectar Application Security on Cloud. Se da soporte a las conexiones de proxy.


Requisitos previos
=============
Para los requisitos de Windows Server, Windows Client y Linux, consulte:
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
AppScan Presence sólo da soporte a la versión de 64 bits.


Instrucciones
============
1. Extraiga los archivos de AppScan Presence y guárdelos en un sistema de la misma red que su sitio. El sistema debe tener acceso al sitio y a Internet.

2. Si la presencia se conecta a la aplicación o a Internet mediante proxy, configúrelo como se describe en la siguiente sección.

3. En la carpeta raíz de la presencia, localice y ejecute startPresence.sh (Linux) o startPresence.vbs (Windows).

4. Cuando configure una escaneo de Sitio privado, seleccione la presencia para habilitar Application Security on Cloud y conectarse de forma segura a la aplicación. 	
	
Configurar los valores del proxy de presencia
=================================
Si la red requiere un proxy para que la presencia se conecte con la aplicación (Proxy interno) o Internet (Proxy saliente), configúrela como se indica a continuación:

1. En la carpeta raíz de la presencia, localice config.properties y ábralo con un editor de texto.

2. Añada los valores relevantes (elimine el símbolo "#" que aparece al inicio de cada línea relevante) y guarde el archivo. (Tenga en cuenta que "anfitrión" puede ser un nombre o una dirección IP.)

Por ejemplo, para configurar un proxy interno IP 192.168.1.100, y número de puerto 3128, cambie:

#internalProxyHost = 
#internalProxyPort =

por


internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. Inicie la presencia ejecutando startPresence.sh (Linux), o startPresence.vbs (Windows).
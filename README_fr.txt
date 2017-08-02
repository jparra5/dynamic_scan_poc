Description
===========
Ce fichier zip contient les fichiers n�cessaires � la configuration d'une pr�sence AppScan sur votre r�seau.

Si votre application n'est pas accessible � partir d'Internet, vous devez cr�er une pr�sence AppScan ayant un acc�s � l'application et � Internet afin qu'Application Security on Cloud puisse se connecter. Les connexions proxy sont prises en charge.


Pr�requis
=============
Pour en savoir plus sur les exigences sp�cifiques � Windows Server, Windows Client et Linux, rendez-vous sur :
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
AppScan Presence prend en charge le mode 64 bits uniquement.


Instructions
============
1. Extrayez les fichiers AppScan Presence, puis sauvegardez-les sur un ordinateur dans le m�me r�seau que votre site. L'ordinateur doit avoir acc�s au site et � Internet.

2. Si la pr�sence se connecte � l'application ou � Internet par l'interm�diaire d'un proxy, proc�dez � la configuration comme d�crit dans la section suivante.

3. Dans le dossier racine de la pr�sence, localisez et ex�cutez startPresence.sh (Linux) ou startPresence.vbs (Windows).

4. Lorsque vous configurez un examen de site priv�, s�lectionnez la pr�sence pour permettre au service Application Security on Cloud de se connecter � votre application de fa�on s�curis�e.
	
	
Configurer les param�tres de proxy de pr�sence
=================================
Si votre r�seau requiert un proxy pour que la pr�sence puisse se connecter � l'application (proxy interne) ou � Internet (proxy sortant), proc�dez � la configuration comme suit :

1. Dans le dossier racine de la pr�sence, localisez le fichier config.properties, puis ouvrez-le � l'aide d'un �diteur de texte.

2. Ajoutez les param�tres appropri�s (supprimez le signe "#" au d�but de chaque ligne pertinente), puis sauvegardez le fichier. (Notez que "Host" peut �tre un nom ou une adresse IP.)

Par exemple, pour configurer l'IP de proxy interne
192.168.1.100 et le port 3128, remplacez :

#internalProxyHost = 
#internalProxyPort =

par

internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. D�marrez la pr�sence en ex�cutant startPresence.sh (Linux) ou startPresence.vbs (Windows).
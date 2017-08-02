Description
===========
Ce fichier zip contient les fichiers nécessaires à la configuration d'une présence AppScan sur votre réseau.

Si votre application n'est pas accessible à partir d'Internet, vous devez créer une présence AppScan ayant un accès à l'application et à Internet afin qu'Application Security on Cloud puisse se connecter. Les connexions proxy sont prises en charge.


Prérequis
=============
Pour en savoir plus sur les exigences spécifiques à Windows Server, Windows Client et Linux, rendez-vous sur :
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354.html
AppScan Presence prend en charge le mode 64 bits uniquement.


Instructions
============
1. Extrayez les fichiers AppScan Presence, puis sauvegardez-les sur un ordinateur dans le même réseau que votre site. L'ordinateur doit avoir accès au site et à Internet.

2. Si la présence se connecte à l'application ou à Internet par l'intermédiaire d'un proxy, procédez à la configuration comme décrit dans la section suivante.

3. Dans le dossier racine de la présence, localisez et exécutez startPresence.sh (Linux) ou startPresence.vbs (Windows).

4. Lorsque vous configurez un examen de site privé, sélectionnez la présence pour permettre au service Application Security on Cloud de se connecter à votre application de façon sécurisée.
	
	
Configurer les paramètres de proxy de présence
=================================
Si votre réseau requiert un proxy pour que la présence puisse se connecter à l'application (proxy interne) ou à Internet (proxy sortant), procédez à la configuration comme suit :

1. Dans le dossier racine de la présence, localisez le fichier config.properties, puis ouvrez-le à l'aide d'un éditeur de texte.

2. Ajoutez les paramètres appropriés (supprimez le signe "#" au début de chaque ligne pertinente), puis sauvegardez le fichier. (Notez que "Host" peut être un nom ou une adresse IP.)

Par exemple, pour configurer l'IP de proxy interne
192.168.1.100 et le port 3128, remplacez :

#internalProxyHost = 
#internalProxyPort =

par

internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. Démarrez la présence en exécutant startPresence.sh (Linux) ou startPresence.vbs (Windows).
Beschreibung
============
Diese ZIP-Datei enthält die Dateien , die für die Konfiguration von AppScan Presence in Ihrem Netz benötigt werden. 

Wenn vom Internet nicht auf Ihre App zugegriffen werden kann, müssen Sie eine AppScan Presence-Instanz mit Zugriff auf die App und das Internet in einer Cloud erstellen, die Ihnen am nächsten ist. Proxy-Verbindungen werden unterstützt. 


Vorbedingungen
==============
Für Anforderungen an Windows Server, Windows Client und Linux:
- http://www.oracle.com/technetwork/java/javase/certconfig-2095354. Die AppScan Presence unterstützt nur 64-Bit.


Anweisungen
===========
1. Extrahieren Sie die AppScan Presence-Dateien und speichern Sie diese auf einem Computer im gleichen Netzwerk wie Ihre Seite. Der Computer muss auf die Site und auf das Internet zugreifen können.

2. Wenn Presence über einen Proxy eine Verbindung zur App oder zum Internet herstellt, konfigurieren Sie diese wie im folgenden Abschnitt beschrieben. 

3. Suchen Sie im Stammordner der Presence und führen Sie startPresence.sh (Linux) oder startPresence.vbs (Windows) aus.

4. Wenn Sie eine private Site durchsuchen, wählen Sie Presence aus, um Application Security on Cloud zu aktivieren und eine sichere Verbindung zu Ihrer App herzustellen.


Einstellungen für Presence-Proxy konfigurieren
==============================================
Wenn Ihr Netzwerk einen Proxy erfordert, damit die Presence eine Verbindung zur App (interner Proxy) oder zum Internet (ausgehender Proxy) herstellen kann, konfigurieren Sie diese wie folgt: 

1. Suchen Sie im Stammordner der Presence nach 'config.properties' und öffnen Sie diese mit einem Texteditor. 

2. Fügen Sie die relevanten Einstellungen ("#" am Beginn jeder relevanten Zeile) hinzu und speichern Sie die Datei. (Beachten Sie, dass "Host" ein Name oder eine IP-Adresse sein kann.) 

Beispiel: zum Konfigurieren der internen
Proxy-IP 192.168.1.100 und des Port 3128 ändern Sie: 

#internalProxyHost = 
#internalProxyPort =

in


internalProxyHost = 192.168.1.100 
internalProxyPort = 3128

3. Starten Sie die Presence, indem Sie startPresence.sh (Linux) oder startPresence.vbs (Windows) ausführen.
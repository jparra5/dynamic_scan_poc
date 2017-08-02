Set fso = CreateObject("Scripting.FileSystemObject")

javaZipFile = fso.GetAbsolutePathName("Java.zip")
javaFolder = fso.GetAbsolutePathName("java")

Sub Pause(strPause)
    WScript.Echo (strPause)
    Input = WScript.StdIn.ReadLine
End Sub

Set shell = CreateObject("WScript.Shell")

' Make sure script runs using cscript (in console window)
strEngine = UCase( Right( WScript.FullName, 12 ) )
If strEngine <> "\CSCRIPT.EXE" Then
	strCmd = "cscript.exe //NOLOGO """ & WScript.ScriptFullName & """"
	shell.Run strCmd
	Wscript.Quit
End If

' Verify this is a 64-bit operating system
If GetObject("winmgmts:root\cimv2:Win32_Processor='cpu0'").AddressWidth <> 64 Then
	Wscript.Echo("AppScan Presence must run on a 64-bit system")
	Pause("Press ENTER to continue...")
	Wscript.Quit 1
End if


' Unzip Java
if (fso.FileExists(javaZipFile)) Then
	Wscript.Echo("Preparing service for first execution. This may take a few moments.")
	if (fso.FolderExists(javaFolder)) Then
		fso.DeleteFolder javaFolder, true
	End If
	fso.CreateFolder(javaFolder)
	Set ObjShell = CreateObject("Shell.Application") 
	Set FilesInZip = ObjShell.NameSpace(javaZipFile).Items 
	ObjShell.NameSpace(javaFolder).CopyHere FilesInZip, 4 

	Set objShell = Nothing 
	
	Wscript.Echo("Ready!")
	
	fso.DeleteFile(javaZipFile)
End If

javaExecutable = "java\jre\bin\java.exe"

' Verify java executable exists
if (NOT fso.FileExists(javaExecutable)) Then
	Wscript.Echo("Java missing from installation. Please download the latest version of AppScan Presence from the 'IBM Application Security on Cloud' website.")
	Pause("Press ENTER to continue...")
	Wscript.Quit 1
End If

Set fso = Nothing 


shell.Run javaExecutable & " -jar agentService.jar"
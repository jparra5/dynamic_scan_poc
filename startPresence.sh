#!/bin/bash

java_zip="Java.tgz"
java_folder="java"

# Check operating system
os=$(uname -s)
if [ "$os" != "Linux" ]; then
	echo "Unsupported operating system $os"
	read -p "Press any key to continue... " -n1 -s
	echo
	exit
fi

# Check 64-bit
arch=$(uname -m)
if [ "$arch" != "x86_64" ]; then
	echo "AppScan Presence must run on a 64-bit system"
	read -p "Press any key to continue... " -n1 -s
	echo
	exit
fi

# Extract Java from zip, if required
if [ -f $java_zip ]; then
	echo "Preparing service for first execution. This may take a few moments."
	if [ -d $java_folder ]; then
		rm -rf $java_folder
	fi 
	mkdir $java_folder
	
	tar xzf $java_zip -C $java_folder --strip-components=1
	rm -rf $java_zip
fi

java_executable=$java_folder/jre/bin/java

if [ ! -f $java_executable ]; then
	echo "Java missing from installation. Please download the latest version of AppScan Presence from the 'IBM Application Security on Cloud' website."
	read -p "Press any key to continue... " -n1 -s
	echo
	exit
fi

$java_executable -jar agentService.jar
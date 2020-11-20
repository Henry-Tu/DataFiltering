#!/usr/bin/env python3

critPaths = []
inFile = open("output.txt", "r")
inFile.readline()
numTraces = int(inFile.readline())

print(numTraces)
for x in range(numTraces):
	print("Trace : " + str(x+1))
	inFile.readline()
	inFile.readline()
	critPath = inFile.readline()
	critPaths.append(critPath)
	inFile.readline()
	inFile.readline()
inFile.close

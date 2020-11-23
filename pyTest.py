#!/usr/bin/env python3
import nltk
from nltk.tokenize import word_tokenize
from nltk.probability import FreqDist
from fuzzywuzzy import fuzz 
from fuzzywuzzy import process 


critPaths = []
inFile = open("C:\\Users\\henry\\source\\repos\\Henry-Tu\\DataFiltering\\output.txt", "r")
inFile.readline()
numTraces = int(inFile.readline())

print(numTraces)
for x in range(numTraces):
	print("Trace : " + str(x + 1))
	inFile.readline()
	inFile.readline()
	critPath = inFile.readline()
	fdist = FreqDist()
	for word in word_tokenize(critPath):
		fdist[word.lower()] += 1
	print(fdist.most_common(15))
	critPaths.append(critPath)
	inFile.readline()
	inFile.readline()
inFile.close
print("")
for x in range(numTraces):
	critPath = critPaths[x]
	choices = []
	for y in range(numTraces):
		if(y!=x):
			choices.append(critPaths[y])
	closest = process.extractOne(critPath, choices)[0]
	for y in range(numTraces):
		if(closest == critPaths[y]):
			print("Trace " + str(x + 1) + "'s  closest match is trace " + str(y+1))
	print("")
loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule('/System/Resources');
loadModule('/TraceCompass/View');
loadModule('/TraceCompass/TraceUI');
jaro_winkler = {};
jaro_winkler.adjustments = {
  'A': 'E',
  'A': 'I',
  'A': 'O',
  'A': 'U',
  'B': 'V',
  'E': 'I',
  'E': 'O',
  'E': 'U',
  'I': 'O',
  'I': 'U',
  'O': 'U',
  'I': 'Y',
  'E': 'Y',
  'C': 'G',
  'E': 'F',
  'W': 'U',
  'W': 'V',
  'X': 'K',
  'S': 'Z',
  'X': 'S',
  'Q': 'C',
  'U': 'V',
  'M': 'N',
  'L': 'I',
  'Q': 'O',
  'P': 'R',
  'I': 'J',
  '2': 'Z',
  '5': 'S',
  '8': 'B',
  '1': 'I',
  '1': 'L',
  '0': 'O',
  '0': 'Q',
  'C': 'K',
  'G': 'J',
  'E': ' ',
  'Y': ' ', 
  'S': ' '
}

//Filter values
 time1 = 0;                            //start time
 time2 = 9999999999999999999999;          //end time
 filterTid = -1;                     //tid: -1 if not in use
 filterStatus = "none";                  //status: none if not in use
 saveLocation = "workspace://DataFiltering/output.txt";
 simThreshold = 98;

//The thread you want to compare
var followName = "wget";
//number of traces
numTraces = 5;
//Output save location
saveLocation = "workspace://DataFiltering/output.txt";

/* 
Possible statuses:

	BLOCK_DEVICE	//A
	BLOCKED			//B
	DEFAULT			//C
	EPS				//D
	INTERRUPTED		//E
	IPI				//F
	NETWORK			//G
	PREEMPTED		//H
	RUNNING			//I
	TIMER			//J
	UNKNOWN			//K
	USER_INPUT		//L
See: 
https://archive.eclipse.org/tracecompass/doc/javadoc/apidocs/org/eclipse/tracecompass/analysis/graph/core/base/TmfEdge.EdgeType.html
for details
*/




// For output
var file = createFile(saveLocation);
var fileHandle = writeLine(file, "Crit Path Output");
writeLine(fileHandle,"");
var outputStrs = [];
outputStrs[0] = "";
var charOutput = "";
var critPathStrings = [];


for( traceNum = 1; traceNum <= numTraces; traceNum++){ 
	location = "wget" + traceNum + "/kernel";
	print("opening trace " + traceNum);
	trace = openTrace("DataFiltering", location, false);
 	if (trace == null) {
      print("Trace is null");
	} else{
		writeLine(fileHandle, "Trace Number: " + traceNum);
		outStr = filterCritPath(trace, time1, time2, filterTid, filterStatus);
		critPathStrings.push(outStr);
		writeLine(fileHandle, "\n");
	}

}
for(x = 0; x <numTraces; x ++){
	xString = critPathStrings[x];
	for ( y = 0; y < numTraces; y++){
		if( x != y ){
			yString = critPathStrings[y];
			similarity = textCosineSimilarity(xString, yString) * 100;
			similarity = similarity.toFixed(2);
			outputCompar = "Trace " + (x+1) + " and Trace " + (y+1) + "\nCosine Algorithm: " + similarity + "% similar";
			//If it is above threshold
			if(similarity >= simThreshold){
				thisGroup.push(y+1);
			}
			if( y>x ){
				outputCompar += "\nJaro Winkler: " + (jaroWinkler(xString,yString) * 100).toFixed(2) +"%";
				outputCompar += "\nLevenshtein distance: " + levenshtein(xString, yString);
				print(outputCompar);
				writeLine(fileHandle, outputCompar);
			}
		}
	}
}

print("Data output to \"" + saveLocation + "\" ");
print("Complete");
exit();



/*
	Traverse through the nodes of the graph
	
*/
function filterGraph(next,critPath, time1, time2, filterTid, status){
	//Get the ENUM of the edge directions
	edges =	org.eclipse.tracecompass.analysis.graph.core.base.TmfVertex.EdgeDirection.values();
	counter = 0;
	//Loop for all nodes in graph
	while(next != null){
		
		vertex = next;
		vertical = false;
		type = null;
		within = true;   //If the node is within the filters
		
		//Find next vertex
		if(vertex.getEdge(edges[0]) != null){
			edge = vertex.getEdge(edges[0]);
			type = edge.getType();
			next = vertex.getNeighborFromEdge(edge, edges[0]);
			vertical = true;
		}else if (vertex.getEdge(edges[2]) != null){
			edge = vertex.getEdge(edges[2]);
			type = edge.getType();
			next = vertex. getNeighborFromEdge(edge, edges[2]);
		}else{
			next = null;
		}

		//Get data of vertex and node
		worker = critPath.getParentOf(vertex);
		name = worker.getName();
		sTime = vertex.getTs();
		info = worker.getWorkerInformation(sTime);
		tid = info.get('TID');
		
		
		//check if this node is within filter
		if(!((sTime >= time1) && (sTime <= time2)) || ((filterStatus != "none") && (filterStatus != type)) || ((filterTid != -1) && (filterTid != tid) ) || (next== null)){
			within = false;
		}
		
		if(within){
			counter ++;
			//output data
			outputStrs[counter] = "";
			outputStrs[counter] += "Worker of Vertex: " + name + "\nWorker info: " + info  + "\nStatus: " + type + "\nVertex start time: " + sTime;
			
			if(next != null){
				eTime = next.getTs();
				elapsed = eTime - sTime;
				outputStrs[counter] += "\nVertex end time: " + eTime + "\nTime elapsed: " + elapsed;
				if(vertical){
					outputStrs[counter] += "\nSwitching to different worker";
				}
			}
			outputStrs[counter] += "\n";
			addChar(type.toString(),name);
		}
		
	}	
		
	if(next == null){
		outputStr[counter] += "\nEnd of Crit Path";
	}
	outputStrs[counter] += "\n";
	//writeLine(fileHandle, outputStr + "\n");
}

function filterCritPath(trace, time1, time2, filterTid, filterStatus){
	charOutput = "";
	
	/*
	analysisMods = trace.getAnalysisModules();
	iter = analysisMods.iterator();
	while(iter.hasNext()){
		print(iter.next());
	}
	*/
	signal = new org.eclipse.tracecompass.analysis.os.linux.core.signals.TmfThreadSelectedSignal(this, 1, trace);
	org.eclipse.tracecompass.tmf.core.signal.TmfSignalManager.dispatchSignal(signal);
	analysis = getTraceAnalysis(trace, 'OS Execution Graph');
	analysis.schedule();
	analysis.waitForCompletion();
	
	osGraph = analysis.getGraph();
	
	print(osGraph);
	
	
	workers = osGraph.getWorkers();
	iter = workers.iterator();
	followTid = null;
	targetWorker = null;
	while(iter.hasNext()){
		worker = iter.next();
		info = worker.getWorkerInformation();
		name = worker.getName();
		//print(name);
		if(name == followName){
			info = worker.getWorkerInformation();
			tid = info.get('TID');
			followTid = tid;
			targetWorker = worker;
			break;
		}
	}
	if(followTid == null){
		print("Thread was not found");
		exit();
	}
	print(followTid);
	//trace = getActiveTrace();
	signal = new org.eclipse.tracecompass.analysis.os.linux.core.signals.TmfThreadSelectedSignal(this, followTid, trace);
	org.eclipse.tracecompass.tmf.core.signal.TmfSignalManager.dispatchSignal(signal);
	analysis = new org.eclipse.tracecompass.analysis.os.linux.core.execution.graph.OsExecutionGraph();
	analysis.setTrace(trace);
	//getTraceAnalysis(trace, 'OS Execution Graph');
	analysis.schedule();
	analysis.waitForCompletion();
	osGraph = analysis.getGraph();
	print(osGraph);
	critPathMod = org.eclipse.tracecompass.analysis.graph.core.criticalpath.CriticalPathModule(analysis);
	critPathMod.setTrace(trace);
	critPathMod.setParameter("workerid", targetWorker);
	critPathMod.schedule();
	critPathMod.waitForCompletion();
	print("param: " + critPathMod.getParameter("workerid"));
	let critPath = critPathMod.getCriticalPath();
	if(critPath == null){
		print("Critical path not found");
		print(signal.getThreadId());
	     exit();
	}
	 workers = critPath.getWorkers();
	
	//get head of graph
	head = critPath.getHead();
	next = head;
	
	outputStr= "critPath " + critPath + "\nNum Vertices: " + critPath.size() + "\nNum workers: " + workers.size() + "\nTimestamp of head " + head.getTs() + "\n\nCritical graph data:\n";
	//writeLine(fileHandle,outputStr);
	
	filterGraph(next, critPath, time1, time2, filterTid, filterStatus);
	for ( i = 0; i < outputStrs.length; i++){
		//writeLine(fileHandle, outputStrs[i]);
	}
	writeLine(fileHandle,"String representation: \n" + charOutput);
	return charOutput;
}

/**
*
**/
function addChar(status,worker){
	charOutput += " " + worker + "-";
	if(status == "BLOCK_DEVICE"){
		charOutput += ' A ';
	}else if(status == "BLOCKED"){
		charOutput += 'B';
	}else if(status == "DEFAULT"){
		charOutput += 'C';
	}else if(status == "EPS"){
		charOutput += 'D';
	}else if(status == "INTERRUPTED"){
		charOutput += 'E';
	}else if(status == "IPI"){
		charOutput += 'F';
	}else if(status =="NETWORK"){
		charOutput += 'G';
	}else if(status == "PREEMPTED"){
		charOutput += 'H';
	}else if(status == "RUNNING"){
		charOutput += 'I';
	}else if(status == "TIMER"){
		charOutput += 'J';
	}else if(status == "UNKNOWN"){
		charOutput += 'K';
	}else if(status == "USER_INPUT"){
		charOutput += 'L';
	}else{
	charOutput += 'Z';
	}
}


/////////////////////////////////////////////////
/* Methods for string comparison
source: https://gist.github.com/sumn2u/118c284dc2abaa947eb8423fa9d47511#file-consine-similarity-js  */
function termFreqMap(str) {
        var words = str.split(' ');
        var termFreq = {};
        words.forEach(function(w) {
            termFreq[w] = (termFreq[w] || 0) + 1;
        });
        return termFreq;
}

function addKeysToDict(map, dict) {
        for (var key in map) {
            dict[key] = true;
        }
    }

    function termFreqMapToVector(map, dict) {
        var termFreqVector = [];
        for (var term in dict) {
            termFreqVector.push(map[term] || 0);
        }
        return termFreqVector;
    }

    function vecDotProduct(vecA, vecB) {
        var product = 0;
        for (var i = 0; i < vecA.length; i++) {
            product += vecA[i] * vecB[i];
        }
        return product;
    }

    function vecMagnitude(vec) {
        var sum = 0;
        for (var i = 0; i < vec.length; i++) {
            sum += vec[i] * vec[i];
        }
        return Math.sqrt(sum);
    }

    function cosineSimilarity(vecA, vecB) {
        return vecDotProduct(vecA, vecB) / (vecMagnitude(vecA) * vecMagnitude(vecB));
    }

    function textCosineSimilarity(strA, strB) {
        var termFreqA = termFreqMap(strA);
        var termFreqB = termFreqMap(strB);

        var dict = {};
        addKeysToDict(termFreqA, dict);
        addKeysToDict(termFreqB, dict);

        var termFreqVecA = termFreqMapToVector(termFreqA, dict);
        var termFreqVecB = termFreqMapToVector(termFreqB, dict);

        return cosineSimilarity(termFreqVecA, termFreqVecB);
    }
    
    
    
    
//Levenshtein Algorithm 
//Source: https://coderwall.com/p/uop8jw/fast-and-working-levenshtein-algorithm-in-javascript
    
function levenshtein(a, b) {
  if(a.length === 0) return b.length;
  if(b.length === 0) return a.length;

  var matrix = [];

  // increment along the first column of each row
  var i;
  for(i = 0; i <= b.length; i++){
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for(j = 0; j <= a.length; j++){
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for(i = 1; i <= b.length; i++){
    for(j = 1; j <= a.length; j++){
      if(b.charAt(i-1) == a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
}

//Jaro Winkler algorithm
//Source: https://github.com/thsig/jaro-winkler-JS/blob/master/jaro_winkler.js

function jaroWinkler(a, b) {
	
  
  if (!a || !b) { return 0.0; }

  a = a.trim().toUpperCase();
  b = b.trim().toUpperCase();
  var a_len = a.length;
  var b_len = b.length;
  var a_flag = []; var b_flag = [];
  var search_range = Math.floor(Math.max(a_len, b_len) / 2) - 1;
  var minv = Math.min(a_len, b_len);

  // Looking only within the search range, count and flag the matched pairs. 
  var Num_com = 0;
  var yl1 = b_len - 1;
  for (var i = 0; i < a_len; i++) {
    var lowlim = (i >= search_range) ? i - search_range : 0;
    var hilim  = ((i + search_range) <= yl1) ? (i + search_range) : yl1;
    for (var j = lowlim; j <= hilim; j++) {
      if (b_flag[j] !== 1 && a[j] === b[i]) {
        a_flag[j] = 1;
        b_flag[i] = 1;
        Num_com++;
        break;
      }
    }
  }

  // Return if no characters in common
  if (Num_com === 0) { return 0.0; }

  // Count the number of transpositions
  var k = 0; var N_trans = 0;
  for (var i = 0; i < a_len; i++) {
    if (a_flag[i] === 1) {
      var j;
      for (j = k; j < b_len; j++) {
        if (b_flag[j] === 1) {
          k = j + 1;
          break;
        }
      }
      if (a[i] !== b[j]) { N_trans++; }
    }
  }
  N_trans = Math.floor(N_trans / 2);

  // Adjust for similarities in nonmatched characters
  var N_simi = 0; var adjwt = jaro_winkler.adjustments;
  if (minv > Num_com) {
    for (var i = 0; i < a_len; i++) {
      if (!a_flag[i]) {
        for (var j = 0; j < b_len; j++) {
          if (!b_flag[j]) {
            if (adjwt[a[i]] === b[j]) {
              N_simi += 3;
              b_flag[j] = 2;
              break;
            }
          }
        }
      }
    }
  }

  var Num_sim = (N_simi / 10.0) + Num_com;

  // Main weight computation
  var weight = Num_sim / a_len + Num_sim / b_len + (Num_com - N_trans) / Num_com;
  weight = weight / 3;

  // Continue to boost the weight if the strings are similar
  if (weight > 0.7) {
    // Adjust for having up to the first 4 characters in common
    var j = (minv >= 4) ? 4 : minv;
    var i;
    for (i = 0; (i < j) && a[i] === b[i]; i++) { }
    if (i) { weight += i * 0.1 * (1.0 - weight) };

    // Adjust for long strings.
    // After agreeing beginning chars, at least two more must agree
    // and the agreeing characters must be more than half of the
    // remaining characters.
    if (minv > 4 && Num_com > i + 1 && 2 * Num_com >= minv + i) {
      weight += (1 - weight) * ((Num_com - i - 1) / (a_len * b_len - i*2 + 2));
    }
  }

  return weight
  
};

// The char adjustment table used above





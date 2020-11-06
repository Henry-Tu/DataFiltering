loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule('/System/Resources');
loadModule('/TraceCompass/View');
loadModule('/TraceCompass/TraceUI');

//Filter values
 time1 = 0;                            //start time
 time2 = 9999999999999999999999;          //end time
 filterTid = -1;                     //tid: -1 if not in use
 filterStatus = "none";                  //status: none if not in use
 saveLocation = "workspace://DataFiltering/output.txt";

//The thread you want to compare
var followName = "wget";
//number of traces
numTraces = 3;

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
			similarity = textCosineSimilarity(xString, yString);
			print((x+1) + " is " + similarity + " similar to " + (y+1));
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
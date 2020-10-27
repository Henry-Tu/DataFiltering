loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule('/System/Resources');
loadModule('/TraceCompass/View');

//Filter values
const time1 = 0;                            //start time
const time2 = 1602814327606576000;          //end time
const filterTid = -1;                     //tid: -1 if not in use
const filterStatus = "none";                  //status: none if not in use
const saveLocation = "workspace://DataFiltering/output.txt";

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

filterCritPath(time1, time2, filterTid, filterStatus);


// Get the currently active trace
function getTrace(){
	var trace = getActiveTrace();
	if (trace == null) {
      	print("Trace is null");
      	writeLine(fileHandle,"Trace was null");
      	exit();
	}
	return trace;
}

// Get the Statistics module (by name) for that trace
function getCritAnalysis(trace){
	var analysis = getTraceAnalysis(trace, 'OS Execution Graph');
	if (analysis == null) {
     	print("Statistics analysis not found");
      	writeLine(fileHandle,"Statisics analysis not found");
      	exit();
	}
	return analysis;
}


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
		if(!((sTime >= time1) && (sTime <= time2)) || ((status != "none") && (status != type)) || ((filterTid != -1) && (filterTid != tid) ) || (next== null)){
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
			addChar(type.toString());
		}
		
	}	
		
	if(next == null){
		outputStr[counter] += "\nEnd of Crit Path";
	}
	outputStrs[counter] += "\n";
	//writeLine(fileHandle, outputStr + "\n");
}

function filterCritPath(time1, time2, filterTid, filterStatus){
	
	trace = getTrace();
	analysis = getCritAnalysis(trace);
	let critPath = analysis.getCriticalPath();
	if(critPath == null){
		print("Critical path not found");
	     exit();
	}
	var workers = critPath.getWorkers();
	
	//get head of graph
	head = critPath.getHead();
	next = head;
	
	outputStr= "critPath " + critPath + "\nNum Vertices: " + critPath.size() + "\nNum workers: " + workers.size() + "\nTimestamp of head " + head.getTs() + "\n\nCritical graph data:\n";
	writeLine(fileHandle,outputStr);
	
	filterGraph(next, critPath, time1, time2, filterTid, filterStatus);
	print("Outputting to \"" + saveLocation + "\" ");
	for ( i = 0; i < outputStrs.length; i++){
		writeLine(fileHandle, outputStrs[i]);
	}
	writeLine(fileHandle,"String representation: \n" + charOutput);
	print("Complete");
}

/**
*
**/
function addChar(status){
	if(status == "BLOCK_DEVICE"){
		charOutput += 'A';
	}else if(status = "BLOCKED"){
		charOutput += 'B';
	}else if(status = "DEFAULT"){
		charOutput += 'C';
	}else if(status = "EPS"){
		charOutput += 'D';
	}else if(status = "INTERRUPTED"){
		charOutput += 'E';
	}else if(status = "IPI"){
		charOutput += 'F';
	}else if(status = "NETWORK"){
		charOutput += 'G';
	}else if(status = "PREEMPTED"){
		charOutput += 'H';
	}else if(status = "RUNNING"){
		charOutput += 'I';
	}else if(status = "TIMER"){
		charOutput += 'J';
	}else if(status = "UNKNOWN"){
		charOutput += 'K';
	}else if(status = "USER_INPUT"){
		charOutput += 'L';
	}else{
	charOutput += 'Z';
	}
}


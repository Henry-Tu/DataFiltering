loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule('/System/Resources');
loadModule('/TraceCompass/View');

//Filter values
const time1 = 0;                            //start time
const time2 = 99999999999999999999;         //end time
const filterTid = -1;                     //tid: -1 if not in use
const filterStatus = "none";                  //status: none if not in use
const saveLocation = "workspace://DataFiltering/output.txt";

/* 
Possible statuses:

	BLOCK_DEVICE
	BLOCKED
	DEFAULT
	EPS
	INTERRUPTED
	IPI
	NETWORK
	PREEMPTED
	RUNNING
	TIMER
	UNKNOWN
	USER_INPUT
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
	traverse through the nodes of the graph
	
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
			next = vertex. getNeighborFromEdge(edge, edges[0]);
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
				eTime = next.getTs()-1;
				elapsed = eTime - sTime;
				outputStrs[counter] += "\nVertex end time: " + eTime + "\nTime elapsed: " + elapsed;
				if(vertical){
					outputStrs[counter] += "\nSwitch to different worker";
				}
			}
			outputStrs[counter] += "\n";
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
	print("Complete");
}



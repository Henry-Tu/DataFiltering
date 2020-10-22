loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule('/System/Resources');

var time1 = 0;
var time2 = 99999999999999999999;
tid = "";

// For output
var file = createFile("workspace://DataFiltering/output.txt");
var fileHandle = writeLine(file, "Crit Path Output");
writeLine(fileHandle,"");


filterCritPath(time1, time2, tid);


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
iter = workers.iterator();

while(iter.hasNext()){
	worker = iter.next();
	name = worker.getName();
	writeLine(fileHandle, "Worker name: " + name);
	start = worker.getStart()
	writeLine(fileHandle, "Start: " + start);
	info = worker.getWorkerInformation()
	writeLine(fileHandle, "Worker info: " + info);
	writeLine(fileHandle, "Host id: " + worker.getHostId());
	hostThread = worker.getHostThread();
	writeLine(fileHandle, hostThread);
	writeLine(fileHandle, "");
}
*/





/*
	traverse through the nodes of the graph
	
*/
function filterGraph(next,critPath, time1, time2, tid){
	//Get the ENUM of the edge directions
	edges =	org.eclipse.tracecompass.analysis.graph.core.base.TmfVertex.EdgeDirection.values();
	//Get the Enum of the statuses
	statuses = org.eclipse.tracecompass.analysis.os.linux.core.model.ProcessStatus.values();
	
	//Loop for all nodes in graph
	while(next != null){
		vertex = next;
		vertical = false;
		outputStr = "";
		
		//Find next vertex
		if(vertex.getEdge(edges[0]) != null){
			edge = vertex.getEdge(edges[0]);
			next = vertex. getNeighborFromEdge(edge, edges[0]);
			vertical = true;
		}else if (vertex.getEdge(edges[2]) != null){
			edge = vertex.getEdge(edges[2]);
			next = vertex. getNeighborFromEdge(edge, edges[2]);
		}else{
			next = null;
		}
		
		sTime = vertex.getTs();
		
		//check if this node is within filter
		if((sTime >= time1) && (sTime <= time2)){
			//Get data of vertex and node
			worker = critPath.getParentOf(vertex);
			name = worker.getName();
			info = worker.getWorkerInformation(sTime);
			statusNum = worker.getStatus().getStateValue().unboxInt();
			status = statuses[statusNum];
			prevStatus = worker.getOldStatus();
	
			//output data
			outputStr += "Worker of Vertex: " + name + "\nWorker info: " + info + "\nStatus: " + status + "\nOld status: " + prevStatus + "Vertex start time: " + sTime;
			if(next != null){
				eTime = next.getTs()-1;
				elapsed = eTime - sTime;
				
				outputStr += "\nVertex end time: " + eTime + "\nTime elapsed: " + elapsed;
				if(vertical){
					outputStr += "\nSwitch to different worker";
				}
			}
		}
		if(next == null){
			outputStr += "\nEnd of Crit Path";
		}
		writeLine(fileHandle, outputStr + "\n");
	}
}

function filterCritPath(time1, time2, tid){
	
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
	
	filterGraph(next, critPath, time1, time2, tid);
	print("Complete");
}



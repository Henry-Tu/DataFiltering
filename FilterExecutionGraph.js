loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule("/TraceCompass/DataProvider")
loadModule("/TraceCompass/View")
loadModule("/TraceCompass/Utils");

time1 = 0;
time2 = 9999999999999999999999999;
tid = "";

filterOsExecutionGraph(time1, time2, tid);

function filterGraph(next, graph, time1, time2, tid){
	//Get the ENUM of the edge directions
	edges =	org.eclipse.tracecompass.analysis.graph.core.base.TmfVertex.EdgeDirection.values();
	//Get the Enum of the statuses
	statuses = org.eclipse.tracecompass.analysis.os.linux.core.model.ProcessStatus.values();
	// Associate a TID with a graph worker
	tidToWorkerMap = {};
	//For holding pending arrows
	pendingArrows = {};
	//For saving the arrow information
	arrows = [];
	
	//Loop for all nodes in graph
	while(next != null){
		vertex = next;
		vertical = false;
		//outputStr = "";
		
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
			worker = graph.getParentOf(vertex);
			name = worker.getName();
			//info = worker.getWorkerInformation(sTime);
			tid = worker.getHostId();
			id = vertex.getID();
			
			//statusNum = worker.getStatus().getStateValue().unboxInt();
			//status = statuses[statusNum];
			//prevStatus = worker.getOldStatus();
			
			//output data
			///outputStr += "Worker of Vertex: " + name + "\nWorker info: " + info + "\nStatus: " + status + "\nOld status: " + prevStatus + "Vertex start time: " + sTime;
			if(next != null){
				eTime = next.getTs()-1;
				elapsed = eTime - sTime;
				
				//outputStr += "\nVertex end time: " + eTime + "\nTime elapsed: " + elapsed;
				if(vertical){
					//outputStr += "\nSwitch to different worker";
				}
			}
		}
		if(next == null){
			//outputStr += "\nEnd of Crit Path";
		}
		//writeLine(fileHandle, outputStr + "\n");
	}
}

//provider = new org.eclipse.tracecompass.analysis.os.linux.core.execution.graph.OsExecutionGraphProvider(trace);



//var ss = analysis.getStateSystem(false);



/*

var event = null

while (iter.hasNext()) {
	event = iter.next();
	eventName = event.getName();
	tid = getEventFieldValue(event, "context._vtid");
	worker_id = getEventFieldValue(event, "worker_id");
	tidToWorkerMap[tid] = worker_id;
		
}

if (event != null) {
	ss.closeHistory(event.getTimestamp().toNanos());
}


var tgEntries = createListWrapper();
var mpiWorkerToId = {};
for (i = 0; i < quarks.size(); i++) {
	quark = quarks.get(i);
	// Get the mpi worker ID, and find its quark
	mpiWorkerId = ss.getAttributeName(quark);
	// Create an entry with the worker ID as name and the quark. The quark will be used to populate the entry's data.
	entry = createEntry(mpiWorkerId, {'quark' : quark});
	mpiWorkerToId[mpiWorkerId] = entry.getID();
	mpiEntries.push(entry);
}
// Sort the entries numerically
mpiEntries.sort(function(a,b){return Number(a.getName()) - Number(b.getName())});
// Add the entries to the entry list
for (i = 0; i < mpiEntries.length; i++) {
	tgEntries.getList().add(mpiEntries[i]);
}
function getEntries(parameters) {
	// The list is static once built, return all entries
	return tgEntries.getList();
}
provider = createScriptedTimeGraphProvider(analysis, getEntries, null, null);
if (provider != null) {
	// Open a time graph view displaying this provider
	openTimeGraphView(provider);
}
*/



function filterOsExecutionGraph(time1, time2, tid){
	//Get the active trace
	var trace = getActiveTrace();
	if (trace == null) {
	      print("Trace is null");
	      exit();
	}
	
	// Get the Statistics module (by name) for that trace
	var analysis = getTraceAnalysis(trace, 'OS Execution Graph');
	if (analysis == null) {
	      print("Statistics analysis not found");
	      exit();
	}
	var graph = analysis.getGraph();
	
	if(graph == null){
		print("Os Execution Graph not found");
	     exit();
	}
	
	var tidToWorkerMap = {};

	print("graph " + graph);

	var workers = graph.getWorkers();
	head = graph.getHead();
	next = head;
	
	filterGraph(next, graph,time1, time2, tid);

}


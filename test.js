loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule("/TraceCompass/DataProvider")
loadModule("/TraceCompass/View")
loadModule("/TraceCompass/Utils");



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

var workers = graph.getWorkers();
	
//get head of graph
head = graph.getHead();
next = head;
//Get the ENUM of the edge directions
var edges =	org.eclipse.tracecompass.analysis.graph.core.base.TmfVertex.EdgeDirection.values();

function recursion(vertex){
	sTime = vertex.getTs();
	valid = true;
	end = false;
	if(valid){
		worker = graph.getParentOf(vertex);
		name = worker.getName();
		info = worker.getWorkerInformation(sTime);
		tid = worker.getHostId();
		id = vertex.getID();
	}
	//exit
	if( ( (vertex.getEdge(edges[0]) == null) && (vertex.getEdge(edges[2]) != null) ) || (end) ){
		return;
	}
	if(vertex.getEdge(edges[0]) != null){
		edge = vertex.getEdge(edges[0]);
		next = vertex. getNeighborFromEdge(edge, edges[0]);
		recursion(next);
	}
	if(vertex.getEdge(edges[2]) != null){
		edge = vertex.getEdge(edges[2]);
		next = vertex. getNeighborFromEdge(edge, edges[2]);
		recursion(next);
	}
}
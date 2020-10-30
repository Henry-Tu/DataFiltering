loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule("/TraceCompass/DataProvider")
loadModule("/TraceCompass/View")
loadModule("/TraceCompass/Utils");

/*
To do:
represent a node as two vertex connected by an edge
method also accepts bool vertical. if vertical then the second vertex must only have a horizontal (in theory). 
copy filtering from method 1
store data in format for graph provider
build graph
*/

var graphEndTime = 0;


print("start test");
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
var iter = workers.iterator();
	if(iter == null){
		print("no iterator");
		exit();
	}
	
//get head of graph


//Get the ENUM of the edge directions
var edges =	org.eclipse.tracecompass.analysis.graph.core.base.TmfVertex.EdgeDirection.values();
print(edges[2].getClass());
//var headTime = head.getTs();
//filter(head);


print("Graph: " + graph);

var scriptedAnalysis = createScriptedAnalysis(trace, "FilterExecutionGraph.js");
var ss = scriptedAnalysis.getStateSystem(false);

while(iter.hasNext()){
	worker = iter.next();
	next = graph.getHead(worker);
	while(next !=null){
		vertex = next;
		edge = vertex.getEdge(edges[2]);
		name = worker.getName();
		sTime = vertex.getTs();
		info = worker.getWorkerInformation(sTime);
		tid = info.get('TID');
		if(edge != null){
			next = vertex.getNeighborFromEdge(edge, edges[2]);
			status = edge.getType();
			eTime = next.getTs();
			if(eTime > graphEndTime){
				graphEndTime = eTime;
			} 
			quark = ss.getQuarkAbsoluteAndAdd(name);
			ss.modifyAttribute(sTime, status.toString(), quark);
			ss.removeAttribute(eTime, quark);
		}else{
			next = null;
		}
	}
}
ss.closeHistory(graphEndTime);
//output graph
	var map = new java.util.HashMap();
	map.put(ENTRY_PATH, '*');
	
	provider = createTimeGraphProvider(scriptedAnalysis, map, "");
	
	if (provider != null) {
		// Open a time graph view displaying this provider
		openTimeGraphView(provider);
	}else{
		print("provider is null");
	}





















































///////////////////////////////////////////////
/*
function filter(vertex){
	if( (vertex.getEdge(edges[0]) != null) && (vertex.getEdge(edges[2]) != null)){
		//print("two edges");
	}
	
	sTime = vertex.getTs();
	print("time: " + (sTime -  1600000000000000000 - 2780000000000000));
	//valid = true;
	end = false;
	
	//print(vertex.getEdge(edges[0]));
	//base condition
	if( ( (vertex.getEdge(edges[0]) == null) && (vertex.getEdge(edges[2]) == null) ) || (end) ){
		print("end");
		return;
	}
	if(vertex.getEdge(edges[0]) != null){
		//print("is true");
		edge = vertex.getEdge(edges[0]);
		next = vertex.getNeighborFromEdge(edge, edges[0]);
		worker = graph.getParentOf(next);
		print("switch worker to " + worker.getName());
		sTime = vertex.getTs();
		eTime = next.getTs();
		//timeElasped = eTime - sTime;
		if( !(eTime> 1602783194330306300) ){
			filter(next);
		}
	}
	//print("line complete);
	if(vertex.getEdge(edges[2]) != null){
		edge = vertex.getEdge(edges[2]);
		next = vertex.getNeighborFromEdge(edge, edges[2]);

		worker = graph.getParentOf(vertex);
		name = worker.getName();
		sTime = vertex.getTs();
		eTime = next.getTs();
		timeElasped = eTime - sTime;
		info = worker.getWorkerInformation(sTime);
		tid = info.get('TID');
		
		filter(next);
		
	}
	
	return;
}
*/
print("complete");
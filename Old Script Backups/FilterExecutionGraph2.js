loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule("/TraceCompass/DataProvider")
loadModule("/TraceCompass/View")
loadModule("/TraceCompass/Utils");

time1 = 0;
time2 = 9999999999999999999999999;
tid = "";



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

//get head of graph
head = graph.getHead();
if(head == null){
	print("Head vertex not found");
	exit();
}

//Get the ENUM of the edge directions
var edges =	org.eclipse.tracecompass.analysis.graph.core.base.TmfVertex.EdgeDirection.values();

//Get state system:
var scriptedAnalysis = createScriptedAnalysis(trace, "FilterExecutionGraph.js");
var ss = scriptedAnalysis.getStateSystem(false);

//For graph output
var tidToWorkerMap = {};

var headTime = head.getTs();
var graphEndTime = 0;

filter(head);


ss.closeHistory(graphEndTime);

//output graph
var map = new java.util.HashMap();
map.put(ENTRY_PATH, '*');
print(map);

provider = createTimeGraphProvider(scriptedAnalysis, map, "");
print(analysis.getClass());

if (provider != null) {
	print("provider not null");
	// Open a time graph view displaying this provider
	openTimeGraphView(provider);
}else{
	print("provider is null");
}



/////////////////////////////////////////
function filter(vertex){
	horEdge = vertex.getEdge(edges[2]);
	verEdge = vertex.getEdge(edges[0]);
	worker = graph.getParentOf(vertex);
	name = worker.getName();
	sTime = vertex.getTs();
	info = worker.getWorkerInformation(sTime);
	tid = info.get('TID');
	
	//base case
	if( (horEdge == null) && (verEdge == null) ){
		return;
	}
	if(verEdge != null){
		verNext = vertex.getNeighborFromEdge(verEdge, edges[0]);
		eTime =verNext.getTs();
		if(eTime > graphEndTime){
			graphEndTime = eTime;
		} 
		filter(verNext);
	}
	if(horEdge != null){
		horNext = vertex.getNeighborFromEdge(horEdge, edges[2]);
		type = horEdge.getType();
		print(type);
		eTime = horNext.getTs();
		if(eTime > graphEndTime){
			graphEndTime = eTime;
		} 
		tidToWorkerMap[tid] = name;
		status = horEdge.getType();
		//print(status.toString());
		quark = ss.getQuarkAbsoluteAndAdd(name);
		ss.modifyAttribute(sTime, status.toString(), quark);
		ss.removeAttribute(eTime, quark);
		filter(horNext);
	}
	
	return;
}


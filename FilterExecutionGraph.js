loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule("/TraceCompass/DataProvider")
loadModule("/TraceCompass/View")
loadModule("/TraceCompass/Utils");

//Filter values
const time1 = 0;                            				//start time
const time2 = 1602814327606576000;          				//end time
const filterTid = -1;                     					//tid: -1 if not in use
const filterStatus = "none";                  				//status: none if not in use
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


function filterExeGraph(){
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
	within = true;
	
	//check if this node is within filter
	if(!((sTime >= time1) && (sTime <= time2)) || ((status != "none") && (status != type)) || ((filterTid != -1) && (filterTid != tid) ) || (next== null)){
		within = false;
	}
	
	
	//base case
	if( (horEdge == null) && (verEdge == null) ){
		return;
	}
	if(verEdge != null){
		verNext = vertex.getNeighborFromEdge(verEdge, edges[0]);
		filter(verNext);
	}
	if(horEdge != null){
		if(within){
			horNext = vertex.getNeighborFromEdge(horEdge, edges[2]);
			type = horEdge.getType();
			eTime = horNext.getTs();
			if(eTime > graphEndTime){
				graphEndTime = eTime;
			} 
			tidToWorkerMap[tid] = name;
			status = horEdge.getType();
			quark = ss.getQuarkAbsoluteAndAdd(name);
			ss.modifyAttribute(sTime, status.toString(), quark);
			ss.removeAttribute(eTime, quark);
		}
		filter(horNext);
	}
	
	return;
}


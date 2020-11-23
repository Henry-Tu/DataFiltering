loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule("/TraceCompass/DataProvider");
loadModule("/TraceCompass/View");
loadModule("/TraceCompass/Utils");

//Filter values
 time1 = 0;                            //start time
 time2 = 9999999999999999999999;          //end time
 filterTid = -1;                     //tid: -1 if not in use
 filterStatus = "none";                  //status: none if not in use

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

var scriptedAnalysis = createScriptedAnalysis(trace, "FilterExecutionGraph.js");
var ss = scriptedAnalysis.getStateSystem(false);
var tgEntries = createListWrapper();
var tgArrows = createListWrapper();
var vertices = [];
var pendingArrows = [];
var vidToEntry = [];
module = new org.eclipse.tracecompass.incubator.scripting.core.data.provider.DataProviderScriptingModule();
var mapEntryToVid = [];
var quark = null;

//loop for all workers
while(iter.hasNext()){
	worker = iter.next();
	next = graph.getHead(worker);
	vid = next.getID();
	sTime = next.getTs();
	//loop for all vertices of a worker
	while(next != null){
		within = true;
		vertex = next;
		vid = vertex.getID();
		sTime = vertex.getTs();
		info = worker.getWorkerInformation(sTime);
		tid = info.get('TID');
	
		//save vertex;
		vertices.push({"vid" : vid, "sTime": sTime});
		edge = vertex.getEdge(edges[2]);
		name = worker.getName();
		quark = ss.getQuarkAbsoluteAndAdd(name);
		
		if(edge != null){
			
			next = edge.getVertexTo();
			status = edge.getType();
			
			eTime = next.getTs();
			if(eTime > graphEndTime){
				graphEndTime = eTime;
			} 
			
			//check if this node is within filter
			if(!((sTime >= time1) && (sTime <= time2)) || ((filterStatus != "none") && (filterStatus != status)) || ((filterTid != -1) && (filterTid != tid) ) || (next== null)){
				within = false;
			}
			if(within){
				ss.modifyAttribute(sTime, status.toString(), quark);
				ss.removeAttribute(eTime, quark);
			}
			
			//if there is an vertical edge, make an arrow
			vertEdge = vertex.getEdge(edges[0]);
			if (vertEdge != null){
				//add this vertex to the list of new arrows
				vert = vertEdge.getVertexTo();
				destVid = vert.getID();
				pendingArrows.push({"source" : vid, "dest": destVid});
			}
			
		}else{
			next = null;
		}
		
	}
	entry = createEntry(name, {'quark' : quark});
	tgEntries.getList().add(entry);
	entryId = entry.getId();
	vertex = vertices.pop();
	while(vertex != null){
		vidToEntry[vertex["vid"]] = {"sTime": vertex["sTime"], "entryId": entryId};
		vertex = vertices.pop();
	}
}

ss.closeHistory(graphEndTime);

//create the arrows

data = pendingArrows.pop();
while(data != null){
	sourceVid = data["source"];
	destVid = data["dest"];
	sourceV = vidToEntry[sourceVid];
	destV = vidToEntry[destVid];
	source = sourceV["entryId"];
	sTime = sourceV["sTime"];
	dest = destV["entryId"];
	duration = destV["sTime"] - sTime;
	tgArrows.getList().add(module.createArrow(source, dest, sTime, duration, 1));
	data = pendingArrows.pop();
}


// A function used to return the entries to the data provider.
function getEntries(parameters) {
	// The list is static once built, return all entries
	return tgEntries.getList();
}

// A function used to return the arrows to the data provider. 
function getArrows(parameters) {
	// Just return all the arrows, the view will take those in the range
	return tgArrows.getList();
}

//output graph
	provider = createScriptedTimeGraphProvider(scriptedAnalysis, getEntries, null, getArrows);
	
	if (provider != null) {
		// Open a time graph view displaying this provider
		openTimeGraphView(provider);
	}else{
		print("provider is null");
	}


print("complete");

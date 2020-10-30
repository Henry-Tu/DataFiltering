loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule("/TraceCompass/DataProvider")
loadModule("/TraceCompass/View")
loadModule("/TraceCompass/Utils");

/*
Entreis receive the name (which is stored as the quark attribute) instead of the worker id. Creating arrows requires the worker id. 


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

var scriptedAnalysis = createScriptedAnalysis(trace, "FilterExecutionGraph.js");
var ss = scriptedAnalysis.getStateSystem(false);
var tgEntries = createListWrapper();
var tgArrows = createListWrapper();
var pendingArrows = [];
module = new org.eclipse.tracecompass.incubator.scripting.core.data.provider.DataProviderScriptingModule();
var mapEntryToVid = [];

//loop for all workers
while(iter.hasNext()){
	worker = iter.next();
	next = graph.getHead(worker);
	
	//loop for all vertices of a worker
	while(next != null){
		vertex = next;
		edge = vertex.getEdge(edges[2]);
		
		if(edge != null){
			name = worker.getName();
			next = edge.getVertexTo();
			status = edge.getType();
			vid = vertex.getID();
			sTime = vertex.getTs();
			eTime = next.getTs();
			if(eTime > graphEndTime){
				graphEndTime = eTime;
			} 
			
			quark = ss.getQuarkAbsoluteAndAdd(name);
			ss.modifyAttribute(sTime, status.toString(), quark);
			ss.removeAttribute(eTime, quark);
			entry = createEntry(name, {'quark' : quark});
			tgEntries.getList().add(entry);
			
			//save entry incase it is needed later to create an arrow
			entryId = entry.getId();
			mapEntryToVid[vid] = {"entryId" : entryId, "time" : sTime};
			
			//if there is an vertical edge, make an arrow
			vertEdge = vertex.getEdge(edges[0]);
			if (vertEdge != null){
				vert = vertEdge.getVertexTo();
				destVid = vert.getID();
				
				//if the dest entry id has yet to be saved, save data of this vertex
				destEntry = mapEntryToVid[destVid]
				if(destEntry == null){
					pendingArrows[destVid] = {"sTime" : sTime, "source" : entryId, "destVid" : destVid}
				}else{
					//the dest entry id has already been stored
					eTime = destEntry["time"];
					duration = eTime - sTime;
					source = entryId;
					dest = destEntry["entryId"];
					tgArrows.getList().add(module.createArrow(source, dest, sTime, duration, 1));
				}
			}
			//If this is a dest for an arrow
			pArrow = pendingArrows[vid];
			if(pArrow != null){
				pendingArrows[vid] = null;
				eTime = sTime;
				sTime = pArrow["sTime"];
				source = pArrow["source"];
				dest = entryId;
				duration = eTime - sTime;
				tgArrows.getList().add(module.createArrow(source, dest, sTime, duration, 1));
			}
		}else{
			next = null;
		}
	}
	
	
}

ss.closeHistory(graphEndTime);


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

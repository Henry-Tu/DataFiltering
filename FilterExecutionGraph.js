loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule("/TraceCompass/DataProvider")
loadModule("/TraceCompass/View")
loadModule("/TraceCompass/Utils");




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
	mpiWorkerToId[mpiWorkerId] = entry.getId();
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



class filterOsExecutionGraph(){
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
	var tidToWorkerMap = {};

	print("graph " + graph);

	var workers = graph.getWorkers();
	head = graph.getHead();
	next = head;
	
	filterGraph();

}


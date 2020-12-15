loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule('/System/Resources');
loadModule('/TraceCompass/View');
loadModule('/TraceCompass/TraceUI');

//list of all syscalls
//list of syscall types and frequency

const saveLocation = "workspace://DataFiltering/syscalls.txt";
var file = createFile(saveLocation);
var fileHandle = writeLine(file, "Syscall Output");
var followName = "wget";

trace =  getActiveTrace();
events =  getEventIterator(trace);
unmatchedEntry = [];
syscalls = [];
sysTypes = [];
rawSyscalls = "";
test = new Array(314).fill(0);

data = "";
counter = 0;
print("start");

// Get Critical Path

signal = new org.eclipse.tracecompass.analysis.os.linux.core.signals.TmfThreadSelectedSignal(this, 1, trace);
org.eclipse.tracecompass.tmf.core.signal.TmfSignalManager.dispatchSignal(signal);
analysis = getTraceAnalysis(trace, 'OS Execution Graph');
analysis.schedule();
analysis.waitForCompletion();
	
osGraph = analysis.getGraph();
	
//Find the tid of the targeted thread
	
workers = osGraph.getWorkers();
iter = workers.iterator();
followTid = null;
targetWorker = null;
//linear search through each thread/worker until one with the matching name is found
while(iter.hasNext()){
	worker = iter.next();
	info = worker.getWorkerInformation();
	name = worker.getName();
	if(name == followName){
		info = worker.getWorkerInformation();
		tid = info.get('TID');
		followTid = tid;
		targetWorker = worker;
		break;
	}
}
if(followTid == null){
	print("Thread was not found");
	exit();
}
//Select the thread that we want the critical path of.
signal = new org.eclipse.tracecompass.analysis.os.linux.core.signals.TmfThreadSelectedSignal(this, followTid, trace);
org.eclipse.tracecompass.tmf.core.signal.TmfSignalManager.dispatchSignal(signal);
analysis = new org.eclipse.tracecompass.analysis.os.linux.core.execution.graph.OsExecutionGraph();
analysis.setTrace(trace);
analysis.schedule();
analysis.waitForCompletion();
osGraph = analysis.getGraph();
critPathMod = org.eclipse.tracecompass.analysis.graph.core.criticalpath.CriticalPathModule(analysis);
critPathMod.setTrace(trace);
critPathMod.setParameter("workerid", targetWorker);
critPathMod.schedule();
critPathMod.waitForCompletion();

let critPath = critPathMod.getCriticalPath();
if(critPath == null){
	print("Critical path not found");
	print(signal.getThreadId());
	    exit();
}

workers = critPath.getWorkers();
	
//get head of graph
head = critPath.getHead();
next = head;


//Get the ENUM of the edge directions
edges =	org.eclipse.tracecompass.analysis.graph.core.base.TmfVertex.EdgeDirection.values();

previous = null;
//Loop for all nodes in graph
while(next != null){
		
	vertex = next;
	vertical = false;
	worker = critPath.getParentOf(vertex);
	name = worker.getName();
	sTime = vertex.getTs();	
	
	info = worker.getWorkerInformation(sTime);
	tid = info.get('TID');
	//Find next vertex
	if(vertex.getEdge(edges[0]) != null){
		edge = vertex.getEdge(edges[0]);
		type = edge.getType();
		next = vertex.getNeighborFromEdge(edge, edges[0]);
		vertical = true;
	}else if (vertex.getEdge(edges[2]) != null){
		edge = vertex.getEdge(edges[2]);
		next = vertex.getNeighborFromEdge(edge, edges[2]);
		eTime = next.getTs();
			notPass = true;
			while(events.hasNext() && notPass){
				if(previous!=null){
					event = previous;
					previous = null;
				}else{
					event = events.next();
				}
				if(event.getName().substr(0,7) == "syscall"){
					eventTime = event.getTimestamp().toNanos();
					
					//fastforward to node time if the event happens before this node
					if (eventTime < sTime){
						below = true;
						while(events.hasNext() && below){
							event = events.next();
							eventTime = event.getTimestamp().toNanos();
							
							if(eventTime >= sTime){
								below = false;
								//print("below = false");
							}
						}
					}
					//if the event happens before the end of this node
					if(eventTime < eTime && !below){
						//get the tid of the syscall
						fields = event.getContent().getFields().iterator();
						while(fields.hasNext()){
							field = fields.next();
							if(field.getName() == "context._tid"){
								eventTid = field.toString().substr(13);
								if(eventTid == tid){
									
									//check if it is an entry

									time= event.getTimestamp().toNanos();
									if(event.getName().toString().substring(8,13) == "entry"){
										//print("entry found");
										type = event.getName().toString().substring(14);
										//print("entry-" + type); 
										unmatchedEntry.push({"type" : type, "tid": tid, "time":time});
									}else if(event.getName().toString().substring(8,12) == "exit"){
										type = event.getName().toString().substring(13);
										entry = unmatchedEntry.pop();
										if(entry != null && entry["type"] == type && entry["tid"] == tid){
											sTime = entry["time"];
											duration = time - sTime;
											writeLine(fileHandle,"Thread: " + name + " Syscall: " + event.getName().substr(8) + " Time: " + sTime + " Duration: " + duration + " Data: " + event.getContent());
											syscalls.push({"type" : type, "tid": tid, "time":sTime, "duration" : duration});
											typeFreq(type);
											rawSyscalls += type + " ";
										}else{
											//put the entry back into the stack
											unmatchedEntry.push(entry);
										}
									}
								}
							}
						}
					//the event takes place after this node
					}else if(eventTime > eTime && !below){
						previous = event;
						notPass = false;
					}
			}
		}
		
	}else{
		next = null;
	}
}

for (i = 0; i < sysTypes.length; i++){
		print("Syscall: " + sysTypes[i]["type"] + " Frequency: " + sysTypes[i]["freq"]);
	}
	vector = toVector(rawSyscalls);
	print("Vector Mag: " + vecMagnitude(vector));
	for(i = 0; i<vector.length; i++){
		print(vector[i]);
	}
print("complete");




function typeFreq(type){
	for (i = 0; i < sysTypes.length; i++){
		comparee = sysTypes[i];
		cType = comparee["type"];
		if(type == cType){
			comparee["freq"] ++;
			return;
		}
	}
	sysTypes.push({"type": type, "freq": 1});
}
		








function termFreqMap(str) {
	var words = str.split(' ');
	var termFreq = {};
	words.forEach(function(w) {
            termFreq[w] = (termFreq[w] || 0) + 1;
        });
    return termFreq;
}

function addKeysToDict(map, dict) {
	for (var key in map) {
		dict[key] = true;
	}
}

function termFreqMapToVector(map, dict) {
	var termFreqVector = [];
	for (var term in dict) {
		termFreqVector.push(map[term] || 0);
	}
	return termFreqVector;
}

function vecDotProduct(vecA, vecB) {
	var product = 0;
	for (var i = 0; i < vecA.length; i++) {
		product += vecA[i] * vecB[i];
	}
	return product;
}

function vecMagnitude(vec) {
	var sum = 0;
	for (var i = 0; i < vec.length; i++) {
		sum += vec[i] * vec[i];
	}
	return Math.sqrt(sum);
}

function cosineSimilarity(vecA, vecB) {
	return vecDotProduct(vecA, vecB) / (vecMagnitude(vecA) * vecMagnitude(vecB));
}

function textCosineSimilarity(strA, strB) {
	var termFreqA = termFreqMap(strA);
	var termFreqB = termFreqMap(strB);

	var dict = {};
	addKeysToDict(termFreqA, dict);
	addKeysToDict(termFreqB, dict);

	var termFreqVecA = termFreqMapToVector(termFreqA, dict);
	var termFreqVecB = termFreqMapToVector(termFreqB, dict);

	return cosineSimilarity(termFreqVecA, termFreqVecB);
}

function toVector(str){
	var termFreq = termFreqMap(str);
	var dict = {};
	addKeysToDict(termFreq, dict);
	var termFreqVec = termFreqMapToVector(termFreq, dict);
	return termFreqVec;
}

loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule('/System/Resources');
loadModule('/TraceCompass/View');
loadModule('/TraceCompass/TraceUI');


const syscallPath= "workspace://DataFiltering/syscalls";
const critPathPath = "workspace://DataFiltering/critPaths";
var followName = "wget";
var numTraces = 1000;

print("start");
var syscallOut = createFile(syscallPath +"1.txt");
var syscallHandle = writeLine(syscallOut, "Syscall Output");
var critPathOut = createFile(critPathPath + "1.txt");
var critPathHandle = writeLine(critPathOut, "Syscall Output");

for( traceNum = 1; traceNum <= numTraces; traceNum++){ 
	//set location of next trace
	if(traceNum == 1){
		location = "kernel";
	}else{
		location = "kernel(" + (traceNum) +")" ;
	}
	print("Analyzing trace " + traceNum);
	trace = openTrace("Tracing", location, false);
 	if (trace == null) {
      print("Trace is null");
	} else{
		writeLine(syscallHandle, "Trace Number " + traceNum);
		writeLine(critPathHandle, "Trace Number " + traceNum);
		getData(trace);
		writeLine(syscallHandle,"");
		
		//for every 100 traces, if there are more traces, generate new txt files
		if( (traceNum < numTraces) && (((traceNum) % 100) == 0 ) ){
			syscallOut = createFile(syscallPath + ((traceNum/100.0)+1) +".txt");
			syscallHandle = writeLine(syscallOut, "Syscall Output");
			critPathOut = createFile(critPathPath + ((traceNum/100.0)+1) +".txt");
			critPathHandle = writeLine(critPathOut, "Syscall Output");
		}
	}
}

function getData(trace){
	events =  getEventIterator(trace);
	
	data = "";
	
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
		return;
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
		    return;
	}
	
	workers = critPath.getWorkers();
		
	//get head of graph
	head = critPath.getHead();
	if(head == null){
		print("Critical path graph head not found");
		print(signal.getThreadId());
		    return;
	}
	next = head;
	critOutStr = "";
	
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
			
			//output critpath data
			type = edge.getType();
			critOutStr += name + "-" + getChar(type) + " ";
			
			
			//output syscalls
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
										//if the tid matches, output the content of the syscall
										writeLine(syscallHandle,"Time: " + eventTime + " CPU id: " + event.getCPU() + " Thread: " + name + " Syscall: " + event.getName().substr(8) + " " + event.getContent());
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
			print("end of crit path");
		}
	}
	critOutStr +="\n";
	writeLine(critPathHandle, critOutStr);
}
print("complete");
exit();

/**
* Method for matching the crit path status with a char
**/
function getChar(status){
	
	if(status == "BLOCK_DEVICE"){
		return'A';
	}else if(status == "BLOCKED"){
		return('B');
	}else if(status == "DEFAULT"){
		return'C';
	}else if(status == "EPS"){
		return'D';
	}else if(status == "INTERRUPTED"){
		return'E';
	}else if(status == "IPI"){
		return'F';
	}else if(status =="NETWORK"){
		return'G';
	}else if(status == "PREEMPTED"){
		return'H';
	}else if(status == "RUNNING"){
		return'I';
	}else if(status == "TIMER"){
		return'J';
	}else if(status == "UNKNOWN"){
		return'K';
	}else if(status == "USER_INPUT"){
		return'L';
	}else{
		return'Z';
	}
}

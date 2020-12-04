loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule('/System/Resources');
loadModule('/TraceCompass/View');
loadModule('/TraceCompass/TraceUI');


const syscallPath= "workspace://DataFiltering/syscalls";
const critPathPath = "workspace://DataFiltering/critPaths";
const vectorPath= "workspace://DataFiltering/vectors";
var followName = "wget";
var numTraces = 200;

print("start");
var d = new Date();
var t= d.getTime();
var syscallOut = createFile(syscallPath + t + ".txt");
var syscallHandle = writeLine(syscallOut, "Syscall Output");
var critPathOut = createFile(critPathPath + t + ".txt");
var critPathHandle = writeLine(critPathOut, "Syscall Output");
var freqVectorOut = createFile(vectorPath +"Freq" + t +".csv");
var freqVectorHandle = writeLine(freqVectorOut, "Vector Output");
var durVectorOut = createFile(vectorPath +"Dur" + t+ ".csv");


//Vector csv headers
header = "";
for(i=0;i<313;i++){
	header+=i+",";
}
header+=313;
var freqVectorHandle = writeLine(freqVectorOut, header);
var durVectorHandle = writeLine(durVectorOut, header);

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
	
	unmatchedEntry = [];
	rawSyscalls = "";
	freqVector = [];
	durationVector = [];
	//iniitialize vectors
	for(x = 0; x < 315; x++){
		freqVector[x]=0;
		durationVector[x]=0;
	}
	
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
										
										time= event.getTimestamp().toNanos();
										if(event.getName().toString().substring(8,13) == "entry"){
											type = event.getName().toString().substring(14);
											unmatchedEntry.push({"type" : type, "tid": tid, "time":time});
										}else if(event.getName().toString().substring(8,12) == "exit"){
											type = event.getName().toString().substring(13);
											entry = unmatchedEntry.pop();
											if(entry != null && entry["type"] == type && entry["tid"] == tid){
												sTime = entry["time"];
												duration = time - sTime;
												//writeLine(fileHandle,"Thread: " + name + " Syscall: " + event.getName().substr(8) + " Time: " + sTime + " Duration: " + duration + " Data: " + event.getContent());
												//syscalls.push({"type" : type, "tid": tid, "time":sTime, "duration" : duration});
												//typeFreq(type);
												sysNum = assignVal(type);
												freqVector[sysNum] ++;
												durationVector[sysNum] += duration;
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
			print("end of crit path");
		}
	}
	writeLine(freqVectorHandle, vectorToString(freqVector));
	writeLine(durVectorHandle, vectorToString(durationVector));
	
	
	critOutStr +="\n";
	writeLine(critPathHandle, critOutStr);
	closeSignal = new org.eclipse.tracecompass.tmf.core.signal.TmfTraceClosedSignal(this, trace);
	org.eclipse.tracecompass.tmf.core.signal.TmfSignalManager.dispatchSignal(closeSignal);
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




function vectorToString(vector){
	output = "";
	for(f = 0; f<vector.length-2; f++){
		output += vector[f] + ",";
	}
	output += vector[vector.length-1];
	return output;
}





































function assignVal(syscall){
	if(syscall == "sys_read"){ 
    	return 0; 
} 

	else if(syscall == "write"){ 
	
	    return 1; 
	
	} 
	
	else if(syscall == "open"){ 
	
	    return 2; 
	
	} 
	
	else if(syscall == "close"){ 
	
	    return 3; 
	
	} 
	
	else if(syscall == "stat"){ 
	
	    return 4; 
	
	} 
	
	else if(syscall == "fstat"){ 
	
	    return 5; 
	
	} 
	
	else if(syscall == "lstat"){ 
	
	    return 6; 
	
	} 
	
	else if(syscall == "poll"){ 
	
	    return 7; 
	
	} 
	
	else if(syscall == "lseek"){ 
	
	    return 8; 
	
	} 
	
	else if(syscall == "mmap"){ 
	
	    return 9; 
	
	} 
	
	else if(syscall == "mprotect"){ 
	
	    return 10; 
	
	} 
	
	else if(syscall == "munmap"){ 
	
	    return 11; 
	
	} 
	
	else if(syscall == "brk"){ 
	
	    return 12; 
	
	} 
	
	else if(syscall == "rt_sigaction"){ 
	
	    return 13; 
	
	} 
	
	else if(syscall == "rt_sigprocmask"){ 
	
	    return 14; 
	
	} 
	
	else if(syscall == "rt_sigreturn"){ 
	
	    return 15; 
	
	} 
	
	else if(syscall == "ioctl"){ 
	
	    return 16; 
	
	} 
	
	else if(syscall == "pread64"){ 
	
	    return 17; 
	
	} 
	
	else if(syscall == "pwrite64"){ 
	
	    return 18; 
	
	} 
	
	else if(syscall == "readv"){ 
	
	    return 19; 
	
	} 
	
	else if(syscall == "writev"){ 
	
	    return 20; 
	
	} 
	
	else if(syscall == "access"){ 
	
	    return 21; 
	
	} 
	
	else if(syscall == "pipe"){ 
	
	    return 22; 
	
	} 
	
	else if(syscall == "select"){ 
	
	    return 23; 
	
	} 
	
	else if(syscall == "sched_yield"){ 
	
	    return 24; 
	
	} 
	
	else if(syscall == "mremap"){ 
	
	    return 25; 
	
	} 
	
	else if(syscall == "msync"){ 
	
	    return 26; 
	
	} 
	
	else if(syscall == "mincore"){ 
	
	    return 27; 
	
	} 
	
	else if(syscall == "madvise"){ 
	
	    return 28; 
	
	} 
	
	else if(syscall == "shmget"){ 
	
	    return 29; 
	
	} 
	
	else if(syscall == "shmat"){ 
	
	    return 30; 
	
	} 
	
	else if(syscall == "shmctl"){ 
	
	    return 31; 
	
	} 
	
	else if(syscall == "dup"){ 
	
	    return 32; 
	
	} 
	
	else if(syscall == "dup2"){ 
	
	    return 33; 
	
	} 
	
	else if(syscall == "pause"){ 
	
	    return 34; 
	
	} 
	
	else if(syscall == "nanosleep"){ 
	
	    return 35; 
	
	} 
	
	else if(syscall == "getitimer"){ 
	
	    return 36; 
	
	} 
	
	else if(syscall == "alarm"){ 
	
	    return 37; 
	
	} 
	
	else if(syscall == "setitimer"){ 
	
	    return 38; 
	
	} 
	
	else if(syscall == "getpid"){ 
	
	    return 39; 
	
	} 
	
	else if(syscall == "sendfile"){ 
	
	    return 40; 
	
	} 
	
	else if(syscall == "socket"){ 
	
	    return 41; 
	
	} 
	
	else if(syscall == "connect"){ 
	
	    return 42; 
	
	} 
	
	else if(syscall == "accept"){ 
	
	    return 43; 
	
	} 
	
	else if(syscall == "sendto"){ 
	
	    return 44; 
	
	} 
	
	else if(syscall == "recvfrom"){ 
	
	    return 45; 
	
	} 
	
	else if(syscall == "sendmsg"){ 
	
	    return 46; 
	
	} 
	
	else if(syscall == "recvmsg"){ 
	
	    return 47; 
	
	} 
	
	else if(syscall == "shutdown"){ 
	
	    return 48; 
	
	} 
	
	else if(syscall == "bind"){ 
	
	    return 49; 
	
	} 
	
	else if(syscall == "listen"){ 
	
	    return 50; 
	
	} 
	
	else if(syscall == "getsockname"){ 
	
	    return 51; 
	
	} 
	
	else if(syscall == "getpeername"){ 
	
	    return 52; 
	
	} 
	
	else if(syscall == "socketpair"){ 
	
	    return 53; 
	
	} 
	
	else if(syscall == "setsockopt"){ 
	
	    return 54; 
	
	} 
	
	else if(syscall == "getsockopt"){ 
	
	    return 55; 
	
	} 
	
	else if(syscall == "clone"){ 
	
	    return 56; 
	
	} 
	
	else if(syscall == "fork"){ 
	
	    return 57; 
	
	} 
	
	else if(syscall == "vfork"){ 
	
	    return 58; 
	
	} 
	
	else if(syscall == "execve"){ 
	
	    return 59; 
	
	} 
	
	else if(syscall == "exit"){ 
	
	    return 60; 
	
	} 
	
	else if(syscall == "wait4"){ 
	
	    return 61; 
	
	} 
	
	else if(syscall == "kill"){ 
	
	    return 62; 
	
	} 
	
	else if(syscall == "uname"){ 
	
	    return 63; 
	
	} 
	
	else if(syscall == "semget"){ 
	
	    return 64; 
	
	} 
	
	else if(syscall == "semop"){ 
	
	    return 65; 
	
	} 
	
	else if(syscall == "semctl"){ 
	
	    return 66; 
	
	} 
	
	else if(syscall == "shmdt"){ 
	
	    return 67; 
	
	} 
	
	else if(syscall == "msgget"){ 
	
	    return 68; 
	
	} 
	
	else if(syscall == "msgsnd"){ 
	
	    return 69; 
	
	} 
	
	else if(syscall == "msgrcv"){ 
	
	    return 70; 
	
	} 
	
	else if(syscall == "msgctl"){ 
	
	    return 71; 
	
	} 
	
	else if(syscall == "fcntl"){ 
	
	    return 72; 
	
	} 
	
	else if(syscall == "flock"){ 
	
	    return 73; 
	
	} 
	
	else if(syscall == "fsync"){ 
	
	    return 74; 
	
	} 
	
	else if(syscall == "fdatasync"){ 
	
	    return 75; 
	
	} 
	
	else if(syscall == "truncate"){ 
	
	    return 76; 
	
	} 
	
	else if(syscall == "ftruncate"){ 
	
	    return 77; 
	
	} 
	
	else if(syscall == "getdents"){ 
	
	    return 78; 
	
	} 
	
	else if(syscall == "getcwd"){ 
	
	    return 79; 
	
	} 
	
	else if(syscall == "chdir"){ 
	
	    return 80; 
	
	} 
	
	else if(syscall == "fchdir"){ 
	
	    return 81; 
	
	} 
	
	else if(syscall == "rename"){ 
	
	    return 82; 
	
	} 
	
	else if(syscall == "mkdir"){ 
	
	    return 83; 
	
	} 
	
	else if(syscall == "rmdir"){ 
	
	    return 84; 
	
	} 
	
	else if(syscall == "creat"){ 
	
	    return 85; 
	
	} 
	
	else if(syscall == "link"){ 
	
	    return 86; 
	
	} 
	
	else if(syscall == "unlink"){ 
	
	    return 87; 
	
	} 
	
	else if(syscall == "symlink"){ 
	
	    return 88; 
	
	} 
	
	else if(syscall == "readlink"){ 
	
	    return 89; 
	
	} 
	
	else if(syscall == "chmod"){ 
	
	    return 90; 
	
	} 
	
	else if(syscall == "fchmod"){ 
	
	    return 91; 
	
	} 
	
	else if(syscall == "chown"){ 
	
	    return 92; 
	
	} 
	
	else if(syscall == "fchown"){ 
	
	    return 93; 
	
	} 
	
	else if(syscall == "lchown"){ 
	
	    return 94; 
	
	} 
	
	else if(syscall == "umask"){ 
	
	    return 95; 
	
	} 
	
	else if(syscall == "gettimeofday"){ 
	
	    return 96; 
	
	} 
	
	else if(syscall == "getrlimit"){ 
	
	    return 97; 
	
	} 
	
	else if(syscall == "getrusage"){ 
	
	    return 98; 
	
	} 
	
	else if(syscall == "sysinfo"){ 
	
	    return 99; 
	
	} 
	
	else if(syscall == "times"){ 
	
	    return 100; 
	
	} 
	
	else if(syscall == "ptrace"){ 
	
	    return 101; 
	
	} 
	
	else if(syscall == "getuid"){ 
	
	    return 102; 
	
	} 
	
	else if(syscall == "syslog"){ 
	
	    return 103; 
	
	} 
	
	else if(syscall == "getgid"){ 
	
	    return 104; 
	
	} 
	
	else if(syscall == "setuid"){ 
	
	    return 105; 
	
	} 
	
	else if(syscall == "setgid"){ 
	
	    return 106; 
	
	} 
	
	else if(syscall == "geteuid"){ 
	
	    return 107; 
	
	} 
	
	else if(syscall == "getegid"){ 
	
	    return 108; 
	
	} 
	
	else if(syscall == "setpgid"){ 
	
	    return 109; 
	
	} 
	
	else if(syscall == "getppid"){ 
	
	    return 110; 
	
	} 
	
	else if(syscall == "getpgrp"){ 
	
	    return 111; 
	
	} 
	
	else if(syscall == "setsid"){ 
	
	    return 112; 
	
	} 
	
	else if(syscall == "setreuid"){ 
	
	    return 113; 
	
	} 
	
	else if(syscall == "setregid"){ 
	
	    return 114; 
	
	} 
	
	else if(syscall == "getgroups"){ 
	
	    return 115; 
	
	} 
	
	else if(syscall == "setgroups"){ 
	
	    return 116; 
	
	} 
	
	else if(syscall == "setresuid"){ 
	
	    return 117; 
	
	} 
	
	else if(syscall == "getresuid"){ 
	
	    return 118; 
	
	} 
	
	else if(syscall == "setresgid"){ 
	
	    return 119; 
	
	} 
	
	else if(syscall == "getresgid"){ 
	
	    return 120; 
	
	} 
	
	else if(syscall == "getpgid"){ 
	
	    return 121; 
	
	} 
	
	else if(syscall == "setfsuid"){ 
	
	    return 122; 
	
	} 
	
	else if(syscall == "setfsgid"){ 
	
	    return 123; 
	
	} 
	
	else if(syscall == "getsid"){ 
	
	    return 124; 
	
	} 
	
	else if(syscall == "capget"){ 
	
	    return 125; 
	
	} 
	
	else if(syscall == "capset"){ 
	
	    return 126; 
	
	} 
	
	else if(syscall == "rt_sigpending"){ 
	
	    return 127; 
	
	} 
	
	else if(syscall == "rt_sigtimedwait"){ 
	
	    return 128; 
	
	} 
	
	else if(syscall == "rt_sigqueueinfo"){ 
	
	    return 129; 
	
	} 
	
	else if(syscall == "rt_sigsuspend"){ 
	
	    return 130; 
	
	} 
	
	else if(syscall == "sigaltstack"){ 
	
	    return 131; 
	
	} 
	
	else if(syscall == "utime"){ 
	
	    return 132; 
	
	} 
	
	else if(syscall == "mknod"){ 
	
	    return 133; 
	
	} 
	
	else if(syscall == "uselib"){ 
	
	    return 134; 
	
	} 
	
	else if(syscall == "personality"){ 
	
	    return 135; 
	
	} 
	
	else if(syscall == "ustat"){ 
	
	    return 136; 
	
	} 
	
	else if(syscall == "statfs"){ 
	
	    return 137; 
	
	} 
	
	else if(syscall == "fstatfs"){ 
	
	    return 138; 
	
	} 
	
	else if(syscall == "sysfs"){ 
	
	    return 139; 
	
	} 
	
	else if(syscall == "getpriority"){ 
	
	    return 140; 
	
	} 
	
	else if(syscall == "setpriority"){ 
	
	    return 141; 
	
	} 
	
	else if(syscall == "sched_setparam"){ 
	
	    return 142; 
	
	} 
	
	else if(syscall == "sched_getparam"){ 
	
	    return 143; 
	
	} 
	
	else if(syscall == "sched_setscheduler"){ 
	
	    return 144; 
	
	} 
	
	else if(syscall == "sched_getscheduler"){ 
	
	    return 145; 
	
	} 
	
	else if(syscall == "sched_get_priority_max"){ 
	
	    return 146; 
	
	} 
	
	else if(syscall == "sched_get_priority_min"){ 
	
	    return 147; 
	
	} 
	
	else if(syscall == "sched_rr_get_interval"){ 
	
	    return 148; 
	
	} 
	
	else if(syscall == "mlock"){ 
	
	    return 149; 
	
	} 
	
	else if(syscall == "munlock"){ 
	
	    return 150; 
	
	} 
	
	else if(syscall == "mlockall"){ 
	
	    return 151; 
	
	} 
	
	else if(syscall == "munlockall"){ 
	
	    return 152; 
	
	} 
	
	else if(syscall == "vhangup"){ 
	
	    return 153; 
	
	} 
	
	else if(syscall == "modify_ldt"){ 
	
	    return 154; 
	
	} 
	
	else if(syscall == "pivot_root"){ 
	
	    return 155; 
	
	} 
	
	else if(syscall == "_sysctl"){ 
	
	    return 156; 
	
	} 
	
	else if(syscall == "prctl"){ 
	
	    return 157; 
	
	} 
	
	else if(syscall == "arch_prctl"){ 
	
	    return 158; 
	
	} 
	
	else if(syscall == "adjtimex"){ 
	
	    return 159; 
	
	} 
	
	else if(syscall == "setrlimit"){ 
	
	    return 160; 
	
	} 
	
	else if(syscall == "chroot"){ 
	
	    return 161; 
	
	} 
	
	else if(syscall == "sync"){ 
	
	    return 162; 
	
	} 
	
	else if(syscall == "acct"){ 
	
	    return 163; 
	
	} 
	
	else if(syscall == "settimeofday"){ 
	
	    return 164; 
	
	} 
	
	else if(syscall == "mount"){ 
	
	    return 165; 
	
	} 
	
	else if(syscall == "umount2"){ 
	
	    return 166; 
	
	} 
	
	else if(syscall == "swapon"){ 
	
	    return 167; 
	
	} 
	
	else if(syscall == "swapoff"){ 
	
	    return 168; 
	
	} 
	
	else if(syscall == "reboot"){ 
	
	    return 169; 
	
	} 
	
	else if(syscall == "sethostname"){ 
	
	    return 170; 
	
	} 
	
	else if(syscall == "setdomainname"){ 
	
	    return 171; 
	
	} 
	
	else if(syscall == "iopl"){ 
	
	    return 172; 
	
	} 
	
	else if(syscall == "ioperm"){ 
	
	    return 173; 
	
	} 
	
	else if(syscall == "create_module"){ 
	
	    return 174; 
	
	} 
	
	else if(syscall == "init_module"){ 
	
	    return 175; 
	
	} 
	
	else if(syscall == "delete_module"){ 
	
	    return 176; 
	
	} 
	
	else if(syscall == "get_kernel_syms"){ 
	
	    return 177; 
	
	} 
	
	else if(syscall == "query_module"){ 
	
	    return 178; 
	
	} 
	
	else if(syscall == "quotactl"){ 
	
	    return 179; 
	
	} 
	
	else if(syscall == "nfsservctl"){ 
	
	    return 180; 
	
	} 
	
	else if(syscall == "getpmsg"){ 
	
	    return 181; 
	
	} 
	
	else if(syscall == "putpmsg"){ 
	
	    return 182; 
	
	} 
	
	else if(syscall == "afs_syscall"){ 
	
	    return 183; 
	
	} 
	
	else if(syscall == "tuxcall"){ 
	
	    return 184; 
	
	} 
	
	else if(syscall == "security"){ 
	
	    return 185; 
	
	} 
	
	else if(syscall == "gettid"){ 
	
	    return 186; 
	
	} 
	
	else if(syscall == "readahead"){ 
	
	    return 187; 
	
	} 
	
	else if(syscall == "setxattr"){ 
	
	    return 188; 
	
	} 
	
	else if(syscall == "lsetxattr"){ 
	
	    return 189; 
	
	} 
	
	else if(syscall == "fsetxattr"){ 
	
	    return 190; 
	
	} 
	
	else if(syscall == "getxattr"){ 
	
	    return 191; 
	
	} 
	
	else if(syscall == "lgetxattr"){ 
	
	    return 192; 
	
	} 
	
	else if(syscall == "fgetxattr"){ 
	
	    return 193; 
	
	} 
	
	else if(syscall == "listxattr"){ 
	
	    return 194; 
	
	} 
	
	else if(syscall == "llistxattr"){ 
	
	    return 195; 
	
	} 
	
	else if(syscall == "flistxattr"){ 
	
	    return 196; 
	
	} 
	
	else if(syscall == "removexattr"){ 
	
	    return 197; 
	
	} 
	
	else if(syscall == "lremovexattr"){ 
	
	    return 198; 
	
	} 
	
	else if(syscall == "fremovexattr"){ 
	
	    return 199; 
	
	} 
	
	else if(syscall == "tkill"){ 
	
	    return 200; 
	
	} 
	
	else if(syscall == "time"){ 
	
	    return 201; 
	
	} 
	
	else if(syscall == "futex"){ 
	
	    return 202; 
	
	} 
	
	else if(syscall == "sched_setaffinity"){ 
	
	    return 203; 
	
	} 
	
	else if(syscall == "sched_getaffinity"){ 
	
	    return 204; 
	
	} 
	
	else if(syscall == "set_thread_area"){ 
	
	    return 205; 
	
	} 
	
	else if(syscall == "io_setup"){ 
	
	    return 206; 
	
	} 
	
	else if(syscall == "io_destroy"){ 
	
	    return 207; 
	
	} 
	
	else if(syscall == "io_getevents"){ 
	
	    return 208; 
	
	} 
	
	else if(syscall == "io_submit"){ 
	
	    return 209; 
	
	} 
	
	else if(syscall == "io_cancel"){ 
	
	    return 210; 
	
	} 
	
	else if(syscall == "get_thread_area"){ 
	
	    return 211; 
	
	} 
	
	else if(syscall == "lookup_dcookie"){ 
	
	    return 212; 
	
	} 
	
	else if(syscall == "epoll_create"){ 
	
	    return 213; 
	
	} 
	
	else if(syscall == "epoll_ctl_old"){ 
	
	    return 214; 
	
	} 
	
	else if(syscall == "epoll_wait_old"){ 
	
	    return 215; 
	
	} 
	
	else if(syscall == "remap_file_pages"){ 
	
	    return 216; 
	
	} 
	
	else if(syscall == "getdents64"){ 
	
	    return 217; 
	
	} 
	
	else if(syscall == "set_tid_address"){ 
	
	    return 218; 
	
	} 
	
	else if(syscall == "restart_syscall"){ 
	
	    return 219; 
	
	} 
	
	else if(syscall == "semtimedop"){ 
	
	    return 220; 
	
	} 
	
	else if(syscall == "fadvise64"){ 
	
	    return 221; 
	
	} 
	
	else if(syscall == "timer_create"){ 
	
	    return 222; 
	
	} 
	
	else if(syscall == "timer_settime"){ 
	
	    return 223; 
	
	} 
	
	else if(syscall == "timer_gettime"){ 
	
	    return 224; 
	
	} 
	
	else if(syscall == "timer_getoverrun"){ 
	
	    return 225; 
	
	} 
	
	else if(syscall == "timer_delete"){ 
	
	    return 226; 
	
	} 
	
	else if(syscall == "clock_settime"){ 
	
	    return 227; 
	
	} 
	
	else if(syscall == "clock_gettime"){ 
	
	    return 228; 
	
	} 
	
	else if(syscall == "clock_getres"){ 
	
	    return 229; 
	
	} 
	
	else if(syscall == "clock_nanosleep"){ 
	
	    return 230; 
	
	} 
	
	else if(syscall == "exit_group"){ 
	
	    return 231; 
	
	} 
	
	else if(syscall == "epoll_wait"){ 
	
	    return 232; 
	
	} 
	
	else if(syscall == "epoll_ctl"){ 
	
	    return 233; 
	
	} 
	
	else if(syscall == "tgkill"){ 
	
	    return 234; 
	
	} 
	
	else if(syscall == "utimes"){ 
	
	    return 235; 
	
	} 
	
	else if(syscall == "vserver"){ 
	
	    return 236; 
	
	} 
	
	else if(syscall == "mbind"){ 
	
	    return 237; 
	
	} 
	
	else if(syscall == "set_mempolicy"){ 
	
	    return 238; 
	
	} 
	
	else if(syscall == "get_mempolicy"){ 
	
	    return 239; 
	
	} 
	
	else if(syscall == "mq_open"){ 
	
	    return 240; 
	
	} 
	
	else if(syscall == "mq_unlink"){ 
	
	    return 241; 
	
	} 
	
	else if(syscall == "mq_timedsend"){ 
	
	    return 242; 
	
	} 
	
	else if(syscall == "mq_timedreceive"){ 
	
	    return 243; 
	
	} 
	
	else if(syscall == "mq_notify"){ 
	
	    return 244; 
	
	} 
	
	else if(syscall == "mq_getsetattr"){ 
	
	    return 245; 
	
	} 
	
	else if(syscall == "kexec_load"){ 
	
	    return 246; 
	
	} 
	
	else if(syscall == "waitid"){ 
	
	    return 247; 
	
	} 
	
	else if(syscall == "add_key"){ 
	
	    return 248; 
	
	} 
	
	else if(syscall == "request_key"){ 
	
	    return 249; 
	
	} 
	
	else if(syscall == "keyctl"){ 
	
	    return 250; 
	
	} 
	
	else if(syscall == "ioprio_set"){ 
	
	    return 251; 
	
	} 
	
	else if(syscall == "ioprio_get"){ 
	
	    return 252; 
	
	} 
	
	else if(syscall == "inotify_init"){ 
	
	    return 253; 
	
	} 
	
	else if(syscall == "inotify_add_watch"){ 
	
	    return 254; 
	
	} 
	
	else if(syscall == "inotify_rm_watch"){ 
	
	    return 255; 
	
	} 
	
	else if(syscall == "migrate_pages"){ 
	
	    return 256; 
	
	} 
	
	else if(syscall == "openat"){ 
	
	    return 257; 
	
	} 
	
	else if(syscall == "mkdirat"){ 
	
	    return 258; 
	
	} 
	
	else if(syscall == "mknodat"){ 
	
	    return 259; 
	
	} 
	
	else if(syscall == "fchownat"){ 
	
	    return 260; 
	
	} 
	
	else if(syscall == "futimesat"){ 
	
	    return 261; 
	
	} 
	
	else if(syscall == "newfstatat"){ 
	
	    return 262; 
	
	} 
	
	else if(syscall == "unlinkat"){ 
	
	    return 263; 
	
	} 
	
	else if(syscall == "renameat"){ 
	
	    return 264; 
	
	} 
	
	else if(syscall == "linkat"){ 
	
	    return 265; 
	
	} 
	
	else if(syscall == "symlinkat"){ 
	
	    return 266; 
	
	} 
	
	else if(syscall == "readlinkat"){ 
	
	    return 267; 
	
	} 
	
	else if(syscall == "fchmodat"){ 
	
	    return 268; 
	
	} 
	
	else if(syscall == "faccessat"){ 
	
	    return 269; 
	
	} 
	
	else if(syscall == "pselect6"){ 
	
	    return 270; 
	
	} 
	
	else if(syscall == "ppoll"){ 
	
	    return 271; 
	
	} 
	
	else if(syscall == "unshare"){ 
	
	    return 272; 
	
	} 
	
	else if(syscall == "set_robust_list"){ 
	
	    return 273; 
	
	} 
	
	else if(syscall == "get_robust_list"){ 
	
	    return 274; 
	
	} 
	
	else if(syscall == "splice"){ 
	
	    return 275; 
	
	} 
	
	else if(syscall == "tee"){ 
	
	    return 276; 
	
	} 
	
	else if(syscall == "sync_file_range"){ 
	
	    return 277; 
	
	} 
	
	else if(syscall == "vmsplice"){ 
	
	    return 278; 
	
	} 
	
	else if(syscall == "move_pages"){ 
	
	    return 279; 
	
	} 
	
	else if(syscall == "utimensat"){ 
	
	    return 280; 
	
	} 
	
	else if(syscall == "epoll_pwait"){ 
	
	    return 281; 
	
	} 
	
	else if(syscall == "signalfd"){ 
	
	    return 282; 
	
	} 
	
	else if(syscall == "timerfd_create"){ 
	
	    return 283; 
	
	} 
	
	else if(syscall == "eventfd"){ 
	
	    return 284; 
	
	} 
	
	else if(syscall == "fallocate"){ 
	
	    return 285; 
	
	} 
	
	else if(syscall == "timerfd_settime"){ 
	
	    return 286; 
	
	} 
	
	else if(syscall == "timerfd_gettime"){ 
	
	    return 287; 
	
	} 
	
	else if(syscall == "accept4"){ 
	
	    return 288; 
	
	} 
	
	else if(syscall == "signalfd4"){ 
	
	    return 289; 
	
	} 
	
	else if(syscall == "eventfd2"){ 
	
	    return 290; 
	
	} 
	
	else if(syscall == "epoll_create1"){ 
	
	    return 291; 
	
	} 
	
	else if(syscall == "dup3"){ 
	
	    return 292; 
	
	} 
	
	else if(syscall == "pipe2"){ 
	
	    return 293; 
	
	} 
	
	else if(syscall == "inotify_init1"){ 
	
	    return 294; 
	
	} 
	
	else if(syscall == "preadv"){ 
	
	    return 295; 
	
	} 
	
	else if(syscall == "pwritev"){ 
	
	    return 296; 
	
	} 
	
	else if(syscall == "rt_tgsigqueueinfo"){ 
	
	    return 297; 
	
	} 
	
	else if(syscall == "perf_event_open"){ 
	
	    return 298; 
	
	} 
	
	else if(syscall == "recvmmsg"){ 
	
	    return 299; 
	
	} 
	
	else if(syscall == "fanotify_init"){ 
	
	    return 300; 
	
	} 
	
	else if(syscall == "fanotify_mark"){ 
	
	    return 301; 
	
	} 
	
	else if(syscall == "prlimit64"){ 
	
	    return 302; 
	
	} 
	
	else if(syscall == "name_to_handle_at"){ 
	
	    return 303; 
	
	} 
	
	else if(syscall == "open_by_handle_at"){ 
	
	    return 304; 
	
	} 
	
	else if(syscall == "clock_adjtime"){ 
	
	    return 305; 
	
	} 
	
	else if(syscall == "syncfs"){ 
	
	    return 306; 
	
	} 
	
	else if(syscall == "sendmmsg"){ 
	
	    return 307; 
	
	} 
	
	else if(syscall == "setns"){ 
	
	    return 308; 
	
	} 
	
	else if(syscall == "getcpu"){ 
	
	    return 309; 
	
	} 
	
	else if(syscall == "process_vm_readv"){ 
	
	    return 310; 
	
	} 
	
	else if(syscall == "process_vm_writev"){ 
	
	    return 311; 
	
	} 
	
	else if(syscall == "kcmp"){ 
	
	    return 312; 
	
	} 
	
	else if(syscall == "finit_module"){ 
	
	    return 313; 
	
	} else{
		return 314;
	}
}

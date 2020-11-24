# DataFiltering:

Main function: Import traces into trace compass, and output txt file with either a string representation of their critical paths or output the syscalls along their critical paths. Setup for traces of wget.


## Setup instructions:
* Prerequisites: Trace Compass installed on a Ubuntu system with the “Trace Compass Javascript (Incubation) add-on

* Extract the contents of this folder to your “.tracecompass” folder

* Open the shell scripts “compareSyscalls” and “compareCritPaths” 
	* modify the “tracecompassPath” variables with the path to your Trace Compass installation folder
	* modify the “scriptPath” and “path1” variables with the path to the location of the locations of the ease script and traces respectively. You should only need to change the username  (ie replace “henry” in the path with your Linux	username)
	* Set the numTraces variables you want processed

* Open the ease scripts “compareCritPathsCLI.js” and “compareSyscallsCLI.js”. These are the main ease scripts which are run by the aforementioned shell scripts. 
	* Set the numTraces variables you want processed
	* (Optional) set the output location in the saveLocation constant. Default 	location is the “DataFiltering” folder.

* Currently expects traces with the name format of wgetx  where x is subsequent number (eg. wget1, wget2,...wgetx, see SampleTraces folder)

## Script Functions: 

**compareCritPaths** – Main script for critical path comparison
A shell script that will open Trace Compass, import traces and run the comparison script “compareCriticalPathsCLI.js”. Will output a .txt file with a string representation of each trace’s critical path of wget and some simple analysis.

**compareSyscalls** – Main script for system calls comparison
A shell script that will open Trace Compass, import traces and run the comparison script “compareSyscallsCLI.js”. Will output a .txt file with each trace’s syscalls that are along the critical path

**compareCriticalPaths.js**
A version of compareCriticalPathsCLI.js that is designed to be run in Trace Compass with the traces already imported and within the DataFiltering’s traces folder.

**compareCriticalPathsCLI.js**
Should only be run by a shell script. The script that will generate the critical path and do the comparing. The path to this script should be specified in “compareCritPaths” shell script. Filter parameters and output location can be modified in this script. 

**compareSyscallsCLI.js**
Should only be run by a shell script. The script that will generate the critical path and filter the syscalls with it. The path to this script should be specified in “compareSyscalls” shell script.

**FilterExecutionGraph.js **
An ease script that will open the execution graph of a trace. Requires a trace to be open and a thread selected (needs to be updated)

**getCritPath.js**
An ease script that will provide the critical path of a single trace. Requires the trace to be already imported and the thread selected.

**getSyscallsOfCritPath.js**
An ease script that will output the syscalls along the critical path of a trace that has already been imported and opened

**loopTrace**
A shell script that will generate 15 traces of wget being called on www.brocku.ca





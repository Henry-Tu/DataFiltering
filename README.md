# DataFiltering:

Main function: Import traces into trace compass, and output txt files with string representations of their critical paths and output the syscalls along their critical paths. Setup for traces of wget.


## Setup instructions:
* Prerequisites: Trace Compass installed on a Ubuntu system with the “Trace Compass Javascript (Incubation) add-on

* Extract the contents of this folder to your “.tracecompass” folder

* Open the shell scripts “collect data”
	* modify the “tracecompassPath” variables with the path to your Trace Compass installation folder
	* modify the “scriptPath” and “path1” variables with the path to the location of the locations of the ease script and traces respectively. You should only need to change the username  (ie replace “henry” in the path with your Linux	username)
	* Set the numTraces variables you want processed

* Open the ease scripts “collectData.js”. This is the main ease script which is run by the aforementioned shell script. 
	* Set the numTraces variables you want processed
	* (Optional) set the output locations in the critPathPath and syscallPath constants. Default location is the “DataFiltering” folder.

* Currently expects traces with the name format of wgetx  where x is subsequent number (eg. wget1, wget2,...wgetx, see SampleTraces folder)

## Scripts and their functions: 
**collectData** - Main script
A shell script that will open Trace Compass, import traces and run the comparison script “collectData.js”. Will output two .txt files (one for the critical path, one for syscalls) for each 100 traces.

**collectData.js**
Should only be run by a shell script. The script that will generate the critical path and filter the syscalls with it and outputs both. The path to this script should be specified in “compareSyscalls” shell script.

**compareCritPaths** – Script for critical path comparison
A shell script that will open Trace Compass, import traces and run the comparison script “compareCriticalPathsCLI.js”. Will output a .txt file with a string representation of each trace’s critical path of wget and some simple analysis.

**compareSyscalls** – Script for system calls comparison
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

### Notes:
* It will be common for errors messages to appear in the terminal. They are caused by quirks in Trace Compass and can be ignored.
* It is recomended after runnign to right click at the top of the windows where the traces are listed and clicking close all so Trace Compass does not try to load all the traces next it runs
* When all traces have been analyzed and the output complete, the console will output complete. You will need to manually close Trace Compass for the scripts to finish running.



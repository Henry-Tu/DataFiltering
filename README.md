DataFiltering:

Main function: Import traces into trace compass, get their critical path, create a string representation to compare. 
Currently expects traces in with the name format wgetx (eg. wget1, wget2,...wgetx) where it expects each trace to be subsequently numbered. The number of traces must be set in both openAndCompare and compareCriticalPathsCLI.js, which are stored in variables. 
Trace location should be set in openAndCompare in the variable path1.
Output location should be specified in compareCriticalPathsCLI.js


openAndCompare  - Main script
A shell script that should be run in your trace compass directory. It will open Trace Compass, import traces and run the comparison script.

compareCriticalPathsCLI.js
The script that will do the comparing. The path to this script should be specified in openAndCompare. Filter parameters and output location can be modified in this script.

compareCriticalPaths.js
A version of compareCriticalPathsCLI.js that is designed to be run in Trace Compass with the traces already imported

FilterExecutionGraph4.js
A script to be run in Trace Compass that will open the execution graph of a trace

getCritPath.js
A script to be run in Trace Compass that will provide the critical path of a single trace that was already imported

loopTrace
A shell script that will generate 15 traces of wget being called on www.brocku.ca





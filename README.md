# IBE.js

This framework is responsible for instrumenting Google Chrome extensions. Instrumenting an extension means modifying its source code to record information about its usage. Specifically, the relevant functions are modified so that, when they are called, the number of times they have been executed and the time they have taken to execute are recorded in a file.

The script needs to be given a .zip extension as an argument when executed. The extension is decompressed into a temporary directory, instrumented and re-compressed. The resulting file is the instrumented extension.

Requirements
The script requires Python 3 and the following libraries:
* shutil
* zipfile
* sys
* codecs
* json
* os
* copy
* matplotlib
* requests
* math
* re
* subprocess
* colorama
* shared_functions

Use
To run the script, use the following command:

python main.py my_extension.zip

Where my_extension.zip is the file of the extension you want to instrument. Make sure you have the necessary permissions to write to the current directory and that the folder "my_extension.zip" must be inside the folder "extension_file" so that it can be detected by the program. 

Limitations
The script is not able to distinguish between different versions of the same extension. If it is run multiple times with the same extension, previous results will be overwritten.

The script is also not able to instrument extensions that depend on other libraries, such as jQuery or Angular. These libraries are automatically skipped during the instrumentation process.

Additional information
The script is based on the use of Node.js and its prior installation is required.

Example of implementation
In the "extension_file" folder there are four examples of folders with extensions in ZIP format:
* fdepmfkeabkenofnoepdijlaaoklenpm.zip
* acjecbgflnhmeldadcbblhfdimhifpki.zip
* behkgahlidmeemjefcbgieigiejiglpc.zip
* ddjgegjignlpekchgcmipekkplalknkp.zip
* firefox.zip

To instrument one of these ZIP files, the steps would be:

1. Make sure that the zip folder to be implemented is inside the extension_file folder.

2. Execute the following command in the terminal from the directory where the framework has been downloaded (assuming that we want to instrument the extension corresponding to behkgahlidmeemjefcbgieigiejiglpc.zip):

python instrument.py behkgahlidmeemjefcbgieigiejiglpc.zip

3. As a result we will get a new compressed folder in the extension_file directory called: behkgahlhlidmeemjefcbgieigiejiglpc_instrumented.zip

4. When you unzip this folder, you will find the js files declared in the manifest.json file of extension


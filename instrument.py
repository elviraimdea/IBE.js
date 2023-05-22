import shutil
import zipfile
import sys
import codecs, json, os, copy, matplotlib, requests, math, re
import subprocess

from colorama import Fore

from shared_functions import *

def getCoverage(extension):
    file_path = "extension_file/{}".format(extension)
    with zipfile.ZipFile(file_path, 'r') as extension_zip:
        extension_name = os.path.splitext(extension)[0]
        path= "extension_file/{}".format(extension_name)
        extension_zip.extractall(path)

    if path:
        try:
            total_lines_added = instrument(extension_name, path)
            zip_path = "extension_file/{}_instrumented.zip".format(extension_name)
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for root, dirs, files in os.walk(path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        zip_file.write(file_path, os.path.relpath(file_path, path))

            shutil.rmtree(path)
        except:
            raise Exception("Background is not a dictionary")

def instrument(extension_id, extension_path):
    
    new_ep = "instrumented/{}".format(extension_id)

    scripts = find_files(extension_path) # lista de ficheros de la extensión
    if scripts is None:
        raise Exception("Background is not a dictionary")

    output = {}
    
    for script in scripts:
        token = extension_id + "/" + script
        try:
            output_node = subprocess.check_output([
                'node', os.getcwd() + os.sep + 'instrument' + os.sep + 'inst.js',
                                  extension_path + os.sep + script, token
            ], timeout=60)

        except subprocess.CalledProcessError as e:
            print("command '{}' return with error (code {}): {}".format(e.cmd, e.returncode, e.output))
        
        try:
            total_lines_added = eval(output_node)
        except:
            print('{}Error at getting the total_lines_added {}'.format(Fore.RED, Fore.RESET))
            total_lines_added = -1
        
        output[script] = total_lines_added
        if total_lines_added > 0:
            try:
                shutil.copy("output.js", extension_path + os.sep + script)
                os.remove("output.js")
            except:
                print('{}Error in copying files{}'.format(Fore.RED, Fore.RESET, extension_id))

    return output


def find_files(extension_path):
    # TODO See how to filter or not comercial libraries, e.g., jquery, angular, etc
    files = os.listdir(extension_path)  # lista de los nombres de los directorios en extension_path

    manifest = load_manifest(os.path.join(os.getcwd(), extension_path))  # coge la extension?

    if 'permissions' in manifest.keys():
        addAllUrl = False
        hostList = ['http', '*']
        for elem in hostList:
            for permission in manifest['permissions']:
                if elem in permission:
                    addAllUrl = True
                    break
            if addAllUrl:
                break

        if addAllUrl:
            manifest['permissions'].append('<all_urls>')

    scripts = set()

    if "background" in manifest.keys():
        if type(manifest["background"]) == dict:
            for elem in range(len(manifest["background"])):
                if "scripts" in manifest["background"].keys():
                    for item in manifest["background"]["scripts"]:
                        if not "jquery" in item.lower():
                            scripts.add(item if not item.startswith('./') else item[2:])
                if "service_worker" in manifest["background"].keys():
                    if not "jquery" in manifest["background"]["service_worker"]:
                        scripts.add(manifest["background"]["service_worker"] if not manifest["background"][
                            "service_worker"].startswith('./') else manifest["background"]["service_worker"][2:])
        else:
            print("Error, background is not a dictionary")
            return None

    if "content_scripts" in manifest.keys():
        if type(manifest["content_scripts"]) == dict or type(manifest["content_scripts"]) == list or type(
                manifest["content_script"]) == tuple:
            for elem in range(len(manifest["content_scripts"])):
                if 'matches' in manifest["content_scripts"][elem].keys():
                    if '<all_urls>' not in manifest["content_scripts"][elem]['matches']:
                        manifest["content_scripts"][elem]['matches'].append('<all_urls>')
                else:
                    manifest["content_scripts"][elem]['matches'] = ['<all_urls>']

                if "js" in manifest["content_scripts"][elem].keys():
                    for item in manifest["content_scripts"][elem]["js"]:
                        if not "jquery" in item.lower():
                            scripts.add(item if not item.startswith('./') else item[2:])
        else:
            print("Error, content_script is not an array")

            save_JSON(os.path.join(extension_path, "manifest"), manifest)

    return scripts

def load_manifest(path):
    try:
        for dirpath, dirnames, filenames in os.walk(path):
            if 'manifest.json' in filenames:
                input_file = os.path.join(os.sep, path, 'manifest.json')
                input_file2 = codecs.decode(open(input_file).read().encode(), 'utf-8-sig')
                manifest = json.loads(input_file2)
                return manifest
    except Exception as e:
        print(Fore.RED + "[+] Error in {}: {}".format(path, e) + Fore.RESET)
        return False
    print(path)
    return False


if len(sys.argv) != 2 or not sys.argv[1].endswith(".zip"):
    print("Error: debe proporcionar un archivo .zip como parámetro")
    sys.exit(1)

else:
    ext = sys.argv[1]
    getCoverage(ext)
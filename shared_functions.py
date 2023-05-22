import codecs, json, os

import seaborn as sns
from colorama import Fore

sns.set_theme(style="ticks")
sns.color_palette("colorblind")

dynamic_functions = 0

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


def save_JSON(filename, final_json):
    if not filename.endswith('.json'):
        filename = filename + '.json'
    if not filename:
        filename = "temporal.json"

    with open('{}'.format(filename), 'w') as f:
        json.dump(final_json, f)


def load_JSON(filename):
    if filename.endswith('.json'):
        f = open('{}'.format(filename))
    else:
        f = open('{}.json'.format(filename))
    return json.load(f)



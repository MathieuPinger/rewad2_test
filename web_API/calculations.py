#!C:/Local/python.exe

import sys
import csv
import json

id = sys.argv[1]
exp1_path = f"../data/{id}_exp1.csv"
print(exp1_path)

# Just to confirm that data is loaded successfully
# with open(path) as expdata:
#     reader = csv.DictReader(expdata)
#     for row in reader:
#         print(row)

# Now create a new json file for experiment 2
# (arbitrary values for testing)
new_params = {
    "1": {
        "id": 1,
        "immOpt": 100,
        "delOpt": 200,
        "delay": 365
    },
    "2": {
        "id": 2,
        "immOpt": 200,
        "delOpt": 300,
        "delay": 265
    },
    "3": {
        "id": 3,
        "immOpt": 100,
        "delOpt": 1000,
        "delay": 500
    }
}

# save new json file for exp2
params_path = f"../data/{id}_params_exp2.json"
with open(params_path, 'w') as json_file:
    json_file.write(json.dumps(new_params))
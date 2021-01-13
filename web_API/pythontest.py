#!C:/Anaconda/python.exe

import sys
import csv
import json

id = "test"
exp1_path = f"../data/{id}_exp1.csv"
print(exp1_path)

# Just to confirm that data is loaded successfully
with open(exp1_path) as expdata:
    reader = csv.DictReader(expdata)
    for row in reader:
        print(row)

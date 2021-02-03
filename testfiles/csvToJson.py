import json
import csv

# shamlessly copied and adapted from
# https://www.geeksforgeeks.org/convert-csv-to-json-using-python/


# Takes the file paths as arguments 
def make_json(csvFilePath, jsonFilePath): 
      
    # create a dictionary 
    data = {} 
      
    # Open a csv reader called DictReader 
    with open(csvFilePath, encoding='utf-8') as csvf: 
        csvReader = csv.DictReader(csvf, delimiter=',') 
          
        # Convert each row into a dictionary  
        # and add it to data 
        for rows in csvReader:
            # Primary key: row ID
            key = rows['id']
            data[key] = rows 
  
    # Open a json writer, and use the json.dumps()  
    # function to dump data 
    with open(jsonFilePath, 'w', encoding='utf-8') as jsonf: 
        jsonf.write(json.dumps(data, indent=4)) 
          
# # Driver Code 
  
# # Decide the two file paths according to your  
# computer system 
csvFilePath = r'testfile.csv'
jsonFilePath = r'testfile.json'
  
# Call the make_json function 
make_json(csvFilePath, jsonFilePath)
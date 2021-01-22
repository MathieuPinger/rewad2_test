<?php

// get ID
$post_data = json_decode(file_get_contents('php://input'), true); 
$id = $post_data['prolific_id'];

// construct filename to look for
$name_csv1 = "../data/".$id."_exp1.csv";
$name_csv2 = "../data/".$id."_exp2.csv";
$name_params = "../data/".$id."_params_exp2.json";

// check for existing files
if (
    !file_exists($name_csv1) &&
    !file_exists($name_csv2)
) {   
    $filefound = '0'; // no file exists
} else if (
    file_exists($name_csv1) &&
    file_exists($name_params) &&
    !file_exists($name_csv2)
) {
    $filefound = '1'; // exp1 completed, but no exp2
} else if (
    file_exists($name_csv1) &&
    file_exists($name_csv2) &&
    file_exists($name_params)
) {
    $filefound = '2'; // all data exist
};

echo $filefound;
?>
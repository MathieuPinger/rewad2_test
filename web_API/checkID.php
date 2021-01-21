<?php

// get ID
$post_data = json_decode(file_get_contents('php://input'), true); 
$id = $post_data['prolific_id'];

// construct filename to look for
$name = "../data/".$id."_exp1.csv"; 

// check for existing file
if (!file_exists($name)) {   
$filefound = '0';
};

echo $filefound;
?>
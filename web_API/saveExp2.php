<?php
$post_data = json_decode(file_get_contents('php://input'), true); 
// the directory "data" must be writable by the server
//print_r($post_data);
$id = $post_data['prolific_id'];
$save_data = $post_data['data'];
$name = "../data/".$id."_exp2.csv"; 
// write the file to disk
file_put_contents($name, $save_data);
?>
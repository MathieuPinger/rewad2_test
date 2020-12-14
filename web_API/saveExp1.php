<?php
$post_data = json_decode(file_get_contents('php://input'), true); 
// the directory "data" must be writable by the server
$id = uniqid();
$name = "../data/".$id."_exp1.csv"; 
// write the file to disk
file_put_contents($name, $post_data);
exec("python calculations.py $post_data");
echo($id);
?>
<?php
	$to="demo@demomail.com";/*Your Email*/
	$subject="Message from the website contact form";

	$date=date("l, F jS, Y");
	$time=date("h:i A");

	$name=$_REQUEST['name'];
	$email=$_REQUEST['email'];
	$lastName=$_REQUEST['lastname'];
	$textmessage=$_REQUEST['textmessage'];

	$msg="
		Message sent from website form on date  $date, hour: $time.\n	
		Name: $name\n
		Email: $email\n	
		Message: $textmessage\n	
		";
	if($email=="") {
	echo "<div class='alert alert-danger'>
			  <a class='close' data-dismiss='alert'>×</a>
			  <strong>Warning!</strong> Please fill all the fields.
		  </div>";
	} else {
	mail($to,$subject,$msg,"From:".$email);
	echo "<div class='alert alert-success'>
			  <a class='close' data-dismiss='alert'>×</a>
			  <strong>Thank you for your message!</strong>
		  </div>";
	}
?>

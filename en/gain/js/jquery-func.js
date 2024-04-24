jQuery(document).ready(function ($) {

/*----------------------------------------------------- Newssleter and contact Form -------------------------*/
	$("#newsletter, #form-contact").submit(function() {
		var elem = $(this);
		var urlTarget = $(this).attr("action");
		$.ajax({
			type : "POST",
			url : urlTarget,
			dataType : "html",
			data : $(this).serialize(),
			beforeSend : function() {
				elem.prepend("<div class='loading alert'>" + "<a class='close' data-dismiss='alert'>×</a>" + "Loading" + "</div>");
				//elem.find(".loading").show();
			},
			success : function(response) {
				elem.prepend(response);
				//elem.find(".response").html(response);
				elem.find(".loading").hide();
				elem.find("input[type='text'],input[type='email'],textarea").val("");
			}
		});
		return false;
	});


/*---------------------------------------------------------------- One Page Navigation ----------------------------*/

	$('.nav').onePageNav({
		filter: ':not(.external)',
		scrollThreshold: 0.25,
		scrollOffset: 60,
	});
         


/*--------------------------------------------------------------------------- ToTop -------------------------------*/

	 $(window).scroll(function(){
		 if ($(this).scrollTop() > 100) {
			 $('.scrollup').fadeIn();
		 } else {
			 $('.scrollup').fadeOut();
		 }
	 }); 
 
	 $('.scrollup').click(function(){
		 $("html, body").animate({ scrollTop: 0 }, 600);
		 return false;
	 });
    
	
	      

	
	
/*--------------------------------------------------------------------------- Lightbox -------------------------------*/
	
	$("a.lightbox_image").fancybox({
		'transitionIn'	:	'elastic',
		'transitionOut'	:	'elastic',
		'speedIn'		:	600, 
		'speedOut'		:	200, 
		'overlayShow'	:	false
	});
	



/*--------------------------------------------------------------------------- Tooltip-------------------------------*/
	
	if( $.fn.tooltip() ) {
		$('[class="tooltip_hover"]').tooltip();
	}





/*--------------------------------------------------------------------------- Lightbox map -------------------------------*/
	
	$("#openmap").fancybox({
			'width'				: '65%',
			'height'			: '65%',
	        'autoScale'     	: false,
	        'transitionIn'		: 'none',
			'transitionOut'		: 'none',
			'type'				: 'iframe'
	});



/*--------------------------------------------------------------------------- Responsive Video -------------------------------*/	
	
	$(".video").fitVids();





/*--------------------------------------------------------------------------- Hover Animations ------------------------------*/

	$('header .buttons a, .information a.btn').hover(function() {
		$(this).toggleClass('animated bounce');
	});

	$('.pricing-table, .features .item').hover(function() {
		$(this).toggleClass('animated pulse');
	});

	$('.logos a img').hover(function() {
		$(this).toggleClass('animated flip');
	});

	$('footer img.map').hover(function() {
		$(this).toggleClass('animated shake');
	});










});









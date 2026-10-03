/*
* Template Name: MyPortfolio
* Template URL: https://bootstrapmade.com/myportfolio-bootstrap-portfolio-website-template/
* License: https://bootstrapmade.com/license/
*/

function renderProjects() {
  var grid = document.getElementById('portfolio-grid');
  if (!grid) return;

  grid.innerHTML = PROJECTS.map(function (p) {
    var media = p.image
      ? '<img class="img-fluid" src="' + p.image + '" alt="' + p.title + '">'
      : '<div class="item-placeholder"><span>' + p.title + '</span></div>';

    var badges = p.stack.map(function (tech) {
      return '<span class="badge badge-light stack-badge">' + tech + '</span>';
    }).join('');

    return (
      '<div class="item ' + p.category + ' col-sm-6 col-md-4 col-lg-4 mb-4">' +
        '<a href="' + p.url + '" class="item-wrap"' + (p.external ? ' target="_blank" rel="noopener"' : '') + '>' +
          media +
          '<div class="work-info">' +
            '<h3>' + p.title + '</h3>' +
            '<div class="stack-badges">' + badges + '</div>' +
            '<p>' + p.description + '</p>' +
          '</div>' +
        '</a>' +
      '</div>'
    );
  }).join('');
}
document.addEventListener('DOMContentLoaded', renderProjects);

(function ($) {
  "use strict";

  var burgerMenu = function() {
	  $('.burger').click(function(e) {
	  	$(window).scrollTop(0);
	    if(!$('.burger').hasClass('active'))
	      $('.burger').addClass('active');
	    else
	      $('.burger').removeClass('active');
	  });
  }
  burgerMenu();

  var siteIstotope = function() {
	  var $container = $('#portfolio-grid').isotope({
	    itemSelector : '.item',
	    isFitWidth: true
	  });

	  $(window).resize(function(){
	    $container.isotope({
	      columnWidth: '.col-sm-3'
	    });
	  });
	  
	  $container.isotope({ filter: '*' });

	  $('#filters').on( 'click', 'a', function(e) {
	  	e.preventDefault();
	    var filterValue = $(this).attr('data-filter');
	    $container.isotope({ filter: filterValue });
	    $('#filters a').removeClass('active');
	    $(this).addClass('active');
	  });
  }
  $(window).on('load', function () {
    siteIstotope();
  });


  var siteOwlCarousel = function() {
  	$('.testimonial-carousel').owlCarousel({
		  center: true,
	    items: 1,
	    loop: true,
	    margin: 0,
	    autoplay: true,
	    smartSpeed: 1000,
		});
  };
  siteOwlCarousel();


})(jQuery);

AOS.init({
	easing: 'ease',
	duration: 1000,
	once: true
});

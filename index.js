document.addEventListener('DOMContentLoaded', function() {

  function renderMovies(movieArray) {
    var movieHTML = movieArray.map(function (currentMovie){
      return `
          <div class="movie">
							<div class="card" style="width: 18rem;">
									<img class="card-img-top" src="${currentMovie.Poster}" alt="Card image cap">
									<div class="card-body">
										<h5 class="card-title">${currentMovie.Title} <span class="badge badge-secondary">${currentMovie.Year}</span></h5>
										<p class="card-text">IMDB ID: ${currentMovie.imdbID}</p>
										<button onclick="saveToWatchlist('${currentMovie.imdbID}')" class="btn btn-primary">Go somewhere</button>
									</div>
							</div>
          </div>
          `;
    });

    return movieHTML.join('');
  }

  var content = document.getElementById('movies-container');
  content.innerHTML = renderMovies(movieData);
  
});



function saveToWatchlist(imdbID) {
  var movie = movieData.find(function (currentMovie) {
      return currentMovie.imdbID == imdbID;
  })

  var watchlistJSON = localStorage.getItem("watchlist");
  if (watchlistJSON === null) {
    var watchlist = [];
  } else{
    var watchlist = JSON.parse(watchlistJSON);
  }

  watchlist.push(movie);

  watchlistJSON = JSON.stringify(watchlist);
  localStorage.setItem("watchlist", watchlistJSON);

  console.log(watchlist);
}
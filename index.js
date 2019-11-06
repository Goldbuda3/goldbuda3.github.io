document.addEventListener('DOMContentLoaded', function() {
    function renderMovies(movieArray) {
      var movieHTML = movieArray.map(function (currentMovie){
        return `
            <div class="movie">
              <div class="card">
                      <img class="card-img-top" src="${currentMovie.Poster}" alt="Card image cap">
                      <div class="card-body">
                          <h5 class="card-title"><a href="https://www.imdb.com/title/${currentMovie.imdbID}/">${currentMovie.Title}</a> <span class="badge badge-secondary">${currentMovie.Year}</span></h5>
                          <p class="card-text">IMDB ID: ${currentMovie.imdbID}</p>
                          <a href="#" class="btn btn-primary" onclick="saveToWatchlist(${currentMovie.imdbID})">Add Movie</button></a>
                      </div>
              </div>
            </div>
            `;
      });
  
      return movieHTML.join('');
    }  

    document.getElementById('search-form').addEventListener('submit', function(e){
        e.preventDefault();
        var content = document.getElementById('movies-container');
        content.innerHTML = renderMovies(movieData);
    })

  });


  function saveToWatchlist(imdbID){
    var movie = movieData.find(function(currentMovie){
      return currentMovie.imdbID = imdbID;
    })

    var watchlistJSON = localStorage.getItem("watchlist");

    if(watchlist == null ){
      watchlist =[];
    }else{
      var watchlist = JSON.parse(watchlistJSON);
    }
    watchlist.push(movie);

    watchlistJSON = JSON.stringify(watchlist)
    localStorage.setItem("watchlist", watchlistJSON)

console.log(watchlist);
}
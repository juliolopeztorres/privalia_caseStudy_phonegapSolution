(function(){
    /*
      Global variables - 1st scope
    */
    var app = angular.module("caseStudy", ['infinite-scroll']);
    var service_url = "https://api.trakt.tv";
    var fanart_api_key = "da599f168d006fe5a202da8453c6ff8a";
    var fanart_url = "https://webservice.fanart.tv/v3/movies";

    // --------------------------------------------------------------------

    /*
      Controllers
    */

    /*
      Main controller for the app
    */
    app.controller('MainController', function($scope, RequestsTraktTV) {
      var controller = this;
      $scope.requestsTraktTV = new RequestsTraktTV();
    });

    // --------------------------------------------------------------------

    /*
      Directives
    */
    app.directive("noResultsSection", function(){
      return {
        restrict: "E",
        templateUrl: "templates/noresults.html"
      };
    });

    app.directive("movieSection", function(){
      return {
        restrict: "E",
        templateUrl: "templates/movie.html"
      };
    });

    app.directive("loadingSection", function(){
      return {
        restrict: "E",
        templateUrl: "templates/loading.html"
      };
    });

    app.directive("navigationBarSection", function(){
      return {
        restrict: "E",
        templateUrl: "templates/navbar.html"
      };
    });

    app.directive("inputSearchMovie", function(){
      return {
        restrict: "E",
        templateUrl: "templates/inputSearchMovie.html"
      };
    });

    // --------------------------------------------------------------------

    /*
      Factories
    */

    /*
      Main object to track the movies from the API
    */
    app.factory('RequestsTraktTV', function($http, $q) {
      var RequestsTraktTV = function() {
        this.movies = []; // List of movies
        this.busy = false; // In order to check if it is busy or not (it has requests)
        this.page = 1; // Current page of listing
        this.limit = 10; // Limit of results per page
        this.num = 1; // Variable to get the movie listed
        this.searching = false; // In order to check if it is searching (input has text)
        this.search_text = ''; // The query user is looking for
        this.dirty = false; // Trigger in order to know when it is first launched
      };

      /*
        Funcitons
      */

      // Checks if the API has returned some movies
      RequestsTraktTV.prototype.checkResults = function() {
        return this.movies.length == 0 && !this.busy && this.dirty;
      };

      // Gets the images from FANART's API. The image choosen is the first of list of thumbs.
      RequestsTraktTV.prototype.getImages = function(movie) {
        (function(that, movie){
          // Get the id of the movie from imdb of tmdb. Otherwise, don't launch the request
          var id_movie = (movie.movie.ids.imdb !== "undefined") ? movie.movie.ids.imdb : movie.movie.ids.tmdb;
          if (id_movie) {
            $http({
              method : "GET",
              url : fanart_url + "/" + id_movie + "?api_key=" + fanart_api_key
            }).then(function mySucces(response) {
              var image = response.data;

              if ((typeof image.moviethumb != "undefined") && image.moviethumb.length && image.moviethumb[0].url != "undefined") {
                image = image.moviethumb[0].url;
                image =  "https://" + image.split("http://")[1];
                movie.img = image;
              } else {
                movie.img = "img/no_image.png";
              }

              that.movies.push(movie);

              that.busy = false;
            }, function myError(response) {
              movie.img = "img/no_image.png";
              that.movies.push(movie);
              that.busy = false;
            });
          } else {
            movie.img = "img/no_image.png";
            that.movies.push(movie);
            that.busy = false;
          }
        })(this, movie);
      };

      // Gets the movies from the Track's API. It works whether searching or just
      // listing the trendies
      RequestsTraktTV.prototype.getMovies = function(url) {
        var cancel = $q.defer();
        $http({
            method : "GET",
            url : url,
            headers: {
              'Content-Type': "application/json",
              'trakt-api-key': "019a13b1881ae971f91295efc7fdecfa48b32c2a69fe6dd03180ff59289452b8",
              'trakt-api-version': "2"
            },
            timeout: cancel.promise,
            cancel: cancel
        }).then(function mySucces(response) {
          var movies = response.data;
          var movie = {};
          for (var i = 0; i < movies.length; i++) {
            movie = movies[i];
            movie.num = this.num;
            this.num++;

            this.getImages(movie);
          }
          this.busy = false;

        }.bind(this), function myError(response) {
            this.busy = false;
        }.bind(this));
      };

      // Main function that list the movies from the Track's API. infinite-scroll
      // plugin keep calling this function when user scrolls.
      RequestsTraktTV.prototype.nextPage = function() {
        if (this.busy) {
          return false;
        }
        this.busy = true;
        this.dirty = true;

        this.page++;
        var url = service_url + "/movies/trending" + "?page=" + this.page + "&limit=" + this.limit + "&extended=full";
        if (this.searching) {
          url = service_url + "/search/movie?query=" + this.search_text + "&page=" + this.page + "&limit=" + this.limit + "&extended=full";
        }

        this.getMovies(url);
      };

      // Search a query introduced by the user. If launches a request if
      // the key pressed if actually a char.
      // This function also cancel the remain requests in order to make the
      // app more responsive and dynamic.
      RequestsTraktTV.prototype.search = function(value, $event) {
        if ($event.originalEvent.code.split("Key")[1] !== "undefined") {
          this.movies = [];
          this.page = 1;
          this.limit = 10;
          this.num = 1;
          this.searching = false;
          this.search_text = value;

          (function($http){
            $http.pendingRequests.forEach(function(request) {
              if (request.cancel) {
                request.cancel.resolve();
              }
            });
          })($http);

          if (value == '' || value == "undefined") {
            this.nextPage();
          } else {
            this.searching = true;
            if (this.busy) {
              return false;
            }
            this.busy = true;
            this.dirty = true;

            var url = service_url + "/search/movie?query=" + value + "&page=" + this.page + "&limit=" + this.limit + "&extended=full";
            this.page++;

            this.getMovies(url);
          }
        }
      };

      return RequestsTraktTV;
    });

    // --------------------------------------------------------------------

})();

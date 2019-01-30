$(document).ready(function() {
    // Initialize Vue and our data
    var app = new Vue({
        el: '#app',
        data: {
            playlists: [],
            search: ""
        },
        computed: {
          sortedPlaylists() {
              var searchList = [];
              for(playlist in this.playlists) {
                  if(this.playlists[playlist].name.toLowerCase().includes(this.search.toLowerCase())) searchList.push(this.playlists[playlist]);
              }
              return _.orderBy(searchList, ['distance'],['asc']);
          }
        },
        methods: {
            showPlaylist: function (playlist) {
                window.location.href = 'app.html?playlist=' + playlist;
            }
        }
    });
    window.vue = app;
    
    var config = {
        apiKey: "AIzaSyBoYhaLK3TtsuN9v0ZxwBS6ozo4PeDbbKU",
        authDomain: "misc-e4aa1.firebaseapp.com",
        databaseURL: "https://misc-e4aa1.firebaseio.com",
        projectId: "misc-e4aa1",
        storageBucket: "misc-e4aa1.appspot.com",
        messagingSenderId: "169855073018"
      };
      firebase.initializeApp(config);

    // Get a reference to the database service
    var database = firebase.database();

    getPlaylists();

});

function showPlaylist(playlist) {
    window.location.href = 'app.html?playlist=' + playlist;
}

/**
 * Gets all the playlists within range of the user
 */
async function getPlaylists() {
    var position = await getCurrentLocation();

    firebase.database().ref('/Locations').once('value').then(function(locations) {
        locations = locations.val();
        for(var playlist in locations) {
            var dist = getDistance(locations[playlist].l, position.coords);
            if(dist <= 10) {
                var p = {
                    name: playlist,
                    distance: dist
                };
                vue.playlists.push(p);
            }
        }

        var status = document.getElementById('status-text');
        status.innerText = '';
        status.classList.remove('loading');
    });
}

/**
 * Returns the distance in km between two points
 * @param {coords} checkLoc
 * @param {coords} currentLoc
 */
function getDistance(checkLoc, currentLoc) {
    var lng = currentLoc.longitude, lat = currentLoc.latitude; // Distance in km

    if (!("geolocation" in navigator)) {
        // If browser doesn't support geolocation, just add all playlists
        return true;
    }

    var ky = 40000 / 360;
    var kx = Math.cos(Math.PI * lat / 180.0) * ky;
    // Latitude is first in the array and longitude is second
    var dy = Math.abs(lat - checkLoc[0]) * ky; 
    var dx = Math.abs(lng - checkLoc[1]) * kx;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get current location of user
 */
function getCurrentLocation() {
    return new Promise(function(resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}
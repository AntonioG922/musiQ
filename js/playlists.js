$(document).ready(function() {
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

async function getPlaylists() {
    var position = await getCurrentLocation();

    firebase.database().ref('/Locations').once('value').then(function(locations) {
        locations = locations.val();
        for(var location in locations) {
            var playlistIsNear = locationIsNear(locations[location].l, position.coords);
            if(playlistIsNear) {
                var playlist = document.createElement('div');
                playlist.classList.add('playlist');
                playlist.innerHTML = location;
                document.getElementById('playlists').appendChild(playlist);
            }
        }
        var status = document.getElementById('status-text');
        status.innerText = 'Select a playlist to join...';
        status.classList.remove('loading');
        
        $(".playlist").click(function() {
            window.location = 'app.html?playlist=' + $(this).html()
        });
    });
}

function locationIsNear(checkLoc, currentLoc) {
    var lng = currentLoc.longitude, lat = currentLoc.latitude, maxDistance = 10; // Distance in km

    if ("geolocation" in navigator) {

    } else {
        // If browser doesn't support geolocation, just add all playlists
        return true;
    }

    var ky = 40000 / 360;
    var kx = Math.cos(Math.PI * lat / 180.0) * ky;
    // Latitude is first in the array and longitude is second
    var dy = Math.abs(lat - checkLoc[0]) * ky; 
    var dx = Math.abs(lng - checkLoc[1]) * kx;
    return Math.sqrt(dx * dx + dy * dy) <= maxDistance;
}

function getCurrentLocation() {
    return new Promise(function(resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}
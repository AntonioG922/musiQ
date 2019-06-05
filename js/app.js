const urlParams = new URLSearchParams(window.location.search);
const playlist = urlParams.get('playlist');

$(document).ready(function() {
    window.scrollTo(0,1);
    $('#app').css('height', window.innerHeight + 'px');

    // Initialize Vue and our data
    var app = new Vue({
        el: '#app',
        data: {
          playlist: playlist,
          /** 
           * songQueue would be better as an object but I couldn't get it to work with Vue right as one
           * Structure: 
           *    songQueue {
           *        songId: songObject
           *    }
           */ 
          songQueue: [],
          currentSongId: '',
          currentTitle: '',
          currentArtist: '',
          currentAlbum: '',
          currentImage: '',
          allowSpotify: false,
          allowYoutube: false,
          allowExplicit: false
        },
        computed: {
            toPlay: function () {
                var queue = this.songQueue.filter(song => {
                    return song.Played != 'true';
                });
                return _.orderBy(queue, 'Votes', 'desc');
            },
            prevPlayed: function () {
                var queue = this.songQueue.filter(song => {
                    return song.Played == 'true';
                });
                return _.orderBy(queue, 'Votes', 'desc');
            }
        },
        methods: {
            addVote: function (newVote, songId) {
                addVote(newVote, songId);
            }
        }
    });
    window.vue = app;

    // Set up Firebase
    // Set the configuration for your app
    // TODO: Replace with your project's config object
    var config = {
        apiKey: "AIzaSyBoYhaLK3TtsuN9v0ZxwBS6ozo4PeDbbKU",
        authDomain: "misc-e4aa1.firebaseapp.com",
        databaseURL: "https://misc-e4aa1.firebaseio.com",
        projectId: "misc-e4aa1",
        storageBucket: "misc-e4aa1.appspot.com",
        messagingSenderId: "169855073018"
    };
    firebase.initializeApp(config);

    // Get the data we want to show to the user
    getPlaylistInfo().then(function() {
        checkLoggedIn();
        populateQueue(playlist);
        getVotesMap(playlist);
    });
    
    $("#showPrevPlayedBtn").click(function() {
        $("#previously-played").toggleClass("active");
    });
    
    $('#nav-bars').click(function() {
        window.location = "playlists.html";
    });

    $('#add-song-btn').click(function() {
        $('#add-song-menu').css('left', '0');
    });
    
    $("#search").keyup(function(event) {
        if (event.keyCode === 13) {
            searchForSong();
        }
    });
});

async function checkLoggedIn() {
    var userId = firebase.auth().currentUser.uid;
    if(userId == null)
        window.location = 'login.html';
}

/**
 * @param {int} newVote - 1 for up vote, -1 for down vote
 * @param {string} songId - id of the song which was voted on
 */
async function addVote(newVote, songId) {
    // Read users current vote if it exists
    getUsersCurrentVote(newVote, songId).then(function(voteChange) {
        // Update vote count for the given song in the playlist
        updateVoteCountForSong(voteChange, songId);

        // Record or update users vote
        updateUsersVote(voteChange, songId);
    });

}

/**
 * 
 * @param {int} newVote - 1 for up vote, -1 for down vote
 * @param {string} songId - id of the song which was voted on
 */
function getUsersCurrentVote(newVote, songId) {
    var userId = firebase.auth().currentUser.uid;
    return new Promise(function(resolve, reject) {
        firebase.database().ref('/Votes/Playlists/' + vue.playlist + '/' + userId + '/' + songId).once('value').then(function(currentVote) {
            var oldVote = 0;
            if(currentVote.val() === 'Up')
                oldVote = 1;
            else if(currentVote.val() === 'Down')
                oldVote = -1;
            
            // The user has already not changed their vote so do nothing
            resolve(newVote + (oldVote * -1));
        });
    });
}

/**
 * Updates the users vote to newVote
 * @param {int} newVote - 1 for up vote, -1 for down vote
 * @param {string} songId - id of the song which was voted on
 */
function updateUsersVote(newVote, songId) {
    var userId = firebase.auth().currentUser.uid;
    var postData = {}, voteValue = "";
    switch(newVote) {
        case 2:
        case 1:
            voteValue = 'Up';
            break;
        case 0:
            voteValue = null;   //Delete users vote
            break;
        case -2:
        case -1:
            voteValue = 'Down';
            break;
        default:
            voteValue = null;
            break;
    }
    postData[songId] = voteValue;

    return firebase.database().ref('/Votes/Playlists/' + vue.playlist + '/' + userId).update(postData);
}

/**
 * Updates vote count for song with songId
 * @param {int} voteChange - -+2 if vote changed or -+1 if new vote
 * @param {string} songId - id of the song which was voted on 
 */
function updateVoteCountForSong(voteChange, songId) {
    firebase.database().ref('/Playlists/' + vue.playlist + '/Queue/' + songId + '/Votes').transaction(function(currentVotes) {
        return voteChange + parseInt(currentVotes);
    });
}

function getVotesMap(playlist) {
    firebase.database().ref('/Votes/Playlists/' + playlist).on('value', function(voteInfo) {
        var votesMap =  {};
        var votes = voteInfo.val();
        for(var user in votes) {
            var userVotes = votes[user];
            for(var song in userVotes) {
                var voteUp = userVotes[song] === 'Up';
                if(song in votesMap)
                    votesMap[song] += voteUp ? 1 : -1;
                else
                    votesMap[song] = voteUp ? 1 : -1;
            }
        }

        vue.songQueue.forEach(song => {
            song.Votes = votesMap[song.songId] || 0;
        });
    });
}

/**
 * Gets meta data for playlist
 */
async function getPlaylistInfo() {
    var playlistInfo = await queryDbOnce('/Playlists/' + vue.playlist);
    var info = playlistInfo.val();
    vue.currentSongId = info.Current;
    vue.allowExplicit = info.Settings['Allow Explicit Songs'];
    vue.allowSpotify = info.Settings.Spotify;
    vue.allowYoutube = info.Settings.Youtube;
}

/**
 * Populates the song queue with all the songs in the given playlist
 * @param {string} playlist - name of the playlist
 */
function populateQueue(playlist) {
    // Populate song queue and attach listener for new songs that are added
    firebase.database().ref('/Playlists/' + playlist + '/Queue').on('child_added', function(song) {
        songInfo = song.val();
        songInfo.songId = song.key;
        
        if(song.key === vue.currentSongId) {
            vue.currentTitle = songInfo.Name;
            vue.currentArtist = songInfo.Artist;
            vue.currentAlbum = ''; /* Update this when albums are put in */
            vue.currentImage = songInfo.Picture;
        }

        vue.songQueue.push(songInfo);
    });
}

/************************************************/
/******         FIREBASE FUNCTIONS         ******/
/************************************************/
function queryDbOnce(ref) {
    return new Promise(function (resolve, reject) {
        firebase.database().ref(ref).once('value', function(data) {
            resolve(data);
        });
    });
}
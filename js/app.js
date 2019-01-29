$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const playlist = urlParams.get('playlist');
    var activeRow;

    // Initialize Vue and our data
    var app = new Vue({
        el: '#app',
        data: {
          playlist: playlist,
          /** songQueue would be better as an object but I couldn't get it to wokr with Vue right as one
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

    // Get a reference to the database service
    var database = firebase.database();

    // Get the data we want to show to the user
    var votesMap = getVotesMap(playlist);
    getPlaylistInfo().then(function() {
        populateQueue(playlist);
    });
    
    $("#showPrevPlayedBtn").click(function() {
        $("#previously-played").toggleClass("active");
    });
    
    $('#nav-bars').click(function() {
        $('#nav-bars').addClass('active');
    });
    
    $('#exit-btn').click(function() {
        window.location = "playlists.html"
    });
    
    $('#close-sidebar-btn').click(function() {
        $('#sidebar').css('left', '-110%');
    });
    
    $('#add-song-btn').click(function() {
        $('#add-song-list').addClass('active');
    });

    /*
    $('table').on('touchmove', 'tr', function(e) {
        if (!$(this).data('draggable')) $(this).draggable({
            helper: 'clone',
            axis: 'x',
            cursor: "move",
            start: function (event, ui) {
            
            $(this).css('opacity', '0');
             //   sourceElement = $(this).closest('table').attr('id');
   
            },
            stop: function (e, ui) {
                if(e.pageX >= $(window).width()/2)
                    addVote(1, this.dataset.song);
                else
                    addVote(-1, this.dataset.song);

                $(this).css('opacity', '1');
            }
        });
    });

    $('body').mousemove(function(e) {
        // Calculate mouse position relative to the center of the page
        var relativeMouseX = e.pageX - $(window).width()/2;

        $(activeRow).css('margin-left', relativeMouseX + 'px');
    });

    $('table').on('mouseenter', 'tr', function(e) {
        if (!$(this).data('draggable')) $(this).draggable({
            helper: 'clone',
            axis: 'x',
            cursor: "move",
            start: function (event, ui) {
            
            $(this).css('opacity', '0');
             //   sourceElement = $(this).closest('table').attr('id');
   
            },
            stop: function (e, ui) {
                if(e.pageX >= $(window).width()/2)
                    addVote(1, this.dataset.song);
                else
                    addVote(-1, this.dataset.song);

                $(this).css('opacity', '1');
            }
        });
    });

    $('body').mouseup(function() {
        activeRow = null;
    }); */
});

/*
 * Votes are treated as integers:
 *      Up: 1
 *      Down: -1
 */
async function addVote(newVote, songId) {
    // Read users current vote if it exists
    getUsersCurrentVote(newVote, songId).then(function(voteTotal) {
        // Update vote count for the given song in the playlist
        updateVoteCountForSong(voteTotal, songId);

        // Record or update users vote
        updateUsersVote(newVote, songId);
    }, function(message) {
        $('#err-btn').html(message);
        $('#err-btn').css('bottom', '30px');
        setTimeout(function(){$('#err-btn').css('bottom', '-100px');}, 3000);
    });

}

function getUsersCurrentVote(newVote, songId) {
    var userId = firebase.auth().currentUser.uid;
    return new Promise(function(resolve, reject) {
        firebase.database().ref('/Votes/Playlists/' + vue.playlist + '/' + userId + '/' + songId).once('value').then(function(currentVote) {
            var oldVote = 0;
            if(currentVote.val() === 'Up')
                oldVote = 1;
            else if(currentVote.val() === 'Down')
                oldVote = -1;
            
            if(newVote == oldVote)
                reject("Chill man, you already voted for this");
            
            // The user has already not changed their vote so do nothing
            resolve(newVote + (oldVote * -1));
        });
    });
}

function updateUsersVote(newVote, songId) {
    var userId = firebase.auth().currentUser.uid;
    var postData = {};
    postData[songId] = newVote === 1 ? 'Up' : 'Down';

    return firebase.database().ref('/Votes/Playlists/' + vue.playlist + '/' + userId).update(postData);
}

function updateVoteCountForSong(voteTotal, songId) {
    firebase.database().ref('/Playlists/' + vue.playlist + '/Queue/' + songId + '/Votes').transaction(function(currentVotes) {
        return voteTotal + parseInt(currentVotes);
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

async function getPlaylistInfo() {
    var playlistInfo = await queryDbOnce('/Playlists/' + vue.playlist);
    var info = playlistInfo.val();
    vue.currentSongId = info.Current;
    vue.allowExplicit = info.Settings['Allow Explicit Songs'];
    vue.allowSpotify = info.Settings.Spotify;
    vue.allowYoutube = info.Settings.Youtube;
}

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
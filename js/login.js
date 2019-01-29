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

// FirebaseUI config.
var uiConfig = {
    signInSuccessUrl: 'playlists.html',
    signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
        firebase.auth.PhoneAuthProvider.PROVIDER_ID
    ],
    // tosUrl and privacyPolicyUrl accept either url string or a callback
    // function.
    // Terms of service url/callback.
    tosUrl: '<your-tos-url>',
    // Privacy policy url/callback.
    privacyPolicyUrl: function() {
      window.location.assign('<your-privacy-policy-url>');
    }
};

// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());
// The start method will wait until the DOM is loaded.
ui.start('#firebaseui-auth-container', uiConfig);
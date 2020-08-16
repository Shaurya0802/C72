import * as firebase from 'firebase';
require('@firebase/firestore');

var firebaseConfig = {
    apiKey: "AIzaSyBbI7UtuJFYikkiZkFhmHlB6FTI0-P0cVw",
    authDomain: "wily-app-94951.firebaseapp.com",
    databaseURL: "https://wily-app-94951.firebaseio.com",
    projectId: "wily-app-94951",
    storageBucket: "wily-app-94951.appspot.com",
    messagingSenderId: "999113900143",
    appId: "1:999113900143:web:208e5bded64a7eec728d9a"
  };
  
  firebase.initializeApp(firebaseConfig);

export default firebase.firestore();


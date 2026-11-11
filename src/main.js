import { onAuthReady } from "/src/authentication.js";
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot, QuerySnapshot } from "firebase/firestore";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { getDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
// Import the file that has the authentication helper function we want to use.
// The function we want to use is called "onAuthReady" which returns the login state

let currentUser = null;   // who is logged in
let favourites = [];      // the hike IDs they've favourited

function showName() {
    // Pass a CALLBACK function to run when Firebase finishes checking login status
    onAuthReady(function (user) {  // Firebase passes the user object (or null)
        if (user) {
            // User is logged in
            const name = user.displayName || user.email;  // Use email if name is missing
             document.getElementById("name-goes-here").textContent = name + "!";
        } else {
            // User is NOT logged in
            // location.href = "index.html";  // Redirect to login page
        }
    });
}

showName();

// Function to read the quote of the day from Firestore
function readQuote(day) {
    const quoteDocRef = doc(db, "quotes", day); // Get a reference to the document

    onSnapshot(quoteDocRef, docSnap => { // Listen for real-time updates
        if (docSnap.exists()) {          //Document existence check
            document.getElementById("quote-goes-here").innerHTML = docSnap.data().quote;
            
        } else {
            console.log("No such document!");
        }
    }, (error) => {                      //Listener/system error
        console.error("Error listening to document: ", error);
    });
}

readQuote("tuesday");

// Helper function to add the sample hike documents.
function addHikeData() {
    const hikesRef = collection(db, "hikes");
    console.log("Adding sample hike data...");
    addDoc(hikesRef, {
        code: "BBY01", name: "Burnaby Lake Park Trail", city: "Burnaby",
        level: "easy", details: "A lovely place for a lunch walk.", length: 10,
        hike_time: 60, lat: 49.2467097082573, lng: -122.9187029619698,
        last_updated: serverTimestamp()
    });
    addDoc(hikesRef, {
        code: "AM01", name: "Buntzen Lake Trail", city: "Anmore",
        level: "moderate", details: "Close to town, and relaxing.", length: 10.5,
        hike_time: 80, lat: 49.3399431028579, lng: -122.85908496766939,
        last_updated: serverTimestamp()
    });
    addDoc(hikesRef, {
        code: "NV01", name: "Mount Seymour Trail", city: "North Vancouver",
        level: "hard", details: "Amazing ski slope views.", length: 8.2,
        hike_time: 120, lat: 49.38847101455571, lng: -122.94092543551031,
        last_updated: serverTimestamp()
    });
}

async function seedHikes(){
 // make reference to the hikes collection
 const hikesRef= collection(db,"hikes");
 //Read this hikes ref to go through checks later:
 const hikesSnapshot = await getDocs(hikesRef);


 //if hikes collection does not exist, then write 
 if(hikesSnapshot.empty){
    console.log("seeding the hikes collection")
    addHikeData();
    

 }else{
     //else do nothing
     console.log("hikes collection already exists")
 }


}

seedHikes()

async function displayHikesDynamically(){
    //referenct to the hikes collection
 const hikesRef = collection(db,"hikes");
    //get the template from front-end
 let cardTemplate = document.getElementById("hikeCardTemplate");

    //read the hikes collection
 const querySnapShot = await getDocs(hikesRef);

    //loop throught three hikes
    querySnapShot.forEach(doc=>{
     let newcard = cardTemplate.content.cloneNode(true);

    //create the copy of the template
     const thisHike = doc.data()
    //populate data in the template
     newcard.querySelector(".card-title").textContent = thisHike.name;
     newcard.querySelector('.card-text').textContent = thisHike.details || `Located in ${thisHike.city}.`;
     newcard.querySelector('.card-length').textContent = thisHike.length;
     newcard.querySelector('.card-image').src = `./images/${thisHike.code}.jpg`;
        // Add the link with the document ID
     newcard.querySelector(".read-more").href = `eachHike.html?docID=${doc.id}`;
     setupHeart(newcard, doc.id); 
    //attach the template to the front end
     document.getElementById("hikes-go-here").appendChild(newcard);
})
}

// ------------------------------------------------------------
// setupHeart(card, hikeID)
// Gets ONE card's heart ready:
//   - on page load: fills the heart if this hike is already a favourite
//   - connects the click to toggleFavourite()
// card   = the card we just built from the template
// hikeID = this hike's document ID (doc.id)
// ------------------------------------------------------------
function setupHeart(card, hikeID) {

    // [FRONT END] Find the heart icon inside this card
    const heart = card.querySelector(".fav-btn");

    // [FRONT END] Already a favourite? Fill the heart.
    //             (favourites was read from Firestore in Step 2.3)
    if (favourites.includes(hikeID)) {
        heart.classList.replace("bi-heart", "bi-heart-fill");
    }

    // Connect it: "heart, when you are clicked, toggle this hike"
    heart.addEventListener("click", function () {
        toggleFavourite(heart, hikeID);
    });
}

// ------------------------------------------------------------
// toggleFavourite(heart, hikeID)
// Runs on every click: adds or removes the hike from favourites
// heart  = the heart icon that was clicked
// hikeID = which hike it belongs to
// ------------------------------------------------------------
async function toggleFavourite(heart, hikeID) {

    // [BACK END] The address of the logged-in user's document in Firestore
    const userRef = doc(db, "users", currentUser.uid);

    // [FRONT END] Is the heart filled right now?
    if (heart.classList.contains("bi-heart-fill")) {

        // Filled → REMOVE from favourites
        // [BACK END] Remove this hike's ID from the user's favourites array
        await setDoc(userRef, { favourites: arrayRemove(hikeID) }, { merge: true });
        // [FRONT END] Show the empty heart
        heart.classList.replace("bi-heart-fill", "bi-heart");

    } else {

        // Empty → ADD to favourites
        // [BACK END] Add this hike's ID to the user's favourites array
        await setDoc(userRef, { favourites: arrayUnion(hikeID) }, { merge: true });
        // [FRONT END] Show the filled heart
        heart.classList.replace("bi-heart", "bi-heart-fill");
    }
}

// Runs once Firebase knows if someone is logged in
onAuthReady(async function (user) {
    if (!user) {
        location.href = "index.html";                              // Not logged in → back to start
    } else {
        currentUser = user;                                        // 1. Remember who's logged in
        const userDoc = await getDoc(doc(db, "users", user.uid));  // 2. Get their user doc

        // 3. Load user's favourites, or use an empty array if none exist
        favourites = userDoc.data()?.favourites || [];   // uses "optional chaining" (?.)

        // Beginner version of the line above:
        // if (userDoc.exists() && userDoc.data().favourites) {
        //   favourites = userDoc.data().favourites;
        // } else {
        //   favourites = [];
        // }

        displayHikesDynamically();                                 // 4. Draw the cards
    }
});
    

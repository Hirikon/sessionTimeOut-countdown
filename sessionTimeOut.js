// ******************************************************************************************************************
// * Script For Handling Session TimeOut Front-End                                                                  *
// * ---------------------------------------------                                                                  *
// * Author: Konstantinos Hirikakis 11/04/2017                                                                      *
// *                                                                                                                *
// * Το script αφού δεχτεί ένα expiration time σε δευτερόλεπτα (είτε πρόκειται για session είτε για authentication) *
// * εμφανίζει μία αντίστροφη μέτρηση (παρόμοια με ένα τραπεζικό site) και ένα (ή περισσότερα) link Ανανέωσης       *
// * Επιπλέον δέχεται σαν όρισμα δύο χρόνους (σε δευτερόλεπτα) που αφορούν την 1η και 2η ειδοποίηση. Αυτό παρακτικά *
// * σημαίνει ότι όταν ο μετρητής φτάσει στο χρόνο 1ης ειδοποίησης τότε κοκκινίζει και αναβοσβήνει, ενώ αντίστοιχα  *
// * κατά τη 2η ειδοποίηση εμφανίζεται ένα messagebox το οποίο αφενός προειδοποιεί το χρήστη και αφετέρου τον       *
// * προτρέπει να πατήσει το κουμπί για "Ανανέωση" του χρόνου. Τελικά, αν ο χρόνος εξαντληθεί τότε εμφανίζεται νέο  *
// * μήνυμα, το οποίο ενημερώνει ότι έχει γίνει Logout ο χρήστης. Πατώντας πάνω σε αυτό, ανακατευθύνεται στην       *
// * οθόνη του Login.                                                                                               *
// ******************************************************************************************************************


// Χρήση του script
//------------------
// To element το οποίο επιθυμείτε να εμφανίζει τον εναπομείναντα χρόνο πρέπει να έχει ID: countdownBeforeExpiration
// Οποιοδήποτε element επιθυμείτε να πατάει ο χρήστης για ανανέωση, πρέπει να περιλαμβάνει την class: clickToResetExpirationTime
// Τέλος απαιτείται το library: bootbox.js (για τα message boxes)


// Βασικές Μεταβλητές
var globalTimeOut;              // Κατά την αρχικοποίηση λαμβάνει την τιμή του expire time που έρχεται από το Server
var topictimer;                 // Αρχικοποιείται με την τιμή της globalTimeOut αλλά μεταβάλλεται από τον κώδικα
var timeInSecondsFirstAlert;    // Ο χρόνος σε δευτερόλεπτα όπου θα ξεκινήσει ο χρόνος να αναβοσβήνει κόκκινος
var timeInSecondsSecondAlert;   // Ο χρόνος σε δευτερόλεπτα που θα εμφανιστεί το message box για την προειδοποίηση λήξης
var GetExpirationTimeURI;       // To URI της κλήσης που θα επιστρέψει το expiration time (σε δευτερόλεπτα)
var LogOffURI;                  // To URI για το LogOff του χρήστη
var LoginURI;                   // To URI για το LogIn του χρήστη
// ------------- Τέλος Μεταβλητών ----------------


// Είναι ο constructior ο οποίος πρέπει να κληθεί για να αρχικοποιήσει τις μεταβλητές και να κάνει τη διαδικασία
function SessionExpireCheckConstructor(_timeInSecondsFirstAlert, _timeInSecondsSecondAlert, _GetExpirationTimeURI, _LogOffURI, _LoginURI) {
    topictimer = 0;
    timeInSecondsFirstAlert = _timeInSecondsFirstAlert;
    timeInSecondsSecondAlert = _timeInSecondsSecondAlert;
    GetExpirationTimeURI = _GetExpirationTimeURI;
    LogOffURI = _LogOffURI;
    LoginURI = _LoginURI;

    // Σε όποιο element βρει με την class clickToResetExpirationTime του προσθέτει ένα click event handler ο οποίος καλεί τη resetSession()
    if ($('.clickToResetExpirationTime').length) $('.clickToResetExpirationTime').click(function () { resetSession(); });
    // Καλείται η initialize μέθοδος
    InitSessionExpireCheck(true);
}
// ------------ Τέλος constructor μεθόδου --------------


// Ο ρόλος της είναι η αρχικοποίηση, ώστε να λειτουργήσουν όλα τα παρακάτω. Εκτός από την πρώτη φορά, καλείται και κάθε φορά που γίνεται "Ανανέωση" του Session
function InitSessionExpireCheck(doCall) {
    // Γίνεται ένα ajax call στη μέθοδο εκείνη που επιστρέφει από τη database το session timeout
    $.get(GetExpirationTimeURI, function (data) {
        // Ενημερώνουμε την globalTimeOut με την τιμή που επέστρεψε η κλήση. Στην περίπτωση που δεν απαντήσει, κρατάμε την υφιστάμενη τιμή
        if (!isNaN(data.gTO))
            globalTimeOut = data.gTO;

        // Αν η κλήση δεν έχει απαντήσει (δεν ήταν επιτυχής) ποτέ στο παρελθόν (πιθανόν να είναι και η πρώτη), κάνουμε μια αρχικοποίηση 15 λεπτών
        if (isNaN(globalTimeOut)) globalTimeOut = 900;


        topictimer = globalTimeOut;     // Ενημερώνουμε και την τιμή της topictimer

        // Αν η doCall είναι TRUE το οποίο πρακτικά σημαίνει ότι η InitSessionExpireCheck καλείται για πρώτη φορά στη σελίδα
        // τότε με τη σειρά της καλεί την SessionExpireCheck που είναι η κύρια μέθοδος
        if (doCall) SessionExpireCheck();
    });
}
// ------------ Τέλος InitSessionExpireCheck μεθόδου --------------


// H παρακάτω μέθοδος υλοποιεί τη βασική λειτουργία, που απαρτίζεται από τρεις (3) συνιστώσες και ειδικότερα:
// - Αντίστροφη Μέτρηση
// - Ανανέωση
// - LogOff και Redirection
function SessionExpireCheck() {
    // Προϋπόθεση για να εκτελεστεί ο κώδικας είναι η topictimer να έχει αποκτήσει τιμή (με άλλα λόγια να υφίσταται κάποιο session timeout αλλιώς δεν έχει νόημα)
    if (topictimer != undefined) {
        // Ελέγχουμε αν υπάρχει element με το παρακάτω ID, ώστε να εμφανίσουμε το χρόνο
        if ($("#countdownBeforeExpiration").length) document.getElementById("countdownBeforeExpiration").innerHTML = getStringMMSSFromSeconds(topictimer);
        // H παρακάτω μέθοδος εκτελείται για κάθε ένα δευτερόλεπτο (1000 milliseconds)
        setInterval(function () {
            topictimer--;   // Μείωση της topictimer κατά 1

            // Αν ο χρόνος είναι κάτω από το όριο που έχει τεθεί, τότε η γραμματοσειρά γίνεται κόκκινη και αναβοσβήνει
            if (topictimer > 0 && topictimer <= timeInSecondsFirstAlert) {
                $('#countdownBeforeExpiration').fadeOut(200).fadeIn(200)
                $('#countdownBeforeExpiration').css('color', 'red');
            }
            else {
                $('#countdownBeforeExpiration').css('color', 'inherit');
            }

            // Για να μην εφανίζονται αρνητικές τιμές, σε κάθε τέτοια περίπτωση ο χρόνος μηδενίζεται
            if (topictimer < 0) {
                topictimer = 0;
            }

            // Ελέγχουμε αν υπάρχει element με το παρακάτω ID, ώστε να εμφανίσουμε το χρόνο
            if ($("#countdownBeforeExpiration").length) document.getElementById("countdownBeforeExpiration").innerHTML = getStringMMSSFromSeconds(topictimer);

            // Όταν ο χρόνος φτάσει στο 2o όριο προειδοποίησης, τότε εμφανίζεται κατάλληλο μήνυμα. Αν ο χρήστης πατήσει έγκαιρα ΟΚ τότε ο χρόνος ανανεώνεται
            if (topictimer == timeInSecondsSecondAlert) {
                if ($(".modal-content").length == 0 && $("#countdownBeforeExpiration").length) {
                    bootbox.alert("To session θα λήξει! Πατήστε ΟΚ για ανανέωση.", function () {
                        resetSession();
                    });
                    // Στην περίπτωση που ο χρόνος εξαντληθεί, μισό δευτερόλεπτο πριν αφαιρείται το message box γιατί όταν ο χρόνος μηδενίστεί (βλέπε παρακάτω) 
                    // θα ακολουθήσει το επόμενο message box που ενημερώνει το χρήστη για τη λήξη
                    setTimeout(function () { $(".modal-content").remove(); }, (timeInSecondsSecondAlert*1000 - 500))
                }
            }

            // Όταν ο χρόνος μηδενιστεί το οποίο με άλλα λόγια σημαίνει ότι η σύνοδος (session) έχει λήξει, τότε εμφανίζεται αντίστοιχο μήνυμα.
            // Όταν ο χρήστης πατήσει ΟΚ τότε γίνεται logoff και ακολούθως ανακατευθύνεται στην αρχική οθόνη για να κάνει login ξανά
            if (topictimer == 0) {
                if ($(".modal-content").length == 0 && $("#countdownBeforeExpiration").length) {
                    bootbox.alert("To session έχει λήξει! Θα μεταφερθείτε στην οθόνη του Login.", function () {
                        // γίνεται ένα ajax call στη LogOff, ώστε ο χρήστης πρώτα να αποσυνδεθεί
                        $.get(LogOffURI, function (data) {
                            window.location.href = LoginURI;    // ανακατευθυνση στο home page
                        });
                    });
                }
            }

        }, 1000);
    }
};
// ------------ Τέλος SessionExpireCheck μεθόδου --------------


// H παρακάτω μέθοδος καλείται κατά την "Ανανέωση"
function resetSession() {
    // Προσοχή ότι η κλήση της InitSessionExpireCheck γίνεται με false
    InitSessionExpireCheck(false);
}
// ------------ Τέλος resetSession μεθόδου --------------


// Βοηθητική μέθοδος η οποία δέχεται σαν όρισμα έναν integer ο οποίος αντιπροσωπεύει δευτερόλεπτα και επιστρέφει ένα string της μορφής MM:SS
function getStringMMSSFromSeconds(intSeconds) {
    minutes = parseInt(intSeconds / 60, 10);
    seconds = parseInt(intSeconds % 60, 10);

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    return minutes + ":" + seconds;
}
// ------------ Τέλος getStringMMSSFromSeconds μεθόδου --------------

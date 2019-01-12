//==============================================
//        IMPORT NPM PACKAGES
//==============================================
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var methodOverride = require("method-override");
var expressSanitizer = require("express-sanitizer");
var Blog = require("./models/blogpost.js");
var Comment = require("./models/comment.js");
//Required for user authentication
var passport = require("passport");
var expressSession = require("express-session");
var passportSession = require("passport-session");
var passportLocal = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
//Required to store express session information in mongodb databse
var mongoDBStore = require("connect-mongodb-session")(expressSession);
var User = require("./models/user.js");
//Required to flash error messages to the username
var flash = require("connect-flash-plus");
//Required configuration file for app to run
var config = require("./config.js");
//import routes
var blogpostRouter = require("./routes/blogpost.js");
var commentRouter = require("./routes/comment.js");
var authRouter = require("./routes/auth.js");

//================================================
//        APPLICATION SETUP
//================================================
//Override with POST having ?_method=put
app.use(methodOverride("_method"));
//Tell express to use files in public folder
app.use(express.static("public"));
//Allows extraction of data from forms
app.use(bodyParser.urlencoded({extended: true}));
//Mount sanitizer to remove scripts from html input (prevent html injection)
app.use(expressSanitizer());
//Do not have to add ejs file extension
app.set("view engine", "ejs");


//=============================================
//        CONNECT TO Databse
//=============================================
mongoose.connect(config.dev.db.uri, config.dev.db.options, function(err){
  if(err){
    console.log("Failed to connect to MongoDB databse. Error: " + err);
  }else{
    console.log("Successfully connected to MongoDB databse!");
  }
});


//===============================================
//        MONGODB SESSION STORE SETUP
//===============================================
//Create new connection (faster) to mongoDB to store sessions in BlogApp
var store = new mongoDBStore({
  uri: config.dev.db.uri,
  collection: "sessions"
});
store.on('connected', function() {
  store.client; // The underlying MongoClient object from the MongoDB driver
});
// Catch errors
store.on('error', function(error) {
  assert.ifError(error);
  assert.ok(false);
});

//===============================================
//        AUTHENTICATION SETUP
//===============================================
//Need express session for passport to piggy back off of it (also configure it)
app.use(expressSession({
  //Only saves session information if the user logs in (not only visit website)
  saveUninitialized: true,
  //Double check if needed to be true depending on session store
  resave: true,
  //Used to sign the session Cookie ID
  secret: "Kitty is a cute little bugger!",
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  //Save to monogDB store using new connection to Mongo databse
  store: store
}));
//Configure passport, reqired in express app
app.use(passport.initialize());
//Need this middleware for persistant login sesssions (login info stored always)
app.use(passport.session());
//Configure passport to use local strategy (username/password stored on server) and passport-local-mongoose automatically creates local strategy for us
passport.use(User.createStrategy());
//Set serializer and deserializer for sessions
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Tell express to use flash (stored in session so need to put after session configuration above)
app.use(flash());

//===============================================
//        SET LOCAL VAR FOR ROUTES
//==============================================
//When we set app.use without a path, this middleware is executed on every route of our app. We declare local variables so when passport populates req.user so it is available only to the view(s) rendered during that request / response cycle (if any). Thus only avlaiable when user logged on, and it is avaliable anywehre in our app. Otherwise we would have to pass it as an object to each one of our routes manually.
app.use(function(req, res, next){
  res.locals.user = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

//================================================
//        EMAIL CONFIGURATION
//================================================
//Required for sending emails from our app
const nodemailer = require("nodemailer");
//Configure transport service to send emails (set our gmail account here)
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth:{
          user: config.dev.app.emailUser,
          pass: config.dev.app.emailPass
  }
});
//Configure our email message to be sent
const mailOptions = {
  from: "jackjack.blogapp@gmail.com",
  to: "",
  subject: "JackJack's Blog - Password Reset",
  html: "<p>Please click on the following link to reset the password associated with your account: <a href = 'http://localhost:3000/resetpass'>Reset Link</a> </p>"
};
//Make our email configuration variables avaliable everywhere in our app
app.locals.transporter = transporter;
app.locals.mailOptions = mailOptions;


//================================
//             ROUTES
//================================
//Include ROUTES (why do these have to be at the end??beacuse the "req.user" made avaliable in our app routes above is not avaliable yet, so need routes after this")
app.use(commentRouter);
app.use(blogpostRouter);
app.use(authRouter);


//================================
//        START NODE SERVER
//================================
app.listen(config.dev.app.port, function(){
  console.log("The BlogApp Server has started!");
});

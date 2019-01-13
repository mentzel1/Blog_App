var express = require("express");
var router = express.Router();
var middleware = require("../middleware");
var User = require("../models/user.js");
var passport = require("passport");
var flash = require("connect-flash-plus");
//Required to generate secure JSON webtokens for pass resets
var jwt = require("jwt-simple");

//================================================
//APP EMAIL configuration (jackjack.blogapp@gmail.com)
//================================================
//Required for sending emails from our app
// const nodemailer = require("nodemailer");
//Configure transport service to send emails (set our gmail account here)
// var transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth:{
//           user: "jackjack.blogapp@gmail.com",
//           pass: "Bl0g_App_Pazzw0rd"
//   }
// });
//Configure our email message to be sent
// const mailOptions = {
//   from: "jackjack.blogapp@gmail.com",
//   to: "",
//   subject: "JackJack's Blog - Password Reset",
//   html: "<p>Please click on the following link to reset the password associated with your account: <a href = 'http://localhost:3000/resetpass'>Reset Link</a> </p>"
// };

// NEW Route which shows signup Page
router.get("/signup", function(req, res){
  res.render("signup");
});

//CREATE - Creates new user in our database
router.post("/signup", middleware.confirmPassword, function(req, res){
  //Create user in mongo database using method we plugged into user Schema (also checks if username is unique, if not throws error)
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      req.flash("error", err.message);
      res.redirect("/signup");
    }else{
      //Store First and last Name
      user.firstName = req.body.firstName;
      user.lastName = req.body.lastName;
      //save changes made (didnt use create function which autosaves for us)
      user.save();

      //Log user in upon registering
      req.login(user, function(err){
        if(err){
          console.log(err);
          res.redirect("back");
        }else{
          req.flash("success", "Successfully registered!");
          res.redirect("/blogs");
        }
      });
    }
  });
});

//Displays login Page
router.get("/login", function(req, res){
  res.render("login");
});

//Logs the user in using passport authentication middleware method
router.post("/login", passport.authenticate("local", {failureRedirect: "/login"}), function(req, res){
  req.flash("success", "Successfully logged in!");
  // console.log(req.user);
  res.redirect("/blogs");
});

//Log user out of the APPLICATION and redirect to main page
router.get("/logout", function(req, res){
  req.logout();
  req.flash("success", "Successfully logged out!");
  res.redirect("/login");
});

//Displays send reset link page
router.get("/sendemail", function(req, res){
  res.render("sendemail.ejs");
});

//Finds user account and sends them a reset link to reset password
router.post("/sendemail", function(req, res){
  req.app.locals.mailOptions.to = req.body.username;
  //Check that user exists in our database. If not, redirect back to reset page and flash error
  User.find({username: req.body.username}, function(err, user){
      if(err){
        console.log(err);
        req.flash("error", err);
        res.redirect("/sendemail");
      }else{
        //if user does not exist in database
        if(user.length < 1){
          console.log(err)
          req.flash("error", "The user account does not exist in JackJack's Blog. Please create an account before continuing. For problems please contact jackjack.blogapp@gmail.com ");
          res.redirect("/signup");
        }else{
        //Create one time use webtoken link by setting secret to user's pass hash + '-' + string. Once user resets their password the original sent linke made with old password wont work. Making this a one time use secure link
        var payload = user[0]._id;
        var time = payload.getTimestamp();
        var pass = user[0].hash;
        var secret = pass + '-' + time;
        var token = jwt.encode(payload, secret);
        var link = "/resetpass" + payload + token;
        req.app.locals.mailOptions.context.secureLink ="http://localhost:3000/resetpass" + payload + "/" + token;
        req.app.locals.mailOptions.context.user = user[0].firstName + user[0].lastName;
        //
        req.app.locals.transporter.sendMail(req.app.locals.mailOptions, function (err, info) {
           if(err){
             console.log(err)
             req.flash("error", error);
             res.redirect("/sendemail");
           }else{
             //console.log(info);
             req.flash("success", "Password reset link has Successfully been sent!");
             res.redirect("/sendemail");
           }
         });
        }
      }
  });
});

//Displays reset password page
router.get("/resetpass", function(req, res){
  res.render("resetpass.ejs");
});

module.exports = router;

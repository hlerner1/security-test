var bodyParser = require('body-parser');
var express = require('express');
var mongoose = require('mongoose');
var sessions = require('client-sessions');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
//defining an object user, each section is how data is represented in the database
//stored as a String
//"unique" keeps people from logging in with the same email
var User = mongoose.model('User', new Schema({
  id: ObjectId,
  firstName: String,
  lastName: String,
  email: {type: String, unique: true },
  password: String,

}))

var app = express();
app.set('view engine' , 'jade' )
app.locals.pretty = true;

//connecting to mongo database
mongoose.connect('mongodb://localhost/newauth');

//middle ware runs user request through the homepage
app.use(bodyParser.urlencoded({ extended: true}));
app.use(sessions({
  cookieName: 'session',
//encrypts information (must be random)
  secret: 'f8d7sh374fdwe988jf9wet8fhweoidjleugofcash',
// sets duration for login
  duration: 30 * 60 * 1000,
//will set another timer if you leave the site then come back
  activeDuration: 5 * 60 * 1000,
}));




//calls the function
app.get('/' , function(req, res){
  res.render('index.jade');
});

app.get('/register', function(req,res){
  res.render('register.jade');
});

app.post('/register', function(req,res){
//sends a response back to the browser
  var user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
  })
  user.save(function(err){
    if(err){
      var err = 'Something bad happened! Try again!';
//error code 11000 means that the "unique" parameter has not been met
      if (err.code == 11000){
        error = "That email is already Taken!";
      }
//displays error in html
      res.render('register.jade',{ error : error});
    } else{
// if no errors (else) you will be sent to the dashboard
      res.redirect('/dashboard');
    }
  })
//res.json(req.body);
});

app.get('/login', function(req,res){
  res.render('login.jade');
});

app.post('/login' , function(req,res){
  User.findOne({ email: req.body.email}, function(err,user){
    if(!user){
      res.render('login.jade', {  error: 'invalid email or password.' });
    } else {
      if (req.body.password === user.password) {
//starts cookies if password is valid
        req.session.user = user; // set-cookie: session={email: "..." , password: "..."}
        res.redirect('/dashboard');
      } else{
        res.render('login.jade', {  error: 'invalid email or password.' });
      }
    }
  })
})

app.get('/dashboard', function(req,res){
  if (req.session && req.session.user){
//look users up by their email in the database by looking at the session
    User.findOne({ email: req.session.user.email } , function(err,user){
//if user not found, reset the session and redirect them to the login page
      if (!user){
        req.session.reset();
        res.redirect('/login');
//otherwise, render the dashboard page
      } else {
        res.locals.user = user;
        res.render('dashboard.jade');
      }
    });
  } else{
  res.redirect('/login');
  }
});
app.get('/logout', function(req,res){
  res.redirect('/');
});
app.listen(3000);

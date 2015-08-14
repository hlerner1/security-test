// the require function is drawing information from a pre-existing library
//similar to "from myro import*" in python
var bodyParser = require('body-parser');
var bcrypt = require('bcryptjs');
var csrf = require('csurf');
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



////////////////////////// START OF MIDDLEWARE //////////////////////////


//runs user request through the homepage
app.use(bodyParser.urlencoded({ extended: true}));
app.use(sessions({
  cookieName: 'session',
//encrypts information (must be random)
  secret: 'f8d7sh374fdwe988jf9wet8fhweoidjleugofcash',
// sets duration for login
  duration: 30 * 60 * 1000,
//will set another timer if you leave the site then come back
  activeDuration: 5 * 60 * 1000,
//prevents browser from accessing javascript cookies ever
  httpOnly: true,
//cookies only through https
  secure: true,
//deletes this cookie when the browser is closed
  ephemeral: true,
}));

//creates a unique token that verifies that it is you on the site
//prevents some phishing links
app.use(csrf());

app.use(function(req,res,next) {
  if (req.session && req.session.user) {
    User.findOne({ email: req.session.user.email} , function(err, user){
      if(user){
        req.user = user;
//deletes password for safety
        delete req.user.password;
//refreshes session
        req.session.user = req.user;
        res.locals.user = req.user;
      }
//runs the next function after the middleware is done
      next();
    });
  } else {
    next();
  }
});

//if no user, redirect to login page
function requireLogin(req,res,next){
  if (!req.user) {
    res.redirect('/login');
  } else {
    next();
  }
}



//calls the function
app.get('/' , function(req, res){
  res.render('index.jade');
});

app.get('/register', function(req,res){
//creates a csrf token
  res.render('register.jade' , {csrfToken: req.csrfToken() });
});

app.post('/register', function(req,res){
//Hashes password
var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
//sends a response back to the browser
  var user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
//calls the hash
    password: hash,
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
  res.render('login.jade' , {csrfToken: req.csrfToken()});
});

app.post('/login' , function(req,res){
  User.findOne({ email: req.body.email}, function(err,user){
    if(!user){
      res.render('login.jade', {  error: 'invalid email or password.' });
    } else {
      if (bcrypt.compareSync(req.body.password , user.password)) {
//starts cookies if password is valid
        req.session.user = user; // set-cookie: session={email: "..." , password: "..."}
        res.redirect('/dashboard');
      } else{
        res.render('login.jade', {  error: 'invalid email or password.' });
      }
    }
  })
})
//requireLogin prevents people from simply going to the address and accessing
//someone's information without logging in
app.get('/dashboard', requireLogin , function(req,res){
  res.render('dashboard.jade');
  });
app.get('/logout', function(req,res){
// redirects to the homepage
  req.session.reset();
  res.redirect('/');
});
app.listen(3000);

require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')


const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    //cookie: { secure: true }
  }))

  app.use(passport.initialize());
  app.use(passport.session());



// mongoose.connect('mongodb://127.0.0.1:27017/FresherDB');
console.log(process.env.MONGO_URI)
mongoose.connect(process.env.MONGO_URI);
const studentSchema = new mongoose.Schema({
    username: String,
    rollno: String,
    points: Number,
    email: String,
    Position: Number,
    googleId: String
})

studentSchema.plugin(passportLocalMongoose)
studentSchema.plugin(findOrCreate);

const Student = mongoose.model("Student",studentSchema);

passport.use(Student.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

const url = process.env.DEV ? "http://localhost:3000" : "https://techenheimer.eastus.cloudapp.azure.com";
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: `${url}/auth/google/secrets`,
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    Student.findOrCreate({ googleId: profile.id }, function (err, user) {
        console.log(profile);
        Student.findOneAndUpdate({googleId: profile.id},{username:profile.displayName}).then((student)=>{
            console.log(student.points);
        })
      return cb(err, user);
    });
  }
));

app.get("/admin", (req,res)=>{
    console.log("hi");
    if (req.isAuthenticated()){
        
        Student.find().sort({points: -1}).then((student)=>{
            Student.findOne({_id:req.user._id}).then((stud)=>{
                console.log(student[0].username);
                res.render("index.ejs",{
                    student:student,
                    userId: req.user._id,
                    currentUser: stud
                })
            })
            
        })
    } else{
        res.redirect("/login")
    }
    
    
})

app.get("/login", (req,res)=>{
    res.render('login.ejs')
})

app.get("/register", (req,res)=>{
    res.render('register.ejs')
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile','email'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    
    res.redirect('/admin');
  });

app.post("/admin", (req,res)=>{
    const user = req.body.userButton;
    Student.updateOne({_id:user},{$inc: {points: 1}}).then();
    res.redirect("/admin");
})

app.post("/dec", (req,res)=>{
    const user = req.body.decButton;
    Student.updateOne({_id:user},{$inc: {points: -1}}).then();
    res.redirect("/admin");
})

app.listen(3000, ()=>{
    console.log("listening");
})
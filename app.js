// Import core module - path
const path = require("path");
const fs = require("fs");
// Import necessary module
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
// Import custom defined module
const User = require("./models/user");
// Import routes
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");

if (!process.env.NODE_ENV || 
  !process.env.MONGO_USER || 
  !process.env.MONGO_PASSWORD ||
  !process.env.MONGO_SERVER || 
  !process.env.MONGO_DB || 
  !process.env.SG_API_KEY) {
    throw new Error("Please specify the environment variables: NODE_ENV, MONGO_USER, MONGO_PASSWORD, MONGO_SERVER, MONGO_DB, SG_API_KEY");
  }


console.log("Env:" + process.env.NODE_ENV);

// Define package's option object
const MongoDB_URI = `mongodb+srv://${process.env.MONGO_USER}:${
  process.env.MONGO_PASSWORD
}@${process.env.MONGO_SERVER}/${process.env.MONGO_DB}`;

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

// Initiate express
const app = express();
// Define veiw template engine & veiws folder
app.set("view engine", "ejs");
app.set("views", "views");

// Use helmet to secure response header
app.use(helmet());
// Use compression to compress static resources
app.use(compression());
// Use morgan to log
app.use(morgan("combined", { stream: accessLogStream }));
// Use body parser
app.use(bodyParser.urlencoded({ extended: false }));
// Use multipart data parser
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
// Use express static method to define static resources folder
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
// Use express session with initial parameters
app.use(
  session({
    secret: "agreeinfotech.com",
    resave: false,
    saveUninitialized: false,
    store: new MongoDBStore({
      uri: MongoDB_URI,
      collection: "sessions"
    })
  })
);
// Initiate csurf
const csrfProtection = csrf();
// Use csurf to generate CSRF token for incoming request
app.use(csrfProtection);

// Transfer session user id into Mongoose User object
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      next(error);
    });
});

// Use res.locals to store session data and CSRF token
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Define middleware using auth route
app.use(authRoutes);
// Define middleware using admin route
app.use("/admin", adminRoutes);
// Define middleware using shop route
app.use(shopRoutes);

// Define page not found middleware
app.use((req, res, next) => {
  res.status(404).render("404", {
    pageTitle: "Page Not Found",
    path: "/404"
  });
});

// Define ERROR handling middleware
app.use((error, req, res, next) => {
  let httpStatusCode = 500;
  if (error.httpStatusCode) {
    httpStatusCode = error.httpStatusCode;
  }
  if (httpStatusCode === 500) {
    res.status(500).render("500", {
      pageTitle: "Server Error",
      path: "/error",
      errorMessage: error
    });
  } else {
    res.status(httpStatusCode).render("error", {
      pageTitle: "Unexpected Error",
      path: "/error",
      errorMessage: error
    });
  }
});

// Connect mongodb using mongoose package & start listen http request
mongoose
  .connect(MongoDB_URI, { useNewUrlParser: true })
  .then(result => {
    app.listen(process.env.PORT || 3000);
  })
  .catch(err => {
    console.log(err);
  });

// Nodejs module - token with expiration
const crypto = require("crypto");

// Import necessary 3rd party package
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendGridTransporter = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator/check");

const User = require("../models/user");

const transporter = nodemailer.createTransport(
  sendGridTransporter({
    auth: {
      api_key: process.env.SG_API_KEY
    }
  })
);

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: [],
    originInput: { email: "", password: "" }
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array(),
      originInput: { email: email, password: password }
    });
  }
  User.findOne({ email: email })
    .then(user => {
      req.session.user = user;
      req.session.isLoggedIn = true;
      return req.session.save(err => {
        if (err) {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        }
        res.redirect("/");
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: [],
    originInput: {
      email: "",
      password: "",
      confirmedPassword: ""
    }
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmedPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array(),
      originInput: {
        email: email,
        password: password,
        confirmedPassword: confirmedPassword
      }
    });
  }
  bcrypt
    .hash(password, 12) // encrypt password
    .then(hashedPassword => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] }
      });
      return user.save(); // create new user
    })
    .then(result => {
      res.redirect("/login"); // forward to login page
      return transporter // send signup notification email (Not Best Practice)
        .sendMail({
          to: email,
          from: "shop@agree.com",
          subject: "Signup succeeded!",
          html: "<h1>You successfully signed up!</h1>"
        });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    if (err) {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    }
    res.redirect("/login");
  });
};

exports.getReset = (req, res, next) => {
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    originInput: { email: "" },
    errorMessage: []
  });
};

exports.postReset = (req, res, next) => {
  const email = req.body.email;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/reset", {
      path: "/reset",
      pageTitle: "Reset Password",
      errorMessage: errors.array(),
      originInput: {
        email: email
      }
    });
  }
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    }
    const token = buffer.toString("hex");
    User.findOne({ email: email })
      .then(user => {
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 60 * 60 * 24 * 1000; //24 hour
        return user.save();
      })
      .then(result => {
        res.render("auth/check-email", {
          pageTitle: "Check Reset Email",
          path: "/reset"
        });
        transporter // send reset password confirmation email (Not Best Practice)
          .sendMail({
            to: email,
            from: "shop@agree.com",
            subject: "Password reset",
            html: `
                <p>You requested a password reset.</p>
                <p>Click the <a href="http://localhost:3000/new-password/${token}">link</a> to set a new password.</p>
              `
          });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getCheckEmail = (req, res, next) => {
  res.render("auth/check-email", {
    pageTitle: "Check Reset Email",
    path: "/reset"
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token
  })
    .then(user => {
      if (!user) {
        return res.status(400).render("auth/token-error", {
          pageTitle: "Error",
          path: "/error",
          errorMessage: "Token is invalid!"
        });
      }
      if (user.resetTokenExpiration < Date.now()) {
        return res.status(400).render("auth/token-error", {
          pageTitle: "Error",
          path: "/error",
          errorMessage: "Token is expired!"
        });
      }
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        userId: user._id.toString(),
        token: token,
        errorMessage: [],
        originInput: { newPassword: "", confirmPassword: "" }
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.newPassword;
  const confirmPassword = req.body.confirmPassword;
  const userId = req.body.userId;
  const token = req.body.token;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/new-password", {
      path: "/new-password",
      pageTitle: "New Password",
      userId: userId,
      token: token,
      errorMessage: errors.array(),
      originInput: {
        newPassword: newPassword,
        confirmPassword: confirmPassword
      }
    });
  }
  User.findOne({
    _id: userId,
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() }
  })
    .then(user => {
      return bcrypt
        .hash(newPassword, 12) // encrypt password
        .then(hashedPassword => {
          user.password = hashedPassword;
          user.resetToken = undefined;
          user.resetTokenExpiration = undefined;
          return user.save().then(result => {
            res.redirect("/login"); // forward to login page
            // return transporter // send signup notification email (Not Best Practice)
            //   .sendMail({
            //     to: email,
            //     from: "shop@agree.com",
            //     subject: "Signup succeeded!",
            //     html: "<h1>You successfully signed up!</h1>"
            //   });
          }); // update user password
        });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

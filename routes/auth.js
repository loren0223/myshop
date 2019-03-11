const express = require("express");

const authController = require("../controllers/auth");
const { check } = require("express-validator/check");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

const router = express.Router();

router.get("/login", authController.getLogin);

router.post(
  "/login",
  [
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please input a valid email.")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then(user => {
          if (!user) {
            return Promise.reject("Email account does not exist.");
          }
          return true;
        });
      }),
    check("password")
      .trim()
      .custom((value, { req }) => {
        return User.findOne({ email: req.body.email }).then(user => {
          if (user) {
            if (value === "") {
              return Promise.reject("Please input your password.");
            } else {
              return bcrypt.compare(value, user.password).then(doMatch => {
                if (!doMatch) {
                  return Promise.reject("Password is incorrect.");
                }
              });
            }
          }
          return true;
        });
      })
  ],
  authController.postLogin
);

router.get("/signup", authController.getSignup);

router.post(
  "/signup",
  [
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please input a valid email.")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then(user => {
          if (user) {
            return Promise.reject(
              "Email exists already. Please pick a different one."
            );
          }
        });
      }),
    check("password")
      .trim()
      .isLength({ min: 6 })
      .withMessage("Password minimun length is 6."),
    check("confirmPassword")
      .trim()
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Password and confirmed password are different.")
  ],
  authController.postSignup
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post(
  "/reset",
  [
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please input a valid email.")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then(user => {
          if (!user) {
            return Promise.reject("Email account does not exist.");
          }
          return true;
        });
      })
  ],
  authController.postReset
);
router.get("/check-email", authController.getCheckEmail);

router.get("/new-password/:token", authController.getNewPassword);

router.post(
  "/new-password",
  [
    check("newPassword")
      .trim()
      .isLength({ min: 6 })
      .withMessage("Password minimun length is 6."),
    check("confirmPassword")
      .trim()
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage("Password and confirmed password are different.")
  ],
  authController.postNewPassword
);

module.exports = router;

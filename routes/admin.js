const path = require("path");

const express = require("express");

const isAuth = require("../middleware/is-auth");

const adminController = require("../controllers/admin");

const { check } = require("express-validator/check");

const validator = [
  check("title")
    .exists({ checkFalsy: true })
    .withMessage("Title is required!")
    .isLength({ max: 30 })
    .withMessage("Max. length is 30 ")
    .trim(),
  check("price")
    .exists({ checkFalsy: true })
    .withMessage("Price is required!")
    .isFloat()
    .withMessage("Invalid float number")
    .trim(),
  check("description")
    .exists({ checkFalsy: true })
    .withMessage("Description is required!")
    .isLength({ max: 100 })
    .withMessage("Max. length is 100 ")
    .trim()
];

const router = express.Router();

// /admin/add-product => GET
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/add-product => POST
router.post("/add-product", isAuth, validator, adminController.postAddProduct);

// /admin/products => GET
router.get("/products", isAuth, adminController.getProducts);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post(
  "/edit-product",
  isAuth,
  validator,
  adminController.postEditProduct
);

router.delete("/product/:prodId", isAuth, adminController.deleteProduct);

module.exports = router;

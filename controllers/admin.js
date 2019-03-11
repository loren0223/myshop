const fileHelper = require("../util/file");

const mongoose = require("mongoose");
const Product = require("../models/product");

const { validationResult } = require("express-validator/check");

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: [],
    product: {
      title: "",
      price: "",
      description: ""
    }
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file; // multipart-data
  const price = req.body.price;
  const description = req.body.description;
  //console.log(image);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      errorMessage: errors.array(),
      product: {
        title: title,
        price: price,
        description: description
      }
    });
  }
  if (image === undefined) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      errorMessage: [
        {
          param: "image",
          msg: "Image file should be *.png, *.jpg or *.jpeg."
        }
      ],
      product: {
        title: title,
        price: price,
        description: description
      }
    });
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: image.path,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      console.log("Created Product");
      res.redirect("/admin/products");
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit; // Fetch GET Query parameter edit
  const prodId = req.params.productId; // Fetch GET URL parameter productId
  Product.findById(prodId)
    .then(product => {
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        hasError: false,
        errorMessage: [],
        product: product
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      errorMessage: errors.array(),
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc
      }
    });
  }
  Product.findById(prodId)
    .then(product => {
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl); // async way
        product.imageUrl = image.path;
      }
      return product.save();
    })
    .then(result => {
      console.log("UPDATED PRODUCT!");
      res.redirect("/admin/products");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find()
    .then(products => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products"
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.prodId;
  Product.findById(prodId)
    .then(product => {
      fileHelper.deleteFile(product.imageUrl); // async way
      return Product.findOneAndDelete({ _id: mongoose.Types.ObjectId(prodId) });
    })
    .then(product => {
      console.log("DESTROYED PRODUCT");
      res.status(200).json({message: "Delete product successfully."});
    })
    .catch(err => {
      res.status(500).json({message: "Deleting product failed."});
    });
};

const express = require('express');
const { createCategoryCtrl,fetchCategoriesCtrl,fetchCategoryCtrl,updateCategoryCtrl,deleteCategoryCtrl } = require('../../controllers/category/categoryCtrl');
const authMiddleware = require("../../middleWares/auth/authMiddleware");
const categoryRoute = express.Router();


categoryRoute.post('/', authMiddleware,createCategoryCtrl);
categoryRoute.get('/', authMiddleware,fetchCategoriesCtrl);
categoryRoute.get('/:id', authMiddleware,fetchCategoryCtrl);
categoryRoute.put('/:id', authMiddleware,updateCategoryCtrl);
categoryRoute.delete("/:id", authMiddleware,deleteCategoryCtrl);

module.exports = categoryRoute;
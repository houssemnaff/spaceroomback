const express = require('express');
const { getproggress, progressassigment, progressresource } = require('../controllers/userprogressconttroller');
const router = express.Router();


router.get("/progress/:userId/:courseId",protect,getproggress )
router.post("/progress/assignment",protect,progressassigment )
router.post("/progress/resource",protect,progressresource)
   
   

const express = require('express');
const router = express.Router();

//Import Controller
const { read, update } = require('../controllers/user');
const { requireSignin, adminMidddleware } = require('../controllers/auth');

router.get('/user/:id', requireSignin, read); 
router.put('/user/update', requireSignin, update); 
router.put('/admin/update', requireSignin, adminMidddleware, update); 

module.exports = router;
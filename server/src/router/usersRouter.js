const { Router } = require('express');
const userController = require('../controllers/userController');

// /users
const usersRouter = Router();

usersRouter.get('/id/transactions', userController.getUsersTransactions);

module.exports = usersRouter;

const { Router } = require('express');
const checkToken = require('../middlewares/checkToken');
const basicMiddlewares = require('../middlewares/basicMiddlewares');
const upload = require('../utils/fileUpload');
const validators = require('../middlewares/validators');
const userController = require('../controllers/userController');
const contestController = require('../controllers/contestController');

// /contests
const contestsRouter = Router();

contestsRouter.post(
  '/',
  checkToken.checkToken,
  basicMiddlewares.onlyForCustomer,
  upload.uploadContestFiles,
  basicMiddlewares.parseBody,
  validators.validateContestCreation,
  userController.payment
);

contestsRouter.get(
  '/byCustomer',
  checkToken.checkToken,
  contestController.getCustomersContests
);

contestsRouter.get(
  '/:id',
  checkToken.checkToken,
  basicMiddlewares.canGetContest,
  contestController.getContestById
);

contestsRouter.get('/', contestController.getContests);

contestsRouter.get(
  '/getAllContests',
  basicMiddlewares.onlyForCreative,
  contestController.getContests
);

contestsRouter.get('/downloadFile/:fileName', contestController.downloadFile);

contestsRouter.post(
  '/updateContest',
  upload.updateContestFile,
  contestController.updateContest
);

contestsRouter.post(
  '/setNewOffer',
  upload.uploadLogoFiles,
  basicMiddlewares.canSendOffer,
  contestController.setNewOffer
);

contestsRouter.post(
  '/setOfferStatus',
  basicMiddlewares.onlyForCustomerWhoCreateContest,
  contestController.setOfferStatus
);

module.exports = contestsRouter;

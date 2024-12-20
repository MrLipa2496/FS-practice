const jwt = require('jsonwebtoken');
const CONSTANTS = require('../constants');
const bd = require('../models');
const NotUniqueEmail = require('../errors/NotUniqueEmail');
const moment = require('moment');
const { v4: uuid } = require('uuid');
const controller = require('../socketInit');
const userQueries = require('./queries/userQueries');
const bankQueries = require('./queries/bankQueries');
const ratingQueries = require('./queries/ratingQueries');

module.exports.login = async (req, res, next) => {
  try {
    const foundUser = await userQueries.findUser({ email: req.body.email });
    await userQueries.passwordCompare(req.body.password, foundUser.password);
    const accessToken = jwt.sign(
      {
        firstName: foundUser.firstName,
        userId: foundUser.id,
        role: foundUser.role,
        lastName: foundUser.lastName,
        avatar: foundUser.avatar,
        displayName: foundUser.displayName,
        balance: foundUser.balance,
        email: foundUser.email,
        rating: foundUser.rating,
      },
      CONSTANTS.JWT_SECRET,
      { expiresIn: CONSTANTS.ACCESS_TOKEN_TIME }
    );
    await userQueries.updateUser({ accessToken }, foundUser.id);
    res.send({ token: accessToken });
  } catch (err) {
    next(err);
  }
};
module.exports.registration = async (req, res, next) => {
  try {
    const newUser = await userQueries.userCreation(
      Object.assign(req.body, { password: req.hashPass })
    );
    const accessToken = jwt.sign(
      {
        firstName: newUser.firstName,
        userId: newUser.id,
        role: newUser.role,
        lastName: newUser.lastName,
        avatar: newUser.avatar,
        displayName: newUser.displayName,
        balance: newUser.balance,
        email: newUser.email,
        rating: newUser.rating,
      },
      CONSTANTS.JWT_SECRET,
      { expiresIn: CONSTANTS.ACCESS_TOKEN_TIME }
    );
    await userQueries.updateUser({ accessToken }, newUser.id);
    res.send({ token: accessToken });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      next(new NotUniqueEmail());
    } else {
      next(err);
    }
  }
};

function getQuery (offerId, userId, mark, isFirst, transaction) {
  const getCreateQuery = () =>
    ratingQueries.createRating(
      {
        offerId,
        mark,
        userId,
      },
      transaction
    );
  const getUpdateQuery = () =>
    ratingQueries.updateRating({ mark }, { offerId, userId }, transaction);
  return isFirst ? getCreateQuery : getUpdateQuery;
}

module.exports.changeMark = async (req, res, next) => {
  let sum = 0;
  let avg = 0;
  let transaction;
  const { isFirst, offerId, mark, creatorId } = req.body;
  const userId = req.tokenData.userId;
  try {
    transaction = await bd.sequelize.transaction({
      isolationLevel:
        bd.Sequelize.Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED,
    });
    const query = getQuery(offerId, userId, mark, isFirst, transaction);
    await query();
    const offersArray = await bd.Ratings.findAll({
      include: [
        {
          model: bd.Offers,
          required: true,
          where: { userId: creatorId },
        },
      ],
      transaction,
    });
    for (let i = 0; i < offersArray.length; i++) {
      sum += offersArray[i].dataValues.mark;
    }
    avg = sum / offersArray.length;

    await userQueries.updateUser({ rating: avg }, creatorId, transaction);
    transaction.commit();
    controller.getNotificationController().emitChangeMark(creatorId);
    res.send({ userId: creatorId, rating: avg });
  } catch (err) {
    transaction.rollback();
    next(err);
  }
};

module.exports.payment = async (req, res, next) => {
  const {
    body: { number, cvc, expiry, price, contests },
    tokenData: { userId },
  } = req;
  const { SQUADHELP_BANK_NUMBER, SQUADHELP_BANK_CVC, SQUADHELP_BANK_EXPIRY } =
    CONSTANTS;

  let transaction;
  try {
    transaction = await bd.sequelize.transaction();
    await bankQueries.updateBankBalance(
      {
        balance: bd.sequelize.literal(`
          CASE
            WHEN "cardNumber"='${number.replace(/ /g, '')}' 
              AND "cvc"='${cvc}' 
              AND "expiry"='${expiry}'
                THEN "balance"-${price}
            WHEN "cardNumber"='${SQUADHELP_BANK_NUMBER}' 
              AND "cvc"='${SQUADHELP_BANK_CVC}' 
              AND "expiry"='${SQUADHELP_BANK_EXPIRY}'
                THEN "balance"+${price} END
        `),
      },
      {
        cardNumber: {
          [bd.Sequelize.Op.in]: [
            SQUADHELP_BANK_NUMBER,
            number.replace(/ /g, ''),
          ],
        },
      },
      transaction
    );
    const orderId = uuid();
    contests.forEach((contest, index) => {
      const prize =
        index === contests.length - 1
          ? Math.ceil(price / contests.length)
          : Math.floor(price / contests.length);
      contest = Object.assign(contest, {
        status: index === 0 ? 'active' : 'pending',
        userId,
        priority: index + 1,
        orderId,
        createdAt: moment().format('YYYY-MM-DD HH:mm'),
        prize,
      });
    });
    await bd.Contests.bulkCreate(contests, { transaction });

    // TODO move to constants
    const newBankTransacton = {
      amount: price,
      operationType: 'EXPENSE',
      userId,
    };

    await bd.Transactions.create(newBankTransacton, { transaction });

    transaction.commit(); // зберігти зміни всіх запитів
    res.send();
  } catch (err) {
    transaction.rollback(); // відкатити всі зміни транзакції
    next(err);
  }
};

module.exports.updateUser = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.avatar = req.file.filename;
    }
    const updatedUser = await userQueries.updateUser(
      req.body,
      req.tokenData.userId
    );
    res.send({
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      displayName: updatedUser.displayName,
      avatar: updatedUser.avatar,
      email: updatedUser.email,
      balance: updatedUser.balance,
      role: updatedUser.role,
      id: updatedUser.id,
    });
  } catch (err) {
    next(err);
  }
};

module.exports.cashout = async (req, res, next) => {
  // TODO destructuring
  let transaction;
  try {
    transaction = await bd.sequelize.transaction();
    const updatedUser = await userQueries.updateUser(
      { balance: bd.sequelize.literal('balance - ' + req.body.sum) },
      req.tokenData.userId,
      transaction
    );
    await bankQueries.updateBankBalance(
      {
        balance: bd.sequelize.literal(`
          CASE 
            WHEN "cardNumber"='${req.body.number.replace(/ /g, '')}' 
              AND "expiry"='${req.body.expiry}' 
              AND "cvc"='${req.body.cvc}'
                THEN "balance"+${req.body.sum}
            WHEN "cardNumber"='${CONSTANTS.SQUADHELP_BANK_NUMBER}'
              AND "expiry"='${CONSTANTS.SQUADHELP_BANK_EXPIRY}' 
              AND "cvc"='${CONSTANTS.SQUADHELP_BANK_CVC}'
                THEN "balance"-${req.body.sum}
          END
        `),
      },
      {
        cardNumber: {
          [bd.Sequelize.Op.in]: [
            CONSTANTS.SQUADHELP_BANK_NUMBER,
            req.body.number.replace(/ /g, ''),
          ],
        },
      },
      transaction
    );

    // TODO move to constants
    const newBankTransacton = {
      amount: req.body.sum,
      operationType: 'INCOME',
      userId: req.tokenData.userId,
    };

    await bd.Transactions.create(newBankTransacton, { transaction });

    transaction.commit();

    res.send({ balance: updatedUser.balance });
  } catch (err) {
    transaction.rollback();
    next(err);
  }
};

module.exports.getUsersTransactions = async (req, res, next) => {
  const {
    query: { limit = 8, offset = 0 },
    tokenData: { userId },
  } = req;

  try {
    const foundTransactions = await bd.Transactions.findAll({
      where: { userId },
      limit,
      offset,
      raw: true,
    });

    res.status(200).send(foundTransactions);
  } catch (err) {
    next(err);
  }
};

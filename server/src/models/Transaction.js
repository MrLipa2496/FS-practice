module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define(
    'Transactions',
    {
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          isPositive (value) {
            if (value <= 0) {
              throw new Error('amount must be positive');
            }
          },
        },
      },
      operationType: {
        type: DataTypes.ENUM('INCOME', 'EXPENSE'),
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: true,
        },
      },
    },
    {
      timestamps: true,
    }
  );

  Transaction.associate = models => {
    Transaction.belongsTo(models.Users, {
      foreignKey: { name: 'userId', allowNull: false },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  };

  return Transaction;
};

module.exports = (sequelize, DataTypes) => {
  const Rating = sequelize.define(
    'Ratings',
    {
      offerId: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      mark: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 5,
        },
      },
    },
    {
      timestamps: false,
    }
  );

  Rating.associate = db => {
    Rating.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id' });
    Rating.belongsTo(db.Offer, { foreignKey: 'offerId', targetKey: 'id' });
  };

  return Rating;
};

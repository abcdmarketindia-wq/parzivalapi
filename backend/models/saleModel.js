const { db, nextId } = require('./db');
const limitModel = require('./limitModel');

const sales = () => db.collection('sales');

// Records the sale and credits the calls together; a failed credit leaves no record behind.
async function create(userId, api, quantity, buyRatePaise, sellRatePaise) {
  const id = await nextId('sales');
  await sales().insertOne({
    _id: id,
    user_id: userId,
    api,
    quantity,
    buy_rate_paise: buyRatePaise,
    sell_rate_paise: sellRatePaise,
    created_at: Date.now(),
  });
  try {
    await limitModel.add(userId, api, quantity);
  } catch (err) {
    await sales().deleteOne({ _id: id });
    throw err;
  }
  return id;
}

const list = () =>
  sales()
    .aggregate([
      { $sort: { _id: -1 } },
      { $limit: 500 },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          id: '$_id',
          email: '$user.email',
          api: 1,
          quantity: 1,
          buy_rate_paise: 1,
          sell_rate_paise: 1,
          created_at: 1,
        },
      },
    ])
    .toArray();

// Across every sale, not only the rows list() returns.
async function totals() {
  const [row] = await sales()
    .aggregate([
      {
        $group: {
          _id: null,
          calls: { $sum: '$quantity' },
          cost_paise: { $sum: { $multiply: ['$quantity', '$buy_rate_paise'] } },
          revenue_paise: { $sum: { $multiply: ['$quantity', '$sell_rate_paise'] } },
        },
      },
    ])
    .toArray();
  return { calls: row?.calls ?? 0, cost_paise: row?.cost_paise ?? 0, revenue_paise: row?.revenue_paise ?? 0 };
}

module.exports = { create, list, totals };

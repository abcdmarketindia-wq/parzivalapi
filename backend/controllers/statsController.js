const userModel = require('../models/userModel');
const stats = require('../models/statsModel');
const { fail } = require('../utils/response');

const APIS = ['vehicle', 'hsrp'];
const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 30;

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: stats.TIME_ZONE }); // en-CA gives YYYY-MM-DD.
const dayString = (ms) => dayFormat.format(new Date(ms));

// Start of a YYYY-MM-DD day in India time (no daylight saving, so always +05:30), or null.
function dayStart(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const ms = Date.parse(`${date}T00:00:00+05:30`);
  return Number.isNaN(ms) || dayString(ms) !== date ? null : ms;
}

// Balances are only stored as they are now, so a past day's opening balance is worked
// out backwards: undo every sale and charged call made since that day began.
async function getStats(req, res) {
  const today = dayString(Date.now());
  const date = String(req.query.date ?? today);
  const start = dayStart(date);
  if (start === null) return fail(res, 400, 'Date must be a real day in YYYY-MM-DD format.');
  const end = start + DAY_MS;
  const historyFrom = dayStart(today) - (HISTORY_DAYS - 1) * DAY_MS;

  const [users, balances, usedSince, addedSince, usedDay, addedDay, dailyUsed, dailyAdded] = await Promise.all([
    userModel.listAll(),
    stats.currentBalances(),
    stats.usedByUser(start),
    stats.addedByUser(start),
    stats.usedByUser(start, end),
    stats.addedByUser(start, end),
    stats.dailyUsed(historyFrom),
    stats.dailyAdded(historyFrom),
  ]);

  const rows = users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    apis: Object.fromEntries(
      APIS.map((api) => {
        const k = stats.key(user.id, api);
        const opening = (balances[k] ?? 0) - (addedSince[k] ?? 0) + (usedSince[k] ?? 0);
        const added = addedDay[k] ?? 0;
        const used = usedDay[k] ?? 0;
        return [api, { opening, added, used, left: opening + added - used }];
      }),
    ),
  }));

  const history = Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const day = dayString(dayStart(today) - i * DAY_MS);
    return {
      date: day,
      used: Object.fromEntries(APIS.map((api) => [api, dailyUsed[day]?.[api] ?? 0])),
      added: Object.fromEntries(APIS.map((api) => [api, dailyAdded[day]?.[api] ?? 0])),
    };
  });

  res.json({ date, today, users: rows, history });
}

module.exports = { getStats };

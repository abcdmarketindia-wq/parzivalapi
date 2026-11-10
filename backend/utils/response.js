const fail = (res, status, error) => res.status(status).json({ success: false, error });

module.exports = { fail };

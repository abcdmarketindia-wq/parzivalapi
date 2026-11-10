const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const isValidUserId = (id) => /^[a-z0-9._@+-]{3,254}$/.test(id);
// 200 matches the length login compares, so a longer password could never be checked in full.
const isValidPassword = (password) => password.length >= 6 && password.length <= 200;

module.exports = { isValidEmail, isValidUserId, isValidPassword };

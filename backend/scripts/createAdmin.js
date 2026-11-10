// Usage: npm run create-admin
// Prompts for an email and password, then creates the admin.
// If the email already has an account, it is made an admin and offers a password update.
const path = require('node:path');
const readline = require('node:readline/promises');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // Fall back to the process environment.
}

const { connectDb, closeDb } = require('../models/db');
const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');
const { hashPassword } = require('../utils/security');
const { isValidEmail, isValidPassword } = require('../utils/validation');

function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    let value = '';
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const finish = (action) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      action();
    };
    function onData(chunk) {
      if (chunk.startsWith('\u001b')) return; // Arrow and function keys aren't part of a password.
      for (const char of chunk) {
        if (char === '\r' || char === '\n') return finish(() => resolve(value));
        if (char === '\u0003') return finish(() => reject(new Error('Cancelled.')));
        if (char === '\u007f' || char === '\b') {
          if (value) stdout.write('\b \b');
          value = value.slice(0, -1);
        } else {
          value += char;
          stdout.write('*');
        }
      }
    }
    stdin.on('data', onData);
  });
}

// Piped input is read once, then handed out a line at a time.
let pipedLines;
async function readPipedLine() {
  if (!pipedLines) {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    pipedLines = input.split(/\r?\n/);
  }
  return pipedLines.shift() ?? '';
}

async function askLine(prompt) {
  if (!process.stdin.isTTY) return readPipedLine();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
}

async function readNewPassword() {
  if (!process.stdin.isTTY) return readPipedLine();
  const password = await askHidden('New admin password (at least 6 characters): ');
  if (password !== (await askHidden('Repeat password: '))) throw new Error('Passwords do not match.');
  return password;
}

async function readValidPasswordHash() {
  const password = await readNewPassword();
  if (!isValidPassword(password)) throw new Error('Password must be 6 to 200 characters.');
  return hashPassword(password);
}

async function main() {
  await connectDb();
  const email = String(process.argv[2] ?? (await askLine('Admin email: '))).trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.');

  const existing = await userModel.findByEmail(email);
  if (existing) {
    const answer = await askLine('This email already has an account. Update its password? (y/n): ');
    if (/^y(es)?$/i.test(answer.trim())) {
      const hash = await readValidPasswordHash();
      await userModel.setPassword(existing.id, hash);
      await sessionModel.removeForUser(existing.id); // Anyone logged in with the old password is signed out.
      await userModel.setRole(existing.id, 'admin');
      console.log(`Password updated. ${email} is an admin. Log in with the normal login form.`);
      return;
    }
    await userModel.setRole(existing.id, 'admin');
    console.log(`${email} is an admin. The password was not changed.`);
    return;
  }

  await userModel.create(email, await readValidPasswordHash(), 'admin');
  console.log(`Admin ${email} created. Log in with the normal login form.`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
    process.exit(); // stdin can keep the process alive after the prompts finish.
  });

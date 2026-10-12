import { spawn } from 'node:child_process';

const processes = [
  spawn('node', ['--watch-path=server', 'server/index.js'], { stdio: 'inherit' }),
  spawn('npm', ['run', 'dev', '--prefix', 'client'], { stdio: 'inherit' })
];

function stopAll() {
  processes.forEach((child) => child.kill('SIGINT'));
}

processes.forEach((child) => child.on('exit', stopAll));
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

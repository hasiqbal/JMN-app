const major = Number.parseInt(process.versions.node.split('.')[0], 10);

if (Number.isNaN(major) || major < 22 || major >= 25) {
  console.error('Unsupported Node.js version for this Expo project.');
  console.error(`Detected Node ${process.versions.node}. Use Node 22 LTS.`);
  console.error('If you use nvm/fnm/Volta, switch to Node 22 and run pnpm install again.');
  process.exit(1);
}
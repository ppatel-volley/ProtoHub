import fs from 'fs';
import path from 'path';

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Please provide a version number');
  process.exit(1);
}

const packagePaths = [
  'package.json',
  'apps/client/package.json',
  'apps/server/package.json'
];

packagePaths.forEach(pkgPath => {
  const fullPath = path.resolve(process.cwd(), pkgPath);
  const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 4) + '\n');
  console.log(`Updated ${pkgPath} to version ${newVersion}`);
});

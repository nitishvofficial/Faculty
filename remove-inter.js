const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      content = content.replace(/,\s*fontFamily:\s*'Inter'/g, '');
      content = content.replace(/fontFamily:\s*'Inter',\s*/g, '');
      content = content.replace(/fontFamily:\s*'Inter'/g, '');
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fullPath);
      }
    }
  }
}
replaceInDir('e:/Faculty/src');

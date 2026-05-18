const fs = require('fs');
const content = fs.readFileSync('prisma/schema.prisma', 'utf8');
const lines = content.split('\n');
console.log('Total lines read:', lines.length);

const matches = [];
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('expense') || line.toLowerCase().includes('model ')) {
    matches.push({ lineNum: index + 1, content: line.trim() });
  }
});

console.log('Matches:', matches.slice(0, 50));

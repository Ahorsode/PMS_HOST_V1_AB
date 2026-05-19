import fs from 'fs';
import path from 'path';

function main() {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  console.log('Reading schema from:', schemaPath);
  let content = fs.readFileSync(schemaPath, 'utf-8');

  // Let's replace any `id String @id` line that doesn't have a default or uuid mapping
  // with `id String @id @default(cuid())`
  
  const originalLines = content.split('\n');
  const updatedLines = originalLines.map((line) => {
    // Check if the line defines id as String @id without any default
    const match = line.match(/^(\s*)id\s+String\s+@id\s*$/);
    if (match) {
      const indent = match[1];
      console.log(`Updating line: "${line.trim()}"`);
      return `${indent}id                 String            @id @default(cuid())`;
    }
    return line;
  });

  const updatedContent = updatedLines.join('\n');
  fs.writeFileSync(schemaPath, updatedContent, 'utf-8');
  console.log('✅ schema.prisma updated successfully!');
}

main();

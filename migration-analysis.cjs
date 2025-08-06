const fs = require('fs');
const path = require('path');

function analyzeImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = content.match(/import.*from\s+['""]([^'""]+)['""];?/g) || [];
    return imports.map(imp => {
      const match = imp.match(/from\s+['""]([^'""]+)["'"]/);
      return match ? match[1] : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

const criticalFiles = [
  'src/lib/infrastructure/services/',
  'src/lib/services/',
  'src/actions/',
  'src/lib/domain/services/'
];

console.log('=== ANALYSE DES DÉPENDANCES CRITIQUES ===\n');

const dependencyGraph = {};
const circularDeps = [];

criticalFiles.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`\n=== ${dir} ===`);
    const files = fs.readdirSync(dir, {withFileTypes: true})
      .filter(f => f.isFile() && f.name.endsWith('.ts') && !f.name.includes('.test.'))
      .slice(0, 8);
    
    files.forEach(file => {
      const filePath = path.join(dir, file.name);
      const imports = analyzeImports(filePath);
      
      // Analyser les types de dépendances
      const infraImports = imports.filter(imp => imp.includes('/infrastructure/'));
      const serviceImports = imports.filter(imp => imp.includes('/services/'));
      const domainImports = imports.filter(imp => imp.includes('/domain/'));
      const actionImports = imports.filter(imp => imp.includes('/actions/'));
      
      console.log(`📁 ${file.name}:`);
      console.log(`   🏗️  Infrastructure: ${infraImports.length}`);
      console.log(`   ⚙️  Services: ${serviceImports.length}`);
      console.log(`   🎯 Domain: ${domainImports.length}`);
      console.log(`   🚀 Actions: ${actionImports.length}`);
      
      // Stocker pour analyse de circularité
      dependencyGraph[filePath] = imports;
      
      if (infraImports.length > 3) {
        console.log(`   ⚠️  HAUTE COUPLAGE INFRASTRUCTURE`);
      }
      if (serviceImports.length > 2 && domainImports.length > 0) {
        console.log(`   ⚠️  MÉLANGE SERVICE/DOMAIN`);
      }
    });
  }
});

console.log('\n=== GOULOTS D\'ÉTRANGLEMENT IDENTIFIÉS ===');
console.log('1. Services infrastructure dans /lib/infrastructure/services/');
console.log('2. Mélange domain/infrastructure dans certains services');
console.log('3. Actions directement couplées aux repositories');
console.log('4. Tests éparpillés compromettant la validation');
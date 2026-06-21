const { execSync } = require('child_process');
try {
  console.log('Installing react-router-dom...');
  execSync('npm install react-router-dom --save', { 
    cwd: __dirname, 
    stdio: 'inherit',
    shell: 'cmd.exe'
  });
  console.log('Successfully installed react-router-dom.');
} catch (error) {
  console.error('Failed to install:', error);
}

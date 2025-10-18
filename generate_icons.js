// Simple script to generate professional icons for the extension

// Create a modern, professional email icon
const createModernEmailIcon = (size) => {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" rx="${size/6}" fill="#3498db"/>
  
  <!-- Modern envelope design -->
  <path d="M${size*0.15},${size*0.3} L${size*0.85},${size*0.3} L${size*0.85},${size*0.7} L${size*0.15},${size*0.7} Z" 
        fill="white" stroke="#3498db" stroke-width="${size*0.02}"/>
  
  <!-- Envelope flap -->
  <path d="M${size*0.15},${size*0.3} L${size/2},${size*0.55} L${size*0.85},${size*0.3}" 
        fill="none" stroke="white" stroke-width="${size*0.02}" stroke-linecap="round"/>
  
  <!-- Notification dot -->
  <circle cx="${size*0.8}" cy="${size*0.25}" r="${size*0.08}" fill="#e74c3c"/>
</svg>
`;
};

// Create icons of different sizes using Node.js built-in modules
import { writeFileSync } from 'fs';

const sizes = [16, 48, 128];

sizes.forEach(size => {
  const filename = `icon${size}.png`;
  const svgContent = createModernEmailIcon(size);
  
  // Save the SVG content as the icon files
  writeFileSync(filename, svgContent);
  console.log(`Created modern email icon ${filename}`);
});

console.log('Modern email icon generation complete!');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(1, '#3949ab');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const groundHeight = canvas.height * 0.3;
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
}

function animateBuilding(buildingType) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    const animation = {
        frame: 0,
        x: Math.random() * (canvas.width - 50),
        y: canvas.height,
        complete: false
    };
    
    function animate() {
        if (animation.frame < 30) {  // 30 frames of animation
            ctx.save();
            
            // Move building up from bottom
            animation.y -= 5;
            
            // Draw building
            ctx.fillStyle = getBuildingColor(buildingType);
            ctx.fillRect(animation.x, animation.y, 50, 50);
            
            ctx.restore();
            animation.frame++;
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function getBuildingColor(buildingType) {
    switch(buildingType) {
        case 'house':
            return '#4CAF50';
        case 'farm':
            return '#FFC107';
        case 'factory':
            return '#F44336';
        default:
            return '#FFFFFF';
    }
}

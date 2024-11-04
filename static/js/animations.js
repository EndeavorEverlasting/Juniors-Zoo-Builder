function animateBuilding(buildingType) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    const animation = {
        frame: 0,
        x: Math.random() * (canvas.width - 100),
        y: canvas.height,
        size: 0,
        opacity: 0,
        complete: false
    };
    
    function drawBuilding(x, y, size, opacity) {
        ctx.save();
        ctx.globalAlpha = opacity;
        
        const color = getBuildingColor(buildingType);
        ctx.fillStyle = color;
        
        // Draw building with a simple shape based on type
        switch(buildingType) {
            case 'house':
                // Draw house (triangle roof + rectangle base)
                ctx.beginPath();
                ctx.moveTo(x + size/2, y);
                ctx.lineTo(x, y + size/2);
                ctx.lineTo(x + size, y + size/2);
                ctx.closePath();
                ctx.fill();
                ctx.fillRect(x + size*0.2, y + size/2, size*0.6, size/2);
                break;
                
            case 'farm':
                // Draw farm (barn shape)
                ctx.beginPath();
                ctx.moveTo(x + size/2, y);
                ctx.lineTo(x, y + size/3);
                ctx.lineTo(x + size, y + size/3);
                ctx.closePath();
                ctx.fill();
                ctx.fillRect(x, y + size/3, size, size*2/3);
                break;
                
            case 'factory':
                // Draw factory (building with chimney)
                ctx.fillRect(x, y + size/3, size, size*2/3);
                ctx.fillRect(x + size*0.3, y, size*0.2, size/2);
                break;
        }
        
        ctx.restore();
    }
    
    function animate() {
        if (animation.frame < 60) {  // 60 frames of animation
            // Calculate animation progress
            const progress = animation.frame / 60;
            
            // Ease-out function for smooth animation
            const ease = 1 - Math.pow(1 - progress, 3);
            
            // Update animation properties
            animation.y = canvas.height - (canvas.height * 0.3 * ease);
            animation.size = 80 * ease;
            animation.opacity = Math.min(1, progress * 2);
            
            // Draw the building
            drawBuilding(animation.x, animation.y, animation.size, animation.opacity);
            
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

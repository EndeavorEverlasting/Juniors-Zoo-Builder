let weather = {
    clouds: [],
    raindrops: [],
    isRaining: false
};

let visitors = [];
let activeParticles = [];

function initWeather() {
    // Create initial clouds
    for (let i = 0; i < 5; i++) {
        weather.clouds.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height * 0.3),
            speed: 0.2 + Math.random() * 0.3,
            size: 30 + Math.random() * 20
        });
    }
}

function updateWeather() {
    // Move clouds
    weather.clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width + cloud.size) {
            cloud.x = -cloud.size;
        }
    });

    // Random chance to start/stop rain
    if (Math.random() < 0.001) {
        weather.isRaining = !weather.isRaining;
    }

    // Update rain
    if (weather.isRaining) {
        if (weather.raindrops.length < 100) {
            weather.raindrops.push({
                x: Math.random() * canvas.width,
                y: 0,
                speed: 5 + Math.random() * 5
            });
        }
    }

    // Move raindrops
    weather.raindrops = weather.raindrops.filter(drop => {
        drop.y += drop.speed;
        return drop.y < canvas.height;
    });
}

function drawWeather() {
    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    weather.clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size * 0.5, cloud.y - cloud.size * 0.2, cloud.size * 0.7, 0, Math.PI * 2);
        ctx.arc(cloud.x - cloud.size * 0.5, cloud.y - cloud.size * 0.1, cloud.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw rain
    if (weather.isRaining) {
        ctx.strokeStyle = 'rgba(155, 155, 255, 0.5)';
        ctx.lineWidth = 1;
        weather.raindrops.forEach(drop => {
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x + 1, drop.y + 10);
            ctx.stroke();
        });
    }
}

function drawBuildings() {
    gameState.buildingGrid.forEach(building => {
        // Draw building
        const buildingImg = new Image();
        buildingImg.src = `/static/assets/${building.type}.svg`;
        ctx.save();
        ctx.globalAlpha = building.opacity;
        ctx.translate(building.x, building.y);
        ctx.scale(building.scale, building.scale);
        ctx.drawImage(buildingImg, 0, 0, BUILDING_SIZE, BUILDING_SIZE);
        
        // Draw animal
        if (building.animal) {
            ctx.drawImage(building.animal, 
                BUILDING_SIZE * 0.25, BUILDING_SIZE * 0.25,
                BUILDING_SIZE * 0.5, BUILDING_SIZE * 0.5);
        }
        ctx.restore();
        
        // Update animation properties
        if (building.scale < 1) {
            building.scale += 0.05;
        }
        if (building.opacity < 1) {
            building.opacity += 0.05;
        }
    });
}

function addVisitor(x, y) {
    const visitorImg = new Image();
    visitorImg.src = '/static/assets/visitor.svg';
    visitors.push({
        x,
        y,
        targetX: x + (Math.random() * 200 - 100),
        targetY: y + (Math.random() * 200 - 100),
        img: visitorImg,
        happiness: Math.random() > 0.5
    });
}

function updateVisitors() {
    visitors.forEach(visitor => {
        const dx = visitor.targetX - visitor.x;
        const dy = visitor.targetY - visitor.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 1) {
            visitor.x += dx * 0.02;
            visitor.y += dy * 0.02;
        } else {
            visitor.targetX = visitor.x + (Math.random() * 200 - 100);
            visitor.targetY = visitor.y + (Math.random() * 200 - 100);
            visitor.happiness = Math.random() > 0.3;
        }
    });
}

function drawVisitors() {
    visitors.forEach(visitor => {
        ctx.save();
        ctx.translate(visitor.x, visitor.y);
        ctx.drawImage(visitor.img, -10, -15, 20, 30);
        
        if (visitor.happiness) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            const heartSize = 5;
            ctx.moveTo(0, -20);
            ctx.bezierCurveTo(-heartSize, -25, -heartSize * 2, -20, 0, -15);
            ctx.bezierCurveTo(heartSize * 2, -20, heartSize, -25, 0, -20);
            ctx.fill();
        }
        ctx.restore();
    });
}

function createHappinessParticle(x, y) {
    activeParticles.push({
        x,
        y,
        size: 10,
        alpha: 1,
        type: 'heart',
        velocity: { x: (Math.random() - 0.5) * 2, y: -2 }
    });
}

function updateParticles() {
    activeParticles = activeParticles.filter(particle => {
        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;
        particle.velocity.y += 0.1;
        particle.alpha -= 0.02;
        return particle.alpha > 0;
    });
}

function drawParticles() {
    activeParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = '#FF69B4';
        
        if (particle.type === 'heart') {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.bezierCurveTo(
                particle.x - particle.size/2, particle.y - particle.size/2,
                particle.x - particle.size, particle.y,
                particle.x, particle.y + particle.size/2
            );
            ctx.bezierCurveTo(
                particle.x + particle.size, particle.y,
                particle.x + particle.size/2, particle.y - particle.size/2,
                particle.x, particle.y
            );
            ctx.fill();
        }
        ctx.restore();
    });
}

function animateBuilding(buildingType, x, y) {
    const animalImg = new Image();
    switch(buildingType) {
        case 'cage':
            animalImg.src = '/static/assets/small_animal.svg';
            break;
        case 'habitat':
            animalImg.src = '/static/assets/medium_animal.svg';
            break;
        case 'safari':
            animalImg.src = '/static/assets/large_animal.svg';
            break;
    }
    
    const building = {
        type: buildingType,
        x,
        y,
        scale: 0,
        opacity: 0,
        animal: animalImg,
        happiness: 100,
        lastParticleTime: 0
    };
    
    gameState.buildingGrid.push(building);
    addVisitor(x + BUILDING_SIZE/2, y + BUILDING_SIZE);
}

// Update the game loop to include new animations
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    updateWeather();
    drawWeather();
    
    updateVisitors();
    drawVisitors();
    
    updateParticles();
    drawParticles();
    
    drawBuildings();
    
    // Spawn happiness particles randomly
    gameState.buildingGrid.forEach(building => {
        if (Date.now() - building.lastParticleTime > 5000 && Math.random() < 0.1) {
            createHappinessParticle(building.x + BUILDING_SIZE/2, building.y);
            building.lastParticleTime = Date.now();
        }
    });
    
    requestAnimationFrame(gameLoop);
}

// Initialize weather when the game starts
initWeather();

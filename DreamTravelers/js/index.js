gsap.registerPlugin(ScrollTrigger);

function initCardParallax() {
    const cards = document.querySelectorAll('.level-card');
    
    cards.forEach((card, index) => {
        gsap.from(card, {
            opacity: 0,
            y: 100,
            rotation: 8,
            duration: 1.2,
            delay: index * 0.3,
            ease: "power4.out"
        });

        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                scale: 1.05,
                boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
                duration: 0.4,
                ease: "power2.out"
            });
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                scale: 1,
                boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
                duration: 0.4,
                ease: "power2.out"
            });
        });
    });

    gsap.from('.title-container', {
        y: -100,
        opacity: 0,
        duration: 2,
        ease: "elastic.out(1, 0.5)"
    });
}

function initParticles() {
    particlesJS("particles-js", {
        particles: {
            number: { value: 100 },
            color: { value: ["#ffffff", "#a1e4ff", "#9d4ddb", "#7e35b8", "#c27ff0"] },
            shape: { type: "circle" },
            opacity: {
                value: 0.6,
                random: true,
                anim: { enable: true, speed: 0.5 }
            },
            size: {
                value: 3,
                random: true,
                anim: { enable: true, speed: 1 }
            },
            move: {
                enable: true,
                speed: 1,
                direction: "none",
                random: true,
                out_mode: "out",
                bounce: false
            }
        },
        interactivity: {
            detect_on: "canvas",
            events: {
                onhover: { enable: true, mode: "repulse" },
                onclick: { enable: true, mode: "push" }
            }
        }
    });
}

function initControlsInfo() {
    const controlsInfo = document.getElementById('controlsInfo');
    
    // Animation d'entrée
    gsap.from(controlsInfo, {
        opacity: 0,
        y: 20,
        duration: 0.8,
        delay: 1.5,
        ease: "power3.out"
    });
    
    // Rendre le panneau cliquable pour réduire/agrandir
    const controlsHeader = document.querySelector('.controls-header');
    const controlItems = document.querySelectorAll('.control-item');
    
    let isCollapsed = false;
    
    controlsHeader.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        
        if (isCollapsed) {
            gsap.to(controlItems, {
                height: 0,
                opacity: 0,
                marginTop: 0,
                paddingTop: 0,
                paddingBottom: 0,
                duration: 0.3,
                ease: "power2.out",
                stagger: 0.05,
                onComplete: () => {
                    controlItems.forEach(item => {
                        item.style.display = 'none';
                    });
                }
            });
            
            // Ajouter une classe pour indiquer que c'est réduit
            controlsInfo.classList.add('collapsed');
            
        } else {
            controlItems.forEach(item => {
                item.style.display = 'flex';
            });
            
            gsap.to(controlItems, {
                height: 'auto',
                opacity: 1,
                marginTop: 'auto',
                paddingTop: 4,
                paddingBottom: 4,
                duration: 0.4,
                ease: "power2.out",
                stagger: 0.05
            });
            
            // Enlever la classe 
            controlsInfo.classList.remove('collapsed');
        }
    });
    
    // Ajouter un indicateur visuel que c'est cliquable
    controlsHeader.style.cursor = 'pointer';
    
    // Ajouter une info-bulle
    const infoIcon = document.createElement('i');
    infoIcon.className = 'fa-solid fa-angle-up info-toggle';
    controlsHeader.appendChild(infoIcon);
}

function startGame(levelId) {
    const menuContent = document.querySelector('.menu-content');
    
    gsap.to(menuContent, {
        opacity: 0,
        scale: 0.9,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => {
            window.location.href = `level${levelId}.html`;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initCardParallax();
    initParticles();
    initControlsInfo();
    
    const menuContent = document.querySelector('.menu-content');
    gsap.from(menuContent, {
        opacity: 0,
        y: 50,
        duration: 1,
        ease: "power3.out"
    });
    
    const buttons = document.querySelectorAll('.menu-btn');
    buttons.forEach((button, index) => {
        gsap.from(button, {
            opacity: 0,
            x: -50,
            duration: 0.8,
            delay: 0.3 + (index * 0.2),
            ease: "back.out(1.7)"
        });
    });
}); 
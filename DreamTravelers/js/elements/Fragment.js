class Fragment {
    constructor(scene, grid, position) {
        this.scene = scene;
        this.grid = grid;
        this.position = position;
        this.mesh = null;
        this.isCollected = false;
        
        this.createFragment();
        this.setupInteraction();
    }
    
    createFragment() {
        // conteneur pour le fragment
        const key = `${this.position.x},${this.position.y},${this.position.z}`;
        this.meshParent = new BABYLON.TransformNode(`fragment_parent_${key}`, this.scene);
        this.meshParent.position = new BABYLON.Vector3(
            this.position.x,
            this.position.y,
            this.position.z
        );
        
        // forme triangulaire
        this.mesh = BABYLON.MeshBuilder.CreateCylinder(
            `fragment_mesh_${key}`,
            { 
                height: 0.5,
                diameterTop: 0,
                diameterBottom: 0.4,
                tessellation: 3
            },
            this.scene
        );
        
        // flottement
        this.mesh.position.y = 0.75;
        this.mesh.parent = this.meshParent;
        
        // atériau
        const material = new BABYLON.StandardMaterial(`fragment_mat_${key}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 0.8, 0.2);
        material.emissiveColor = new BABYLON.Color3(0, 0, 0);
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        
        this.mesh.material = material;
        
        // flottement et rotation
        this.scene.registerBeforeRender(() => {
            if (!this.isCollected) {
                this.mesh.rotation.y += 0.01;
                this.mesh.position.y = 0.75 + Math.sin(performance.now() * 0.002) * 0.1;
            }
        });
    }
    
    setupInteraction() {
        this.observer = this.scene.onBeforeRenderObservable.add(() => {
            if (!this.scene.level || !this.scene.level.player || !this.scene.level.player.mesh || this.isCollected) {
                return;
            }
            
            const player = this.scene.level.player;
            
            // avoir les positions pour vérifier la proximité
            const playerPos = player.mesh.position.clone();
            const fragmentPos = this.meshParent.position.clone();
            
            const playerGridX = Math.round(playerPos.x);
            const playerGridY = Math.round(playerPos.y);
            const playerGridZ = Math.round(playerPos.z);
            const fragmentGridX = Math.round(fragmentPos.x);
            const fragmentGridY = Math.round(fragmentPos.y);
            const fragmentGridZ = Math.round(fragmentPos.z);
            
            // vérifier si le joueur est sur la même case 
            const sameHorizontalPosition = (playerGridX === fragmentGridX && playerGridZ === fragmentGridZ);
            
            // vérifier si le joueur est au même niveau
            const correctHeight = (playerGridY === fragmentGridY || 
                                 (playerGridY === fragmentGridY + 1 && 
                                  Math.abs(playerPos.y - fragmentPos.y - 1) < 0.5));
            
            if (sameHorizontalPosition && correctHeight) {
                this.collect();
            }
        });
    }
    
    collect() {
        if (this.isCollected) return;
        
        this.isCollected = true;
        
        // animation de collecte
        const collectAnimation = new BABYLON.Animation(
            "collectAnim",
            "scaling",
            30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const keyFrames = [
            { frame: 0, value: this.mesh.scaling.clone() },
            { frame: 15, value: new BABYLON.Vector3(1.5, 1.5, 1.5) },
            { frame: 30, value: new BABYLON.Vector3(0, 0, 0) }
        ];
        
        collectAnimation.setKeys(keyFrames);
        this.mesh.animations = [collectAnimation];
        
        // lancer l'animation
        this.scene.beginAnimation(this.mesh, 0, 30, false, 1, () => {
            this.fragmentCollected();
            
            // supprimer le mesh
            this.dispose();
        });
    }
    
    fragmentCollected() {
        // vérifier que le niveau existe
        if (!this.scene.level) return;
        
        // incrémenter le compteur dans le niveau
        this.scene.level.collectedFragments++;
        console.log(`Fragment collecté! ${this.scene.level.collectedFragments}/${this.scene.level.requiredFragments}`);
        
        // maj de la sortie
        if (this.scene.level.exit) {
            this.scene.level.exit.updateFragmentCount(this.scene.level.collectedFragments);
        }
        
        // afficher message
        this.showFragmentMessage();
    }
    
    showFragmentMessage() {
        // vérifier que le niveau existe
        if (!this.scene.level) return;
        
        const message = document.createElement('div');
        message.className = 'fragment-message';
        message.textContent = `Fragment collecté: ${this.scene.level.collectedFragments}/${this.scene.level.requiredFragments}`;
        
        // styles
        message.style.position = 'fixed';
        message.style.top = '100px';
        message.style.left = '50%';
        message.style.transform = 'translateX(-50%)';
        message.style.backgroundColor = 'rgba(0,0,0,0.7)';
        message.style.color = '#FFD700';
        message.style.padding = '10px 20px';
        message.style.borderRadius = '5px';
        message.style.fontFamily = '"Poppins", sans-serif';
        message.style.zIndex = '1000';
        
        document.body.appendChild(message);
        
        // animation avec GSAP
        if (window.gsap) {
            gsap.fromTo(message, 
                { opacity: 0, y: -20 }, 
                { opacity: 1, y: 0, duration: 0.5 }
            );
            
            gsap.to(message, {
                opacity: 0, 
                y: -20, 
                delay: 2,
                duration: 0.5,
                onComplete: () => {
                    document.body.removeChild(message);
                }
            });
        } else {
            setTimeout(() => {
                message.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(message);
                }, 500);
            }, 2000);
        }
    }
    
    dispose() {
        if (this.observer) {
            this.scene.onBeforeRenderObservable.remove(this.observer);
        }
        
        if (this.mesh) {
            this.mesh.dispose();
        }
    }
} 
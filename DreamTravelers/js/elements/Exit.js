class Exit {
    constructor(scene, grid, position, nextLevelId, requiredFragments = 0) {
        this.scene = scene;
        this.grid = grid;
        this.position = position;
        this.nextLevelId = nextLevelId;
        this.mesh = null;
        this.requiredFragments = requiredFragments;
        this.collectedFragments = 0;
        this.isActive = (requiredFragments === 0); // actif par défaut
        
        this.createExit();
        this.setupInteraction();
    }
    
    createExit() {
        try {
            // référence dans la grille pour le pathfinding
            const key = `${this.position.x},${this.position.y},${this.position.z}`;
            
            // s'assurer que la position est valide pour le pathfinding
            if (this.grid && typeof this.grid.addGridElement === 'function') {
                this.meshParent = this.grid.addGridElement(
                    this.position.x, 
                    this.position.y, 
                    this.position.z, 
                    'exit'
                );
            } else {
                // solution de secours
                this.meshParent = new BABYLON.Mesh(`exit_parent_${key}`, this.scene);
                this.meshParent.position = new BABYLON.Vector3(
                    this.position.x,
                    this.position.y,
                    this.position.z
                );
            }
            
            // rectangle
            this.mesh = BABYLON.MeshBuilder.CreateBox(`exit_mesh_${key}`, {
                width: 0.25,
                height: 0.5,
                depth: 0.25
            }, this.scene);
            
            // position pour pas bloquer le mouvement
            this.mesh.position.y = 0.75;
            this.mesh.parent = this.meshParent;
            
            // matériau
            this.material = new BABYLON.StandardMaterial(`exit_mat_${key}`, this.scene);
            this.material.diffuseColor = new BABYLON.Color3(1, 1, 1);
            this.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
            this.material.specularColor = new BABYLON.Color3(0, 0, 0);
            this.material.alpha = 0.8;
            
            this.mesh.material = this.material;
            
            // lumière
            this.light = new BABYLON.PointLight(`exit_light_${key}`, new BABYLON.Vector3(0, 0.75, 0), this.scene);
            this.light.parent = this.mesh;
            this.light.intensity = 0.2;
            this.light.diffuse = new BABYLON.Color3(1, 1, 1);
            
            // rotation
            this.scene.registerBeforeRender(() => {
                if (this.mesh) {
                    this.mesh.rotation.y += 0.005;
                }
            });
            
            console.log("Exit créée avec succès à la position:", this.position);
        } catch (error) {
            console.error("Erreur lors de la création de la sortie:", error);
        }
    }
    
    setupInteraction() {
        // vérifier proximité du joueur à chaque frame
        const observer = this.scene.onBeforeRenderObservable.add(() => {
            // vérifier si le joueur existe
            if (!this.scene.level || !this.scene.level.player || !this.scene.level.player.mesh) {
                return;
            }
            
            const player = this.scene.level.player;
            
            // si joueur en mouvement, ignorer
            if (player.isMoving) {
                return;
            }
            
            // positions pour vérifier la proximité
            const playerPos = player.mesh.position.clone();
            const exitPos = this.meshParent.position.clone();
            
            const distance = Math.sqrt(
                Math.pow(playerPos.x - exitPos.x, 2) + 
                Math.pow(playerPos.z - exitPos.z, 2)
            );
            
            // si assez proche et sortie active
            if (distance < 0.5 && this.isActive) {
                this.teleportToNextLevel();
            } else if (distance < 0.5 && !this.isActive) {
                this.showInactiveMessage();
            }
        });
        
        // stocker l'observer pour pouvoir le supprimer
        this.observer = observer;
    }
    
    updateFragmentCount(count) {
        this.collectedFragments = count;
        this.isActive = (this.collectedFragments >= this.requiredFragments);
        
        // effet quand activé
        if (this.isActive && !this._pulseAnimation) {
            this._pulseAnimation = true;
            this._startPulseAnimation();
        } else if (!this.isActive && this._pulseAnimation) {
            this._pulseAnimation = false;
        }
    }
    
    _startPulseAnimation() {
        let time = 0;
        const observer = this.scene.onBeforeRenderObservable.add(() => {
            if (!this._pulseAnimation) {
                this.scene.onBeforeRenderObservable.remove(observer);
                return;
            }
            
            time += this.scene.getEngine().getDeltaTime() / 1000;
            const pulse = Math.sin(time * 2) * 0.2 + 0.8;
            
            // pulsation
            if (this.mesh) {
                const pulseFactor = 0.9 + (pulse * 0.2);
                this.mesh.scaling.set(pulseFactor, pulseFactor, pulseFactor);
            }
        });
    }
    
    showInactiveMessage() {
        // message "Fragments requis: X/Y"
        if (this._messageTimeout) {
            return;
        }
        
        const container = document.createElement('div');
        container.className = 'floating-message';
        container.innerHTML = `Fragments requis: ${this.collectedFragments}/${this.requiredFragments}`;
        document.body.appendChild(container);
        
        // positionner au-dessus de la sortie
        const engine = this.scene.getEngine();
        const camera = this.scene.activeCamera;
        
        if (camera) {
            const projectedPosition = BABYLON.Vector3.Project(
                new BABYLON.Vector3(this.position.x, this.position.y + 1.5, this.position.z),
                BABYLON.Matrix.Identity(),
                this.scene.getTransformMatrix(),
                camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
            );
            
            container.style.left = projectedPosition.x + 'px';
            container.style.top = projectedPosition.y + 'px';
        }
        
        // animation et suppression après quelques secondes
        setTimeout(() => {
            container.classList.add('fadeOut');
            setTimeout(() => {
                if (document.body.contains(container)) {
                    document.body.removeChild(container);
                }
            }, 1000);
            this._messageTimeout = null;
        }, 2000);
        
        this._messageTimeout = true;
    }
    
    teleportToNextLevel() {
        // supprimer l'observer pour éviter multiples appels
        if (this.observer) {
            this.scene.onBeforeRenderObservable.remove(this.observer);
            this.observer = null;
        }
        
        // sauvegarder progression
        if (window.GameProgress && typeof window.GameProgress.saveGameProgress === 'function') {
            // utiliser GAME_IDS.DREAM_TRAVELERS = 2
            const gameId = window.GameProgress.GAME_IDS.DREAM_TRAVELERS;
            const currentLevel = parseInt(window.location.pathname.split('level')[1]?.split('.')[0] || '1');
            
            // sauvegarder
            window.GameProgress.saveGameProgress(gameId, currentLevel);
            console.log(`Progression sauvegardée pour Dream Travelers: Niveau ${currentLevel} terminé`);
        } else {
            console.warn("GameProgress indisponible, progression non sauvegardée");
        }
        
        const fadeAnimation = new BABYLON.Animation(
            "fadeOut", 
            "alpha", 
            60, 
            BABYLON.Animation.ANIMATIONTYPE_FLOAT, 
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // écran de transition
        const fadePanel = BABYLON.MeshBuilder.CreatePlane("fadePanel", { width: 100, height: 100 }, this.scene);
        fadePanel.position = new BABYLON.Vector3(0, 0, 1);
        fadePanel.parent = this.scene.activeCamera;
        
        const fadeMaterial = new BABYLON.StandardMaterial("fadeMaterial", this.scene);
        fadeMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        fadeMaterial.alpha = 0;
        fadeMaterial.backFaceCulling = false;
        fadeMaterial.disableLighting = true;
        fadePanel.material = fadeMaterial;
        
        // animation de fondu
        const fadeKeys = [
            { frame: 0, value: 0 },
            { frame: 30, value: 1 }
        ];
        
        fadeAnimation.setKeys(fadeKeys);
        fadeMaterial.animations = [fadeAnimation];
        
        // lancer l'animation
        this.scene.beginAnimation(fadeMaterial, 0, 30, false, 1, () => {
            // si nextLevelId est 0, retour au menu
            if (this.nextLevelId === 0) {
                window.location.href = "index.html";
            } else {
                // sinon niveau suivant
                window.location.href = `level${this.nextLevelId}.html`;
            }
        });
    }
    
    dispose() {
        // nettoyer les ressources lors de la suppression
        if (this.observer) {
            this.scene.onBeforeRenderObservable.remove(this.observer);
        }
        
        if (this.light) {
            this.light.dispose();
        }
        
        if (this.mesh) {
            this.mesh.dispose();
        }
    }
} 
 
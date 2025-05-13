class RotatingPlatform {
    constructor(scene, position, size, initialRotation = 0) {
        this.scene = scene;
        this.position = position;
        this.size = size;
        this.isRotating = false;
        
        // état de rotation (0 = initial, 1 = 90°, 2 = 180°, 3 = 270°)
        this.rotationState = initialRotation % 4;
        
        this.mesh = this.createPlatform();
        
        // appliquer la rotation initiale sans animation
        if (this.rotationState > 0) {
            this.mesh.rotation.y = this.rotationState * Math.PI/2;
        }
        
        // positions valides sur la plateforme selon l'état de rotation
        // format: {worldX, worldY, worldZ}
        this.validPositions = [];
        
        // initialisation des positions valides
        this.updateValidPositions();
        
        // on enregistre la plateforme dans la scène
        if (!scene.rotatingPlatforms) {
            scene.rotatingPlatforms = [];
        }
        scene.rotatingPlatforms.push(this);
    }
    
    createPlatform() {
        // création de la plateforme rotative
        const platform = BABYLON.MeshBuilder.CreateBox("rotatingPlatform", {
            width: this.size,
            height: 1,
            depth: 1
        }, this.scene);
        
        platform.position = new BABYLON.Vector3(this.position.x, this.position.y, this.position.z);
        
        // référence à cette instance dans le mesh
        platform.platformInstance = this;
        
        // matériau
        const platformMaterial = new BABYLON.StandardMaterial("platformMat", this.scene);
        platformMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.9);
        platform.material = platformMaterial;
        
        // petit bouton de rotation au centre
        const rotateButton = BABYLON.MeshBuilder.CreateCylinder("rotateButton", {
            height: 0.6,
            diameter: 0.3
        }, this.scene);
        
        rotateButton.position = new BABYLON.Vector3(0, 0.35, 0);
        rotateButton.parent = platform;
        
        // matériau du bouton
        const buttonMaterial = new BABYLON.StandardMaterial("buttonMat", this.scene);
        buttonMaterial.diffuseColor = new BABYLON.Color3(1, 0.8, 0.0);
        buttonMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.0);
        
        rotateButton.material = buttonMaterial;
        
        return platform;
    }
    
    // mise à jour des positions valides selon l'état de rotation
    updateValidPositions() {
        this.validPositions = [];
        
        // position centrale toujours valide
        this.validPositions.push({
            x: this.position.x, 
            y: this.position.y, 
            z: this.position.z
        });
        
        // positions des extrémités selon l'état de rotation
        if (this.rotationState % 2 === 0) {
            // état 0 ou 2 (horizontal sur l'axe X)
            this.validPositions.push({
                x: this.position.x - 1, 
                y: this.position.y, 
                z: this.position.z
            });
            this.validPositions.push({
                x: this.position.x + 1, 
                y: this.position.y, 
                z: this.position.z
            });
        } else {
            // état 1 ou 3 (horizontal sur l'axe Z)
            this.validPositions.push({
                x: this.position.x, 
                y: this.position.y, 
                z: this.position.z - 1
            });
            this.validPositions.push({
                x: this.position.x, 
                y: this.position.y, 
                z: this.position.z + 1
            });
        }
        
        console.log(`Plateforme à [${this.position.x}, ${this.position.y}, ${this.position.z}] - État ${this.rotationState}`);
        console.log("Positions valides:", this.validPositions);
    }
    
    // vérifie si une position est valide sur cette plateforme
    isPositionValid(position) {
        for (const validPos of this.validPositions) {
            // seuil de tolérance pour la comparaison
            if (Math.abs(position.x - validPos.x) < 0.1 && 
                Math.abs(position.y - validPos.y) < 0.1 && 
                Math.abs(position.z - validPos.z) < 0.1) {
                return true;
            }
        }
        return false;
    }
    
    // récupère la position valide la plus proche
    getNearestValidPosition(position) {
        let closestPos = null;
        let minDistance = Infinity;
        
        for (const validPos of this.validPositions) {
            const distance = Math.sqrt(
                Math.pow(position.x - validPos.x, 2) +
                Math.pow(position.y - validPos.y, 2) +
                Math.pow(position.z - validPos.z, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                closestPos = validPos;
            }
        }
        
        return {
            position: closestPos,
            distance: minDistance
        };
    }
    
    // rotation de la plateforme
    rotate() {
        if (this.isRotating) return;
        
        this.isRotating = true;
        
        const currentRotation = this.mesh.rotation.y;
        const targetRotation = currentRotation + Math.PI/2;
        
        const animation = new BABYLON.Animation(
            "rotateAnimation",
            "rotation.y",
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const keyFrames = [
            { frame: 0, value: currentRotation },
            { frame: 60, value: targetRotation }
        ];
        
        animation.setKeys(keyFrames);
        
        this.mesh.animations = [];
        this.mesh.animations.push(animation);
        
        this.scene.beginAnimation(this.mesh, 0, 60, false, 1, () => {
            this.isRotating = false;
            
            // maj de l'état de rotation
            this.rotationState = (this.rotationState + 1) % 4;
            
            // maj des positions valides
            this.updateValidPositions();
            
            // maj de la grille pour le pathfinding
            if (this.scene.level && this.scene.level.grid) {
                console.log("Mise à jour de la grille après rotation");
            }
            
            // notifier les joueurs sur la plateforme
            const playersOnPlatform = [];
            
            // chercher tous les joueurs qui ont cette plateforme comme parent
            for (const node of this.scene.meshes) {
                if (node.name === "playerContainer" && node.parent === this.mesh) {
                    const player = node.playerInstance;
                    if (player) {
                        playersOnPlatform.push(player);
                        
                        // maj de la position interne du joueur
                        const worldPos = player.mesh.getAbsolutePosition();
                        player.position.x = Math.round(worldPos.x);
                        player.position.y = Math.round(worldPos.y);
                        player.position.z = Math.round(worldPos.z);
                        
                        console.log("Position du joueur mise à jour après rotation:", player.position);
                    }
                }
            }
            
            console.log(`${playersOnPlatform.length} joueur(s) sur la plateforme après rotation`);
        });
    }
}

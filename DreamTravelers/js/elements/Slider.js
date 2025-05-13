class Slider {
    constructor(scene, position, axis, minValue, maxValue) {
        this.scene = scene;
        this.position = position;
        this.axis = axis.toLowerCase();
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.isDragging = false;
        this.playerOnSlider = null;
        this.cameraState = null;
        this.pendingGridRegistration = true;
        
        this.createMesh();
        
        this.setupEvents();
        
        // attendre que la scène soit prête
        this.scene.onReadyObservable.addOnce(() => {
            if (this.scene.level && this.scene.level.grid) {
                this.registerInGrid();
            } else {
                const checkInterval = setInterval(() => {
                    if (this.scene.level && this.scene.level.grid) {
                        this.registerInGrid();
                        clearInterval(checkInterval);
                    }
                }, 500);
            }
        });
    }
    
    // enregistrer le slider dans la grille
    registerInGrid() {
        if (!this.pendingGridRegistration) return;
        
        if (this.scene.level && this.scene.level.grid) {
            const x = Math.round(this.mesh.position.x);
            const y = Math.round(this.mesh.position.y);
            const z = Math.round(this.mesh.position.z);
            
            this.pendingGridRegistration = false;
        }
    }
    
    createMesh() {
        // créer le slider
        this.mesh = BABYLON.MeshBuilder.CreateBox(
            "slider", 
            { width: 1, height: 1, depth: 1 }, 
            this.scene
        );
        
        // positionnement initial
        this.mesh.position = new BABYLON.Vector3(
            Math.round(this.position.x),
            Math.round(this.position.y),
            Math.round(this.position.z)
        );
        
        this.mesh.checkCollisions = true;
        this.mesh.isWalkable = true;
        this.mesh.isSlider = true;
        
        // matériau
        const material = new BABYLON.StandardMaterial("sliderMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.1, 0.4, 1.0);
        material.emissiveColor = new BABYLON.Color3(0.0, 0.2, 0.5);
        material.specularColor = new BABYLON.Color3(1, 1, 1);
        this.mesh.material = material;
        
        // surbrillance
        this.highlightMaterial = new BABYLON.StandardMaterial("sliderHighlightMaterial", this.scene);
        this.highlightMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.8, 1.0);
        this.highlightMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.5, 0.8);
        
        // poignées
        this.addHandles();
        
        // position d'origine
        this.originalY = this.position.y;
    }
    
    addHandles() {
        // matériau
        const handleMaterial = new BABYLON.StandardMaterial("handleMaterial", this.scene);
        handleMaterial.diffuseColor = new BABYLON.Color3(1.0, 0.8, 0.0);
        handleMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.0);
        
        // orientation selon l'axe
        if (this.axis === 'x') {
            // poignées sur les faces X (gauche/droite)
            this.leftHandle = BABYLON.MeshBuilder.CreateCylinder(
                "leftSliderHandle",
                { height: 0.3, diameter: 0.2 },
                this.scene
            );
            this.leftHandle.rotation.z = Math.PI / 2;
            this.leftHandle.position = new BABYLON.Vector3(-0.6, 0, 0);
            this.leftHandle.parent = this.mesh;
            this.leftHandle.material = handleMaterial;
            
            this.rightHandle = BABYLON.MeshBuilder.CreateCylinder(
                "rightSliderHandle",
                { height: 0.3, diameter: 0.2 },
                this.scene
            );
            this.rightHandle.rotation.z = Math.PI / 2;
            this.rightHandle.position = new BABYLON.Vector3(0.6, 0, 0);
            this.rightHandle.parent = this.mesh;
            this.rightHandle.material = handleMaterial;
        } else if (this.axis === 'y') {
            // poignées sur faces Y (haut/bas)
            this.topHandle = BABYLON.MeshBuilder.CreateCylinder(
                "topSliderHandle",
                { height: 0.3, diameter: 0.2 },
                this.scene
            );
            this.topHandle.position = new BABYLON.Vector3(0, 0.6, 0);
            this.topHandle.parent = this.mesh;
            this.topHandle.material = handleMaterial;
            
            this.bottomHandle = BABYLON.MeshBuilder.CreateCylinder(
                "bottomSliderHandle",
                { height: 0.3, diameter: 0.2 },
                this.scene
            );
            this.bottomHandle.position = new BABYLON.Vector3(0, -0.6, 0);
            this.bottomHandle.parent = this.mesh;
            this.bottomHandle.material = handleMaterial;
        } else if (this.axis === 'z') {
            // poignées sur faces Z (avant/arrière)
            this.frontHandle = BABYLON.MeshBuilder.CreateCylinder(
                "frontSliderHandle",
                { height: 0.3, diameter: 0.2 },
                this.scene
            );
            this.frontHandle.rotation.x = Math.PI / 2;
            this.frontHandle.position = new BABYLON.Vector3(0, 0, 0.6);
            this.frontHandle.parent = this.mesh;
            this.frontHandle.material = handleMaterial;
            
            this.backHandle = BABYLON.MeshBuilder.CreateCylinder(
                "backSliderHandle",
                { height: 0.3, diameter: 0.2 },
                this.scene
            );
            this.backHandle.rotation.x = Math.PI / 2;
            this.backHandle.position = new BABYLON.Vector3(0, 0, -0.6);
            this.backHandle.parent = this.mesh;
            this.backHandle.material = handleMaterial;
        }
    }
    
    setupEvents() {
        // stocker les gestionnaires d'événements
        const originalPointerDown = this.scene.onPointerDown;
        const originalPointerMove = this.scene.onPointerMove;
        const originalPointerUp = this.scene.onPointerUp;
        
        // liste des poignées
        this.handles = [];
        if (this.axis === 'x') {
            this.handles = [this.leftHandle, this.rightHandle];
        } else if (this.axis === 'y') {
            this.handles = [this.topHandle, this.bottomHandle];
        } else if (this.axis === 'z') {
            this.handles = [this.frontHandle, this.backHandle];
        }
        
        this.scene.onPointerDown = (evt, pickResult) => {
            if (pickResult.hit && 
                (pickResult.pickedMesh === this.mesh || 
                this.handles.includes(pickResult.pickedMesh))) {
                
                // activer le mode glissement si c'est une poignée
                if (this.handles.includes(pickResult.pickedMesh)) {
                    this.startDragging();
                    return;
                }
                
                // utiliser le pathfinding pour le corps du slider
                if (pickResult.pickedMesh === this.mesh) {
                    if (this.scene.level && this.scene.level.player) {
                        const player = this.scene.level.player;
                        const targetPosition = {
                            x: Math.round(this.mesh.position.x),
                            y: Math.round(this.mesh.position.y),
                            z: Math.round(this.mesh.position.z)
                        };
                        
                        // utilisation du pathfinding
                        const path = player.findPath(targetPosition);
                        if (path && path.length > 0) {
                            player.moveAlongPath(path);
                        }
                    }
                    return;
                }
            }
            
            if (originalPointerDown) {
                originalPointerDown(evt, pickResult);
            }
            
            if (this.isDragging) {
                this.stopDragging();
            }
        };
        
        this.scene.onPointerMove = (evt) => {
            // traiter le mouvement si on est en train de glisser
            if (this.isDragging) {
                this.updateSliderPosition(evt);
                return;
            }
            
            if (originalPointerMove) {
                originalPointerMove(evt);
            }
        };
        
        this.scene.onPointerUp = (evt) => {
            // si on est en train de glisser, arrêter
            if (this.isDragging) {
                this.stopDragging();
                return;
            }
            
            if (originalPointerUp) {
                originalPointerUp(evt);
            }
        };
                
        // vérifier périodiquement si le joueur est sur le slider
        this.scene.registerBeforeRender(() => {
            this.checkPlayerOnSlider();
            this.updateHandlePositions();
        });
    }
    
    updateHandlePositions() {
        // s'assurer que les poignées restent attachées au slider
        if (this.handles && this.handles.length > 0) {
            this.handles.forEach(handle => {
                if (handle && handle.parent !== this.mesh) {
                    handle.parent = this.mesh;
                }
            });
        }
    }
    
    startDragging() {
        this.isDragging = true;
        // changer l'apparence du slider quand il est sélectionné
        this.mesh.material = this.highlightMaterial;
        
        this.handles.forEach(handle => {
            const highlightHandleMaterial = new BABYLON.StandardMaterial("handleHighlightMaterial", this.scene);
            highlightHandleMaterial.diffuseColor = new BABYLON.Color3(1.0, 1.0, 0.0); // jaune vif
            highlightHandleMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.0); // très brillant
            handle.material = highlightHandleMaterial;
        });
        
        // verrouiller la caméra
        if (this.scene.activeCamera) {
            this.cameraState = {
                detached: false
            };
            
            this.scene.activeCamera.detachControl();
            this.cameraState.detached = true;
        }
    }
    
    stopDragging() {
        this.isDragging = false;
        
        // replacer le slider vers la position la plus proche
        this.snapToGrid();
        
        const material = new BABYLON.StandardMaterial("sliderMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.1, 0.4, 1.0);
        material.emissiveColor = new BABYLON.Color3(0.0, 0.2, 0.5);
        material.specularColor = new BABYLON.Color3(1, 1, 1);
        this.mesh.material = material;
        
        this.handles.forEach(handle => {
            const handleMaterial = new BABYLON.StandardMaterial("handleMaterial", this.scene);
            handleMaterial.diffuseColor = new BABYLON.Color3(1.0, 0.8, 0.0);
            handleMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.0);
            handle.material = handleMaterial;
        });
        
        // restaurer les contrôles de la caméra
        if (this.cameraState && this.cameraState.detached && this.scene.activeCamera) {
            const canvas = this.scene.getEngine().getRenderingCanvas();
            if (canvas) {
                this.scene.activeCamera.attachControl(canvas);
            }
            this.cameraState.detached = false;
        }
    }
    
    // recalibrer le slider sur la grille
    snapToGrid() {
        const currentPos = this.mesh.position.clone();
        
        // ancienne position
        const oldX = Math.round(currentPos.x);
        const oldY = Math.round(currentPos.y);
        const oldZ = Math.round(currentPos.z);
        
        // nouvelle position
        let newPos = currentPos.clone();
        
        // arrondir à la position de grille la plus proche
        if (this.axis === 'x') {
            newPos.x = Math.round(currentPos.x);
            
            newPos.x = Math.max(this.minValue, Math.min(this.maxValue, newPos.x));
            
            if (newPos.x !== currentPos.x) {
                this.animateSnap(newPos);
            }
        } else if (this.axis === 'y') {
            newPos.y = Math.round(currentPos.y);
            
            newPos.y = Math.max(this.minValue, Math.min(this.maxValue, newPos.y));
            
            if (newPos.y !== currentPos.y) {
                this.animateSnap(newPos);
            }
        } else if (this.axis === 'z') {
            newPos.z = Math.round(currentPos.z);
            
            newPos.z = Math.max(this.minValue, Math.min(this.maxValue, newPos.z));
            
            if (newPos.z !== currentPos.z) {
                this.animateSnap(newPos);
            }
        }
        
        // mise à jour position seulement
        const newX = Math.round(newPos.x);
        const newY = Math.round(newPos.y);
        const newZ = Math.round(newPos.z);
    }
    
    // animer le repalcement du slider
    animateSnap(targetPosition) {
        const animation = new BABYLON.Animation(
            "sliderSnap",
            "position",
            30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const startPosition = this.mesh.position.clone();
        const playerOnSliderAtStart = this.playerOnSlider;
        
        const keyFrames = [
            { frame: 0, value: startPosition },
            { frame: 15, value: targetPosition }
        ];
        
        animation.setKeys(keyFrames);
        
        const easingFunction = new BABYLON.QuarticEase();
        easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        animation.setEasingFunction(easingFunction);
        
        this.mesh.animations = [animation];
        
        const observer = this.scene.onBeforeRenderObservable.add(() => {
            if (playerOnSliderAtStart) {
                const deltaPosition = {
                    x: this.mesh.position.x - startPosition.x,
                    y: this.mesh.position.y - startPosition.y,
                    z: this.mesh.position.z - startPosition.z
                };
                
                // mettre à jour la position du joueur
                if (playerOnSliderAtStart.mesh) {
                    playerOnSliderAtStart.mesh.position.x = playerOnSliderAtStart.mesh.position.x + deltaPosition.x;
                    playerOnSliderAtStart.mesh.position.y = playerOnSliderAtStart.mesh.position.y + deltaPosition.y;
                    playerOnSliderAtStart.mesh.position.z = playerOnSliderAtStart.mesh.position.z + deltaPosition.z;
                    
                    // mettre à jour startPosition
                    startPosition.copyFrom(this.mesh.position);
                }
            }
        });
        
        this.scene.beginAnimation(this.mesh, 0, 15, false, 1.0, () => {
            // nettoyer l'observer une fois l'animation terminée
            this.scene.onBeforeRenderObservable.remove(observer);
            
            this.updateHandlePositions();
        });
    }
    
    updateSliderPosition(evt) {
        if (!this.isDragging) return;
        
        // récupérer la direction du mouvement de la souris
        const movementX = evt.movementX || 0;
        const movementY = evt.movementY || 0;
        
        const sensitivity = 0.03;
        
        // position actuelle du slider
        const oldPosition = this.mesh.position.clone();
        let newPosition = oldPosition.clone();
        
        // calculer la nouvelle position
        if (this.axis === 'x') {
            newPosition.x += movementX * sensitivity;
            newPosition.x = Math.round(newPosition.x * 100) / 100;
            newPosition.x = Math.max(this.minValue, Math.min(this.maxValue, newPosition.x));
        } else if (this.axis === 'y') {
            newPosition.y -= movementY * sensitivity;
            newPosition.y = Math.round(newPosition.y * 100) / 100;
            newPosition.y = Math.max(this.minValue, Math.min(this.maxValue, newPosition.y));
        } else if (this.axis === 'z') {
            newPosition.z += movementX * sensitivity;
            newPosition.z = Math.round(newPosition.z * 100) / 100;
            newPosition.z = Math.max(this.minValue, Math.min(this.maxValue, newPosition.z));
        }
        
        // mettre à jour la position du slider
        this.mesh.position = newPosition;
        
        // vecteur de déplacement
        const deltaPosition = {
            x: newPosition.x - oldPosition.x,
            y: newPosition.y - oldPosition.y,
            z: newPosition.z - oldPosition.z
        };
        
        // déplacer le joueur avec le slider
        this.movePlayerWithSlider(deltaPosition);
    }
    
    checkPlayerOnSlider() {
        // vérifier si le niveau et le joueur sont définis
        if (!this.scene.level || !this.scene.level.player || !this.scene.level.player.mesh) {
            return;
        }
        
        const player = this.scene.level.player;
        const playerMesh = player.mesh;
        
        let isOnSlider = false;
        
        // vérifier si le joueur est sur le slider ou à y+1 au-dessus
        isOnSlider = (Math.abs(playerMesh.position.x - this.mesh.position.x) < 0.5 &&
                      (Math.abs(playerMesh.position.y - this.mesh.position.y) < 0.5 || 
                       Math.abs(playerMesh.position.y - (this.mesh.position.y + 1)) < 0.5) &&
                      Math.abs(playerMesh.position.z - this.mesh.position.z) < 0.5);
        
        if (isOnSlider) { 
            // le joueur est sur le slider
            this.playerOnSlider = player;
            
            // activer les collisions pour permettre au joueur de rester sur le slider
            if (!this.mesh.checkCollisions) {
                this.mesh.checkCollisions = true;
            }
        } else {
            // le joueur n'est plus sur le slider
            this.playerOnSlider = null;
        }
    }
    
    movePlayerWithSlider(deltaPosition) {
        // déplacer le joueur s'il est sur le slider
        if (this.playerOnSlider && this.playerOnSlider.mesh) {
            const playerMesh = this.playerOnSlider.mesh;
            
            playerMesh.position.x += deltaPosition.x;
            playerMesh.position.y += deltaPosition.y;
            playerMesh.position.z += deltaPosition.z;
            
            // mettre à jour la position du joueur
            if (this.playerOnSlider.position) {
                this.playerOnSlider.position.x = Math.round(playerMesh.position.x);
                this.playerOnSlider.position.y = Math.round(playerMesh.position.y);
                this.playerOnSlider.position.z = Math.round(playerMesh.position.z);
            }
        }
    }
} 
class BaseLevel {
    constructor() {
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = null;
        this.camera = null;
        this.currentLevel = 0;
        
        this.createScene();
        
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        // Ajouter un gestionnaire d'événements générique
        this.scene.onPointerDown = (evt) => this.handleClick(evt);
    }

    createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(51/255, 176/255, 255/255, 1); // Couleur #33b0ff
        
        // Caméra isométrique
        this.camera = new BABYLON.ArcRotateCamera(
            "camera",
            BABYLON.Tools.ToRadians(45),
            BABYLON.Tools.ToRadians(60),
            20,
            BABYLON.Vector3.Zero(),
            this.scene
        );
        
        this.camera.lowerRadiusLimit = 10;
        this.camera.upperRadiusLimit = 30;
        this.camera.lowerBetaLimit = BABYLON.Tools.ToRadians(30); // Limite inférieure de l'angle vertical
        this.camera.upperBetaLimit = BABYLON.Tools.ToRadians(80); // Limite supérieure de l'angle vertical
        this.camera.attachControl(this.canvas, true);
        
        // Lumière
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.8;
        
        // Lumière directionnelle pour les ombres
        const dirLight = new BABYLON.DirectionalLight(
            "dirLight", 
            new BABYLON.Vector3(-1, -2, -1), 
            this.scene
        );
        dirLight.intensity = 0.5;
    }

    createGridLines(gridSize = 10) {
        const linesMaterial = new BABYLON.StandardMaterial("linesMaterial", this.scene);
        linesMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        linesMaterial.alpha = 0.3;

        // Créer le conteneur parent pour les lignes
        const gridLinesParent = new BABYLON.TransformNode("gridLines", this.scene);

        // Créer les lignes horizontales (X)
        for (let i = -gridSize; i <= gridSize; i++) {
            const line = BABYLON.MeshBuilder.CreateLines(
                "gridLine",
                {
                    points: [
                        new BABYLON.Vector3(-gridSize, 0, i),
                        new BABYLON.Vector3(gridSize, 0, i)
                    ]
                },
                this.scene
            );
            line.material = linesMaterial;
            line.parent = gridLinesParent;
        }

        // Créer les lignes verticales (Z)
        for (let i = -gridSize; i <= gridSize; i++) {
            const line = BABYLON.MeshBuilder.CreateLines(
                "gridLine",
                {
                    points: [
                        new BABYLON.Vector3(i, 0, -gridSize),
                        new BABYLON.Vector3(i, 0, gridSize)
                    ]
                },
                this.scene
            );
            line.material = linesMaterial;
            line.parent = gridLinesParent;
        }
        
        // Ajouter des lignes verticales pour la grille 3D
        for (let i = -gridSize/2; i <= gridSize/2; i += gridSize/2) {
            const yLine = BABYLON.MeshBuilder.CreateLines("yLine", {
                points: [
                    new BABYLON.Vector3(i, -gridSize/2, i),
                    new BABYLON.Vector3(i, gridSize/2, i)
                ]
            }, this.scene);
            yLine.color = new BABYLON.Color3(0.3, 0.3, 0.3); // Gris plus foncé
            yLine.parent = gridLinesParent;
        }

        return gridLinesParent;
    }

    handleClick(evt) {
        if (!this.player || this.player.isMoving) return;
        
        try {
            const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
            if (pickResult.hit) {
                // IMPORTANT: Logs de débogage pour comprendre ce que vous cliquez
                console.log("Mesh cliqué:", pickResult.pickedMesh.name);
                console.log("Parent:", pickResult.pickedMesh.parent ? pickResult.pickedMesh.parent.name : "Aucun");
                
                // Gestion des boutons de rotation
                if (pickResult.pickedMesh.name === "rotateButton") {
                    // Trouver la plateforme correspondante
                    for (const platform of this.rotatingPlatforms || []) {
                        if (platform.mesh === pickResult.pickedMesh.parent) {
                            platform.rotate();
                            return;
                        }
                    }
                    return;
                }
                
                // AMÉLIORATION: Meilleure détection des escaliers - utiliser contains au lieu de startsWith
                // Cela permettra de détecter les noms comme "marche_0_x,y,z" ou "stairBase_x,y,z"
                const isStair = pickResult.pickedMesh.name.includes('stair') || 
                               pickResult.pickedMesh.name.includes('marche');
                
                // Gestion du déplacement vers les cubes, plateformes et escaliers
                if (pickResult.pickedMesh.name.includes('cube') || 
                    pickResult.pickedMesh.name === "rotatingPlatform" ||
                    isStair) {
                    
                    let targetPosition = new BABYLON.Vector3();
                    
                    if (isStair) {
                        // Pour un escalier, chercher le parent ou utiliser la position du mesh cliqué
                        if (pickResult.pickedMesh.parent && 
                            (pickResult.pickedMesh.parent.name.includes('stair') || 
                             pickResult.pickedMesh.parent.metadata?.type === 'stair')) {
                            targetPosition = pickResult.pickedMesh.parent.position.clone();
                        } else {
                            // Si c'est directement un escalier ou une marche sans parent
                            targetPosition = pickResult.pickedMesh.position.clone();
                            
                            // Si l'escalier a une position dans la grille, l'utiliser directement
                            for (const [key, element] of Object.entries(this.grid.getAllElements())) {
                                if (element.type === 'stair' && 
                                    element.mesh && 
                                    element.mesh.id === pickResult.pickedMesh.id) {
                                    const [x, y, z] = key.split(',').map(Number);
                                    targetPosition.x = x;
                                    targetPosition.y = y;
                                    targetPosition.z = z;
                                    break;
                                }
                            }
                        }
                    } else if (pickResult.pickedMesh.name === "rotatingPlatform") {
                        // Gestion des plateformes rotatives
                        const hitPoint = pickResult.pickedPoint;
                        let platformHit = null;
                        
                        // Récupérer la plateforme soit depuis l'instance, soit depuis la liste
                        if (pickResult.pickedMesh.platformInstance) {
                            platformHit = pickResult.pickedMesh.platformInstance;
                        } else {
                            for (const platform of this.rotatingPlatforms || []) {
                                if (platform.mesh === pickResult.pickedMesh) {
                                    platformHit = platform;
                                    break;
                                }
                            }
                        }
                        
                        if (platformHit) {
                            // Trouver la position valide la plus proche du point de clic
                            const rotationMatrix = BABYLON.Matrix.RotationY(-platformHit.mesh.rotation.y);
                            const localHitPoint = hitPoint.subtract(platformHit.mesh.position);
                            const rotatedPoint = BABYLON.Vector3.TransformCoordinates(localHitPoint, rotationMatrix);
                            
                            // Position du clic dans l'espace de la scène
                            const clickWorldPos = new BABYLON.Vector3(
                                platformHit.mesh.position.x + rotatedPoint.x,
                                platformHit.mesh.position.y,
                                platformHit.mesh.position.z + rotatedPoint.z
                            );
                            
                            console.log("Position du clic sur la plateforme:", clickWorldPos);
                            
                            // Obtenir la position valide la plus proche
                            const nearest = platformHit.getNearestValidPosition(clickWorldPos);
                            
                            if (nearest.position && nearest.distance < 1.5) {
                                targetPosition.x = nearest.position.x;
                                targetPosition.y = nearest.position.y;
                                targetPosition.z = nearest.position.z;
                                console.log("Position valide la plus proche:", nearest.position, "distance:", nearest.distance);
                            } else {
                                // Méthode de secours - arrondir les coordonnées du clic
                                targetPosition.x = Math.round(clickWorldPos.x);
                                targetPosition.y = platformHit.mesh.position.y;
                                targetPosition.z = Math.round(clickWorldPos.z);
                                console.log("Aucune position valide trouvée, utilisation de la position arrondie:", targetPosition);
                            }
                        }
                    } else {
                        // Cubes et autres éléments
                        targetPosition = pickResult.pickedMesh.position.clone();
                    }
                    
                    console.log("Tentative de déplacement vers:", targetPosition);
                    
                    // Calcul du chemin
                    const path = this.player.findPath({
                        x: targetPosition.x, 
                        y: targetPosition.y, 
                        z: targetPosition.z
                    });
                    
                    // Vérifier explicitement si le chemin est valide et non vide
                    if (path && path.length > 0) {
                        this.player.moveAlongPath(path);
                    } else {
                        console.log("Destination inaccessible, aucun déplacement");
                        this.showInaccessibleFeedback(targetPosition);
                    }
                }
            }
        } catch (error) {
            console.error("Erreur lors du traitement du clic:", error);
            // S'assurer que le joueur n'est pas bloqué en état de mouvement
            if (this.player) {
                this.player.isMoving = false;
            }
        }
    }

    // Méthode optionnelle pour montrer un feedback visuel quand une destination est inaccessible
    showInaccessibleFeedback(position) {
        // Créer un effet visuel temporaire (par exemple, un X rouge)
        const feedbackMarker = BABYLON.MeshBuilder.CreatePlane("inaccessibleMarker", {size: 0.5}, this.scene);
        feedbackMarker.position = new BABYLON.Vector3(position.x, position.y + 1, position.z);
        feedbackMarker.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        // Appliquer un matériau rouge semi-transparent
        const material = new BABYLON.StandardMaterial("feedbackMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 0, 0);
        material.alpha = 0.7;
        feedbackMarker.material = material;
        
        // Animer l'opacité pour faire disparaître progressivement
        const animation = new BABYLON.Animation(
            "fadeOut", 
            "visibility", 
            30, 
            BABYLON.Animation.ANIMATIONTYPE_FLOAT, 
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const keys = [
            { frame: 0, value: 1 },
            { frame: 30, value: 0 }
        ];
        animation.setKeys(keys);
        
        feedbackMarker.animations = [animation];
        
        // Lancer l'animation et supprimer le marqueur après
        this.scene.beginAnimation(feedbackMarker, 0, 30, false, 1, () => {
            feedbackMarker.dispose();
        });
    }
    
    // Méthode par défaut à surcharger dans les classes filles
    createLevel() {
        console.warn("La méthode createLevel doit être implémentée dans la classe fille");
    }
} 